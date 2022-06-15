import Entity, { query } from "entitystorage"
import ForumThread from "./thread.mjs"

export default class Forum extends Entity {

  initNew(id, title){
    this.id = id
    this.title = title
    this.tag("forum")
  }

  static lookup(id){
    if(!id) return null
    return query.type(Forum).tag("forum").prop("id", id).first
  }
  static all(){
    return query.type(Forum).tag("forum").all
  }

  get threads() {
    return (this.rels.thread||[]).map(p => ForumThread.from(p))
  }

  static createId(name){
    if(!name || typeof name !== "string") return null;
    return name.replace(/^\s+|\s+$/g, '') // trim
               .toLowerCase()
               .replace(/\//g, '-') //Replace / with -
               .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
               .replace(/\s+/g, '-') // collapse whitespace and replace by -
               .replace(/-+/g, '-'); // collapse dashes
  }

  toObj(){
    return {
      id: this.id,
      title: this.title
    }
  }
}