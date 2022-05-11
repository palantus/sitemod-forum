const elementName = 'forumthread-page'

import api from "/system/api.mjs"
import {on, off, fire} from "/system/events.mjs"
import {state} from "/system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        position: relative;
        padding: 5px;
    }
    div.post{
      margin-top: 10px;
      border: 1px solid gray;
      padding: 5px;
      -moz-box-shadow: 0 0 5px #888;
      -webkit-box-shadow: 0 0 5px #888;
      box-shadow: 0 0 5px #888;
      border-radius: 3px;
      background: rgb(250, 250, 250);
    }

    div.postauthor {
      display: inline-block;
      margin-right: 10px;
    }

    div.postdate {
      display: inline-block;
      margin-right: 10px;
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
  </style>  

  <div id="container">
    <div id="threadinfo"></div>
    <div id="posts"></div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.threadId = this.getAttribute("threadid") || parseInt(/\d+/.exec(state().path)?.[0]);

    fire("forum-thread-page-created", {
      page: this,
      container: this.shadowRoot.getElementById("container"), 
      threadId: this.threadId
    })
  }

  connectedCallback() {
    this.refreshData();

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
        id, title, author{name}, date
        posts{author{name}, date, subject, body},
      }
    }`)

    this.thread = thread;
    this.shadowRoot.getElementById("posts").innerHTML = thread.posts.sort((a, b) => a.date < b.date ? -1 : 1)
                                                                    .map(p => `
                  <div class="post">
                    <div class="postauthor">${p.author.name}</div>
                    <div class="postdate">${p.date.replaceAll("T", " ")}</div>
                    <div class="posttitle">${p.subject}</div>
                    <div class="postbody">${p.body.trim().replace(/(\r\n|\n|\r)/gm, "<br/>")}</div>
                  </div>`).join("")

    let threadInfoContainer = this.shadowRoot.getElementById("threadinfo")
    threadInfoContainer.style.display = "block";

    threadInfoContainer.innerHTML = `
      <table>
        <tr><td>Id:</td><td id="threadid"><field-ref ref="/forum/thread/${thread.id}"/>${thread.id}</field-ref></td></tr>
        <tr><td>Title:</td><td id="threadtitle">${thread.title}</td></tr>
        <tr><td>Author:</td><td id="threadauthor">${thread.author.name}</td></tr>
        <tr><td>Date:</td><td id="threaddate">${thread.date.replaceAll("T", " ")}</td></tr>
      </table>
    `
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