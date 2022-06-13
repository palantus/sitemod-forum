import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity, { query } from "entitystorage";
import { validateAccess, noGuest } from "../../../../services/auth.mjs"
import ForumThread from "../../models/thread.mjs";
import Forum from "../../models/forum.mjs";
import ForumPost from "../../models/post.mjs";
import User from "../../../../models/user.mjs";
import { getTimestamp } from "../../../../tools/date.mjs";
import File from "../../../files/models/file.mjs"
import { sendMailsNewPosts, sendMailsNewThread, sendNotificationsNewPosts, sendNotificationsNewThread } from "../../services/notification.mjs";

export default (app) => {

  const route = Router();
  app.use("/forum", noGuest, route)

  route.get('/thread/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.read"})) return;
    let thread = ForumThread.lookup(req.params.id)
    if(!thread) throw "Unknown thread"
    let threadObj = thread.toObj()
    threadObj.posts = thread.posts.map(p => p.toObj())
    res.json(threadObj)
  });

  route.get('/log', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.admin"})) return;
    res.json(query.tag("forumupdatelogentry").all.map(e => e.props));
  });

  route.post('/:id', noGuest, function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.thread.create"})) return;
    let forum = Forum.lookup(req.params.id)
    if(!forum) throw "Unknown forum"
    if(!req.body.title || typeof req.body.title !== "string") throw "Invalid title"
    let thread = new ForumThread()
    thread.title = req.body.title
    thread.rel(res.locals.user, "owner")
    thread.subscribe(res.locals.user)
    forum.rel(thread, "thread")
    res.json(thread.toObj())
  });

  route.patch('/thread/:id', noGuest, function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.thread.edit"})) return;
    let thread = ForumThread.lookup(req.params.id)
    if(!thread) throw "Unknown thread"
    if(req.body.title) {
      if(!req.body.title || typeof req.body.title !== "string") throw "Invalid title"
      thread.title = req.body.title
    }

    if(typeof req.body.subscribe === "boolean"){
      if(req.body.subscribe) thread.subscribe(res.locals.user)
      else thread.unsubscribe(res.locals.user)
    }
    res.json({success: true})
  });

  route.post('/thread/:id/posts', noGuest, function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.post.create"})) return;
    let thread = ForumThread.lookup(req.params.id)
    if(!thread) throw "Unknown thread"
    if(!req.body.body || typeof req.body.body !== "string") throw "Invalid body"
    let post = new ForumPost()
    post.body = req.body.body
    post.rel(res.locals.user, "owner")
    post.updateHTML()
    thread.rel(post, "post")
    thread.subscribe(res.locals.user)

    let numReplies = thread.rels.post?.length || 0;
    if(numReplies == 1){
      sendNotificationsNewThread(thread)
      sendMailsNewThread(thread)
    } else if(numReplies > 1){
      sendNotificationsNewPosts(thread, post)
      sendMailsNewPosts(thread, post)
    }

    res.json(post.toObj())
  });

  route.post('/thread/:id/files', noGuest, function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.thread.attach-file"})) return;
    let thread = ForumThread.lookup(req.params.id)
    if(!thread) throw "Unknown thread"
    if(!req.body.fileId || typeof req.body.fileId !== "number") throw "No fileId"
    let file = File.lookup(req.body.fileId)
    if(!file || !file.hasAccess(res.locals.user)) throw "Invalid file or you do not have access to it"
    thread.rel(file, "file")
    res.json({success: true})
  });

  route.delete('/thread/:id/file/:fileId', noGuest, function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.thread.edit"})) return;
    let thread = ForumThread.lookup(req.params.id)
    if(!thread) throw "Unknown thread"
    if(!req.params.fileId || isNaN(req.params.fileId)) throw "No fileId"
    let file = File.lookup(req.params.fileId)
    if(!file || !file.hasAccess(res.locals.user, "w")) throw "Invalid file or you do not have access to it"
    if(thread.related.owner?.id != res.locals.user.id && !validateAccess(req, res, {permission: "forum.admin"})) throw "No access"
    file.delete();
    res.json({success: true})
  });

  route.delete("/thread/:id", noGuest, (req, res) => {
    let thread = ForumThread.lookup(req.params.id)
    if(!thread) throw "Unknown thread"
    if(thread.related.owner?._id == res.locals.user._id && !validateAccess(req, res, {permission: "forum.thread.delete"})) return;
    if(thread.related.owner?._id != res.locals.user._id && !validateAccess(req, res, {permission: "forum.admin"})) return;
    thread.delete();
    res.json({success: true})
  })

  route.delete("/post/:id", noGuest, (req, res) => {
    let post = ForumPost.lookup(req.params.id)
    if(!post) throw "Unknown post"
    if(post.related.owner?._id == res.locals.user._id && !validateAccess(req, res, {permission: "forum.post.delete"})) return;
    if(post.related.owner?._id != res.locals.user._id && !validateAccess(req, res, {permission: "forum.admin"})) return;
    post.delete();
    res.json({success: true})
  })

  route.patch("/post/:id", noGuest, (req, res) => {
    if(!req.body.body || typeof req.body.body !== "string") throw "Invalid body"
    let post = ForumPost.lookup(req.params.id)
    if(!post) throw "Unknown post"
    if(post.related.owner?._id == res.locals.user._id && !validateAccess(req, res, {permission: "forum.post.edit"})) return;
    if(post.related.owner?._id != res.locals.user._id && !validateAccess(req, res, {permission: "forum.admin"})) return;
    if(post.body != req.body.body){
      post.body = req.body.body
      post.edited = getTimestamp()
      post.updateHTML()
    }
    res.json({success: true})
  })

  route.get('/users/missing', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.admin"})) return;
    let postUsers = [...new Set(query.tag("forumpost").all.filter(p => !p.related.owner).map(p => p.authorName))].map(name => ({
      name,
      suggestedUserId: User.lookupName(name)?.id || query.tag("user").prop("forumName", name).first?.id || null
    }))
    res.json(postUsers)
  });

  route.post('/users/:id/map', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.admin"})) return;
    let user = User.lookup(req.params.id)
    if(!user) throw "Unknown user"
    if(!req.body.name || typeof req.body.name !== "string") throw "Missing name"
    for(let thread of query.type(ForumThread).tag("forumthread").prop("authorName", req.body.name).all){
      thread.rel(user, "owner")
    }
    for(let post of query.type(ForumPost).tag("forumpost").prop("authorName", req.body.name).all){
      post.rel(user, "owner")
    }
    res.json({success: true})
  });

  route.patch('/:id', noGuest, function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.admin"})) return;
    let forum = Forum.lookup(req.params.id)
    if(!forum) throw "Unknown forum"
    if(!req.body.name || typeof req.body.name !== "string") throw "Invalid name"
    forum.name = req.body.name
    res.json({success: true})
  });

};