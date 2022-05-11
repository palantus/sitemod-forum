const elementName = 'forums-page'

import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"
import {goto} from "/system/core.mjs"
import "/components/field-ref.mjs"
import "/components/field.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
      padding: 10px;
    }
    table thead th:nth-child(1){width: 150px}
    table thead th:nth-child(2){width: 90px}
    
    .hidden{display: none;}
  </style>  

  <action-bar>
    <action-bar-item class="hidden" id="new-btn">New forum</action-bar-item>
    <action-bar-item id="search-btn">Search</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Forums</h1>

    <table class="datalist">
        <thead>
            <tr>
              <th>Name</th>
              <th>Language</th>
              <th>Threads</th>
            </tr>
        </thead>
        <tbody id="forums">
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

    this.shadowRoot.getElementById("search-btn").addEventListener("click", () => goto("/forum"))
  }

  async refreshData(){

    let {forums} = await api.query(`{
      forums{
        id, name, language, threadCount
      }
    }`)

    this.shadowRoot.getElementById("forums").innerHTML = forums.sort((a,b) => a.name < b.name ? -1 : 1).map(f => `
      <tr>
        <td><field-ref ref="/forum/${f.id}">${f.name}</field-ref></td>
        <td>${f.language}</td>
        <td>${f.threadCount}</td>
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