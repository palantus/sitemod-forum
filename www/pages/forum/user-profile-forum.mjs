const elementName = 'forum-user-profile-component'

import api from "../../system/api.mjs"
import "../../components/field.mjs"
import "../../components/field-edit.mjs"
import "../../components/field-list.mjs"
import {on, off} from "../../system/events.mjs"
import {mods} from "../../system/core.mjs"

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
    .hidden{display: none;}
  </style>  

  <div id="container">
    <h2>Forum</h2>
    <field-list labels-pct="70">
      <field-edit label="Notify with updates" title="Will send you a notification every time something happens on a subscribed thread" type="checkbox" id="notifyForumUpdates"></field-edit>
      <field-edit label="Notify with new threads" title="Receive a notification every time a new thread is posted" type="checkbox" id="notifyAllNewThreads"></field-edit>
      <field-edit label="E-mail notifications" title="Will send you an email every time you get a forum notification according to above settings" type="checkbox" id="emailMeOnForumUpdates"></field-edit>
    </field-list>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)

    this.shadowRoot.getElementById("emailMeOnForumUpdates").classList.toggle("hidden", !!!mods().find(m => m.id == "mail"))

    this.refreshData();
  }

  async refreshData(){
    let setup = await api.get("me/setup")
    
    this.shadowRoot.getElementById("notifyForumUpdates").setAttribute("value", setup.notifyForumUpdates !== false)
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