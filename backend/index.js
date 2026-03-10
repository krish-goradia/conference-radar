require("dotenv").config()
const express = require("express")
const {Pool} = require("pg")
const cors = require("cors")

const  app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool( {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
})

app.get("/",(req,res)=>{
    res.send("Backend Running")
})

app.get("/conferences", async (req,res)=>{
    try{
        const result = await pool.query("SELECT * FROM CONFERENCES");
        res.json(result.rows);
    }
    catch (err){
        res.status(500).json({error: err.message,success:false});

    }
})

app.get("/scrape-configs",async(req,res)=>{
    try{
        const result = await pool.query("SELECT * FROM SCRAPE_CONFIGS");
        res.json(result.rows);
    }
    catch (err){
        res.status(500).json({error:err.message,success:false})
    }
})

app.listen(process.env.PORT, ()=>{
    console.log("Server running on 5000")
})

// my endpoints
// query by rawid

app.get("/confgetbyid",async(req,res)=>{
    try{
        const {conf_ext_id} = req.query;
        if(!conf_ext_id){
            return res.status(400).json({error: "conf_ext_id is required",success:false});
        }
        const result = await pool.query(
            `SELECT 
                sc.absdeadline_xpath,
                sc.papdeadline_xpath,
                sc.confdate_xpath,
                sc.conftime_xpath,
                sc.confvenue_xpath,
                sc.conf_url,
                sc.conf_ext_id,
                c.abs_time,
                c.paper_time,
                c.short_title,
                c.long_title,
                c.research_domain,
                c.keywords
             FROM scrape_configs sc
             LEFT JOIN conferences c
             ON c.config_id = sc.id
             WHERE sc.conf_ext_id = $1`,
            [conf_ext_id]
        );
        if (result.rowCount==0) return res.json({exists:false});
        const row = result.rows[0];

        res.json({
            exists: true,
            confer_id: row.conf_ext_id,
            fields:{
                abs_deadline: {xpath:row.absdeadline_xpath},
                abs_time: {value: row.abs_time},
                paper_deadline: {xpath: row.papdeadline_xpath},
                paper_time: {value: row.paper_time},
                conf_date: {xpath:row.confdate_xpath},
                conf_time: {xpath: row.conftime_xpath},
                conf_venue:{xpath: row.confvenue_xpath}
            },
            meta: {
                conf_URL: row.conf_url,
                short_title: row.short_title,
                long_title: row.long_title,
                research_domain: row.research_domain,
                keywords: row.keywords
            }
        });
    }
    catch(err){
        console.error(err);
        res.status(500).json({error: err.message,success:false});
    }
    
})


// submit endpoint
app.post("/submit-conference",async(req,res)=>{
    const client = await pool.connect();
    try{
        const{
            conf_ext_id,
            fields,
            meta
        } = req.body;
        if(!conf_ext_id) return res.status(400).json({error: "conf_ext_id is required"});

        await client.query("BEGIN");
        const scrape_result = await client.query(
        `INSERT INTO scrape_configs (
            conf_url,
            conf_ext_id,
            absdeadline_xpath,
            papdeadline_xpath,
            confdate_xpath,
            conftime_xpath,
            confvenue_xpath
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (conf_ext_id)
        DO UPDATE SET
            conf_url = COALESCE(EXCLUDED.conf_url, scrape_configs.conf_url),
            absdeadline_xpath = COALESCE(EXCLUDED.absdeadline_xpath, scrape_configs.absdeadline_xpath),
            papdeadline_xpath = COALESCE(EXCLUDED.papdeadline_xpath, scrape_configs.papdeadline_xpath),
            confdate_xpath = COALESCE(EXCLUDED.confdate_xpath, scrape_configs.confdate_xpath),
            conftime_xpath = COALESCE(EXCLUDED.conftime_xpath, scrape_configs.conftime_xpath),
            confvenue_xpath = COALESCE(EXCLUDED.confvenue_xpath, scrape_configs.confvenue_xpath)
        RETURNING id`,
        [
            meta.conf_URL,
            conf_ext_id,
            fields.abs_deadline?.xpath || null,
            fields.paper_deadline?.xpath || null,
            fields.conf_date?.xpath || null,
            fields.confer_time?.xpath || null,
            fields.confer_venue?.xpath || null
        ]
        );
        const config_id = scrape_result.rows[0].id;
        const conf_result = await client.query(
            `INSERT INTO conferences (
                config_id,
                short_title,
                long_title,
                research_domain,
                keywords,
                abs_time,
                paper_time
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (config_id)
            DO UPDATE SET
                short_title = COALESCE(EXCLUDED.short_title, conferences.short_title),
                long_title = COALESCE(EXCLUDED.long_title, conferences.long_title),
                research_domain = COALESCE(EXCLUDED.research_domain, conferences.research_domain),
                keywords = COALESCE(EXCLUDED.keywords, conferences.keywords),
                abs_time = COALESCE(EXCLUDED.abs_time, conferences.abs_time),
                paper_time = COALESCE(EXCLUDED.paper_time, conferences.paper_time)`,
            [
                config_id,
                meta.short_title || null,
                meta.long_title || null,
                meta.research_domain || null,
                meta.keywords ? meta.keywords : null,
                fields.abs_time?.value || null,
                fields.paper_time?.value || null
            ]
            );

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            conf_ext_id 
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});
