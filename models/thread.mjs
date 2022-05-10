import Entity, { query } from "entitystorage"
import ForumPost from "./post.mjs"

export default class ForumThread extends Entity {

  static lookup(id){
    if(!id) return null
    return query.type(ForumThread).tag("forumthread").prop("id", id).first
  }
  static all(){
    return query.type(ForumThread).tag("forumthread").all
  }

  get posts() {
    return (this.rels.post||[]).map(p => ForumPost.from(p))
  }

  toObj(){
    return {
      id: this.id,
      forum: this.forum,
      title: this.title,
      postCount: this.relsrev?.thread?.length || 0,
      date: this.date,
      author: this.author,
      active: !this.tags.includes("closed"),
      url: this.url,
      lastActivityDate: this.relsrev?.thread?.sort((a, b) => a.date < b.date ? 1 : -1)[0]?.date || this.date
    }
  }
}