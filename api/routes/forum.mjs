import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity, { query } from "entitystorage";
import { validateAccess, noGuest, permission, lookupType } from "../../../../services/auth.mjs"
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

  route.get("/tools/generate-new-id", (req, res, next) => {
    let originalNewId = Forum.createId(req.query.id)
    if (!originalNewId) throw "Id not provided"
    let newId = originalNewId
    let i = 1;
    while (Forum.lookup(newId)) {
      newId = `${originalNewId}-${++i}`
    }
    res.json(newId)
  })

  route.get('/thread/:id/exists', function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.read" })) return;
    res.json(!!ForumThread.lookup(req.params.id))
  });

  route.get('/thread/:id', function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.read" })) return;
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) throw "Unknown thread"
    let threadObj = thread.toObj()
    threadObj.posts = thread.posts.map(p => p.toObj())
    res.json(threadObj)
  });

  route.get('/log', function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.admin" })) return;
    res.json(query.tag("forumupdatelogentry").all.map(e => e.props));
  });

  route.post('/forum/:id/threads', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.thread.create" })) return;
    let forum = Forum.lookup(req.params.id)
    if (!forum) throw "Unknown forum"
    if (!req.body.title || typeof req.body.title !== "string") throw "Invalid title"
    let thread = new ForumThread()
    thread.authorName = res.locals.user.name; //Used when a user is deleted!
    thread.title = req.body.title.substring(0, 200);
    thread.rel(res.locals.user, "owner")
    thread.subscribe(res.locals.user)
    forum.rel(thread, "thread")
    res.json(thread.toObj())
  });

  route.patch('/thread/:id', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.thread.edit" })) return;
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) throw "Unknown thread"
    if (req.body.title) {
      if (!req.body.title || typeof req.body.title !== "string") throw "Invalid title"
      thread.title = req.body.title.substring(0, 200)
    }

    if (req.body.forumId && typeof req.body.forumId === "string") {
      if (!validateAccess(req, res, { permission: "forum.admin" })) return;
      let forum = Forum.lookup(req.body.forumId);
      if (!forum) throw "Invalid destination forum";
      if (forum._id == thread.forum._id) throw "The thread is already in this forum"
      thread.forum.removeRel(thread, "thread")
      forum.rel(thread, "thread")
    }
    res.json({ success: true })
  });

  route.post('/thread/:id/subscribe', noGuest, permission("forum.read"), function(req, res, next) {
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) return res.sendStatus(404);
    thread.subscribe(res.locals.user)
    res.json({ success: true })
  });

  route.post('/thread/:id/unsubscribe', noGuest, permission("forum.read"), function(req, res, next) {
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) return res.sendStatus(404);
    thread.unsubscribe(res.locals.user)
    res.json({ success: true })
  });

  route.post('/thread/:id/posts', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.post.create" })) return;
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) throw "Unknown thread"
    if (!req.body.body || typeof req.body.body !== "string") throw "Invalid body"
    let post = new ForumPost()
    post.authorName = res.locals.user.name; //Used when a user is deleted!
    post.body = req.body.body
    post.rel(res.locals.user, "owner")
    post.updateHTML()
    thread.rel(post, "post")
    thread.subscribe(res.locals.user)

    let numReplies = thread.rels.post?.length || 0;
    if (numReplies == 1) {
      sendNotificationsNewThread(thread)
      sendMailsNewThread(thread)
    } else if (numReplies > 1) {
      sendNotificationsNewPosts(thread, post)
      sendMailsNewPosts(thread, post)
    }

    res.json(post.toObj())
  });


  route.get('/thread/:id/posts', noGuest, function(req, res) {
    if (!validateAccess(req, res, { permission: "forum.post.create" })) return;
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) throw "Unknown thread"
    res.json(thread.posts.map(p => p.toObj()))
  });

  route.post('/thread/:id/files', noGuest, function(req, res) {
    if (!validateAccess(req, res, { permission: "forum.thread.attach-file" })) return;
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) throw "Unknown thread"
    if (!req.body.fileId || typeof req.body.fileId !== "number") throw "No fileId"
    let file = File.lookup(req.body.fileId)
    if (!file || !file.hasAccess(res.locals.user)) throw "Invalid file or you do not have access to it"
    thread.attachFile(file)
    res.json({ success: true })
  });


  route.post('/thread/:id/log', permission("forum.admin"), lookupType(ForumThread, "thread"), (req, res) => {
    if (!req.body.message || typeof req.body.message !== "string") throw "Invalid message"
    res.locals.thread.log(req.body.message, res.locals.user)
    res.json({ success: true })
  });

  route.get('/thread/:id/log', permission("forum.admin"), lookupType(ForumThread, "thread"), (_, res) => {
    res.json(res.locals.thread.logEntries.map(l => l.toObj()))
  });

  route.delete('/thread/:id/file/:fileId', noGuest, function(req, res) {
    if (!validateAccess(req, res, { permission: "forum.thread.edit" })) return;
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) throw "Unknown thread"
    if (!req.params.fileId || isNaN(req.params.fileId)) throw "No fileId"
    let file = File.lookup(req.params.fileId)
    if (!file || !file.hasAccess(res.locals.user, "w")) throw "Invalid file or you do not have access to it"
    if (thread.related.owner?.id != res.locals.user.id && !validateAccess(req, res, { permission: "forum.admin" })) throw "No access"
    file.delete();
    res.json({ success: true })
  });

  route.delete("/thread/:id", noGuest, (req, res) => {
    let thread = ForumThread.lookup(req.params.id)
    if (!thread) throw "Unknown thread"
    if (thread.related.owner?._id == res.locals.user._id && !validateAccess(req, res, { permission: "forum.thread.delete" })) return;
    if (thread.related.owner?._id != res.locals.user._id && !validateAccess(req, res, { permission: "forum.admin" })) return;
    thread.delete();
    res.json({ success: true })
  })

  route.delete("/post/:id", noGuest, (req, res) => {
    let post = ForumPost.lookup(req.params.id)
    if (!post) throw "Unknown post"
    if (post.related.owner?._id == res.locals.user._id && !validateAccess(req, res, { permission: "forum.post.delete" })) return;
    if (post.related.owner?._id != res.locals.user._id && !validateAccess(req, res, { permission: "forum.admin" })) return;
    post.delete();
    res.json({ success: true })
  })

  route.patch("/post/:id", noGuest, (req, res) => {
    if (!req.body.body || typeof req.body.body !== "string") throw "Invalid body"
    let post = ForumPost.lookup(req.params.id)
    if (!post) throw "Unknown post"
    if (post.related.owner?._id == res.locals.user._id && !validateAccess(req, res, { permission: "forum.post.edit" })) return;
    if (post.related.owner?._id != res.locals.user._id && !validateAccess(req, res, { permission: "forum.admin" })) return;
    if (post.body != req.body.body) {
      post.body = req.body.body
      post.edited = getTimestamp()
      post.updateHTML()
    }
    res.json({ success: true })
  })

  route.get('/users/missing', function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.admin" })) return;
    let postUsers = [...new Set(query.tag("forumpost").all.filter(p => !p.related.owner).map(p => p.authorName || `ERROR: Unnamed user on post ${p.id}`))].map(name => ({
      name,
      suggestedUserId: User.lookupName(name)?.id || null
    }))
    res.json(postUsers)
  });

  route.post('/users/:id/map', function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.admin" })) return;
    let user = User.lookup(req.params.id)
    if (!user) throw "Unknown user"
    if (!req.body.name || typeof req.body.name !== "string") throw "Missing name"
    for (let thread of query.type(ForumThread).tag("forumthread").prop("authorName", req.body.name).all) {
      thread.rel(user, "owner")
    }
    for (let post of query.type(ForumPost).tag("forumpost").prop("authorName", req.body.name).all) {
      post.rel(user, "owner")
    }
    res.json({ success: true })
  });

  route.patch('/forum/:id', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.admin" })) return;
    let forum = Forum.lookup(req.params.id)
    if (!forum) throw "Unknown forum"
    if (req.body.title && typeof req.body.title === "string") {
      forum.title = req.body.title
    }
    if (req.body.url && typeof req.body.url === "string") {
      forum.url = req.body.url
    }
    res.json({ success: true })
  });

  route.post('/forum', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.admin" })) return;
    let id = req.body.id
    if (!id || typeof id !== "string") throw "invalid id";
    if (!req.body.title || typeof req.body.title !== "string") throw "invalid title";
    let forum = Forum.lookup(id)
    if (forum) throw "Forum already exists"
    forum = new Forum(id, req.body.title)
    res.json(forum.toObj())
  });

  route.get('/forum/:id', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.read" })) return;
    if (!req.params.id || typeof req.params.id !== "string") throw "invalid id";
    let forum = Forum.lookup(req.params.id)
    if (!forum) return res.sendStatus(404);
    res.json(forum.toObj())
  });

  route.delete('/forum/:id', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.admin" })) return;
    if (!req.params.id || typeof req.params.id !== "string") throw "invalid id";
    let forum = Forum.lookup(req.params.id)
    if (!forum) return res.sendStatus(404);
    if (forum.related.thread) throw "You cannot delete forums with threads in them"
    forum.delete()
    res.json({ success: true })
  });

  route.get('/forum/:id/exists', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.read" })) return;
    if (!req.params.id || typeof req.params.id !== "string") throw "invalid id";
    res.json(!!Forum.lookup(req.params.id))
  });

  route.get('/forum', noGuest, function(req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.read" })) return;
    res.json(Forum.all().map(f => f.toObj()))
  });
};
