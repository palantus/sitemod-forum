import CoreSetup from "../../../models/setup.mjs"
import LogEntry from "../../../models/logentry.mjs"
import MailSender from "../../mail/services/mailsender.mjs"
import { query } from "entitystorage";
import User from "../../../models/user.mjs";

export async function sendMailsNewThread(thread){

  for(let user of query.tag("user").relatedTo(query.prop("emailMeOnForumUpdates", true)).relatedTo(query.prop("notifyAllNewThreads", true)).all){
    if(!user.email) continue;
    if(user.id == thread.related.owner?.id) continue; // No need to notify author
    try{
      await new MailSender().send({
        to: user.email, 
        subject: `${CoreSetup.lookup().siteTitle}: New thread on forum`, 
        body: `
          <div>
            <h3>Hello ${user.name}</h3>
            <p>A new thread has been posted in the forums by ${thread.author.name}:</p>
            <a href="${global.sitecore.siteURL}/forum/thread/${thread.id}">${thread.title}</a>
          </div>
        `,
        bodyType: "html"
      })
    } catch(err){
      new LogEntry(`Could not send email to ${user.email}. Error: ${err}`, "forum")
    }
  }
}

export async function sendNotificationsNewThread(thread){
  for(let user of query.type(User).tag("user").relatedTo(query.prop("notifyAllNewThreads", true)).all){
    if(user.id == thread.related.owner?.id) continue; // No need to notify author
    user.notify("wiki", thread.title, {title: "New thread on forums", refs: [{uiPath: `/forum/thread/${thread.id}`, title: "Go to thread"}]})
  }
}