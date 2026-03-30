
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

// Timezone conversion utility
function getServerTimezoneOffset() {
  const offsetMinutes = new Date().getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;
  return offsetHours;
}

function convertUTCToServerTimezone(utcDate) {
  if (!utcDate) return null;
  
  const date = new Date(utcDate);
  const serverOffset = getServerTimezoneOffset();
  
  const utcTime = date.getTime();
  const serverOffsetMs = serverOffset * 60 * 60 * 1000;
  const serverDate = new Date(utcTime + serverOffsetMs);
  
  return serverDate;
}

function formatDateAsString(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function formatTimeAsString(date, timezone) {
  if (!date) return null;
  const d = new Date(date);
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function convertConferenceForDisplay(conference) {
  return {
    ...conference,
    // Only convert deadline date columns (stored in UTC)
    abs_deadline: conference.abs_deadline ? formatDateAsString(convertUTCToServerTimezone(conference.abs_deadline)) : null,
    paper_deadline: conference.paper_deadline ? formatDateAsString(convertUTCToServerTimezone(conference.paper_deadline)) : null,
    confer_date: conference.confer_date ? formatDateAsString(convertUTCToServerTimezone(conference.confer_date)) : null
    // All other fields returned as-is from database
  };
}

app.get("/",(req,res)=>{
    res.send("Backend Running")
})

// Get server timezone offset
app.get("/server-timezone", (req, res) => {
    try {
        const offset = getServerTimezoneOffset();
        res.json({ success: true, offset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
})

app.get("/users", async (req,res)=>{
    try{
        const result = await pool.query("SELECT * FROM USERS");
        res.json(result.rows);
    }
    catch (err){
        res.status(500).json({error: err.message,success:false});

    }
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
             WHERE sc.conf_ext_id = $1 AND c.user_id = $2`,
            [conf_ext_id, req.userId]
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
                WHERE user_id = $2
            ) t
            WHERE LOWER(kw) LIKE LOWER($1)
            LIMIT 10
        `, [`%${q}%`, req.userId]);

        res.json(result.rows.map(r => r.kw));
    }
    catch(err){
        res.status(500).json({error:err.message});
    }
});

// endpoint for combined autocomplete (titles, domains, and keywords)
app.get("/autocomplete/search",auth,async(req,res)=>{
    try{
        const q = req.query.q || "";
        
        const [keywordsResult, titlesResult, domainsResult] = await Promise.all([
            pool.query(`
                SELECT DISTINCT kw AS value, 'keyword' AS type
                FROM (
                    SELECT unnest(keywords) AS kw
                    FROM conferences
                    WHERE user_id = $2
                ) t
                WHERE LOWER(kw) LIKE LOWER($1)
                LIMIT 5
            `, [`%${q}%`, req.userId]),
            pool.query(`
                SELECT DISTINCT title AS value, 'title' AS type
                FROM (
                    SELECT short_title AS title FROM conferences WHERE user_id = $2 AND short_title IS NOT NULL
                    UNION
                    SELECT long_title AS title FROM conferences WHERE user_id = $2 AND long_title IS NOT NULL
                ) t
                WHERE LOWER(title) LIKE LOWER($1)
                LIMIT 5
            `, [`%${q}%`, req.userId]),
            pool.query(`
                SELECT DISTINCT research_domain AS value, 'domain' AS type
                FROM conferences
                WHERE user_id = $2 AND research_domain IS NOT NULL
                AND LOWER(research_domain) LIKE LOWER($1)
                LIMIT 5
            `, [`%${q}%`, req.userId])
        ]);

        // Combine results and remove duplicates (case-insensitive)
        const allResults = [
            ...keywordsResult.rows,
            ...titlesResult.rows,
            ...domainsResult.rows
        ];

        // Deduplicate by value (case-insensitive)
        const seen = new Set();
        const deduplicated = allResults.filter(item => {
            const key = item.value.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        res.json(deduplicated);
    }
    catch(err){
        console.error('Autocomplete search error:', err);
        res.status(500).json({error:err.message});
    }
});

// endpoint for autocomplete titles
app.get("/autocomplete/titles",auth,async(req,res)=>{
    try{
        const q = req.query.q || "";
        
        const result = await pool.query(`
            SELECT DISTINCT title
            FROM (
                SELECT short_title AS title FROM conferences WHERE user_id = $2 AND short_title IS NOT NULL
                UNION
                SELECT long_title AS title FROM conferences WHERE user_id = $2 AND long_title IS NOT NULL
            ) t
            WHERE LOWER(title) LIKE LOWER($1)
            LIMIT 10
        `, [`%${q}%`, req.userId]);

        res.json(result.rows.map(r => r.title));
    }
    catch(err){
        console.error('Autocomplete titles error:', err);
        res.status(500).json({error:err.message});
    }
});

// endpoint for autocomplete research domains
app.get("/autocomplete/domains",auth,async(req,res)=>{
    try{
        const q = req.query.q || "";
        
        const result = await pool.query(`
            SELECT DISTINCT research_domain
            FROM conferences
            WHERE user_id = $2 AND research_domain IS NOT NULL
            AND LOWER(research_domain) LIKE LOWER($1)
            LIMIT 10
        `, [`%${q}%`, req.userId]);

        res.json(result.rows.map(r => r.research_domain));
    }
    catch(err){
        console.error('Autocomplete domains error:', err);
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

// Get user's research domains with keywords hierarchy
app.get("/research-domains", auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT research_domain
            FROM conferences
            WHERE user_id = $1 AND research_domain IS NOT NULL
            ORDER BY research_domain
        `, [req.userId]);

        const domainsList = result.rows.map(r => r.research_domain);
        
        // For each domain, get keywords
        const domainsWithKeywords = await Promise.all(
            domainsList.map(async (domain) => {
                const keywordResult = await pool.query(`
                    SELECT DISTINCT kw
                    FROM (
                        SELECT unnest(keywords) AS kw
                        FROM conferences
                        WHERE user_id = $1 AND research_domain = $2 AND keywords IS NOT NULL
                    ) t
                    ORDER BY kw
                `, [req.userId, domain]);
                
                return {
                    domain,
                    keywords: keywordResult.rows.map(r => r.kw)
                };
            })
        );

        res.json({ success: true, researchDomains: domainsWithKeywords });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get user's conferences with search and filter
app.get("/my-conferences", auth, async (req, res) => {
    try {
        const { search, filterBy, filterValue, selectedDomains, selectedKeywords } = req.query;
        let query = `
            SELECT 
                sc.id as config_id,
                sc.conf_ext_id,
                sc.conf_url,
                c.short_title,
                c.long_title,
                c.research_domain,
                c.keywords,
                c.abs_deadline,
                c.abs_time,
                c.abs_timezone,
                c.paper_deadline,
                c.paper_time,
                c.paper_timezone,
                c.confer_date,
                c.confer_time,
                c.confer_venue
            FROM conferences c
            LEFT JOIN scrape_configs sc ON c.config_id = sc.id
            WHERE c.user_id = $1
        `;
        let params = [req.userId];
        let paramIndex = 2;

        // Search by keyword (title, domain, and keywords)
        if (search) {
            query += ` AND (
                LOWER(c.short_title) LIKE LOWER($${paramIndex}) 
                OR LOWER(c.long_title) LIKE LOWER($${paramIndex})
                OR LOWER(c.research_domain) LIKE LOWER($${paramIndex})
                OR EXISTS (
                    SELECT 1 FROM (
                        SELECT UNNEST(c.keywords) AS kw
                    ) expanded_keywords
                    WHERE LOWER(expanded_keywords.kw) LIKE LOWER($${paramIndex})
                )
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Filter by research domains and keywords
        const parsedDomains = selectedDomains ? (typeof selectedDomains === 'string' ? JSON.parse(selectedDomains) : selectedDomains) : [];
        const parsedKeywords = selectedKeywords ? (typeof selectedKeywords === 'string' ? JSON.parse(selectedKeywords) : selectedKeywords) : [];

        if (parsedDomains.length > 0 || parsedKeywords.length > 0) {
            let filterParts = [];
            
            // If domains are selected, include them
            if (parsedDomains.length > 0) {
                const domainPlaceholders = parsedDomains.map(d => {
                    params.push(d);
                    return `$${paramIndex++}`;
                }).join(',');
                filterParts.push(`c.research_domain IN (${domainPlaceholders})`);
            }

            // If keywords are selected, include them
            if (parsedKeywords.length > 0) {
                const keywordPlaceholders = parsedKeywords.map(k => {
                    params.push(k);
                    return `$${paramIndex++}`;
                }).join(',');
                filterParts.push(`EXISTS (
                    SELECT 1 FROM (
                        SELECT UNNEST(c.keywords) AS kw
                    ) expanded_keywords
                    WHERE expanded_keywords.kw IN (${keywordPlaceholders})
                )`);
            }

            if (filterParts.length > 0) {
                query += ` AND (${filterParts.join(' OR ')})`;
            }
        }

        // Filter by deadline type (by date only, not exact time)
        if (filterBy === 'abs_deadline' && filterValue) {
            query += ` AND c.abs_deadline >= CURRENT_DATE AND c.abs_deadline <= CURRENT_DATE + INTERVAL '${filterValue}'`;
        } else if (filterBy === 'paper_deadline' && filterValue) {
        query += ` AND c.paper_deadline >= CURRENT_DATE AND c.paper_deadline <= CURRENT_DATE + INTERVAL '${filterValue}'`;
        }

        query += ` ORDER BY c.abs_deadline ASC NULLS LAST`;

        const result = await pool.query(query, params);
        const convertedConferences = result.rows.map(conf => convertConferenceForDisplay(conf));
        res.json({ success: true, conferences: convertedConferences });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get user's public profile info
app.get("/user/:userId/info", async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            "SELECT id, email, created_at FROM users WHERE id = $1",
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const user = result.rows[0];
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                joinedDate: user.created_at,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get user's conferences (public - anyone can view shared dashboards)
app.get("/user/:userId/conferences", async (req, res) => {
    try {
        const { userId } = req.params;
        const { search, filterBy, filterValue } = req.query;

        // Verify user exists first
        const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        let query = `
            SELECT 
                sc.id as config_id,
                sc.conf_ext_id,
                sc.conf_url,
                c.short_title,
                c.long_title,
                c.research_domain,
                c.keywords,
                c.abs_deadline,
                c.abs_time,
                c.abs_timezone,
                c.paper_deadline,
                c.paper_time,
                c.paper_timezone,
                c.confer_date,
                c.confer_time,
                c.confer_venue
            FROM conferences c
            LEFT JOIN scrape_configs sc ON c.config_id = sc.id
            WHERE c.user_id = $1
        `;
        let params = [userId];
        let paramIndex = 2;

        // Search by keyword (title, domain, and keywords)
        if (search) {
            query += ` AND (
                LOWER(c.short_title) LIKE LOWER($${paramIndex}) 
                OR LOWER(c.long_title) LIKE LOWER($${paramIndex})
                OR LOWER(c.research_domain) LIKE LOWER($${paramIndex})
                OR EXISTS (
                    SELECT 1 FROM (
                        SELECT UNNEST(c.keywords) AS kw
                    ) expanded_keywords
                    WHERE LOWER(expanded_keywords.kw) LIKE LOWER($${paramIndex})
                )
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Filter by deadline type (by date only, not exact time)
        if (filterBy === 'abs_deadline' && filterValue) {
            query += ` AND c.abs_deadline >= CURRENT_DATE AND c.abs_deadline <= CURRENT_DATE + INTERVAL '${filterValue}'`;
        } else if (filterBy === 'paper_deadline' && filterValue) {
            query += ` AND c.paper_deadline >= CURRENT_DATE AND c.paper_deadline <= CURRENT_DATE + INTERVAL '${filterValue}'`;
        }

        query += ` ORDER BY c.abs_deadline ASC NULLS LAST`;

        const result = await pool.query(query, params);
        const convertedConferences = result.rows.map(conf => convertConferenceForDisplay(conf));
        res.json({ success: true, conferences: convertedConferences });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Add a dashboard to user's saved dashboards
app.post("/add-dashboard", auth, async (req, res) => {
    try {
        const { savedUserId } = req.body;
        
        if (!savedUserId) {
            return res.status(400).json({ success: false, error: "savedUserId is required" });
        }

        // Check if the dashboard already exists for this user
        const checkResult = await pool.query(
            "SELECT id FROM user_saved_dashboards WHERE user_id = $1 AND saved_user_id = $2",
            [req.userId, savedUserId]
        );

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, error: "Dashboard already saved" });
        }

        // Check if the saved user exists
        const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [savedUserId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        // Add the saved dashboard
        await pool.query(
            "INSERT INTO user_saved_dashboards (user_id, saved_user_id) VALUES ($1, $2)",
            [req.userId, savedUserId]
        );

        res.json({ success: true, message: "Dashboard added successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get user's saved dashboards
app.get("/saved-dashboards", auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email FROM user_saved_dashboards usd
             JOIN users u ON usd.saved_user_id = u.id
             WHERE usd.user_id = $1
             ORDER BY usd.created_at DESC`,
            [req.userId]
        );

        res.json({ success: true, dashboards: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Remove a saved dashboard
app.delete("/remove-dashboard/:savedUserId", auth, async (req, res) => {
    try {
        const { savedUserId } = req.params;

        const result = await pool.query(
            "DELETE FROM user_saved_dashboards WHERE user_id = $1 AND saved_user_id = $2 RETURNING id",
            [req.userId, savedUserId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Saved dashboard not found" });
        }

        res.json({ success: true, message: "Dashboard removed successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Public: Get research domains and keywords for any user (for shared dashboard)
app.get("/user/:userId/research-domains", async (req, res) => {
    try {
        const { userId } = req.params;
        // Check user exists
        const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const result = await pool.query(`
            SELECT DISTINCT research_domain
            FROM conferences
            WHERE user_id = $1 AND research_domain IS NOT NULL
            ORDER BY research_domain
        `, [userId]);

        const domainsList = result.rows.map(r => r.research_domain);
        // For each domain, get keywords
        const domainsWithKeywords = await Promise.all(
            domainsList.map(async (domain) => {
                const keywordResult = await pool.query(`
                    SELECT DISTINCT kw
                    FROM (
                        SELECT unnest(keywords) AS kw
                        FROM conferences
                        WHERE user_id = $1 AND research_domain = $2 AND keywords IS NOT NULL
                    ) t
                    ORDER BY kw
                `, [userId, domain]);
                return {
                    domain,
                    keywords: keywordResult.rows.map(r => r.kw)
                };
            })
        );

        res.json({ success: true, researchDomains: domainsWithKeywords });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});
