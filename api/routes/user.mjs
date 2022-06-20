import express from "express"
const { Router, Request, Response } = express;
import service from "../../../../services/user.mjs"
import {noGuest, validateAccess} from "../../../../services/auth.mjs"

export default (app) => {

  /* Me */

  const meRoute = Router();
  app.use("/forum/me", meRoute)

  meRoute.patch('/setup', noGuest, function (req, res, next) {
    let u = service(res.locals).me()
    if (!u) throw "No user"

    if(typeof req.body.notifyForumUpdates === "boolean") u.setup.notifyForumUpdates = !!req.body.notifyForumUpdates;
    if(typeof req.body.emailMeOnForumUpdates === "boolean") u.setup.emailMeOnForumUpdates = !!req.body.emailMeOnForumUpdates;
    if(typeof req.body.notifyAllNewThreads === "boolean") u.setup.notifyAllNewThreads = !!req.body.notifyAllNewThreads;
    res.json({success: true})
  });
};