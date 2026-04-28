import { runScraperWorker } from "./scraperWorker.js";
import { closeBrowser } from "./browser.js";

let scrapeInProgress = false;
let rerunRequested = false;
let afterScrapeCompleteHandler = null;

export function setAfterScrapeCompleteHandler(handler) {
    afterScrapeCompleteHandler = handler;
}

async function runScrapeCycle(triggerSource) {
    scrapeInProgress = true;
    try {
        console.log(`scraper starting (${triggerSource})`);
        await runScraperWorker();
        console.log("scraper finished");
    }
    catch (err) {
        console.error("scraper failed with error:", err.message);
    }
    finally {
        await closeBrowser();
        scrapeInProgress = false;
    }

    if (afterScrapeCompleteHandler) {
        afterScrapeCompleteHandler();
    }

    if (rerunRequested) {
        rerunRequested = false;
        return runScrapeCycle("queued-trigger");
    }

    return { started: true };
}

export async function requestScrapeRun(triggerSource = "manual") {
    if (scrapeInProgress) {
        rerunRequested = true;
        console.log(`scraper already running, queued another pass (${triggerSource})`);
        return { started: false, queued: true };
    }

    return runScrapeCycle(triggerSource);
}