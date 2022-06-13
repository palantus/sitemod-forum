import Entity, { query, nextNum } from "entitystorage"
import { getTimestamp } from "../../../tools/date.mjs"
import ForumPost from "./post.mjs"
import User from "../../../models/user.mjs"
import File from "../../files/models/file.mjs"

export default class ForumThread extends Entity {

  initNew(){
    this.id = nextNum("forumthread")
    this.date = getTimestamp()
    this.tag("forumthread")
  }

  static lookup(id){
    if(!id) return null
    return query.type(ForumThread).tag("forumthread").prop("id", id).first
  }

  static all(){
    return query.type(ForumThread).tag("forumthread").all
  }

  static allByAuthor(user){
    if(!user) return [];
    return query.type(ForumThread).tag("forumthread").relatedTo(user, "owner").all
  }

  subscribe(user){
    this.rel(user, "subscribee")
  }

  unsubscribe(user){
    this.removeRel(user, "subscribee")
  }

  get posts() {
    return (this.rels.post||[]).map(p => ForumPost.from(p))
  }

  get files() {
    return (this.rels.file||[]).map(p => File.from(p))
  }

  delete(){
    this.posts.forEach(p => p.delete())
    this.files.forEach(f => f.delete())
    super.delete()
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
      forum: this.forum,
      title: this.title,
      postCount: this.relsrev?.thread?.length || 0,
      date: this.date,
      author: {
        name: author.name,
        userId: author.user?.id || null
      },
      active: !this.tags.includes("closed"),
      url: this.url,
      lastActivityDate: this.relsrev?.thread?.sort((a, b) => a.date < b.date ? 1 : -1)[0]?.date || this.date
    }
  }
}