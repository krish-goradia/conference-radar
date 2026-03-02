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