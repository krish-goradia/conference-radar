
const btnContainer = document.getElementById("btn_container");
const submitbtn = document.getElementById("submitBtn");
const metafields = document.getElementById("_metafields");
const abstz = document.getElementById("abs_timezone");
const papertz = document.getElementById("paper_timezone");
const conferFields = [...document.querySelectorAll("#btn_container .mybutton")].map(btn => btn.id)
const metaFields = [...metafields.querySelectorAll("input")].map(input => input.id)
const authView = document.getElementById("authView")
const mainView = document.getElementById("mainView")
const loginBtn = document.getElementById("loginBtn")
const logoutBtn = document.getElementById("logoutBtn")
const authTabs = document.querySelectorAll(".auth-tab")
const loginForm = document.getElementById("loginForm")
let currenttabid = null;


const FIELD_LABELS = {
    "confer_place" : "Conference Place",
    "paper_deadline": "Paper Deadline",
    "abs_deadline": "Abstract Deadline"
}
authTabs.forEach(tab => {
    tab.addEventListener("click", () => {
        const action = tab.dataset.tab;
        authTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const confirmPasswordGroup = document.getElementById("confirmPasswordGroup");
        if(action === "login") {
            loginBtn.textContent = "Sign In";
            confirmPasswordGroup.style.display = "none";
        } else {
            loginBtn.textContent = "Create Account";
            confirmPasswordGroup.style.display = "flex";
        }
        loginBtn.dataset.action = action;
    });
});

async function initAuth(){
    const {token} = await chrome.storage.local.get("token")
    if(token){
        showMainView();
    }
    else{
        showAuthView();
    }
}
function showAuthView(){
    authView.style.display = "flex"
    mainView.style.display = "none"
}
function showMainView(){
    authView.style.display = "none"
    mainView.style.display = "block"
    setTimeout(panelopen,100);
}

loginBtn.addEventListener("click",()=>{
    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value.trim()
    const confirmPassword = document.getElementById("confirmPassword").value.trim()
    const action = loginBtn.dataset.action || "login"
    document.getElementById("error").textContent = "";
    
    if(!email || !password) {
        document.getElementById("error").textContent = "Please fill in all fields"
        return
    }
    
    // For signup, validate that passwords match
    if(action === "signup") {
        if(!confirmPassword) {
            document.getElementById("error").textContent = "Please confirm your password"
            return
        }
        if(password !== confirmPassword) {
            document.getElementById("error").textContent = "Passwords do not match"
            return
        }
    }
    
    chrome.runtime.sendMessage({type:"AUTH_REQUEST", action: action, email, password})
})

// Allow Enter key to submit
document.getElementById("email")?.addEventListener("keypress", (e) => {
    if(e.key === "Enter") loginBtn.click()
})

document.getElementById("password")?.addEventListener("keypress", (e) => {
    if(e.key === "Enter") loginBtn.click()
})

document.getElementById("confirmPassword")?.addEventListener("keypress", (e) => {
    if(e.key === "Enter") loginBtn.click()
})

chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.type!== "AUTH_RESULT") return;
    if(msg.success){
        showMainView();
    }
    else{
        document.getElementById("error").textContent = msg.error;
    }
})

logoutBtn.addEventListener("click", async () => {
    const modal = document.getElementById("logoutModal");
    modal.classList.add("show");
});

document.getElementById("cancelLogout").addEventListener("click", () => {
    const modal = document.getElementById("logoutModal");
    modal.classList.remove("show");
});

document.getElementById("confirmLogout").addEventListener("click", async () => {
    // Clear token from storage
    await chrome.storage.local.remove("token");
    
    // Clear all conference drafts
    const allItems = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allItems).filter(key => key !== "token");
    await chrome.storage.local.remove(keysToRemove);
    
    // Hide modal and show auth view
    const modal = document.getElementById("logoutModal");
    modal.classList.remove("show");
    
    showAuthView();
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("error").textContent = "";
});

