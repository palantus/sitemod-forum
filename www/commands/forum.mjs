import { goto } from "../system/core.mjs"
import { Command } from "../pages/tools/command-palette/command.mjs"

export class OpenThread extends Command {
  static keywords = [
    { word: "open", mandatory: false },
    { word: "show", mandatory: false },
    { words: ["thread", "forum", "f", "ft"], mandatory: true, replacedByContext: "thread" }
  ]

  static createInstances(context) {
    if (!context.userPermissions.includes("forum.read")) return []
    let id;
    if (context.type == "thread") {
      id = context.id;
    } else {
      id = context.query.find(p => !isNaN(p) && p.length >= 1 && p.length <= 5)
    }
    if (!id) return []

    let cmd = new OpenThread()
    cmd.id = id;
    cmd.context = context;
    cmd.title = `Show forum thread ${id}`
    return [cmd]
  }

  async run() {
    goto(`/forum/thread/${this.id}`)
  }
}

export class SearchForum extends Command {
  static keywords = [
    { words: ["search", "find", "threads", "s"], mandatory: true },
    { words: ["forum", "thread", "f"], mandatory: false }
  ]

  static createInstances(context) {
    if (!context.userPermissions.includes("forum.read")) return []
    let cmd = new SearchForum()
    cmd.context = context;
    cmd.filter = cmd.getQueryWithoutKeywords().join(" ")
    cmd.title = `Search forum for: ${cmd.filter}`
    return [cmd]
  }

  async run() {
    goto(`/forum?filter=${this.filter}`)
  }
}
