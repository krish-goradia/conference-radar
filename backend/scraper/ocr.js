import Tesseract from "tesseract.js";

export async function runOCR(imageURL){
    if(!imageURL) return null
    try{
        
        const {data} = await Tesseract.recognize(imageURL,"eng")
        const text = data?.text?.trim()
        return text || null
    }
    catch(err){
        console.error("OCR Error:",err)
        return null
    }
}