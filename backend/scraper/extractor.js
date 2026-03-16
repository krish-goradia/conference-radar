import {runOCR} from "./ocr.js"

async function getField(page,xpath){
    if(!xpath) return null
    try{
        const locator = page.locator(`xpath=${xpath}`)
        const el = locator.first()
        if(!(await el.count())){
            console.debug(`xpath not found: ${xpath}`)
            return null
        }
        const tag = await el.evaluate(e=>e.tagName.toLowerCase())
        if(tag === "img"){
            const src = await el.getAttribute("src")
            if(!src) {
                console.debug(`img src empty for xpath: ${xpath}`)
                return null
            }
            const fullURL = new URL(src,page.url()).href
            return await runOCR(fullURL)
        }
        const text = await el.textContent()
        return text ? text.trim():null
    }
    catch(err){
        console.error(`error extracting field xpath=${xpath}:`, err.message)
        return null
    }
}

export async function extractFields(page,config){
    return {
        abs_deadline: await getField(page, config.absdeadline_xpath),
        abs_time: await getField(page, config.abstime_xpath),
        paper_deadline: await getField(page, config.papdeadline_xpath),
        paper_time: await getField(page, config.papertime_xpath),
        confer_date: await getField(page, config.confdate_xpath),
        confer_time: await getField(page, config.conftime_xpath),
        confer_venue: await getField(page, config.confvenue_xpath)
    }
}