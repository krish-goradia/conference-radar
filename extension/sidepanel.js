const fieldSelect = document.getElementById("add_field");
const fieldContainer = document.getElementById("field_container");
const submitbtn = document.getElementById("submitbtn");

async function panelopen(){
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});

    chrome.runtime.sendMessage({
        type:"PANEL_OPEN",
        tabId: tab.id
    });
}

setTimeout(panelopen,100);


chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.type != "CONFERENCE_READY") return;

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
    if(!isNew){
        for(let fieldkey in existing_fields){
            const field = existing_fields[fieldkey]
            showfieldUI(fieldkey,field.label,true);
        }
    }
    else{
        document.getElementById("field_container").innerHTML = "";
    }
    if(meta){
        document.getElementById("conference_name").textContent = meta.name;
    }
}
function showfieldUI(fieldkey,label,isDone){
    const div = document.createElement("div");
    div.id = `field-${fieldkey}`;
    div.textContent = label + (isDone ? " DONE ✅" : "");
    fieldContainer.appendChild(div);
}


fieldSelect.addEventListener("change", async(eve)=>{
    const fieldkey = eve.target.value;
    if(!fieldkey) return;
    const {existing_fields,pending_fields} = window.currentConf;
    if(existing_fields[fieldkey] || pending_fields[fieldkey]){
        alert("This field has been added");
        return;
    }
    pending_fields[fieldkey] = {selected:false};
    addnewfieldtoUI(fieldkey);

    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    chrome.tabs.sendMessage(tab.id,{
            type: "START_SELECTION",
            fieldkey
        });
    
    fieldSelect.value = "";

})

function addnewfieldtoUI(fieldkey){
    const div = document.createElement("div");
    div.id = `field-${fieldkey}`;
    div.textContent = fieldkey + "(selecting in progress...)";
    fieldContainer.appendChild(div);
}

chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.type!="FIELD_ADDED") return;
    const {fieldkey} = msg;
    window.currentConf.pending_fields[fieldkey].selected=true;
    const div = document.getElementById(`field-${fieldkey}`);
    if(div) div.textContent = fieldkey + "DONE ✅";

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