// Close modal when clicking outside (on the backdrop)
document.getElementById("logoutModal").addEventListener("click", (e) => {
    if (e.target.id === "logoutModal") {
        e.target.classList.remove("show");
    }
});


async function panelopen(){
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    currenttabid = tab.id;
    chrome.runtime.sendMessage({
        type:"PANEL_OPEN",
        tabId: tab.id
    });
}


chrome.tabs.onActivated.addListener(async(activeinfo)=>{
    currenttabid = activeinfo.tabId;
    chrome.runtime.sendMessage({
        type:"PANEL_OPEN",
        tabId: currenttabid
    })
})

chrome.tabs.onUpdated.addListener(async(tabId,changeinfo,tab)=>{
    if(tabId === currenttabid &&changeinfo.status === "complete"){
        chrome.runtime.sendMessage({
            type:"PANEL_OPEN",
            tabId: tabId
        })
    }
})


chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.type !== "CONFERENCE_READY") return;
    const {isNew,conf_id,existing_fields,meta} = msg;

    window.currentConf = {
        conf_id,
        isNew,
        existing_fields,
        pending_fields : {},
        meta
    };

    showInitialUI(isNew,existing_fields,meta);

});

let metaSaveTimeout = null;
let timezoneSaveTimeouts = {};
metafields.addEventListener("input",(e=>{
    if(e.target.tagName === "INPUT"){
        const id = e.target.id;
        window.currentConf.meta[id] = e.target.value;

        clearTimeout(metaSaveTimeout);
        metaSaveTimeout = setTimeout(() => {
            const conf_id = window.currentConf.conf_id;
            chrome.storage.local.get(conf_id).then(data => {
                const conf = data[conf_id] || { fields: {}, meta: {} };
                conf.meta = { ...conf.meta, ...window.currentConf.meta };
                chrome.storage.local.set({ [conf_id]: conf });
            });
        }, 500);

        checkreadyforsubmit();
    }
}))

abstz.addEventListener("change", (e) => {
    saveTimezoneField("abs_timezone", e.target.value);
});
papertz.addEventListener("change", (e) => {
    saveTimezoneField("paper_timezone", e.target.value);
});

function saveTimezoneField(fieldkey, value){
    window.currentConf.existing_fields[fieldkey] = { value };
    clearTimeout(timezoneSaveTimeouts[fieldkey]);
    timezoneSaveTimeouts[fieldkey] = setTimeout(()=>{
        const conf_id = window.currentConf.conf_id;
        chrome.storage.local.get(conf_id).then(data => {
            const conf = data[conf_id] || { fields: {}, meta: {} };
            conf.fields[fieldkey] = { value };
            chrome.storage.local.set({ [conf_id]: conf });
        });
    }, 500);
}


function showInitialUI(isNew,existing_fields,meta){
    // Reset button states (buttons are static in HTML now)
    const urldiv = document.getElementById("conf_URL");
    if(urldiv){
        urldiv.textContent = meta?.conf_URL || "Can't read URL";
    }
    for(const field of conferFields){
        const isDone = !isNew && field in existing_fields;
        showfieldUI(field,"confer_details",isDone)
    }
    for(const field of metaFields){
        if(field === "keywords") continue;
        const value = meta ? meta[field]: "";
        showfieldUI(field,"meta_details",true,value)
    }
    restoreTimezoneDropdowns(existing_fields);
    // Restore keyword tags from meta
    keywordsList = [];
    if (meta?.keywords) {
        const kws = Array.isArray(meta.keywords) ? meta.keywords : meta.keywords.split(",");
        kws.forEach(k => { if (k.trim()) keywordsList.push(k.trim()); });
    }
    renderTags();
    checkreadyforsubmit();
}



function restoreTimezoneDropdowns(existing_fields){
    if(abstz && existing_fields?.abs_timezone?.value){
        abstz.value = existing_fields.abs_timezone.value;
    } else if(abstz){
        abstz.value = "AoE";
        existing_fields["abs_timezone"] = { value: "AoE" };
    }
    if(papertz && existing_fields?.paper_timezone?.value){
        papertz.value = existing_fields.paper_timezone.value;
    } else if(papertz){
        papertz.value = "AoE";
        existing_fields["paper_timezone"] = { value: "AoE" };
    }
    window.currentConf.existing_fields = existing_fields;
}



