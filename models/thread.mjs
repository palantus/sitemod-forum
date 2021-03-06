import Entity, { query, nextNum } from "entitystorage"
import { getTimestamp } from "../../../tools/date.mjs"
import ForumPost from "./post.mjs"
import Forum from "./forum.mjs"
import User from "../../../models/user.mjs"
import File from "../../files/models/file.mjs"
import Notification from "../../../models/notification.mjs"

export default class ForumThread extends Entity {

  initNew({id, date} = {}){
    this.id = id || nextNum("forumthread")
    this.date = date || getTimestamp()
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

  get forum() {
    return Forum.from(this.relsrev.thread?.find(f => f.tags.includes("forum")))
  }

  delete(){
    this.rels.notification?.map(n => Notification.from(n)).forEach(n => n.dismiss())
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

  get lastActivityDate(){
    return this.posts.sort((a, b) => a.date < b.date ? 1 : -1)[0]?.date || this.date
  }

  get lastReply(){
    return this.posts.sort((a, b) => a.date < b.date ? 1 : -1)[0] || null
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
      lastActivityDate: this.lastActivityDate
    }
  }
}