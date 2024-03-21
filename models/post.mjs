import Entity, { nextNum, query } from "entitystorage"
import { getTimestamp } from "../../../tools/date.mjs"
import { md2html } from "../../../tools/markdown.mjs"
import User from "../../../models/user.mjs"
import ForumThread from "./thread.mjs"
import Notification from "../../../models/notification.mjs"

export default class ForumPost extends Entity {

  initNew({ id, date } = {}) {
    this.id = id || nextNum("forumpost")
    this.date = date || getTimestamp()
    this.tag("forumpost")
  }

  static lookup(id) {
    if (!id) return null
    return query.type(ForumPost).tag("forumpost").prop("id", id).first
  }

  static allByAuthor(user) {
    if (!user) return [];
    return query.type(ForumPost).tag("forumpost").relatedTo(user, "owner").all
  }

  static all() {
    return query.type(ForumPost).tag("forumpost").all
  }

  static isOfType(entity) {
    if (!entity) return false;
    return entity.tags.includes("forumpost")
  }

  updateHTML() {
    this.bodyHTML = md2html(this.body)
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

  get thread() {
    return ForumThread.from(this.relsrev.post?.[0])
  }

  delete() {
    this.rels.notification?.map(n => Notification.from(n)).forEach(n => n.dismiss())
    super.delete()
  }

  toObj() {
    let author = this.author
    return {
      id: this.id,
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
