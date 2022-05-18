import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity, { query } from "entitystorage";
import { validateAccess, noGuest } from "../../../../services/auth.mjs"
import ForumThread from "../../models/thread.mjs";
import Forum from "../../models/forum.mjs";
import ForumPost from "../../models/post.mjs";
import User from "../../../../models/user.mjs";

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
    thread.author = res.locals.user.name
    thread.rel(res.locals.user, "owner")
    forum.rel(thread, "thread")
    res.json(thread.toObj())
  });

  route.post('/thread/:id/posts', noGuest, function (req, res, next) {
    if(!validateAccess(req, res, {permission: "forum.post.create"})) return;
    let thread = ForumThread.lookup(req.params.id)
    if(!thread) throw "Unknown thread"
    if(!req.body.body || typeof req.body.body !== "string") throw "Invalid body"
    let post = new ForumPost()
    post.body = req.body.body
    post.author = res.locals.user.name
    post.rel(res.locals.user, "owner")
    post.updateHTML()
    thread.rel(post, "post")
    res.json(post.toObj())
  });

  route.delete("/thread/:id", noGuest, (req, res) => {
    let thread = ForumThread.lookup(req.params.id)
    if(!thread) throw "Unknown thread"
    if(thread.related.owner?._id != res.locals.user._id && !validateAccess(req, res, {permission: "forum.admin"})) throw "You do not have access to do this";
    thread.delete();
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
};