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
    if(typeof req.body.emailOnThreads === "boolean") u.setup.emailOnThreads = !!req.body.emailOnThreads;
    if(typeof req.body.emailOnPosts === "boolean") u.setup.emailOnPosts = !!req.body.emailOnPosts;
    res.json({success: true})
  });
};