import {runScraperWorker} from "./scraperWorker.js";
import {closeBrowser} from "./browser.js";

const HOURS = 0.16
const DELAY = HOURS*60*60*1000

function sleep(ms){
    return new Promise(resolve=>setTimeout(resolve,ms))
}

export async function startScheduler(){
    console.log("Scheduler started")
    while(true){
        console.log("scraper starting to run")
        try{
            await runScraperWorker();
            console.log("scraper finished")
        }
        catch(err){
            console.error("scraper failed with error:",err.message)
        }
        finally{
            await closeBrowser();
        }
        console.log(`waiting ${HOURS} hours before next run`)
        await sleep(DELAY)
    }
}