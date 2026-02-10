
async function getConferenceState(identifier){
    const data = await chrome.storage.local.get(identifier)
    const state = data[identifier] === undefined 
    return state;
}


chrome.runtime.onMessage.addListener(async (msg,sender,send_resp)=>{
    if (msg.type !== "PANEL_OPEN") return;
    const tab = await chrome.tabs.get(msg.tabId);
    const url = new URL(tab.url);
    const rawId = url.hostname + url.pathname;
    const state = await getConferenceState(rawId);
    const data = await chrome.storage.local.get(rawId);
    const conf_data = data[rawId] || {fields:{},meta:{}};
    conf_data.meta["URL"]=tab.url;
    
    chrome.runtime.sendMessage({
        type: "CONFERENCE_READY",
        isNew: state,
        conf_id: rawId, 
        existing_fields: conf_data ? conf_data.fields : {},
        meta: conf_data.meta  
    })

})

chrome.runtime.onMessage.addListener(async (msg,sender)=>{
    if(msg.type!=="FIELD_SELECTED") return;
    const tabId = sender.tab.id;
    const url = new URL(sender.tab.url)
    const confer_id = url.hostname+url.pathname;
    const data = await chrome.storage.local.get(confer_id);
    const conf = data[confer_id] || {fields:{},meta:{}};
    const mode = msg.mode;

    conf.fields[msg.fieldkey]={
        ...conf.fields[msg.fieldkey],
        label:msg.fieldkey,
        xpath:msg.xpath,
        lastconfirmed: Date.now(),
        selected: true
    };

    await chrome.storage.local.set({[confer_id]:conf});
    chrome.runtime.sendMessage({
        type:"FIELD_ADDED",
        fieldkey:msg.fieldkey,
        mode
    });

})
chrome.runtime.onMessage.addListener(async (msg) => {
    if(msg.type !== "SUBMIT_CONFERENCE") return;
    console.log("Conference submitted:", msg.conf_id);
    // const data = await chrome.storage.local.get(msg.conf_id);
    // console.log(data);
});