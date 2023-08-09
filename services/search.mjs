"use strict"

import {paginate} from "../../../tools/pagination.mjs"
import SearchQueryParser from "searchqueryparser"
import { isFilterValid } from "entitystorage"
import ForumThread from "../models/thread.mjs"
import Forum from "../models/forum.mjs"

export let tokens = [
  {keywords: ["id"], title: "Search for Id", resolve: token => `prop:id=${token}`},
  {keywords: ["active"], title: "Search for active threads only", resolve: token => `!tag:closed`},
  {keywords: ["author", "by"], title: "Specific author", resolve: token => `(prop:"authorName~${token}"|owner.prop:"name~${token}")`},
  {keywords: ["authoruser", "byuser"], title: "Specific author (user id)", resolve: token => `owner.prop:"id=${token}"`},
  {keywords: ["with"], title: "Participant of thread", resolve: token => `(post.prop:"authorName~${token}"|post.owner.prop:"name~${token}")`},
  {keywords: ["withuser"], title: "Participant of thread (user id)", resolve: token => `post.owner.prop:"id=${token}"`},
  {keywords: ["changedsince"], title: "Threads changed since a given date/time (YYYY-MM-DDTHH:MM:SS)", resolve: token => `post.prop:"date>${token}"|file.prop:"timestamp>${token}"`},
  {keywords: ["createdsince"], title: "Threads created since a given date/time (YYYY-MM-DDTHH:MM:SS)", resolve: token => `prop:"date>${token}"`},
  {keywords: [null], title: "Text search", resolve: token => `(prop:"title~${token}"|prop:"authorName~${token}"|post.prop:"body~${token}"|prop:"id=${token}"|post.owner.prop:"name~${token}")`}
]

class Service {

  constructor() {
    this.parser = new SearchQueryParser()
    this.parser.init()
  }

  search(query, paginationArgs = {}, forumId = null) {
    if(!isFilterValid(query)) return { nodes: [], pageInfo: { totalCount: 0 } };
    let qGen = {
      parseE: function (e) {
        switch (e.type) {
          case "and":
            return `(${this.parseE(e.e1)} ${this.parseE(e.e2)})`
          case "or":
            return `(${this.parseE(e.e1)}|${this.parseE(e.e2)})`
          case "not":
            return `!(${this.parseE(e.e)})`
          case "token":
            return this.parseToken(e.tag, e.token)
        }
      },
      parseToken: function (tag, token) {
        return tokens.find(t => t.keywords.includes(tag ? tag.toLowerCase() : null))?.resolve(token, tag) || (token == "*" ? "*" : "id:-20")
      }
    }
    let q;
    if (query) {
      let ast = this.parser.parse(query.trim())
      q = qGen.parseE(ast);
    }

    try {
      let allResults;

      //first, last, start, end, after, before

      if(forumId){
        let forum = Forum.lookup(forumId)
        if(forum)
          allResults = q ? ForumThread.search(`tag:forumthread thread..id:${forum._id} (${q})`) : forum.threads 
        else
          allResults = []
      } else {
        allResults = q ? ForumThread.search(`tag:forumthread (${q})`) : ForumThread.all() 
      }
      let res;

      switch(paginationArgs.sort){
        case "activity":
          allResults = allResults.map(thread => {
            return {lastActivity: thread.lastActivityDate, thread}
          })
          res = (paginationArgs.reverse ? allResults.sort((a, b) => a.lastActivity <= b.lastActivity ? 1 : -1) 
                                       : allResults.sort((a, b) => a.lastActivity >= b.lastActivity ? -1 : 1))
                                       .map(r => r.thread)
          break;
        default:
          res = paginationArgs.reverse ? allResults.sort((a, b) => a.date <= b.date ? 1 : -1) 
                                       : allResults.sort((a, b) => a.date >= b.date ? -1 : 1)
      }

      res = paginate(res, paginationArgs, "id")
      return { nodes: res, pageInfo: { totalCount: allResults.length } }
    } catch (err) {
      console.log(err)
      return { nodes: [], pageInfo: { totalCount: 0 } };;
    }
  }
}

export default new Service()