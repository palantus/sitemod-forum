const elementName = 'forum-page'

import api from "../../system/api.mjs"
import "../../components/field-ref.mjs"
import {pushStateQuery, state, goto, stylesheets} from "../../system/core.mjs"
import {getUser} from "../../system/user.mjs"
import {on, off} from "../../system/events.mjs"
import {makeRowsSelectable} from "../../libs/table-tools.mjs"
import { alertDialog, showDialog, confirmDialog } from "../../components/dialog.mjs"
import "../../components/field-edit.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import "../../components/data/searchhelp.mjs"
import { escapeHTML } from "../../libs/tools.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
        position: relative;
    }
    action-bar{
      height: 28px;
      display: block;
    }
    table{
      width: 100%;
      margin-top: 10px;
    }
    table thead tr{
      border-top: 1px solid gray;
      border-bottom: 1px solid gray;
    }
    
    table thead th:nth-child(1){width: 30px}
    table thead th:nth-child(2){width: 140px}
    table thead th:nth-child(4){width: 200px}
    table thead th:nth-child(5){width: 200px}
    
    #resultinfo{
      margin-left: 0px; 
      position: relative;
      top: 2px;
    }
    #sortThreadsByActivity-container{
      margin-left: 30px; 
      position: relative;
      top: 2px;
    }
    #selection-tools{
      border: 1px solid var(--contrast-color-muted);
      border-radius: 15px;
      padding-left: 7px;
      padding-right: 7px;
      margin-left: 10px;
    }
    #selection-tools > span{
      border-right: 1px solid var(--contrast-color-muted);
      padding-right: 3px;
      color: var(--contrast-color-muted);
    }
    .hidden{display: none;}

    #new-title{width: calc(100% - 15px);}
    #new-dialog label{width: 115px;display: inline-block;}
  </style>  

  <action-bar>
    <action-bar-item id="refresh-btn">Refresh</action-bar-item>
    <action-bar-item id="new-btn">New thread</action-bar-item>
    <div id="selection-tools" class="hidden">
      <span>Selection: </span>
      <action-bar-item id="select-all-btn">Select all</action-bar-item>
      <action-bar-item id="clear-selection-btn">Clear</action-bar-item>
      <action-bar-item id="move-btn" class="hidden">Move</action-bar-item>
      <action-bar-item id="delete-btn" class="hidden">Delete</action-bar-item>
    </div>
  </action-bar>

  <div id="container">
    <input id="search" type="text" placeholder="Search current forum" value=""></input>
    <searchhelp-component path="search/tokens/forum"></searchhelp-component>
    <span id="resultinfo"></span>
    <span id="sortThreadsByActivity-container">
      <label for="sortThreadsByActivity">Sort threads by last activity</label>
      <input type="checkbox" id="sortThreadsByActivity"></input>
    </span>

    <table>
        <thead>
            <tr>
              <th></th>
              <th id="activityHeader">Date</th>
              <th>Title</th>
              <th>Thread author</th>
              <th>Last reply by</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
  </div>

  <dialog-component title="New thread" id="new-dialog">
    <label for="newitem-text"">Title: </label><br>
    <textarea id="new-title" name="text" rows="8" wrap="soft" dialog-no-enter maxlength="200"></textarea>
  </dialog-component>

  <dialog-component title="Move thread" id="move-dialog">
    <field-component label="Destination forum">
      <field-edit id="move-dest-id" type="select" lookup="forum"></field-edit>
    </field-component>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global, stylesheets.searchresults];
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.onScroll = this.onScroll.bind(this);
    this.newClicked = this.newClicked.bind(this);
    this.clearAndRefreshResults = this.clearAndRefreshResults.bind(this)
    this.moveSelected = this.moveSelected.bind(this);
    this.deleteSelected = this.deleteSelected.bind(this);
    
    this.shadowRoot.querySelector('input').addEventListener("change", () => {
      this.queryChanged()
      pushStateQuery(this.lastQuery ? {filter: this.lastQuery} : undefined)
    })
    this.shadowRoot.getElementById("refresh-btn").addEventListener("click", this.clearAndRefreshResults)
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newClicked)
    this.shadowRoot.getElementById("move-btn").addEventListener("click", this.moveSelected)
    this.shadowRoot.getElementById("delete-btn").addEventListener("click", this.deleteSelected)
    this.shadowRoot.getElementById("select-all-btn").addEventListener("click", () => this.selectionTool.selectAll())
    this.shadowRoot.getElementById("clear-selection-btn").addEventListener("click", () => this.selectionTool.clear())
    this.shadowRoot.getElementById("sortThreadsByActivity").addEventListener("change", async () => {
      let newValue = this.shadowRoot.getElementById("sortThreadsByActivity").checked;
      await api.patch("/forum/me/setup", {sortThreadsByActivity: newValue})
      this.clearAndRefreshResults();
    })

    this.forumId = /^\/forum\/([a-z0-9\-]+)/.exec(state().path)?.[1] || null

    this.shadowRoot.getElementById("search").setAttribute("placeholder", this.forumId ? "Search current forum" : "Search all forums")
    this.shadowRoot.getElementById("new-btn").classList.toggle("hidden", !this.forumId)

    //Hide actionbar if there aren't any buttons visible
    this.shadowRoot.querySelector("action-bar").classList.toggle("hidden", !!!this.shadowRoot.querySelector("action-bar action-bar-item:not(.hidden)"))

    this.query = ""
    this.results = []
    this.resultCount = 0;
  }

  async queryChanged(q = this.shadowRoot.querySelector('input').value){
    
    if(q == this.lastQuery)
      return;

    this.lastQuery = q;
    this.shadowRoot.querySelector('input').value = q;
    //this.shadowRoot.querySelector("table-paging").page = 1

    this.clearAndRefreshResults()
  }

  async clearAndRefreshResults(){
    this.clearResults()
    await this.fillResults(0, 80)
    this.appendResults(0, 80)
  }

  async fillResults(start, end){
    let data = await api.query(`query ForumList($input:PageableSearchArgsType, $forum:String){
        forumThreads(input: $input, forum: $forum){
          nodes{
            id,
            author{user{id},name},
            title,
            date,
            lastActivityDate,
            lastReply{author{name}}
          },
          pageInfo{
            totalCount
          }
        },
        forumUserSetup{sortThreadsByActivity}
    }`, {input: {query: this.lastQuery.toLowerCase(), start, end, reverse: true}, forum: this.forumId})
    for(let i = 0; i < data.forumThreads.nodes.length; i++)
      this.results[i+start] = data.forumThreads.nodes[i]
    this.resultCount = data.forumThreads.pageInfo.totalCount
    this.me = await getUser()

    this.shadowRoot.getElementById("move-btn").classList.toggle("hidden", !this.me.permissions.includes("forum.admin"))
    this.shadowRoot.getElementById("delete-btn").classList.toggle("hidden", !this.me.permissions.includes("forum.admin"))
    this.shadowRoot.getElementById("sortThreadsByActivity").checked = data.forumUserSetup.sortThreadsByActivity
    this.shadowRoot.getElementById("activityHeader").innerText = data.forumUserSetup.sortThreadsByActivity ? "Last activity" : "Thread created"
  }

  async clearResults(){
    this.selectionTool?.clear()
    let tab = this.shadowRoot.querySelector('table tbody')
    tab.innerHTML = "";
    this.results = []
  }

  async appendResults(start, end){
    let tab = this.shadowRoot.querySelector('table tbody')
    for(let i = Math.max(0, start); i <= Math.min(end, this.results.length -1); i++){
        let thread = this.results[i]
        let row = document.createElement("tr")
        row.setAttribute("data-id", thread.id)
        row.classList.add("result")
        row.innerHTML = `
              <td>${
                this.shadowRoot.getElementById("sortThreadsByActivity").checked ?
                    thread.lastActivityDate.replaceAll("T", " ").substring(0, 19)
                  : thread.date.replaceAll("T", " ").substring(0, 19)
                  }</td>
              <td><field-ref ref="/forum/thread/${thread.id}"/><lit>${escapeHTML(thread.title)}</lit></field-ref></td>
              <td><field-ref ref="/forum/profile?name=${thread.author.name}">${thread.author.name}</field-ref></td>
              <td>${thread.lastReply?.author ? `<field-ref ref="/forum/profile?name=${thread.lastReply.author.name}">${thread.lastReply.author.name}</field-ref>` : ""}</td>
        `
        tab.appendChild(row);
    }

    // Selectable rows
    this.selectionTool = makeRowsSelectable(tab.parentElement, items => {
      this.shadowRoot.getElementById("selection-tools").classList.toggle("hidden", items.length < 1)
      this.shadowRoot.querySelector("action-bar").classList.toggle("hidden", !!!this.shadowRoot.querySelector("action-bar > *:not(.hidden)"))
    })

    // Result info
    this.shadowRoot.getElementById("resultinfo").innerText = `${this.resultCount} results`
  }

  newClicked(){
    if(!this.forumId) return alertDialog("Only possible in a specific forum")
    let dialog = this.shadowRoot.querySelector("#new-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#new-title").focus(),
      ok: async (val) => {
        let newThread = await api.post(`forum/forum/${this.forumId}/threads`, val)
        await this.clearAndRefreshResults();
        goto(`/forum/thread/${newThread.id}`)
      },
      validate: (val) => 
          !val.title ? "Please fill out title"
        : true,
      values: () => {return {
        title: this.shadowRoot.getElementById("new-title").value.replace(/\n/g, "")
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("#new-dialog textarea").forEach(e => e.value = '')
      }
    })
  }

  async moveSelected(){
    let threadIds = this.selectionTool.getSelected().map(tr => parseInt(tr.getAttribute("data-id")));
    if(threadIds.length < 1) return alertDialog("No threads selected");

    let dialog = this.shadowRoot.getElementById("move-dialog")
    dialog.setAttribute("title", `Move ${threadIds.length} thread${threadIds.length > 1 ? 's':''}`)

    showDialog(dialog, {
      show: () => this.shadowRoot.getElementById("move-dest-id").focus(),
      ok: async (val) => {
        for(let threadId of threadIds){
          await api.patch(`forum/thread/${threadId}`, {forumId: val.id})
        }
        this.clearAndRefreshResults()
      },
      validate: async (val) => 
          !val.id ? "Please fill out id"
        : !(await api.get(`forum/forum/${val.id}/exists`)) ? "The forum doesn't exists"
        : true,
      values: () => {return {
        id: this.shadowRoot.getElementById("move-dest-id").getValue()
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  async deleteSelected(){
    let threadIds = this.selectionTool.getSelected().map(tr => parseInt(tr.getAttribute("data-id")));
    if(threadIds.length < 1) return alertDialog("No threads selected");

    if(!(await confirmDialog(`Are you sure that you want to delete ${threadIds.length} thread${threadIds.length > 1 ? 's':''}? This cannot be undone!`))) return;

    for(let threadId of threadIds){
      await api.del(`forum/thread/${threadId}`)
    }
    this.clearAndRefreshResults()
  }

  connectedCallback() {
    this.shadowRoot.querySelector('input').focus();
    on("first-page-load", elementName, (state) => this.queryChanged(state.query.filter || ""))
    on("changed-page-query", elementName, (query) => this.queryChanged(query.filter || ""))
    on("returned-to-page", elementName, (state) => this.queryChanged(state.query.filter || ""))
    this.parentNode.addEventListener("scroll",this.onScroll,false);
    this.parentNodeSaved = this.parentNode;
  }

  disconnectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').removeEventListener();
    off("first-page-load", elementName)
    off("changed-page-query", elementName)
    off("returned-to-page", elementName)
    this.parentNodeSaved.removeEventListener("scroll",this.onScroll,false);
  }

  async loadNext(){
    if(this.isFetchingNext === true)
      return;

    this.isFetchingNext = true;
    let startIdx = this.results.length;
    let endIdx = startIdx + 80;
    await this.fillResults(startIdx, endIdx)
    this.appendResults(startIdx, endIdx)
    this.isFetchingNext = false;
  }
  
  onScroll(evt){
    let wrapper = this.parentNode;
    if(wrapper.scrollTop+wrapper.offsetHeight+100>this.offsetHeight) {
      //content.innerHTML+= more;
      //alert("scroll")
      this.loadNext()
    }
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}