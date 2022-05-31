import Entity, {nextNum, query} from "entitystorage"
import { getTimestamp } from "../../../tools/date.mjs"
import {md2html} from "../../../tools/markdown.mjs"
import User from "../../../models/user.mjs"

export default class ForumPost extends Entity {

  initNew(){
    this.id = nextNum("forumpost")
    this.date = getTimestamp()
    this.tag("forumpost")
  }

  static lookup(id){
    if(!id) return null
    return query.type(ForumPost).tag("forumpost").prop("id", id).first
  }

  updateHTML(){
    this.bodyHTML = md2html(this.body)
  }

  get author(){
    let owner = this.related.owner
    if(owner){
      return {
        name: owner.name,
        user: User.from(owner)
      }
    } else {
      return {name: this.authorName, user: null}
    }
  }

  toObj(){
    let author = this.author
    return {
      id: this.id,
      thread: this.thread,
      body: this.body || "",
      bodyHTML: this.bodyHTML || null,
      date: this.date,
      edited: this.edited || null,
      author: {
        name: author.name,
        userId: author.user?.id || null
      }
    }
  }
}