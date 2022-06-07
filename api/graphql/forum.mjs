import forumService from "../../services/forum.mjs"
import {PageableResultInfo, PageableSearchArgsType} from "../../../../api/graphql/common.mjs"
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
import {UserType} from "../../../../api/graphql/user.mjs"
import ForumThread from "../../models/thread.mjs"
import Forum from "../../models/forum.mjs"
import {ifPermissionThrow} from "../../../../services/auth.mjs"

export const ForumAuthorType = new GraphQLObjectType({
  name: 'ForumAuthorType',
  description: 'This represents a forum author',
  fields: () => ({
    name: { type: GraphQLNonNull(GraphQLString) },
    user: { type: UserType }
  })
})

export const ForumFileType = new GraphQLObjectType({
  name: 'ForumFileType',
  description: 'This represents a forum file',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt), resolve: t => t._id },
    name: { type: GraphQLNonNull(GraphQLString) }
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
    edited: { type: GraphQLString},
    author: { type: GraphQLNonNull(ForumAuthorType) }
  })
})

export let forumThreadFields = {
  id: { type: GraphQLNonNull(GraphQLInt) },
  date: { type: GraphQLNonNull(GraphQLString) },
  author: { type: GraphQLNonNull(ForumAuthorType)},
  title: { type: GraphQLNonNull(GraphQLString) },
  url: { type: GraphQLString },
  postCount: {type: GraphQLInt, resolve: t => t.relsrev?.thread?.length || 0},
  posts: {type: GraphQLList(ForumPostType)},
  files: {type: GraphQLList(ForumFileType)}
}

export const ForumThreadType = new GraphQLObjectType({
  name: 'ForumThread',
  description: 'This represents a forum thread',
  fields: () => forumThreadFields
})

export const ForumType = new GraphQLObjectType({
  name: 'Forum',
  description: 'This represents a forum post',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLString)},
    name: { type: GraphQLNonNull(GraphQLString) },
    language: { type: GraphQLNonNull(GraphQLString) },
    threadCount: { type: GraphQLNonNull(GraphQLInt), resolve: f => f.rels.thread?.length||0 }
  })
})

export const ForumThreadResultType = new GraphQLObjectType({
  name: 'ForumThreadResultType',
  fields: {
      nodes: { type: GraphQLNonNull(GraphQLList(ForumThreadType)), resolve: threads => threads.nodes.map(t => ForumThread.from(t))},
      pageInfo: {type: GraphQLNonNull(PageableResultInfo)}
  }
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
              forum: { type: GraphQLString}
          },
          description: "Search for forum threads",
          resolve: (parent, args, context) => ifPermissionThrow(context, "forum.read", forumService.search(args.input?.query, args.input, args.forum))
      }
      fields.forums = {
          type: GraphQLList(ForumType),
          description: "List forums",
          resolve: (parent, args, context) => ifPermissionThrow(context, "forum.read", Forum.all())
      }
  }
}