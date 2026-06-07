import jwt from 'jsonwebtoken'

export function auth(req,res,next){
    try{
        const header = req.headers.authorization
        if(!header){
            return res.status(401).json({success:false,error:"No token"})
        }
        const token = header.split(" ")[1]
        const decoded = jwt.verify(token,process.env.JWT_SECRET_KEY)
        req.userId = decoded.userId
        next()
    }
    catch{
        return res.status(401).json({success:false,error:"Invalid token"})
    }
}