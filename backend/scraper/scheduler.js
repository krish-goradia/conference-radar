import { requestScrapeRun } from "./runController.js";
import { setAfterScrapeCompleteHandler } from "./runController.js";

const HOURS = parseFloat(process.env.SCRAPER_HOURS)
const DELAY = HOURS*60*60*1000

let waitTimeout = null;
let waitResolve = null;

function startWait(ms){
    return new Promise(resolve => {
        waitResolve = resolve;
        waitTimeout = setTimeout(() => {
            waitTimeout = null;
            waitResolve = null;
            resolve();
        }, ms);
    });
}

function resetWait(){
    if (!waitTimeout || !waitResolve) {
        return;
    }

    clearTimeout(waitTimeout);
    // restart the countdown and log that we've reset the wait
    console.log(`resetting wait — next run in ${HOURS} hours`);
    waitTimeout = setTimeout(() => {
        const resolve = waitResolve;
        waitTimeout = null;
        waitResolve = null;
        resolve();
    }, DELAY);
}

export async function startScheduler(){
    console.log("Scheduler started")
    setAfterScrapeCompleteHandler(resetWait);
    while(true){
        await requestScrapeRun("scheduled")
        console.log(`waiting ${HOURS} hours before next run`)
        await startWait(DELAY)
    }
}