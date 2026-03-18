
// async function getConferenceStatefromChrome(identifier){
//     const data = await chrome.storage.local.get(identifier)
//     const state = data[identifier] === undefined 
//     return state;
// }

async function getConferenceStatefromDB(identifier){
    try{
        const {token} = await chrome.storage.local.get("token");
        const res = await fetch(`http://localhost:5000/confgetbyid?conf_ext_id=${identifier}`, {
                headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        return data;
    }
    catch(err){
        console.error("DB Check Conf State Error", err);
        return {success:false}; // exists means success connection but not there
    }
}

chrome.runtime.onMessage.addListener(async (msg,sender,send_resp)=>{
    if (msg.type !== "PANEL_OPEN") return;
    const tab = await chrome.tabs.get(msg.tabId);
    const url = new URL(tab.url);
    const confer_id = url.hostname + url.pathname;
    // im checking with db
    let conf_data = await getConferenceStatefromDB(confer_id);
    let state;
    // if(conf_data.success === false){
    //     window.alert("Server is down! Try Again Later")
    // } work on this error handling and other cases as well
    if(conf_data.success === false || conf_data.exists === false){
        // im checking with chrome storage
        const data = await chrome.storage.local.get(confer_id);
        state = data[confer_id] === undefined;
        conf_data = data[confer_id] || {fields:{},meta:{}}; // NOT DB AND NOT CHROME then new so default  
    }
    else{
        state = false;
        conf_data = {fields:conf_data.fields, meta: conf_data.meta};
    }
    conf_data.meta["conf_URL"]=tab.url;
    chrome.runtime.sendMessage({
        type: "CONFERENCE_READY",
        isNew: state,
        conf_id: confer_id, 
        existing_fields: conf_data ? conf_data.fields : {},
        meta: conf_data.meta  
    })

})

chrome.runtime.onMessage.addListener(async(msg)=>{
    if(msg.type!=="AUTH_REQUEST") return;
    const endpoint = msg.action === "login" ? "login" :"signup"
    try{
        const res = await fetch(`http://localhost:5000/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: msg.email, password: msg.password })
        });
        const data = await res.json();
        if(!data.success) throw new Error (data.error || `${msg.action} failed`);
        await chrome.storage.local.set({token:data.token});
        chrome.runtime.sendMessage({type:"AUTH_RESULT",success:true});
    }
    catch(err){
        chrome.runtime.sendMessage({type:"AUTH_RESULT",success:false,error:err.message});
    }
})




chrome.runtime.onMessage.addListener(async (msg,sender)=>{
    if(msg.type!=="FIELD_SELECTED") return;
    const tabId = sender.tab.id;
    const url = new URL(sender.tab.url)
    const confer_id = url.hostname+url.pathname;
    const data = await chrome.storage.local.get(confer_id);
    const conf = data[confer_id] || {fields:{},meta:{}};
    const mode = msg.mode;
    conf.meta["conf_URL"] = url.href;
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
    // const data = await chrome.storage.local.get(msg.conf_id);
    // const conf = data[msg.conf_id] || { fields: {}, meta: {} };
    // conf.meta = { ...conf.meta, ...msg.meta };
    // await chrome.storage.local.set({ [msg.conf_id]: conf });
    // console.log("Conference saved:", msg.conf_id, conf);
    const confer_id = msg.conf_id;
    const data = await chrome.storage.local.get(confer_id);
    const conf = data[confer_id];
    if(!conf){
        console.log("No conference data found");
        return;
    }
    try{
        const {token} = await chrome.storage.local.get("token");
        const res = await fetch("http://localhost:5000/submit-conference",{
            method : "POST",
            headers: {
                "Content-Type":"application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                conf_ext_id: confer_id,
                fields:conf.fields,
                meta: conf.meta
            })

        });
        const result = await res.json();
        if(result.success){
            console.log("saved to db", confer_id);
            await chrome.storage.local.remove(confer_id);
            chrome.runtime.sendMessage({ type: "SUBMIT_RESULT", success: true });
        }
        else{
            console.error("save failed", confer_id);
            chrome.runtime.sendMessage({ type: "SUBMIT_RESULT", success: false });
        }
    }
    catch(err){
        console.log("error with backend", err)
        chrome.runtime.sendMessage({ type: "SUBMIT_RESULT", success: false });
    }
});