function showfieldUI(fieldkey,type,isDone,value= null){
    if(type === "confer_details"){
        const div = document.querySelector(`#${fieldkey} .status`)
        // div.id = `field-${fieldkey}`;
        if(!div) return;
        div.textContent = (isDone ? "Selected" : "Not Set");
        //fieldContainer.appendChild(div);
        const btn = document.querySelector(`#${fieldkey}`);
        if(btn){
            btn.dataset.mode = isDone? "edit" : "new";
        }
        const action = document.querySelector(`#${fieldkey} .action`);
        if(action){
            action.textContent = isDone ? "Click to reselect" : "Click to select";
        }
    }
    if(type === "meta_details"){
    const input = document.getElementById(fieldkey);
    if(!input) return;
    input.value = value || "";
    }

}


btnContainer.addEventListener("click", async(eve)=>{
    const btn = eve.target.closest(".mybutton");
    if(!btn) return;
    const fieldkey = btn.id;
    if(!fieldkey) return;
    const mode = btn.dataset.mode;
    const {existing_fields,pending_fields} = window.currentConf;
    // if(existing_fields[fieldkey] || pending_fields[fieldkey]){
    //     alert("This field has been added");
    //     return;
    // }
    const buttons = btnContainer.querySelectorAll(".mybutton");
    buttons.forEach(b=>{
        b.disabled = true;
    })
    pending_fields[fieldkey] = {selected:false};
    addnewfieldtoUI(fieldkey,mode);


    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    
    try {
        await chrome.tabs.sendMessage(tab.id, {
            type: "START_SELECTION",
            fieldkey,
            mode
        });
    } catch (error) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            await new Promise(resolve => setTimeout(resolve, 100));
            await chrome.tabs.sendMessage(tab.id, {
                type: "START_SELECTION",
                fieldkey,
                mode
            });
        } catch (injectError) {
            alert(`Error: ${injectError.message}`);
        }
    }
})

function addnewfieldtoUI(fieldkey,mode){
    if(mode == "new"){
        const div = document.querySelector(`#${fieldkey} .status`)
        if(div) div.textContent = "Selecting...";
    }
    if(mode == "edit"){
        const div = document.querySelector(`#${fieldkey} .status`)
        if(div) div.textContent = "Reselecting...";
    }
    
}

chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.type!="FIELD_ADDED") return;
    const {fieldkey} = msg;
    if(window.currentConf.pending_fields[fieldkey]){
        window.currentConf.pending_fields[fieldkey].selected=true;
    }
    const div = document.querySelector(`#${fieldkey} .status`);
    const mode = msg.mode;
    const buttons = btnContainer.querySelectorAll(".mybutton");
    buttons.forEach(b=>{
        b.disabled=false;
    })
    if(div && mode == "new"){
        div.textContent ="Selected";
        btnContainer.querySelector(`#${fieldkey}`).dataset.mode = "edit";
        const action = btnContainer.querySelector(`#${fieldkey} .action`);
        if(action) action.textContent = "Click to reselect";
    }
    if(div && mode == "edit") div.textContent = "Reselected";


    checkreadyforsubmit();
})

function checkreadyforsubmit(){
    const {pending_fields, existing_fields} = window.currentConf;
    const conf_meta = window.currentConf.meta;
    const required_meta = ['short_title', 'long_title',"research_domain"];
    const meta_filled = required_meta.every(field => 
        conf_meta[field] && conf_meta[field].toString().trim() !== ""
    );
    const has_pending = Object.keys(pending_fields).length > 0;
    const pending_done = Object.values(pending_fields).every(f=> f.selected == true);
    const has_existing = Object.keys(existing_fields).length > 0;
    
    const fields_ok = has_pending ? pending_done : has_existing;
    // if fields changed, it depends on if they were successfully completed or not
    // if fields arent changed (fields meaning the confer fields), it depends if any exist or not
    // user can submit if required meta fields are updated/added or confer fields are updated/ added or both
    submitbtn.disabled = !(meta_filled && fields_ok);
}


