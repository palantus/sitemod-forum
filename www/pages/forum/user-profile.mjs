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
    <field-list labels-pct="50">
      <field-edit label="E-mail on new threads" title="Receive an e-mail notification every time a thread is posted" type="checkbox" id="emailOnThreads"></field-edit>
      <field-edit label="E-mail on replies" title="Receive an e-mail notification every time a reply is posted to a thread that you have authored or participated in" type="checkbox" id="emailOnPosts"></field-edit>
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
    
    this.shadowRoot.getElementById("emailOnThreads").setAttribute("value", !!setup.emailOnThreads)
    this.shadowRoot.getElementById("emailOnPosts").setAttribute("value", !!setup.emailOnPosts)

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