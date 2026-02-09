(function(){

if (window.alreadycontentpresent) {
    return;
}
window.alreadycontentpresent= true;

let currentfieldkey = null;
let listenersActive = false;
let mode = null;
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "START_SELECTION") {
        currentfieldkey = msg.fieldkey;
        mode = msg.mode;
        enableclickget();
        
    }
})

function enableclickget(){
    if (listenersActive) {
        return;
    }
    listenersActive = true;
    document.body.style.cursor = "crosshair";
    document.addEventListener("click",onelementclick,true);
    document.addEventListener("mouseover",onhoveringelement,true);
    document.addEventListener("mouseout",onunhoveringelement,true);
}

function disableclickget(){
    if (!listenersActive) {
        return;
    }
    listenersActive = false;
    document.body.style.cursor = "";
    if(previoushovered) previoushovered.style.outline = "";
    document.removeEventListener("click",onelementclick,true);
    document.removeEventListener("mouseover",onhoveringelement,true);
    document.removeEventListener("mouseout",onunhoveringelement,true);
}

let previoushovered = null;
function onhoveringelement(e){
    if(previoushovered) previoushovered.style.outline = "";
    e.target.style.outline = "2px solid yellow";
    previoushovered = e.target;
}
function onunhoveringelement(e){
    e.target.style.outline = "";    
}
function onelementclick(e){
    e.preventDefault();
    e.stopPropagation();
    if(e.target) e.target.style.outline = "";
    disableclickget();

    const xpath = getxpath(e.target);
    chrome.runtime.sendMessage({
        type:"FIELD_SELECTED",
        fieldkey: currentfieldkey,
        xpath:xpath,
        mode
    });

    currentfieldkey = null;
}

function getxpath(element){
    let path = "";
    let current = element;
    while(current && current.nodeType===1){
        const parent = current.parentNode;
        const siblings = Array.from(parent.children).filter(e=> e.tagName === current.tagName);
        const index = siblings.indexOf(current)+1;
        const segment = current.tagName.toLowerCase() + `[${index}]`;
        path = segment + (path?"/"+path : "");
        const xpath = "//"+path;
        const result = document.evaluate(xpath,document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
        if(result.snapshotLength===1) return xpath;
        current = parent;
    }
    return "//" + path;
}
})();