const elementName = 'forum-log-page'

import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"
import "/components/field-ref.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
  </style>

  <action-bar>
      <action-bar-item id="refresh-btn">Refresh</action-bar-item>
  </action-bar>

  <div id="container">
    <h2>Forum log</h2>
    <table class="datalist">
      <thead>
        <tr><th>Timestamp</th><th>Text</th></tr>
      </thead>
      <tbody id="log">
      </tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.refreshData = this.refreshData.bind(this)
    this.refreshData();
    
    this.shadowRoot.querySelector("#refresh-btn").addEventListener("click", this.refreshData)
  }
  
  async refreshData(){
    let log = await api.get("forum/log")
    this.shadowRoot.getElementById("log").innerHTML = log.reverse().map(e => `<tr><td>${e.timestamp.replace("T", " ").slice(0, -4)}</td><td>${e.text}</td></tr>`).join("")
  }

  connectedCallback() {
    on("changed-project", elementName, this.refreshData)
    this.refreshData();
  }

  disconnectedCallback() {
    off("changed-project", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}