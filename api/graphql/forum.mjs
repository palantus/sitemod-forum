import searchService from "../../services/search.mjs"
import { generateChangelog } from "../../services/history.mjs"
import { PageableResultInfo, PageableSearchArgsType } from "../../../../api/graphql/common.mjs"
import Entity, { query } from "entitystorage"
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLBoolean
} from 'graphql'
import { UserType } from "../../../../api/graphql/user.mjs"
import ForumThread from "../../models/thread.mjs"
import Forum from "../../models/forum.mjs"
import { ifPermission, ifPermissionThrow } from "../../../../services/auth.mjs"
import User from "../../../../models/user.mjs"
import ForumPost from "../../models/post.mjs"
import Setup from "../../models/setup.mjs"
import { FileType } from "../../../files/api/graphql/files.mjs"

export const ForumProfileType = new GraphQLObjectType({
  name: 'ForumProfileType',
  description: 'This represents a forum user profile',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLNonNull(GraphQLString) },
    user: { type: UserType },
    threadCount: { type: GraphQLNonNull(GraphQLInt) },
    postCount: { type: GraphQLNonNull(GraphQLInt) },
    posts: { type: GraphQLList(ForumPostType) },
    threads: { type: GraphQLList(ForumThreadType) },
  })
})


export const ForumAuthorType = new GraphQLObjectType({
  name: 'ForumAuthorType',
  description: 'This represents a forum author',
  fields: () => ({
    name: { type: GraphQLNonNull(GraphQLString) },
    user: { type: UserType, resolve: (author, args, context) => (context.user.permissions.includes("user.read") || context.user.id == author.user?.id) ? author.user : null }
  })
})

export const ForumPostType = new GraphQLObjectType({
  name: 'ForumPost',
  description: 'This represents a forum post',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt) },
    body: { type: GraphQLNonNull(GraphQLString) },
    bodyHTML: { type: GraphQLString },
    date: { type: GraphQLNonNull(GraphQLString) },
    edited: { type: GraphQLString },
    author: { type: GraphQLNonNull(ForumAuthorType) },
    thread: { type: GraphQLNonNull(ForumThreadType) }
  })
})

export const ForumType = new GraphQLObjectType({
  name: 'Forum',
  description: 'This represents a forum',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLString) },
    title: { type: GraphQLNonNull(GraphQLString) },
    threadCount: { type: GraphQLNonNull(GraphQLInt), resolve: f => f.rels.thread?.length || 0 },
    url: { type: GraphQLString },
  })
})

export const ForumThreadType = new GraphQLObjectType({
  name: 'ForumThread',
  description: 'This represents a forum thread',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt) },
    date: { type: GraphQLNonNull(GraphQLString) },
    author: { type: GraphQLNonNull(ForumAuthorType) },
    title: { type: GraphQLNonNull(GraphQLString) },
    url: { type: GraphQLString },
    postCount: { type: GraphQLInt, resolve: t => t.rels.post?.length || 0 },
    fileCount: { type: GraphQLInt, resolve: t => t.rels.file?.length || 0 },
    posts: { type: GraphQLList(ForumPostType) },
    files: { type: GraphQLList(FileType) },
    isSubscribed: { type: GraphQLNonNull(GraphQLBoolean), resolve: (parent, args, context) => !!parent.rels.subscribee?.find(u => u.id == context.user.id) },
    forum: { type: GraphQLNonNull(ForumType) },
    lastActivityDate: { type: GraphQLNonNull(GraphQLString) },
    lastReply: { type: ForumPostType },
    log: { type: GraphQLList(ForumThreadLogEntryType), resolve: t => t.logEntries.map(e => e.toObj()) },
  })
})

export const ForumClientSetupType = new GraphQLObjectType({
  name: 'ForumClientSetupType',
  description: 'This represents forum client setup',
  fields: () => ({
    maxFileSizeMB: { type: GraphQLNonNull(GraphQLFloat) },
  })
})

