import Permission from "../../models/permission.mjs"
import Role from "../../models/role.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("forum").addPermission(["forum.read", "forum.thread.create", "forum.post.create", "forum.post.edit", "forum.thread.edit"], true)
  Role.lookupOrCreate("admin").addPermission(["forum.setup", "forum.admin", "forum.thread.delete", "forum.post.delete"], true)

  return {
  }
}