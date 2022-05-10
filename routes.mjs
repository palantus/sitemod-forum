routes.push(...[
  {path: "/forum",                  page: "/pages/forum/forum.mjs"},
  {path: "/forum/log",              page: "/pages/forum/forumlog.mjs"},
  {path: "/forum/setup",            page: "/pages/forum/setup.mjs"},

  //Place regexp pages last, to ensure fast routing of those without:
  {regexp: /^\/forum\/thread\/(\d+)/,      page: "/pages/forum/forumthread.mjs"},
])