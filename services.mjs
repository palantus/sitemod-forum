import Permission from "../../models/permission.mjs"
import Role from "../../models/role.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("forum").addPermission(["forum.read", "forum.edit"], true)
  Role.lookupOrCreate("admin").addPermission(["forum.setup"], true)

  return {
  }
}