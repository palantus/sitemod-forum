"use strict"

import {paginate} from "../../../tools/pagination.mjs"
import SearchQueryParser from "searchqueryparser"
import Entity, { isFilterValid } from "entitystorage"
import ForumThread from "../models/thread.mjs"
import Forum from "../models/forum.mjs"

export let tokens = [
  {keywords: ["id"], title: "Search for Id", resolve: token => `prop:id=${token}`},
  {keywords: ["active"], title: "Search for active threads only", resolve: token => `!tag:closed`},
  {keywords: ["language", "lang", "l"], title: "Threads in specific language forums (eg. 'dk')", resolve: token => `forum.prop:"language=${token}"`},
  {keywords: ["author"], title: "Specific author", resolve: token => `prop:"author~${token}"`},
  {keywords: [null], title: "Text search", resolve: token => `(prop:title~${token}|prop:author~${token}|thread..prop:body~${token}|prop:id=${token})`}
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

      if (paginationArgs.reverse === true)
        res = allResults.sort((a, b) => a.id <= b.id ? 1 : -1)
      else
        res = allResults.sort((a, b) => a.id <= b.id ? -1 : 1)

      res = paginate(res, paginationArgs, "id")
      return { nodes: res, pageInfo: { totalCount: allResults.length } }
    } catch (err) {
      console.log(err)
      return { nodes: [], pageInfo: { totalCount: 0 } };;
    }
  }
}

export default new Service()