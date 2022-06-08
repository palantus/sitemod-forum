const elementName = 'forum-page'

import api from "/system/api.mjs"
import "/components/field-ref.mjs"
import {pushStateQuery, state, goto} from "/system/core.mjs"
import {on, off, fire} from "/system/events.mjs"
import {makeRowsSelectable} from "/libs/table-tools.mjs"
import { alertDialog, showDialog } from "/components/dialog.mjs"
import "/components/field.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/data/searchhelp.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style>
    #container{
        position: relative;
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
    table thead th:nth-child(2){width: 50px}
    table thead th:nth-child(3){width: 140px}
    table thead th:nth-child(4){width: 200px}
    
    #resultinfo{
      margin-left: 0px; 
      position: relative;
      top: 2px;
    }
    .hidden{display: none;}
  </style>  

  <action-bar>
    <action-bar-item id="new-btn">New thread</action-bar-item>
  </action-bar>

  <div id="container">
    <input id="search" type="text" placeholder="Search current forum" value=""></input>
    <searchhelp-component path="search/tokens/forum"></searchhelp-component>
    <span id="resultinfo"></span>

    <table>
        <thead>
            <tr>
              <th></th>
              <th>Id</th>
              <th>Date</th>
              <th>Author</th>
              <th>Title</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
  </div>

  <dialog-component title="New thread" id="new-dialog">
    <field-component label="Title"><input id="new-title"></input></field-component>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.onScroll = this.onScroll.bind(this);
    this.newClicked = this.newClicked.bind(this);
    this.clearAndRefreshResults = this.clearAndRefreshResults.bind(this)
    
    this.shadowRoot.querySelector('input').addEventListener("change", () => {
      this.queryChanged()
      pushStateQuery(this.lastQuery ? {filter: this.lastQuery} : undefined)
    })
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newClicked)

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
            date
          },
          pageInfo{
            totalCount
          }
        }
    }`, {input: {query: this.lastQuery.toLowerCase(), start, end, reverse: true}, forum: this.forumId})
    for(let i = 0; i < data.forumThreads.nodes.length; i++)
      this.results[i+start] = data.forumThreads.nodes[i]
    this.resultCount = data.forumThreads.pageInfo.totalCount
  }

  async clearResults(){
    let tab = this.shadowRoot.querySelector('table tbody')
    tab.innerHTML = "";
    this.results = []
  }

  async appendResults(start, end){
    let tab = this.shadowRoot.querySelector('table tbody')
    for(let i = Math.max(0, start); i <= Math.min(end, this.results.length -1); i++){
        let thread = this.results[i]
        let row = document.createElement("tr")
        row.classList.add("result")
        row.innerHTML = `
            <tr>
                <td><field-ref ref="/forum/thread/${thread.id}"/>${thread.id}</field-ref></td>
                <td>${thread.date.replaceAll("T", " ").substring(0, 19)}</td>
                <td>${thread.author.user ? `<field-ref ref="/setup/users/${thread.author.user.id}">${thread.author.name}</field-ref>` : thread.author.name}</td>
                <td><field-ref ref="/forum/thread/${thread.id}"/>${thread.title}</field-ref></td>
            </tr>
        `
        tab.appendChild(row);
    }

    // Selectable rows
    this.selectionTool = makeRowsSelectable(tab.parentElement)

    // Result info
    this.shadowRoot.getElementById("resultinfo").innerText = `${this.resultCount} results`
  }

  newClicked(){
    if(!this.forumId) return alertDialog("Only possible in a specific forum")
    let dialog = this.shadowRoot.querySelector("#new-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#new-title").focus(),
      ok: async (val) => {
        let newThread = await api.post(`forum/${this.forumId}`, val)
        goto(`/forum/thread/${newThread.id}`)
      },
      validate: (val) => 
          !val.title ? "Please fill out title"
        : true,
      values: () => {return {
        title: this.shadowRoot.getElementById("new-title").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
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