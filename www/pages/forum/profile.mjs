const elementName = 'forum-profile-page'

import api from "/system/api.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"
import {state, goto} from "/system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
      padding: 10px;
    }
    field-list{
      width: 400px;
    }
    h2{margin-top: 30px;}
    button{margin-top: 7px;}
    table td{padding-right: 10px;}
  </style>  

  <div id="container">
    <h1>Forum profile</h1>

    <field-list labels-pct="30">
      <field-edit type="text" label="Name" id="name" disabled></field-edit>
      <field-edit type="number" label="Threads count" id="threadCount" disabled></field-edit>
      <field-edit type="number" label="Posts count" id="postCount" disabled></field-edit>
    </field-list>

    <h2>Last 10 threads started</h2>
    <table>
      <tbody id="lastthreads"></tbody>
    </table>
    <button class="styled" id="view-all-threads">View all</button>

    <h2>Last 10 threads participated in</h2>
    <table>
      <tbody id="lastposts"></tbody>
    </table>
    <button class="styled" id="view-all-posts">View all</button>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.userId = /\/forum\/profile\/([a-zA-Z0-9\-_@&.]+)/.exec(state().path)[1]
    this.refreshData = this.refreshData.bind(this)

    this.shadowRoot.getElementById("view-all-threads").addEventListener("click", () => goto(`/forum?filter=authoruser%3A${this.userId}`))
    this.shadowRoot.getElementById("view-all-posts").addEventListener("click", () => goto(`/forum?filter=withuser%3A${this.userId}`))
  }

  async refreshData(){
    
    let profile = (await api.query(`{forumProfile(id: "${this.userId}", returnCount: 10) {id, name, threadCount, postCount, threads{id, date, title}, posts{id, date, thread{id, title}}}}`)).forumProfile
    if(!profile){alertDialog("Could not retrive user profile"); return;}

    this.shadowRoot.getElementById("name").setAttribute("value", profile.name);
    this.shadowRoot.getElementById("threadCount").setAttribute("value", profile.threadCount);
    this.shadowRoot.getElementById("postCount").setAttribute("value", profile.postCount);

    this.shadowRoot.getElementById("lastthreads").innerHTML = profile.threads.map(t => `
        <tr>
          <td>${t.date.substring(0, 19).replace("T", ' ')}</td>
          <td><field-ref ref="/forum/thread/${t.id}">${t.id}: ${t.title}</field-ref></td>
        </tr>
      `).join("")

    this.shadowRoot.getElementById("lastposts").innerHTML = profile.posts.map(p => `
        <tr>
          <td>${p.date.substring(0, 19).replace("T", ' ')}</td>
          <td><field-ref ref="/forum/thread/${p.thread.id}">${p.thread.id}: ${p.thread.title}</field-ref></td>
        </tr>
      `).join("")
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}