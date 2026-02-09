(function(){

if (window.alreadycontentpresent) {
    return;
}
window.alreadycontentpresent= true;

let currentfieldkey = null;
let listenersActive = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "START_SELECTION") {
        currentfieldkey = msg.fieldkey;
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
        xpath:xpath
    });

    currentfieldkey = null;
}

function getxpath(element){
    if(element.id) return `//*[@id="${element.id}"]`;
    if(element === document.body) return '/html/body';
     
    let cnt = 0;
    const siblings = element.parentNode.childNodes;
    for(let i = 0;i<siblings.length;i++){
        const sib = siblings[i];
        if(sib === element){
            return getxpath(element.parentNode) + "/" + element.tagName.toLowerCase() + `[${cnt+1}]`;
        }
        if(sib.nodeType === 1 && sib.tagName === element.tagName){
            cnt++;
        }
    } 
    return null;
}

})();