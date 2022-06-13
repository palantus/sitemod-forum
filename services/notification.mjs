import CoreSetup from "../../../models/setup.mjs"
import LogEntry from "../../../models/logentry.mjs"
import MailSender from "../../mail/services/mailsender.mjs"
import { query } from "entitystorage";
import User from "../../../models/user.mjs";

export async function sendMailsThread(thread){

  for(let user of query.tag("user").relatedTo(query.prop("emailOnThreads", true)).all){
    if(!user.email) continue;
    try{
      await new MailSender().send({
        to: user.email, 
        subject: `${CoreSetup.lookup().siteTitle}: New thread on forum`, 
        body: `
          <div>
            <h3>Hello ${user.name}</h3>
            <p>A new thread has been posted in the forums:</p>
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

export async function sendNotificationsThread(thread){
  for(let user of query.type(User).tag("user").all){
    user.notify("wiki", thread.title, {title: "New thread on forums", refs: [{uiPath: `/forum/thread/${thread.id}`, title: "Go to thread"}]})
  }
}