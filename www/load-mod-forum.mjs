import {on} from "/system/events.mjs"

export async function load(){
  on("user-profile-page-created", "forum-load", (...args) => {
    import("/pages/forum/user-profile.mjs").then(i => {
      i.showOnPage(...args)
    })
  })
}