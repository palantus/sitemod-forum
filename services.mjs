import { query } from "entitystorage"
import Role from "../../models/role.mjs"
import DataType from "../../models/datatype.mjs"
import Forum from "./models/forum.mjs"
import Setup from "./models/setup.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("forum").addPermission(["forum.read", "forum.thread.create", "forum.post.create", "forum.post.edit", "forum.thread.edit", "forum.thread.attach-file"], true)
  Role.lookupOrCreate("forum-admin").addPermission(["forum.setup", "forum.admin", "forum.thread.delete", "forum.post.delete"], true)

  DataType.lookupOrCreate("forum", {title: "Forum", permission: "forum.read", api: "forum/forum", nameField: "title", uiPath: "forum"})
          .init({typeModel: Forum})

  Setup.lookup().ensureDefaults();

  return {
  }
}