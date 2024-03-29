const elementName = 'forumthread-page'

import api from "../../system/api.mjs"
import { on, off, fire } from "../../system/events.mjs"
import { state, setPageTitle, goto, stylesheets } from "../../system/core.mjs"
import { getUser } from "../../system/user.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import "../../components/dropdown-menu.mjs"
import "../../components/list-inline.mjs"
import "../../components/field-edit.mjs"
import "../../components/progress.mjs"
import { confirmDialog, alertDialog, promptDialog, showDialog } from "../../components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <style>
    #container{
        position: relative;
        padding: 10px;
    }
    #title-container{margin-bottom:1px;}
    #edit-title{
      color: gray;
      font-size: 60%;
      position: absolute;
      top: 10px;
      cursor: pointer;
    }

    div.post{
      margin-top: 10px;
      border: 1px solid gray;
      padding: 5px;
      -moz-box-shadow: 0 0 5px #888;
      -webkit-box-shadow: 0 0 5px #888;
      box-shadow: 0 0 5px #888;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.8);
      color: black;
      position: relative;
    }

    div.postauthor {
      display: inline-block;
      margin-right: 10px;
      top: 2px;
    }

    div.postdate {
      display: inline-block;
      position: absolute;
      right: 20px;
      font-size: 80%;
      color: gray;
    }

    .postoptions{
      display: inline-block;
      position: absolute;
      right: 5px;
      top: 2px;
      user-select: none;
    }

    div.posttitle {
      display: inline-block;
      margin-right: 10px;
    }

    div.postbody {
      border-top: 1px solid gray;
      padding-top: 10px;
    }

    #threadinfo table td{padding-left: 0px;}
    #threadinfo table td:first-child{width: 60px; vertical-align: top;}
    .hidden{display: none;}

    .postbody.rendered table{border-collapse: collapse;}
    .postbody.rendered table th{text-align: left; border-bottom: 1px solid black;}
    .postbody.rendered table th, #rendered table td{padding-right: 5px;}
    .postbody.rendered table td{border-left: 1px solid gray; padding: 5px;}
    .postbody.rendered table tbody tr{vertical-align: top; border-bottom: 1px solid gray; border-right: 1px solid gray;}
    .postbody.rendered>p{margin: 0px;}
  </style>  

  <action-bar class="hidden">
    <action-bar-item id="delete" title="Only possible for owner of thread and admins">Delete thread</action-bar-item>
    <action-bar-item id="move-thread-btn" title="Only possible for admins">Move thread</action-bar-item>
    <action-bar-item id="history-btn" title="Only possible for admins">History</action-bar-item>
  </action-bar>

  <div id="container">
    <h1 id="title-container"><span id="title"></span><span id="edit-title" class="hidden">&#9998;</span></h1>
    <div id="threadinfo"></div>
    <button class="styled" id="subscribe">Subscribe</button>
    <div id="posts"></div>
    <br>
    <button id="reply" class="styled">Post new reply</button>
    <div id="reply-editor-container"></div>
  </div>

  <dialog-component title="Add file" id="add-file-dialog">
    <input type="file" multiple>
    <progress-bar complete-text="Upload complete!"></progress-bar>
    <br><br><br>
    <h3>Access:</h3>
    <p>Select the following checkbox, if all other forum users should be able to view the file. If you do not select this, only forum admins can see the file. Before selecting it, please make sure that it doesn't contain any sensitive information.</p>
    <label for="file-access-all">All forum users</label>
    <input id="file-access-all" type="checkbox"></input>
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
      .adoptedStyleSheets = [stylesheets.global];
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.replyClicked = this.replyClicked.bind(this)
    this.postReply = this.postReply.bind(this)
    this.toggleReplyEditor = this.toggleReplyEditor.bind(this)
    this.refreshData = this.refreshData.bind(this)
    this.deleteClicked = this.deleteClicked.bind(this)
    this.postsClicked = this.postsClicked.bind(this)
    this.titleEditClicked = this.titleEditClicked.bind(this)
    this.addFile = this.addFile.bind(this)
    this.subscribeClicked = this.subscribeClicked.bind(this)
    this.moveThread = this.moveThread.bind(this)

    this.shadowRoot.getElementById("reply").addEventListener("click", this.replyClicked)
    this.shadowRoot.getElementById("delete").addEventListener("click", this.deleteClicked)
    this.shadowRoot.getElementById("posts").addEventListener("click", this.postsClicked)
    this.shadowRoot.getElementById("edit-title").addEventListener("click", this.titleEditClicked)
    this.shadowRoot.getElementById("subscribe").addEventListener("click", this.subscribeClicked);
    this.shadowRoot.getElementById("move-thread-btn").addEventListener("click", this.moveThread);
    this.shadowRoot.getElementById("history-btn").addEventListener("click", () => goto(`/forum/thread/${this.threadId}/history`))

    this.threadId = this.getAttribute("threadid") || parseInt(/\d+/.exec(state().path)?.[0]);

    setTimeout(() => {
      fire("forum-thread-page-created", {
        page: this,
        container: this.shadowRoot.getElementById("container"),
        threadId: this.threadId
      })
    }, 0)
  }

  connectedCallback() {
    this.shadowRoot.getElementById("threadinfo").style.display = "none";
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }

  async refreshData() {
    if (!this.threadId) return;

    let threadId = this.threadId;

    let { forumThread: thread, forumClientSetup: setup } = await api.query(`{
      forumThread(id: ${threadId}){
        id, title, author{name, user{id}}, date, isSubscribed
        posts{id, author{name, user{id}}, date, edited, body, bodyHTML}
      }
      forumClientSetup{
        maxFileSizeMB
      }
    }`)

    if (!thread) {
      alertDialog("Thread doesn't exist")
      return;
    }

    setPageTitle(thread.title)

    let user = await getUser()

    this.thread = thread;
    this.setup = setup;
    this.shadowRoot.getElementById("posts").innerHTML = thread.posts.sort((a, b) => a.date < b.date ? -1 : 1)
      .map(p => `
                  <div class="post" data-postId="${p.id}">
                    <div class="postauthor"><field-ref ref="/forum/profile?name=${p.author.name}">${p.author.name}</field-ref></div>
                    <div class="postdate" title="Originally posted: ${p.date.replaceAll("T", " ").substring(0, 19)}\nEdited: ${p.edited ? p.edited.replaceAll("T", " ").substring(0, 19) : "<never>"}">
                      ${p.edited ? "(edited) " + p.edited.replaceAll("T", " ").substring(0, 19) : p.date.replaceAll("T", " ").substring(0, 19)}
                    </div>
                    <dropdown-menu-component class="postoptions" title="Options" width="300px">
                      <span slot="label" style="font-size: 80%" tabindex="0">&vellip;</span>
                      <div slot="content">
                        <h2>Options</h2>
                        <p>You have the following options available:</p>
                        <button class="delete${(user.id == p.author.user?.id || user.permissions.includes("forum.admin")) && user.permissions.includes("forum.post.delete") ? "" : " hidden"}">Delete post</button>
                        <button class="edit${(user.id == p.author.user?.id || user.permissions.includes("forum.admin")) && user.permissions.includes("forum.post.edit") ? "" : " hidden"}">Edit post</button>
                      </div>
                    </dropdown-menu-component>
                    <div class="postbody${p.bodyHTML ? " rendered" : ""}">${p.bodyHTML ? p.bodyHTML : p.body.trim().replace(/(\r\n|\n|\r)/gm, "<br/>")}</div>
                  </div>`).join("")

    this.shadowRoot.getElementById("title").innerText = thread.title

    let hasParticipated = thread.posts.find(p => p.author.name == user.name) ? true : false

    this.shadowRoot.getElementById("subscribe").innerText = (thread.isSubscribed || hasParticipated) ? "Unsubscribe" : "Subscribe"
    this.shadowRoot.getElementById("subscribe").toggleAttribute("subscribed", thread.isSubscribed || hasParticipated)
    this.shadowRoot.getElementById("subscribe").setAttribute("title", hasParticipated ? "You have participated in the thread, so you will always receive notifications" : "")
    this.shadowRoot.getElementById("subscribe").toggleAttribute("disabled", hasParticipated)

    let threadInfoContainer = this.shadowRoot.getElementById("threadinfo")
    threadInfoContainer.style.display = "block";

    threadInfoContainer.innerHTML = `
      <table>
        <tr><td>Id:</td><td id="threadid"><field-ref ref="/forum/thread/${thread.id}"/>${thread.id}</field-ref></td></tr>
        <tr><td>Author:</td><td id="threadauthor"><field-ref ref="/forum/profile?name=${thread.author.name}">${thread.author.name}</field-ref></td></tr>
        <tr><td>Date:</td><td id="threaddate">${thread.date.replaceAll("T", " ").substring(0, 19)}</td></tr>
        <tr><td>Files: </td><td><list-inline-component id="files"></list-inline-component></td></tr>
      </table>
    `

    let fileContainer = this.shadowRoot.getElementById("files")
    fileContainer.setup({
      add: user.permissions.includes("forum.thread.attach-file") && user.permissions.includes("forum.thread.edit") ? this.addFile : undefined,
      validateAdd: () => true,
      remove: user.permissions.includes("forum.thread.edit") ? async file => api.del(`forum/thread/${this.threadId}/file/${file.id}`) : undefined,
      validateRemove: file => confirmDialog(`Are you sure that you want to remove file "${file.name}"?`),
      getData: async () => (await api.query(`{forumThread(id: ${this.threadId}){files{id,name}}}`)).forumThread.files,
      toHTML: file => `<span>${file.name}</span>`,
      click: file => goto(`/file/${file.id}`)
    })

    this.shadowRoot.getElementById("delete").classList.toggle("hidden", (user.id != thread.author.user?.id && !user.permissions.includes("forum.admin")) || !user.permissions.includes("forum.thread.delete"))
    this.shadowRoot.getElementById("move-thread-btn").classList.toggle("hidden", !user.permissions.includes("forum.admin"))
    this.shadowRoot.getElementById("history-btn").classList.toggle("hidden", !user.permissions.includes("forum.admin"))
    this.shadowRoot.getElementById("edit-title").classList.toggle("hidden", (user.id != thread.author.user?.id && !user.permissions.includes("forum.admin")) || !user.permissions.includes("forum.thread.edit"))
    this.shadowRoot.getElementById("reply").classList.toggle("hidden", !user.permissions.includes("forum.post.create"))

    //Hide actionbar if there aren't any buttons visible
    this.shadowRoot.querySelector("action-bar").classList.toggle("hidden", !!!this.shadowRoot.querySelector("action-bar action-bar-item:not(.hidden)"))

    if (thread.posts.length < 1 && user.permissions.includes("forum.post.create")) {
      this.replyClicked()
    }
  }

  replyClicked() {
    if (!this.threadId) return;
    this.toggleReplyEditor(true)
    this.shadowRoot.getElementById("reply-editor")?.value("")
    this.shadowRoot.getElementById("reply-editor")?.focus()
  }

  postReply(body) {
    if (!this.threadId) return;
    this.toggleReplyEditor(false)
    if (body) {
      api.post(`forum/thread/${this.threadId}/posts`, { body }).then(this.refreshData)
    }
  }

  toggleReplyEditor(visible) {
    this.shadowRoot.getElementById("reply").classList.toggle("hidden", visible)
    let editor = this.shadowRoot.getElementById("reply-editor")
    if (editor) {
      editor.classList.toggle("hidden", !visible)
    } else {
      // Don't load the editor, unless it is needed
      import("../../components/richtext.mjs").then(() => {
        this.shadowRoot.getElementById("reply-editor-container").innerHTML = `<richtext-component id="reply-editor" nosave submit></richtext-component>`
        editor = this.shadowRoot.getElementById("reply-editor")
        editor.addEventListener("close", () => this.toggleReplyEditor(false))
        editor.addEventListener("submit", ({ detail: { text } }) => this.postReply(text))
        editor.focus()
      })
    }
  }

  async deleteClicked() {
    if (!this.threadId) return;
    if (!(await confirmDialog("Are you sure that you want to delete this thread?"))) return;
    await api.del(`forum/thread/${this.threadId}`)
    window.history.back();
  }

  async postsClicked(e) {
    if (e.target.tagName != "BUTTON") return;
    let post = e.target.closest(".post")
    let id = post?.getAttribute("data-postId")
    if (!id) return;
    if (e.target.classList.contains("delete")) {
      if (!(await confirmDialog(`Are you sure that you want to delete this post?`))) return;
      await api.del(`forum/post/${id}`)
      this.refreshData()
    } else if (e.target.classList.contains("edit")) {
      // Don't load the editor, unless it is needed
      import("../../components/richtext.mjs").then(() => {
        let container = this.shadowRoot.getElementById("posts")
        container.querySelectorAll(".post-edit").forEach(e => e.remove())
        let div = document.createElement("div")
        div.classList.add("post-edit")
        div.innerHTML = `<richtext-component id="post-edit"></richtext-component>`
        let editor = div.firstChild
        editor.addEventListener("close", () => container.querySelectorAll(".post-edit").forEach(e => e.remove()))
        editor.addEventListener("save", async ({ detail: { text } }) => {
          await api.patch(`forum/post/${id}`, { body: text })
          this.refreshData()
        })
        editor.value(this.thread.posts.find(p => p.id == id).body)
        let nextPostE = post.nextElementSibling
        if (nextPostE)
          container.insertBefore(div, nextPostE)
        else
          container.appendChild(div)
      })
    }
  }

  async titleEditClicked() {
    if (!this.threadId) return;
    let newTitle = await promptDialog("Enter new title", this.thread.title, { selectValue: true, title: "Edit thread title" });
    if (!newTitle || newTitle == this.thread.title) return;
    await api.patch(`forum/thread/${this.threadId}`, { title: newTitle })
    this.refreshData()
  }

  async addFile() {
    return new Promise((resolve, reject) => {
      let dialog = this.shadowRoot.getElementById("add-file-dialog")
      let progress = dialog.querySelector("progress-bar")
      progress.classList.toggle("hidden", true)
      let onProgress = value => progress.setAttribute("value", value)
      showDialog(dialog, {
        ok: async (val) => {
          progress.classList.toggle("hidden", false)
          let formData = new FormData();
          for (let file of dialog.querySelector("input[type=file]").files)
            formData.append("file", file);
          let file = (await api.upload(`file/tag/forum-file/upload?acl=r:${val.accessAll ? "permission:forum.read" : "permission:forum.admin"};w:permission:forum.admin`, formData, { onProgress }))?.[0];
          if (file) {
            await api.post(`forum/thread/${this.threadId}/files`, { fileId: file.id })
            return resolve()
          } else {
            alertDialog("Could not attach file. Try again.")
          }
          reject();
        },
        validate: (val) => {
          let tooLargeFiles = Array.from(dialog.querySelector("input[type=file]").files).filter(f => f.size > this.setup.maxFileSizeMB * 1000000).map(f => f.name)
          if (tooLargeFiles.length > 0) {
            return `The following files exceed size limit of ${this.setup.maxFileSizeMB} MB: <br> - ${tooLargeFiles.join("<br> - ")}`
          }
          return true
        },
        values: () => {
          return {
            accessAll: dialog.querySelector("#file-access-all").checked,
          }
        },
        close: () => {
          dialog.querySelectorAll("field-component input").forEach(e => e.value = '')
        }
      })
    })
  }

  async subscribeClicked() {
    let isSubscribed = this.shadowRoot.getElementById("subscribe").hasAttribute("subscribed")

    await api.post(`forum/thread/${this.threadId}/${isSubscribed ? "un" : ""}subscribe`)
    let { forumThread: thread } = await api.query(`{forumThread(id: ${this.threadId}){isSubscribed}}`)

    this.shadowRoot.getElementById("subscribe").innerText = thread.isSubscribed ? "Unsubscribe" : "Subscribe"
    this.shadowRoot.getElementById("subscribe").toggleAttribute("subscribed", thread.isSubscribed)
  }

  moveThread() {
    let dialog = this.shadowRoot.querySelector("#move-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.getElementById("move-dest-id").focus(),
      ok: async (val) => api.patch(`forum/thread/${this.threadId}`, { forumId: val.id }),
      validate: async (val) =>
        !val.id ? "Please fill out id"
          : !(await api.get(`forum/forum/${val.id}/exists`)) ? "The forum doesn't exists"
            : true,
      values: () => {
        return {
          id: this.shadowRoot.getElementById("move-dest-id").getValue()
        }
      },
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  static get observedAttributes() {
    return ["threadid"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "threadid":
        if (newValue) {
          this.threadId = parseInt(newValue);
          this.refreshData();
          this.dispatchEvent(new CustomEvent("changed-thread", { detail: { id: this.threadId, component: this }, bubbles: true, cancelable: false }));
        }
        break;
    }
  }
}

window.customElements.define(elementName, Element);
export { Element, elementName as name }
