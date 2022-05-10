import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import Entity, { query } from "entitystorage";
import { validateAccess, noGuest } from "../../../../services/auth.mjs"
import ForumThread from "../../models/thread.mjs";

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
    if(!validateAccess(req, res, {permission: "forum.read"})) return;
    res.json(query.tag("forumupdatelogentry").all.map(e => e.props));
  });
};