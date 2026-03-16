import * as chrono from "chrono-node"

export function extractDate(text){
    if(!text || typeof text !== 'string') return null
    try{
        const date = chrono.parseDate(text)
        if(date){
            return date.toISOString().split("T")[0];
        }
    }
    catch(err){
        console.debug(`date parse error for text='${text}':`, err.message)
    }
    return null;
}

export function extractTime(text){
    if(!text || typeof text !== 'string') return null

    try{
        //"14:30" or "2:30 pm"
        let match = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i)
        if(match){
            let hours = parseInt(match[1])
            const minutes = match[2]
            const period = match[3]?.toLowerCase()
            if(period){
                if(period === "pm" && hours !== 12) hours += 12
                if(period === "am" && hours === 12) hours = 0
            }
            if(hours > 23 || parseInt(minutes) > 59) return null
            return `${String(hours).padStart(2,'0')}:${minutes}`
        }
        // "1400 hrs"
        match = text.match(/\b(\d{2})(\d{2})\s*(hrs?|hours?)\b/i)
        if(match){
            const hours = parseInt(match[1])
            const minutes = parseInt(match[2])
            if(hours > 23 || minutes > 59) return null
            return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`
        }
        // "5pm"
        match = text.match(/\b(\d{1,2})\s*(am|pm)\b/i)
        if(match){
            let hours = parseInt(match[1])
            const period = match[2].toLowerCase()
            if(period === "pm" && hours !== 12) hours += 12
            if(period === "am" && hours === 12) hours = 0
            if(hours > 23) return null
            return `${String(hours).padStart(2,'0')}:00`
        }

        return null
    }
    catch(err){
        console.debug(`time parse error for text='${text}':`, err.message)
        return null
    }
}

export function extractVenue(text){
    if(!text || typeof text !== 'string') return null
    try{
        if(/online|virtual|zoom|teams/i.test(text)){
            return "Online";
        }
        text = text
            .replace(/\s+/g," ")
            .replace(/(venue|location|place|address|held at)\s*[:\-–]\s*/i,"")
            .replace(/[.,;]$/,"")
            .trim()
        if(text.length > 200) return null;
        return text || null
    }
    catch(err){
        console.debug(`venue parse error for text='${text}':`, err.message)
        return null
    }
}