const elementName = 'thread-history-page'

import { state } from "../../system/core.mjs"
import api from "../../system/api.mjs"
import "../../components/field-ref.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import { stylesheets } from "../../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `

  <style>
    #container{
      padding: 10px;
    }
  </style>

  <div id="container">
	  <h2>
        Log for forum thread <span class="id"></span>: <span class="title"></span>
    </h2>

    <table class="datalist">
      <thead>
      <tr>
        <th>Timestamp</th>
        <th>User</th>
        <th>Message</th>
      </tr>
      </thead>
      <tbody id="historybody">
      </tbody>
    </table>

  </div>

`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
      .adoptedStyleSheets = [stylesheets.global];
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.threadId = parseInt(/\d+/.exec(state().path)[0])

    this.refreshData();
  }

  async refreshData() {
    let thread = (await api.query(`query Thread($id: Int){
        forumThread(id: $id){
            id,
            title,
            log{timestamp, user{id, name}, text}
        }
    }`, { id: this.threadId })).forumThread;

    this.shadowRoot.querySelector('.id').innerHTML = `<field-ref ref="/forum/thread/${thread.id}">${thread.id}</field-ref>`;
    this.shadowRoot.querySelector('.title').innerText = thread.title;
    this.shadowRoot.getElementById("historybody").innerHTML = thread.log.sort((a, b) => a.timestamp < b.timestamp ? 1 : -1).map(h => `
        <tr>
          <td>${h.timestamp.replace("T", " ").slice(0, -4)}</td>
          <td>${h.user ? `<field-ref ref="/setup/users/${h.user.id}">${h.user.name}</field-ref>` : "N/A"}</td>
          <td>${h.text}</td>
        </tr>`).join("")
  }

  connectedCallback() {

  }

  disconnectedCallback() {
  }

}

window.customElements.define(elementName, Element);
export { Element, elementName as name }
