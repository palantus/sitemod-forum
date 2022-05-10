import setup from "./routes/setup.mjs"
import forum from "./routes/forum.mjs"

import forumQL from "./graphql/forum.mjs";

export default (app, fields) => {
  
  setup(app)
  forum(app)

  //GraphQL
  forumQL.registerQueries(fields)
	
  return app
}