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
        const result = await pool.query("SELECT * FROM CONFERENCES")
        res.json(result.rows)
    }
    catch (err){
        res.status(500).json({error: err.message})

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
            return res.status(400).json({error: "conf_ext_id is required"});
        }
        const result = await pool.query(
            `SELECT 
                sc.*,
                c.conf_id,
                c.name,
                c.date
             FROM scrape_configs sc
             LEFT JOIN conferences c
             ON c.config_id = sc.id
             WHERE sc.raw_id = $1`,
            [conf_ext_id]
        );
        if (result.rowCount==0) return res.json({exists:false});
        res.json({
            exists: true,
            data: result.rows[0]
        });
    }
    catch(err){
        console.error(err);
        res.status(500).json({error: err.message});
    }
    
})


// submit endpoint
app.post("/submit-conference",async(req,res)=>{
    const client = pool.connect();
    try{
        await client.query("BEGIN");
        const{
            conf_ext_id,
            fields,
            meta
        } = req.body;

        if(!conf_ext_id) return res.status(400).json({error: "conf_ext_id is required"});

        const scrape_result = await client.query(
            `INSERT INTO scrape_configs (
                conf_url,
                raw_id,
                absdeadline_xpath,
                papdeadline_xpath,
                confdate_xpath,
                conftime_xpath,
                confvenue_xpath
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
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
        const config_id = scrape_result.row[0].id;
        const conf_result = await client.query(
            `INSERT INTO conferences (
                conf_ext_id,
                config_id,
                short_title,
                long_title,
                research_domain,
                keywords
            )
            VALUES ($1,$2,$3,$4,$5,$6)`,
            [
                conf_ext_id,
                config_id,
                meta.short_title || null,
                meta.long_title || null,
                meta.research_domain || null,
                meta.keywords ? [meta.keywords] : null
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
