import pool from "../db.js"
import {getPage} from "./browser.js"
import { extractFields } from "./extractor.js"
import {handleFields} from "./fieldHandler.js"

export async function runScraperWorker(){
    console.log("fetching all configs")
    const result = await pool.query(`
        SELECT sc.*, c.conf_id, c.abs_deadline, c.abs_time, c.paper_deadline,
               c.paper_time, c.confer_date, c.confer_time, c.confer_venue
        FROM scrape_configs sc
        JOIN conferences c
        ON sc.id = c.config_id
    `)
    const configs = result?.rows || []
    console.log(`found ${configs.length} configs`)

    for(const config of configs){
        if(!config.conf_id || !config.conf_url) {
            console.error(`skipping config ${config.id}: missing conf_id or conf_url`)
            continue
        }
        const page = await getPage()
        try{
            console.log(`scraping ${config.conf_url}`)
            await page.goto(config.conf_url,{
                waitUntil:"domcontentloaded",
                timeout:30000
            })
            const raw = await extractFields(page, config)
            const normalized = handleFields(raw)

            const fields = ["abs_deadline","abs_time","paper_deadline","paper_time","confer_date","confer_time","confer_venue"]

            // Only consider fields that were actually scraped (non-null)
            // AND differ from what's already stored
            const changedFields = fields.filter(f =>
                normalized[f] !== null &&
                normalized[f] !== undefined &&
                normalized[f] !== config[f]
            )

            if(changedFields.length === 0){
                console.log(`no change (or no new data) for ${config.conf_url}`)
                continue
            }

            // Build a partial UPDATE for only the changed fields
            const setClauses = changedFields.map((f, i) => `${f} = $${i + 1}`)
            const values = changedFields.map(f => normalized[f])
            values.push(config.conf_id) // for the WHERE clause

            const update = await pool.query(`
                UPDATE conferences
                SET ${setClauses.join(", ")}, updated_at = NOW()
                WHERE conf_id = $${values.length}
            `, values)

            if(update.rowCount === 0) console.log(`no rows updated for ${config.conf_url}`)
            else console.log(`updated [${changedFields.join(", ")}] for ${config.conf_url}`)
        }
        catch(err){
            console.error(`failed scraping ${config.conf_url}:`, err.message)
        }
        finally{
            if(page) await page.close().catch(e => console.error(`page close error:`, e.message))
        }
    }
    console.log("scraper run completed")
}