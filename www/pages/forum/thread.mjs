const elementName = 'forumthread-page'

import api from "/system/api.mjs"
import {on, off, fire} from "/system/events.mjs"
import {state} from "/system/core.mjs"
import {getUser} from "/system/user.mjs"
import "/components/richtext.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import { confirmDialog, alertDialog } from "../../components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        position: relative;
        padding: 10px;
    }
    h1{margin-bottom:1px;}
    div.post{
      margin-top: 10px;
      border: 1px solid gray;
      padding: 5px;
      -moz-box-shadow: 0 0 5px #888;
      -webkit-box-shadow: 0 0 5px #888;
      box-shadow: 0 0 5px #888;
      border-radius: 3px;
      background: rgb(250, 250, 250);
      position: relative;
    }

    div.postauthor {
      display: inline-block;
      margin-right: 10px;
    }

    div.postdate {
      display: inline-block;
      position: absolute;
      right: 10px;
      font-size: 80%;
      color: gray;
    }

    div.posttitle {
      display: inline-block;
      margin-right: 10px;
    }

    div.postbody {
      border-top: 1px solid gray;
      padding-top: 10px;
    }

    #threadinfo table td{padding-left: 0px;}
    #threadinfo table td:first-child{width: 60px;}
    #openthread{margin-top: 5px;}
    #wiki-btn{background-color: #faa}
    #wiki-btn.haswiki{background-color: #afa}
    .hidden{display: none;}

    .postbody.rendered table{border-collapse: collapse;}
    .postbody.rendered table th{text-align: left; border-bottom: 1px solid black;}
    .postbody.rendered table th, #rendered table td{padding-right: 5px;}
    .postbody.rendered table td{border-left: 1px solid gray; padding: 5px;}
    .postbody.rendered table tbody tr{vertical-align: top; border-bottom: 1px solid gray; border-right: 1px solid gray;}
    .postbody.rendered>p{margin: 0px;}
  </style>  

  <action-bar class="hidden">
    <action-bar-item id="delete" title="Only possible for owner of thread and admins">Delete thread</action-bar-item>
  </action-bar>

  <div id="container">
    <h1 id="title"></h1>
    <div id="threadinfo"></div>
    <div id="posts"></div>
    <br>
    <button id="reply" class="styled">Post a new reply</button>
    <richtext-component id="reply-editor" class="hidden" nosave submit></richtext-component>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.replyClicked = this.replyClicked.bind(this)
    this.postReply = this.postReply.bind(this)
    this.toggleReplyEditor = this.toggleReplyEditor.bind(this)
    this.refreshData = this.refreshData.bind(this)
    this.deleteClicked = this.deleteClicked.bind(this)

    this.shadowRoot.getElementById("reply").addEventListener("click", this.replyClicked)
    this.shadowRoot.getElementById("reply-editor").addEventListener("close", () => this.toggleReplyEditor(false))
    this.shadowRoot.getElementById("reply-editor").addEventListener("submit", ({detail: {text}}) => this.postReply(text))
    this.shadowRoot.getElementById("delete").addEventListener("click", this.deleteClicked)

    this.threadId = this.getAttribute("threadid") || parseInt(/\d+/.exec(state().path)?.[0]);
    
    fire("forum-thread-page-created", {
      page: this,
      container: this.shadowRoot.getElementById("container"), 
      threadId: this.threadId
    })
  }

  connectedCallback() {
    this.shadowRoot.getElementById("threadinfo").style.display = "none";
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }

  async refreshData(){
    if(!this.threadId) return;

    let threadId = this.threadId;

    let {forumThread: thread} = await api.query(`{
      forumThread(id: ${threadId}){
        id, title, author{name, user{id}}, date
        posts{author{name, user{id}}, date, body, bodyHTML},
      }
    }`)

    if(!thread){
      alertDialog("Thread doesn't exist")
      return;
    }

    this.thread = thread;
    this.shadowRoot.getElementById("posts").innerHTML = thread.posts.sort((a, b) => a.date < b.date ? -1 : 1)
                                                                    .map(p => `
                  <div class="post">
                    <div class="postauthor">${p.author.user?.id ? `<field-ref ref="/setup/users/${p.author.user.id}">${p.author.name}</field-ref>` : p.author.name}</div>
                    <div class="postdate">${p.date.replaceAll("T", " ").substring(0, 19)}</div>
                    <div class="postbody${p.bodyHTML?" rendered":""}">${p.bodyHTML ? p.bodyHTML : p.body.trim().replace(/(\r\n|\n|\r)/gm, "<br/>")}</div>
                  </div>`).join("")

    this.shadowRoot.getElementById("title").innerText = thread.title

    let threadInfoContainer = this.shadowRoot.getElementById("threadinfo")
    threadInfoContainer.style.display = "block";

    threadInfoContainer.innerHTML = `
      <table>
        <tr><td>Id:</td><td id="threadid"><field-ref ref="/forum/thread/${thread.id}"/>${thread.id}</field-ref></td></tr>
        <tr><td>Author:</td><td id="threadauthor">${thread.author.user?.id ? `<field-ref ref="/setup/users/${thread.author.user.id}">${thread.author.name}</field-ref>` : thread.author.name}</td></tr>
        <tr><td>Date:</td><td id="threaddate">${thread.date.replaceAll("T", " ")}</td></tr>
      </table>
    `

    getUser().then(user => {
      this.shadowRoot.getElementById("delete").classList.toggle("hidden", user.id != thread.author.user?.id && !user.permissions.includes("forum.admin"))

      //Hide actionbar if there aren't any buttons visible
      this.shadowRoot.querySelector("action-bar").classList.toggle("hidden", !!!this.shadowRoot.querySelector("action-bar action-bar-item:not(.hidden)"))
    })
  }

  replyClicked(){
    if(!this.threadId) return;
    this.shadowRoot.getElementById("reply-editor").value("")
    this.toggleReplyEditor(true)
  }

  postReply(body){
    if(!this.threadId) return;
    this.toggleReplyEditor(false)
    if(body){
      api.post(`forum/thread/${this.threadId}/posts`, {body}).then(this.refreshData)
    }
  }

  toggleReplyEditor(visible){
    this.shadowRoot.getElementById("reply").classList.toggle("hidden", visible)
    this.shadowRoot.getElementById("reply-editor").classList.toggle("hidden", !visible)
  }

  async deleteClicked(){
    if(!this.threadId) return;
    if(!(await confirmDialog("Are you sure that you want to delete this thread?"))) return;
    await api.del(`forum/thread/${this.threadId}`)
    window.history.back();
  }
  
  static get observedAttributes() {
    return ["threadid"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "threadid":
        if(newValue) {
          this.threadId = parseInt(newValue);
          this.refreshData();
          this.dispatchEvent(new CustomEvent("changed-thread", {detail: {id: this.threadId, component: this}, bubbles: true, cancelable: false}));
        }
      break;
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}