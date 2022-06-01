const elementName = 'forums-page'

import api from "/system/api.mjs"
import {on, off} from "/system/events.mjs"
import {goto} from "/system/core.mjs"
import "/components/field-ref.mjs"
import "/components/field-edit.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/dropdown-menu.mjs"

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
              <th>Thread count</th>
              <th></th>
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

    let {forums, me} = await api.query(`{
      forums{
        id, name, language, threadCount
      },
      me{id, permissions}
    }`)

    this.shadowRoot.getElementById("forums").innerHTML = forums.sort((a,b) => a.name < b.name ? -1 : 1).map(f => `
      <tr>
        <td>
          <span class="forum-name">
            <field-ref ref="/forum/${f.id}">${f.name}</field-ref>
          </span>
          <span>
            
        </td>
        <td>${f.threadCount}</td>
        <td>
          <dropdown-menu-component class="postoptions ${me.permissions.includes("forum.admin") ? "" : "hidden"}" title="Options" width="300px">
              <span slot="label" style="font-size: 80%">&vellip;</span>
              <div slot="content">
                <h2>Options</h2>
                <div>
                  <label>Name:</label>
                  <field-edit type="text" field="name" patch="forum/${f.id}" value="${f.name}"></field-edit>
                </div>
              </div>
            </dropdown-menu-component>
          </span>
        </td>
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