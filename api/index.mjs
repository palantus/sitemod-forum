import setup from "./routes/setup.mjs"
import forum from "./routes/forum.mjs"
import user from "./routes/user.mjs"
import search from "./routes/search.mjs"

import forumQL from "./graphql/forum.mjs";

export default (app, fields) => {
  
  setup(app)
  forum(app)
  user(app)
  search(app)

  //GraphQL
  forumQL.registerQueries(fields)
	
  return app
}