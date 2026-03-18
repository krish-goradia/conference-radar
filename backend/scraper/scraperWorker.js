import pool from "../db.js"
import {getPage} from "./browser.js"
import { extractFields } from "./extractor.js"
import {handleFields} from "./fieldHandler.js"

export async function runScraperWorker(){
    console.log("fetching all configs")
    const result = await pool.query(`
        SELECT sc.*, c.conf_id
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
            const raw = await extractFields(page,config)
            const normalized = handleFields(raw)
            const update = await pool.query(`
                    UPDATE conferences
                    SET
                        abs_deadline = $1,
                        abs_time = $2,
                        paper_deadline = $3,
                        paper_time = $4,
                        confer_date = $5,
                        confer_time = $6,
                        confer_venue = $7,
                        updated_at = NOW()
                    WHERE conf_id = $8
                    AND (
                        abs_deadline IS DISTINCT FROM $1 OR
                        abs_time IS DISTINCT FROM $2 OR
                        paper_deadline IS DISTINCT FROM $3 OR
                        paper_time IS DISTINCT FROM $4 OR
                        confer_date IS DISTINCT FROM $5 OR
                        confer_time IS DISTINCT FROM $6 OR
                        confer_venue IS DISTINCT FROM $7
                    )
                `, [
                    normalized.abs_deadline,
                    normalized.abs_time,
                    normalized.paper_deadline,
                    normalized.paper_time,
                    normalized.confer_date,
                    normalized.confer_time,
                    normalized.confer_venue,
                    config.conf_id
                ])
            if(update.rowCount === 0) console.log(`no change for ${config.conf_url}`)
            else console.log(`updated ${config.conf_url}`)
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
