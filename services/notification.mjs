import CoreSetup from "../../../models/setup.mjs"
import { query } from "entitystorage";
import User from "../../../models/user.mjs";

async function getMail(){
  try{
    return (await import("../../mail/models/mail.mjs")).default
  } catch(err){
    return null;
  }
}

export async function sendMailsNewThread(thread){
  let Mail = await getMail()
  if(!Mail) return;
  for(let user of query.type(User).tag("user").relatedTo(query.prop("emailMeOnForumUpdates", true)).relatedTo(query.prop("notifyAllNewThreads", true)).all){
    if(!user.email) continue;
    if(!user.active) continue;
    if(!user.permissions.includes("forum.read")) continue;
    if(user.id == thread.related.owner?.id) continue; // No need to notify author
    await new Mail({
      to: user.email, 
      subject: `${CoreSetup.lookup().siteTitle}: New thread on forums`, 
      body: `
        <div>
          <h3>Hello ${user.name}</h3>
          <p>A new thread has been posted in the forums by ${thread.author.name}:</p>
          <a href="${global.sitecore.siteURL}/forum/thread/${thread.id}">${thread.title}</a>
        </div>
      `,
      bodyType: "html"
    }).send()
  }
}

export async function sendNotificationsNewThread(thread){
  for(let user of query.type(User).tag("user").relatedTo(query.prop("notifyAllNewThreads", true)).all){
    if(!user.active) continue;
    if(!user.permissions.includes("forum.read")) continue;
    if(user.id == thread.related.owner?.id) continue; // No need to notify author
    thread.rel(user.notify("forum", thread.title, {title: "New thread on forums", refs: [{uiPath: `/forum/thread/${thread.id}`, title: "Go to thread"}]}), "notification")
  }
}

export async function sendMailsNewPosts(thread, post){
  let Mail = await getMail()
  if(!Mail) return;
  for(let user of query.type(User).tag("user").relatedTo(query.prop("emailMeOnForumUpdates", true)).all){
    if(!user.email) continue;
    if(!user.active) continue;
    if(!user.permissions.includes("forum.read")) continue;
    if(user.id == post.related.owner?.id) continue; // No need to notify author
    if(user.setup.notifyForumUpdates === false) continue;
    if(!thread.rels.subscribee?.find(u => u.id == user.id) && !thread.participants.find(p => p.name == user.name)) continue; // Not subscribed to thread and not participated in it
    if(!user.permissions.includes("forum.read")) continue; //No need to notify someone who can't read it
    await new Mail({
      to: user.email, 
      subject: `${CoreSetup.lookup().siteTitle}: New reply on forums`, 
      body: `
        <div>
          <h3>Hello ${user.name}</h3>
          <div>
            <p>A new reply by ${post.author.name} has been posted to the following thread:</p>
            <a href="${global.sitecore.siteURL}/forum/thread/${thread.id}">${thread.title}</a>
          </div>
          <br>
          <hr>
          <p style="font-size: 10pt;">If you do not want to receive these types of emails, you can unsubscribe <a href="${global.sitecore.siteURL}/profile">here</a></p>
        </div>
      `,
      bodyType: "html"
    }).send()
  }
}

export async function sendNotificationsNewPosts(thread, post){
  for(let user of query.type(User).tag("user").all){
    if(user.id == post.related.owner?.id) continue; // No need to notify author
    if(user.setup.notifyForumUpdates === false) continue;
    if(!thread.rels.subscribee?.find(u => u.id == user.id) && !thread.participants.find(p => p.name == user.name)) continue; // Not subscribed to thread and not participated in it
    if(!user.permissions.includes("forum.read")) continue; //No need to notify someone who can't read it
    post.rel(user.notify("forum", thread.title, {title: `${post.author.name} has replied on a forum thread`, refs: [{uiPath: `/forum/thread/${thread.id}`, title: "Go to thread"}]}), "notification")
  }
}