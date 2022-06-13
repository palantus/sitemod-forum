const elementName = 'forum-user-profile-component'

import api from "/system/api.mjs"
import "/components/field.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    field-list{
      width: 300px;
    }
    :host{
      margin-top: 10px;
      display: block;
    }
  </style>  

  <div id="container">
    <h2>Forum</h2>
    <field-list labels-pct="70">
      <field-edit label="E-mail me with updates" title="Will send you an email every time something happens (e.g. a new post on a subscribed thread)" type="checkbox" id="emailMeOnForumUpdates"></field-edit>
      <field-edit label="Notify me about new threads" title="Receive an e-mail notification every time a thread is posted" type="checkbox" id="notifyAllNewThreads"></field-edit>
    </field-list>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)

    this.refreshData();
  }

  async refreshData(){
    let setup = await api.get("me/setup")
    
    this.shadowRoot.getElementById("emailMeOnForumUpdates").setAttribute("value", !!setup.emailMeOnForumUpdates)
    this.shadowRoot.getElementById("notifyAllNewThreads").setAttribute("value", !!setup.notifyAllNewThreads)

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `forum/me/setup`));
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

export function showOnPage(args){
  let element = document.createElement(elementName)
  args.container.appendChild(element)
}