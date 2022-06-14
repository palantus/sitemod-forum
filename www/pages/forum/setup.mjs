const elementName = 'forum-setup-page'

import api from "/system/api.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"
import {goto} from "/system/core.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    div.group:not(:first-child){
      margin-top: 10px;
    }
    .group input{
      width: 350px;
    }
    field-list{
      width: 250px;
    }
  </style>  

  <action-bar>
    <action-bar-item id="map-users-btn">Map users</action-bar-item>
  </action-bar>

  <div id="container">

    <h1>Forum setup</h1>
    <field-list labels-pct="60">
      <field-edit type="number" label="Max file size (MB)" id="maxFileSizeMB" title="Note that this limit is only enforced on the client, as the files mod should determine max upload size for a given user. As long as you can upload it to files, you can technically attach it to a thread."></field-edit>
    </field-list>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this); //Make sure "this" in that method refers to this
    
    this.shadowRoot.getElementById("map-users-btn").addEventListener("click", () => goto("/forum/missing-users"))
  }

  async refreshData(){

    let setup = await api.get("forum/setup")

    this.shadowRoot.getElementById("maxFileSizeMB").setAttribute("value", setup.maxFileSizeMB||0)

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `forum/setup`));
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