submitbtn.addEventListener("click",()=>{
    chrome.runtime.sendMessage({
        type: "SUBMIT_CONFERENCE",
        conf_id: window.currentConf.conf_id,
        meta: window.currentConf.meta
    });
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== "SUBMIT_RESULT") return;
    if (msg.success) {
        showToast("Submitted to Dashboard", "success");
    } else {
        showToast("Error submitting. Try Again!", "error");
    }
});

function showToast(message, type) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast toast-" + type + " toast-show";
    setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}

document.getElementById("themeToggle").addEventListener("change", () => {
  document.body.classList.toggle("dark");
})

// keywords tag-style input with autocomplete
const kwInput = document.getElementById("keywords");
const kwSuggestions = document.getElementById("keywordSuggestions");
const kwTagsContainer = document.getElementById("kwTags");
let kwDebounce = null;
let kwSaveTimeout = null;
let keywordsList = [];

function syncKeywordsMeta() {
    window.currentConf.meta["keywords"] = [...keywordsList];
    clearTimeout(kwSaveTimeout);
    kwSaveTimeout = setTimeout(() => {
        const conf_id = window.currentConf.conf_id;
        chrome.storage.local.get(conf_id).then(data => {
            const conf = data[conf_id] || { fields: {}, meta: {} };
            conf.meta = { ...conf.meta, ...window.currentConf.meta };
            chrome.storage.local.set({ [conf_id]: conf });
        });
    }, 500);
}

function renderTags() {
    kwTagsContainer.innerHTML = "";
    keywordsList.forEach((kw, i) => {
        const tag = document.createElement("span");
        tag.className = "kw-tag";
        tag.textContent = kw;
        const removeBtn = document.createElement("span");
        removeBtn.className = "remove-tag";
        removeBtn.dataset.idx = i;
        removeBtn.textContent = "\u00d7";
        tag.appendChild(removeBtn);
        kwTagsContainer.appendChild(tag);
    });
}

function addKeyword(val) {
    const kw = val.trim();
    if (kw && !keywordsList.includes(kw)) {
        keywordsList.push(kw);
        renderTags();
        syncKeywordsMeta();
    }
    kwInput.value = "";
    kwSuggestions.innerHTML = "";
}

kwTagsContainer.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".remove-tag");
    if (!removeBtn) return;
    keywordsList.splice(parseInt(removeBtn.dataset.idx), 1);
    renderTags();
    syncKeywordsMeta();
});

kwInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addKeyword(kwInput.value);
    }
    if (e.key === "Backspace" && kwInput.value === "" && keywordsList.length > 0) {
        keywordsList.pop();
        renderTags();
        syncKeywordsMeta();
    }
});

kwInput.addEventListener("input", () => {
    clearTimeout(kwDebounce);
    const q = kwInput.value.trim();

    if (q.length < 1) {
        kwSuggestions.innerHTML = "";
        return;
    }

    kwDebounce = setTimeout(async () => {
        try {
            const items = await chrome.runtime.sendMessage({
                type: "FETCH_KEYWORDS",
                query: q
            });

            kwSuggestions.innerHTML = "";

            items
                .filter(item => !keywordsList.includes(item))
                .forEach(item => {
                    const div = document.createElement("div");
                    div.className = "suggestion-item";
                    div.textContent = item;
                    div.addEventListener("click", () => addKeyword(item));
                    kwSuggestions.appendChild(div);
                });

        } catch (err) {
            kwSuggestions.innerHTML = "";
        }
    }, 300);
});

document.addEventListener("click", (e) => {
    if (!e.target.closest(".tag-input-wrap")) {
        kwSuggestions.innerHTML = "";
    }
});


initAuth();