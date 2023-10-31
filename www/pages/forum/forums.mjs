const elementName = 'forums-page'

import api from "../../system/api.mjs"
import {on, off} from "../../system/events.mjs"
import {goto, stylesheets} from "../../system/core.mjs"
import "../../components/field-ref.mjs"
import "../../components/field-edit.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import "../../components/dropdown-menu.mjs"
import {showDialog, confirmDialog} from "../../components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
      padding: 10px;
    }
    table thead th:nth-child(1){width: 200px}
    table thead th:nth-child(2){width: 90px}

    table{
      width: 100%;
    }
    table thead tr{
      border-bottom: 1px solid var(--contrast-color-muted);
    }
    table tbody td{padding-top: 5px;padding-bottom:5px;}
    
    .hidden{display: none;}
    .forum-action-buttons{margin-top: 10px;}
  </style>  

  <action-bar>
    <action-bar-item class="hidden" id="new-btn">New forum</action-bar-item>
    <action-bar-item id="search-btn">Search</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Forums</h1>

    <table>
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

  <dialog-component title="New forum" id="new-dialog">
    <field-component label="Title"><input id="new-title"></input></field-component>
    <field-component label="Id"><input id="new-id"></input></field-component>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global, stylesheets.searchresults];
    this.shadowRoot.appendChild(template.content.cloneNode(true));
   
    this.refreshData = this.refreshData.bind(this)
    this.newForum = this.newForum.bind(this)
    this.forumClick = this.forumClick.bind(this)

    this.shadowRoot.getElementById("search-btn").addEventListener("click", () => goto("/forum"))
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newForum)
    this.shadowRoot.getElementById("forums").addEventListener("click", this.forumClick)

    this.shadowRoot.getElementById("new-title").addEventListener("input", e => {
      let value = (e.originalTarget||e.target)?.value
      if(!value) return this.shadowRoot.getElementById("new-id").value = '';
      clearTimeout(this.slugGenTimer)
      this.slugGenTimer = setTimeout(() => {
        api.get(`forum/tools/generate-new-id?id=${value}`).then(id => this.shadowRoot.getElementById("new-id").value = id)
      }, 400)
    })
  }

  async refreshData(){

    let {forums, me} = await api.query(`{
      forums{
        id, title, threadCount
      },
      me{id, permissions}
    }`)

    this.forums = forums
    this.shadowRoot.getElementById("new-btn").classList.toggle("hidden", !me.permissions.includes("forum.admin"))

    this.shadowRoot.getElementById("forums").innerHTML = forums.sort((a,b) => a.title < b.title ? -1 : 1).map(f => `
      <tr data-id="${f.id}" class="forum">
        <td>
          <span class="forum-name">
            <field-ref ref="/forum/${f.id}">${f.title}</field-ref>
          </span>
          <span>
            
        </td>
        <td>${f.threadCount}</td>
        <td>
          <dropdown-menu-component class="postoptions ${me.permissions.includes("forum.admin") ? "" : "hidden"}" title="Options" width="300px">
              <span slot="label" style="font-size: 80%" tabindex="0">&vellip;</span>
              <div slot="content">
                <h2>Options</h2>
                <div>
                  <label>Name:</label>
                  <field-edit type="text" field="title" patch="forum/forum/${f.id}" value="${f.title}"></field-edit>
                </div>
                <div class="forum-action-buttons">
                  <button class="styled delete">Delete</button>
                </div>
              </div>
            </dropdown-menu-component>
          </span>
        </td>
      </tr>
    `).join("")
  }

  newForum(){
    let dialog = this.shadowRoot.querySelector("#new-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#new-title").focus(),
      ok: async (val) => {
        await api.post(`forum/forum`, val)
        this.refreshData()
      },
      validate: async (val) => 
          !val.title ? "Please fill out title"
        : !val.id ? "Please fill out id"
        : await api.get(`forum/forum/${val.id}/exists`) ? "The forum already exists"
        : true,
      values: () => {return {
        title: this.shadowRoot.getElementById("new-title").value,
        id: this.shadowRoot.getElementById("new-id").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  forumClick(e){
    if(e.target.tagName != "BUTTON") return;
    let id = e.target.closest("tr.forum")?.getAttribute("data-id")
    if(!id) return;
    if(e.target.classList.contains("delete")){
      confirmDialog(`Are you sure that you want to delete the forum titled "${this.forums.find(f => f.id == id).title}"?`)
        .then(answer => answer ? api.del(`forum/forum/${id}`)
                                    .then(this.refreshData) : null)
    }
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