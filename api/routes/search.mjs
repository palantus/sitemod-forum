import express from "express"
const { Router, Request, Response } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/search", route)

  route.get('/tokens/forum', function (req, res, next) {
    import("../../../forum/services/search.mjs").then(({tokens}) => res.json(tokens));
  });
};