export const ForumThreadResultType = new GraphQLObjectType({
  name: 'ForumThreadResultType',
  fields: {
    nodes: { type: GraphQLNonNull(GraphQLList(ForumThreadType)), resolve: threads => threads.nodes.map(t => ForumThread.from(t)) },
    pageInfo: { type: GraphQLNonNull(PageableResultInfo) }
  }
})

export const ForumUserSetupType = new GraphQLObjectType({
  name: 'ForumUserSetupType',
  description: 'This represents forum user setup',
  fields: () => ({
    sortThreadsByActivity: { type: GraphQLNonNull(GraphQLBoolean) },
  })
})

export const ForumThreadLogEntryType = new GraphQLObjectType({
  name: 'ForumThreadLogEntryType',
  description: 'This represents a Log entry for a forum thread',
  fields: () => ({
    timestamp: { type: GraphQLNonNull(GraphQLString) },
    user: { type: ForumThreadLogUserType },
    text: { type: GraphQLString },
  })
})

export const ForumThreadLogUserType = new GraphQLObjectType({
  name: 'ForumThreadLogUserType',
  description: 'This represents a user in a forum thread log entry',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLString) },
    name: { type: GraphQLNonNull(GraphQLString) },
  })
})

export default {
  registerQueries: (fields) => {
    fields.forumThread = {
      type: ForumThreadType,
      args: {
        id: { type: GraphQLInt }
      },
      description: "Get a specific forum thread",
      resolve: (parent, args, context) => ifPermissionThrow(context, "forum.read", ForumThread.lookup(args.id))
    }
    fields.forumThreads = {
      type: ForumThreadResultType,
      args: {
        input: { type: PageableSearchArgsType },
        forum: { type: GraphQLString }
      },
      description: "Search for forum threads",
      resolve: (parent, args, context) => {
        let userSetup = context.user.setup
        if (!args.input.sort)
          args.input.sort = userSetup.sortThreadsByActivity ? "activity" : "date"
        let result = searchService.search(args.input?.query, args.input, args.forum)
        return ifPermissionThrow(context, "forum.read", result)
      }
    }
    fields.forums = {
      type: GraphQLList(ForumType),
      description: "List forums",
      resolve: (parent, args, context) => ifPermissionThrow(context, "forum.read", Forum.all())
    }
    fields.forumClientSetup = {
      type: GraphQLNonNull(ForumClientSetupType),
      description: "Forum client setup",
      resolve: (parent, args, context) => ifPermissionThrow(context, "forum.read", {
        maxFileSizeMB: Setup.lookup().maxFileSizeMB
      })
    }
    fields.forumUserSetup = {
      type: GraphQLNonNull(ForumUserSetupType),
      description: "Forum user setup",
      resolve: (parent, args, context) => ifPermissionThrow(context, "forum.read", {
        sortThreadsByActivity: !!context.user.setup.sortThreadsByActivity
      })
    }
    fields.forumProfile = {
      type: ForumProfileType,
      description: "User forum profile",
      args: {
        name: { type: GraphQLNonNull(GraphQLString) },
        returnCount: { type: GraphQLInt },
      },
      resolve: (parent, args, context) => {
        ifPermissionThrow(context, "forum.read");
        let user = User.lookupName(args.name)
        if (!user) return null;
        let threads = ForumThread.allByAuthor(user)
        let posts = ForumPost.allByAuthor(user)
        return {
          id: user.id,
          name: user.name,
          user: ifPermission(context, "user.read", user),
          threadCount: threads.length,
          postCount: posts.length,
          threads: !isNaN(args.returnCount) ? threads.sort((a, b) => a.date < b.date ? 1 : -1).slice(0, args.returnCount)
            : threads,
          posts: !isNaN(args.returnCount) ? posts.sort((a, b) => a.date < b.date ? 1 : -1).slice(0, args.returnCount)
            : posts,
        }
      }
    }
  }
}
