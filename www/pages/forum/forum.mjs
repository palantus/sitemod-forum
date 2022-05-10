const elementName = 'forum-page'

import api from "/system/api.mjs"
import "/components/field-ref.mjs"
import {pushStateQuery, state, goto} from "/system/core.mjs"
import {on, off, fire} from "/system/events.mjs"
import {makeRowsSelectable} from "/libs/table-tools.mjs"
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
        /*padding: 10px;*/
        /*padding-top: 55px;*/
        position: relative;
    }
    table{
      width: 100%;
      margin-top: 10px;
      /*box-shadow: 0px 0px 10px gray;*/
      /*border: 1px solid gray;*/
    }
    table thead tr{
      border-top: 1px solid gray;
      border-bottom: 1px solid gray;
    }
    table-paging{
      position: absolute;
      right: 10px;
      top: -3px;
    }
    
    table thead th:nth-child(1){width: 30px}
    table thead th:nth-child(2){width: 50px}
    table thead th:nth-child(3){width: 140px}
    table thead th:nth-child(4){width: 200px}
    table thead th:nth-child(5){width: 500px}
    
    #resultinfo{margin-left: 5px;}
  </style>  

  <div id="container">
    <action-bar>
        <action-bar-item id="log-btn">Log</action-bar-item>
    </action-bar>
    
    <input id="search" type="text" placeholder="Enter query" value=""></input>
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
              <th>Issues</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    
    this.onScroll = this.onScroll.bind(this); //Make sure "this" in that method refers to this
    
    this.shadowRoot.querySelector('input').addEventListener("change", () => {
      this.queryChanged()
      pushStateQuery(this.lastQuery ? {filter: this.lastQuery} : undefined)
    })
    this.shadowRoot.querySelector("#log-btn").addEventListener("click", () => goto("/forum/log"))

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

    this.clearResults()
    await this.fillResults(0, 80)
    this.appendResults(0, 80)
  }

  async fillResults(start, end){
    let data = {issues: {nodes: [], pageInfo: {totalCount: 0}}}
    data = await api.query(`query ForumList($input:PageableSearchArgsType){
        forumThreads(input: $input){
          nodes{
            id,
            author{name},
            title,
            date,
            issues{id}
          },
          pageInfo{
            totalCount
          }
        }
    }`, {input: {query: this.lastQuery.toLowerCase(), start, end, reverse: true}})
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
                <td>${thread.date.replaceAll("T", " ")}</td>
                <td>${thread.author.name}</td>
                <td>${thread.title}</td>
                <td>${thread.issues?.map(i => `<field-ref ref="/issue/${i.id}">${i.id}</field-ref>`).join(" ")||""}</td>
            </tr>
        `
        tab.appendChild(row);
    }

    // Selectable rows
    this.selectionTool = makeRowsSelectable(tab.parentElement)

    /*
    // Paging
    this.shadowRoot.querySelector("table-paging").total = data.issues.pageInfo.totalCount
    if(start == 0) //happens on first load and on filter change
      this.shadowRoot.querySelector("table-paging").page = 1
    this.shadowRoot.querySelector("table-paging").addEventListener("page-change", this.pagerPageChange)
    */

    // Result info
    this.shadowRoot.getElementById("resultinfo").innerText = `${this.resultCount} results`
  }

  connectedCallback() {
    this.shadowRoot.querySelector('input').focus();
    this.queryChanged(state().query.filter||"");
    on("changed-page-query", elementName, (query) => this.queryChanged(query.filter || ""))
    on("changed-project", elementName, async ({query}) => {
      //this.doSearch(this.lastQuery)
      this.clearResults()
      await this.fillResults(0, 80)
      this.appendResults(0, 80)
    })
    this.parentNode.addEventListener("scroll",this.onScroll,false);
    this.parentNodeSaved = this.parentNode;
  }

  disconnectedCallback() {
    //this.shadowRoot.querySelector('#toggle-info').removeEventListener();
    off("changed-page-query", elementName)
    off("changed-project", elementName)
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