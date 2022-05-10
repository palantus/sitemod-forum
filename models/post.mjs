import Entity from "entitystorage"

export default class ForumPost extends Entity {
  toObj(){
    return {
      id: this.id,
      thread: this.thread,
      body: this.body,
      subject: this.subject,
      date: this.date,
      author: this.author
    }
  }
}