import { extractDate,extractTime,extractVenue } from "./regexExtractor.js";

export function handleFields(raw){
    if(!raw) return {}
    const absDate = extractDate(raw.abs_deadline)
    const paperDate = extractDate(raw.paper_deadline)
    const confer_date = extractDate(raw.confer_date)

    const absTime = extractTime(raw.abs_time)
    const paperTime = extractTime(raw.paper_time)
    const confer_time = extractTime(raw.confer_time)

    const confer_venue = extractVenue(raw.confer_venue)
    

    return {
        abs_deadline : absDate,
        abs_time: absTime,
        paper_deadline: paperDate,
        paper_time: paperTime,
        confer_date: confer_date,
        confer_time: confer_time,
        confer_venue: confer_venue
    }
}