const elementName = 'forum-missing-users-page'

import api from "../../system/api.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import "../../components/field-ref.mjs"
import "../../components/field-edit.mjs"
import {on, off} from "../../system/events.mjs"
import { showDialog, alertDialog } from "../../components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='../css/global.css'>
  <style>
    #container{
        /*padding-top: 55px;*/
        position: relative;
    }

    table thead th:nth-child(1){width: 250px}
    table thead th:nth-child(2){width: 120px}
  </style>  

  <action-bar>
      <action-bar-item id="refresh-btn">Refresh</action-bar-item>
  </action-bar>

  <div id="container">
    <table class="datalist">
        <thead>
            <tr>
              <th>Name</th>
              <th>Suggested User</th>
              <th>Actions</th>
            </tr>
        </thead>
        <tbody id="names">
        </tbody>
    </table>
  </div>

  <dialog-component title="Map name to user" id="map-dialog">
    <field-component label="Name"><input id="map-name"></input></field-component>
    <label for="map-userId">User Id</label>
    <field-edit type="select" id="map-userId" lookup="user"></field-edit>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this); 
    this.tableClick = this.tableClick.bind(this); 
    
    this.shadowRoot.querySelector("#refresh-btn").addEventListener("click", this.refreshData)
    this.shadowRoot.getElementById("names").addEventListener("click", this.tableClick)

    this.refreshData();
  }

  async refreshData(){
    let names = await api.get("forum/users/missing")

    this.shadowRoot.getElementById('names').innerHTML = names.sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)
                                                                       .map(name => `
            <tr class="result" data-name="${name.name}" data-userId="${name.suggestedUserId}">
                <td>${name.name}</td>
                <td>${name.suggestedUserId ? `<field-ref ref="/setup/users/${name.suggestedUserId}">${name.suggestedUserId}</field-ref>`:''}</td>
                <td>
                  <button class="map">Map</button>
                  ${name.suggestedUserId ? `<button class="confirm">Confirm suggestion</button>` : ''}
                </td>
            </tr>
        `).join("")
  }

  tableClick(e){
    let row = e.target.closest("tr")
    let name = row.getAttribute("data-name")
    let userId = row.getAttribute("data-userId")
    if(e.target.classList.contains("map")){
      this.mapName(name)
    } else if(e.target.classList.contains("confirm")){
      api.post(`forum/users/${userId}/map`, {name}).then(this.refreshData)
    }
  }

  mapName(name){
    if(!name) return alertDialog("Missing name")
    let dialog = this.shadowRoot.querySelector("#map-dialog")
    this.shadowRoot.getElementById("map-name").value = name

    showDialog(dialog, {
      show: () => this.shadowRoot.getElementById("map-userId").focus(),
      ok: async (val) => {
        api.post(`forum/users/${val.userId}/map`, {name: val.name}).then(this.refreshData)
      },
      validate: (val) => 
          !val.userId ? "Please fill out userId"
        : !val.name ? "Please fill out name"
        : true,
      values: () => {return {
        name: this.shadowRoot.getElementById("map-name").value,
        userId: this.shadowRoot.getElementById("map-userId").getValue()
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
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