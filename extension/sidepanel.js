
const btnContainer = document.getElementById("btn_container");
const submitbtn = document.getElementById("submitBtn");
let currenttabid = null;

const FIELD_LABELS = {
    "confer_place" : "Conference Place",
    "paper_deadline": "Paper Deadline",
    "abs_deadline": "Abstract Deadline"
}

async function panelopen(){
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});

    chrome.runtime.sendMessage({
        type:"PANEL_OPEN",
        tabId: tab.id
    });
}

setTimeout(panelopen,100);
chrome.tabs.onActivated.addListener(async(activeinfo)=>{
    currenttabid = activeinfo.tabId;
    chrome.runtime.sendMessage({
        type:"PANEL_OPEN",
        tabId: currenttabid
    })
})

chrome.tabs.onUpdated.addListener(async(tabId,changeinfo,tab)=>{
    if(tabId == currenttabid &&changeinfo.url){
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

function showInitialUI(isNew,existing_fields,meta){
    // Reset button states (buttons are static in HTML now)
    const div = document.getElementById("conf_URL");
    div.textContent = meta["URL"];
    if(!isNew){
        for(let fieldkey in existing_fields){
            const field = existing_fields[fieldkey]
            showfieldUI(fieldkey,field.label,true);
        }
    }
    // if(meta){
    //     document.getElementById("conference_name").textContent = meta.name;
    // }
}
function showfieldUI(fieldkey,label,isDone){
    const div = document.querySelector(`#${fieldkey} .status`)
    // div.id = `field-${fieldkey}`;
    div.textContent = (isDone ? "Selected" : "Not Set");
    //fieldContainer.appendChild(div);
    if(isDone){
        const btn = document.querySelector(`#${fieldkey}`);
        if(btn){
            btn.dataset.mode = "edit"
        }
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
        if(div) div.textContent = " Selecting...";
    }
    if(mode == "edit"){
        const div = document.querySelector(`#${fieldkey} .status`)
        if(div) div.textContent = " Reselecting...";
    }
    
}

chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.type!="FIELD_ADDED") return;
    const {fieldkey} = msg;
    window.currentConf.pending_fields[fieldkey].selected=true;
    const div = document.querySelector(`#${fieldkey} .status`);
    const mode = msg.mode;
    const buttons = btnContainer.querySelectorAll(".mybutton");
    buttons.forEach(b=>{
        b.disabled=false;
    })
    if(div && mode == "new"){
        div.textContent ="Selected ✅";
        btnContainer.querySelector(`#${fieldkey}`).dataset.mode = "edit";
        const action = btnContainer.querySelector(`#${fieldkey} .action`);
        if(action) action.textContent = "Click to reselect";
    }
    if(div && mode == "edit") div.textContent = "Reselected ✅";


    checkreadyforsubmit();
})

function checkreadyforsubmit(){
    const {pending_fields} = window.currentConf;
    const done = Object.values(pending_fields).every(f=> f.selected == true);
    submitbtn.disabled = !done;
}

submitbtn.addEventListener("click",()=>{
    chrome.runtime.sendMessage({
        type: "SUBMIT_CONFERENCE",
        conf_id: window.currentConf.conf_id
    });
});

document.getElementById("themeToggle").addEventListener("change", () => {
  document.body.classList.toggle("dark");
})