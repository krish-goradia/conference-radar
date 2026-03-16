import {chromium} from "playwright"
let browser = null;

export async function getBrowser(){
    if(!browser){
        browser = await chromium.launch({
            headless: true
        });
    }
    return browser;
}

export async function closeBrowser(){
    if(browser){
        await browser.close();
        browser = null;
    }
}

export async function getPage(){
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();
    await page.route("**/*",route=>{
        const type = route.request().resourceType();
        if(["image","font","media","stylesheet"].includes(type)){
            route.abort();
        }
        else{
            route.continue();
        }
    });
    return page;
}