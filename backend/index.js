import dotenv from "dotenv"
dotenv.config()
import express from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import cors from "cors"
import { startScheduler } from "./scraper/scheduler.js"
import { auth } from "./auth.js"
import pool from "./db.js"

const  app = express()
app.use(cors())
app.use(express.json())

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
    console.log(`Server running on ${process.env.PORT}`)
    startScheduler()
})

// my endpoints
// query by rawid

app.get("/confgetbyid",auth,async(req,res)=>{
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

// endpoint for autocomplete keywords
app.get("/autocomplete/keywords",auth,async(req,res)=>{
    try{
        const q = req.query.q || "";
        
        const result = await pool.query(`
            SELECT DISTINCT kw
            FROM (
                SELECT unnest(keywords) AS kw
                FROM conferences
            ) t
            WHERE LOWER(kw) LIKE LOWER($1)
            LIMIT 10
        `, [`%${q}%`]);

        res.json(result.rows.map(r => r.kw));
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
});

// endpoint for autocomplete research domain

// submit endpoint
app.post("/submit-conference",auth,async(req,res)=>{
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
            confvenue_xpath,
            abstime_xpath,
            papertime_xpath
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (conf_ext_id)
        DO UPDATE SET
            conf_url = COALESCE(EXCLUDED.conf_url, scrape_configs.conf_url),
            absdeadline_xpath = COALESCE(EXCLUDED.absdeadline_xpath, scrape_configs.absdeadline_xpath),
            papdeadline_xpath = COALESCE(EXCLUDED.papdeadline_xpath, scrape_configs.papdeadline_xpath),
            confdate_xpath = COALESCE(EXCLUDED.confdate_xpath, scrape_configs.confdate_xpath),
            conftime_xpath = COALESCE(EXCLUDED.conftime_xpath, scrape_configs.conftime_xpath),
            confvenue_xpath = COALESCE(EXCLUDED.confvenue_xpath, scrape_configs.confvenue_xpath),
            abstime_xpath = COALESCE(EXCLUDED.abstime_xpath, scrape_configs.abstime_xpath),
            papertime_xpath = COALESCE(EXCLUDED.papertime_xpath,scrape_configs.papertime_xpath)
        RETURNING id`,
        [
            meta.conf_URL,
            conf_ext_id,
            fields.abs_deadline?.xpath || null,
            fields.paper_deadline?.xpath || null,
            fields.conf_date?.xpath || null,
            fields.confer_time?.xpath || null,
            fields.confer_venue?.xpath || null,
            fields.abs_time?.xpath|| null,
            fields.paper_time?.xpath || null
        ]
        );
        const config_id = scrape_result.rows[0].id;
        const conf_result = await client.query(
            `INSERT INTO conferences (
                config_id,
                user_id,
                short_title,
                long_title,
                research_domain,
                keywords,
                abs_timezone,
                paper_timezone
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (config_id)
            DO UPDATE SET
                short_title = COALESCE(EXCLUDED.short_title, conferences.short_title),
                long_title = COALESCE(EXCLUDED.long_title, conferences.long_title),
                research_domain = COALESCE(EXCLUDED.research_domain, conferences.research_domain),
                keywords = COALESCE(EXCLUDED.keywords, conferences.keywords),
                abs_timezone = COALESCE(EXCLUDED.abs_timezone, conferences.abs_timezone),
                paper_timezone = COALESCE(EXCLUDED.paper_timezone, conferences.paper_timezone)`,
            [
                config_id,
                req.userId,
                meta.short_title || null,
                meta.long_title || null,
                meta.research_domain || null,
                meta.keywords ? meta.keywords : null,
                fields.abs_timezone?.value || null,
                fields.paper_timezone?.value || null
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

app.post("/signup",async(req,res)=>{
    const {email,password} = req.body
    const hash = await bcrypt.hash(password,10)
    try{
        const user = await pool.query(
        "INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id",
        [email, hash]
        )
        const token = jwt.sign(
            {userId: user.rows[0].id},
            process.env.JWT_SECRET_KEY,
            {expiresIn:"7d"}
        )
        res.json({success:true,token})
    }
    catch(err){
        if(err.code === "23505"){
            return res.status(400).json({
                success:false,
                error: "Email already exists"
            })
        }
        res.status(500).json({error:"Server Error",success:false})
    }
})

app.post("/login",async(req,res)=>{
    try{
        const {email,password} = req.body
        const user = await pool.query(
            "SELECT * FROM users WHERE email=$1",
            [email]
        )
        if(user.rows.length === 0){
            return res.status(401).json({success:false, error: "Dont have account"})
        }
        const valid = await bcrypt.compare(password,user.rows[0].password_hash)
        if(!valid){
            return res.status(401).json({success:false, error:"Invalid credentials"})
        }
        const token = jwt.sign(
            {userId: user.rows[0].id},
            process.env.JWT_SECRET_KEY,
            {expiresIn:"7d"}
        )
        res.json({success:true,token})
    }
    catch(err){
        console.error(err)
        res.status(500).json({
            success:false,
            error:"Server Error"
        })
    }
})



