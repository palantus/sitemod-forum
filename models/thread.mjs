import Entity, { query, nextNum } from "entitystorage"
import { getTimestamp } from "../../../tools/date.mjs"
import ForumPost from "./post.mjs"
import Forum from "./forum.mjs"
import User from "../../../models/user.mjs"
import File from "../../files/models/file.mjs"
import Notification from "../../../models/notification.mjs"
import LogEntry from "../../../models/logentry.mjs"

export default class ForumThread extends Entity {

  initNew({ id, date } = {}) {
    this.id = id || nextNum("forumthread")
    this.date = date || getTimestamp()
    this.tag("forumthread")
  }

  static lookup(id) {
    if (!id) return null
    return query.type(ForumThread).tag("forumthread").prop("id", id).first
  }

  static all() {
    return query.type(ForumThread).tag("forumthread").all
  }

  static allByAuthor(user) {
    if (!user) return [];
    return query.type(ForumThread).tag("forumthread").relatedTo(user, "owner").all
  }

  static isOfType(entity) {
    if (!entity) return false;
    return entity.tags.includes("forumthread")
  }

  subscribe(user) {
    this.rel(user, "subscribee")
  }

  unsubscribe(user) {
    this.removeRel(user, "subscribee")
  }

  get posts() {
    return (this.rels.post || []).map(p => ForumPost.from(p))
  }

  get files() {
    return (this.rels.file || []).map(p => File.from(p))
  }

  get forum() {
    return Forum.from(this.relsrev.thread?.find(f => f.tags.includes("forum")))
  }

  delete() {
    this.rels.notification?.map(n => Notification.from(n)).forEach(n => n.dismiss())
    this.posts.forEach(p => p.delete())
    this.files.forEach(f => f.delete())
    this.logEntries.forEach(l => l.delete())
    super.delete()
  }

  get author() {
    let owner = this.related.owner
    if (owner) {
      return {
        name: owner.name,
        user: User.from(owner)
      }
    } else {
      return { name: this.authorName, user: null }
    }
  }

  get participants() {
    let allAutors = this.posts.map(p => p.author)
    let authors = [];
    for (let author of allAutors) {
      if (authors.find(a => a.name == author.name)) continue;
      authors.push(author)
    }

    return authors;
  }

  get lastActivityDate() {
    return this.posts.sort((a, b) => a.date < b.date ? 1 : -1)[0]?.date || this.date
  }

  get lastReply() {
    return this.posts.sort((a, b) => a.date < b.date ? 1 : -1)[0] || null
  }

  log(message, user) {
    this.rel(new LogEntry(message, "forum", { user }), "log")
  }

  attachFile(file) {
    this.log(`User ${file.owner?.name || "N/A"} attached file ${file.name}`, file.owner)
    this.rel(file, "file")
  }

  get logEntries() {
    return (this.rels.log || []).map(l => LogEntry.from(l))
  }

  toObj() {
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
