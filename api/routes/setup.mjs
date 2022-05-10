import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { validateAccess } from "../../../../services/auth.mjs"
import Setup from "../../models/setup.mjs";

export default (app) => {

  app.use("/forum", route)

  route.get('/setup', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.setup" })) return;
    res.json(Setup.lookup().toObj());
  });

  route.patch('/setup', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "forum.setup" })) return;

    let setup = Setup.lookup();

    /*
    if(req.body.legacyForumURL !== undefined) setup.legacyForumURL = req.body.legacyForumURL;
    if(req.body.legacyForumUsername !== undefined) setup.legacyForumUsername = req.body.legacyForumUsername;
    if(req.body.legacyForumPassword !== undefined) setup.legacyForumPassword = req.body.legacyForumPassword;
    */

    res.json(true);
  });
};