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
import ForumThread from "../../models/thread.mjs"
import {ifPermissionThrow} from "../../../../services/auth.mjs"

export const ForumAuthorType = new GraphQLObjectType({
  name: 'ForumAuthorType',
  description: 'This represents a forum author',
  fields: () => ({
    name: { type: GraphQLNonNull(GraphQLString) }
  })
})

export const ForumPostType = new GraphQLObjectType({
  name: 'ForumPost',
  description: 'This represents a forum post',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLInt) },
    body: { type: GraphQLNonNull(GraphQLString) },
    subject: { type: GraphQLNonNull(GraphQLString) },
    date: { type: GraphQLNonNull(GraphQLString) },
    author: { type: GraphQLNonNull(ForumAuthorType), resolve: p => ({name: p.author})  }
  })
})

export let forumThreadFields = {
  id: { type: GraphQLNonNull(GraphQLInt) },
  date: { type: GraphQLNonNull(GraphQLString) },
  author: { type: GraphQLNonNull(ForumAuthorType), resolve: t => ({name: t.author}) },
  title: { type: GraphQLNonNull(GraphQLString) },
  url: { type: GraphQLNonNull(GraphQLString) },
  postCount: {type: GraphQLInt, resolve: t => t.relsrev?.thread?.length || 0},
  posts: {type: GraphQLList(ForumPostType), resolve: t => t.posts},
}

export const ForumThreadType = new GraphQLObjectType({
  name: 'ForumThread',
  description: 'This represents a forum thread',
  fields: () => forumThreadFields
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
              input: { type: PageableSearchArgsType }
          },
          description: "Search for forum threads",
          resolve: (parent, args, context) => ifPermissionThrow(context, "forum.read", forumService.search(args.input.query, args.input))
      }
  }
}