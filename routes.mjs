routes.push(...[
  {path: "/forums",                 page: "/pages/forum/forums.mjs"},
  {path: "/forum",                  page: "/pages/forum/forum.mjs"},
  {path: "/forum/search",           page: "/pages/forum/forum.mjs"},
  {path: "/forum/setup",            page: "/pages/forum/setup.mjs"},
  {path: "/forum/missing-users",    page: "/pages/forum/missing-users.mjs"},

  //Place regexp pages last, to ensure fast routing of those without:
  {regexp: /^\/forum\/thread\/(\d+)/,     page: "/pages/forum/thread.mjs"},
  {regexp: /^\/forum\/([a-z0-9\-]+)/,  page: "/pages/forum/forum.mjs"},
])