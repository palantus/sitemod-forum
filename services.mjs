import { query } from "entitystorage"
import Permission from "../../models/permission.mjs"
import Role from "../../models/role.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("forum").addPermission(["forum.read", "forum.thread.create", "forum.post.create", "forum.post.edit", "forum.thread.edit", "forum.thread.attach-file"], true)
  Role.lookupOrCreate("forum-admin").addPermission(["forum.setup", "forum.admin", "forum.thread.delete", "forum.post.delete"], true)

  //Upgrade jobs
  query.tag("forum").all.forEach(f => {
    if(!f.title) f.title = f.name;
  })

  return {
  }
}