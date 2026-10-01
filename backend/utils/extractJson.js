import { jsonrepair } from 'jsonrepair'

const extractJson = async (text) => {
    if (!text) {
        return null
    }
    const cleaned = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const openBracket = cleaned.indexOf('{')
    const closeBracket = cleaned.lastIndexOf('}')
    if (openBracket === -1 || closeBracket < openBracket) return null

    const jsonString = cleaned.slice(openBracket, closeBracket + 1)
    try {
        return JSON.parse(jsonString)
    } catch {
        try {
            return JSON.parse(jsonrepair(jsonString))
        } catch {
            return null
        }
    }
}

export default extractJson