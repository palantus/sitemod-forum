import Permission from "../../models/permission.mjs"
import Role from "../../models/role.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("forum").addPermission(["forum.read", "forum.edit", "forum.thread.create", "forum.post.create"], true)
  Role.lookupOrCreate("admin").addPermission(["forum.setup", "forum.admin", "forum.thread.delete"], true)

  return {
  }
}