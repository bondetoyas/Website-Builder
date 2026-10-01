const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions'
const model = process.env.OPENROUTER_MODEL || 'openrouter/free'

export const generateResponse = async (prompt) => {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is missing from the backend environment.')
    }

    const res = await fetch(openRouterUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: 'system',
                    content: "You must return only valid raw JSON",
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.2
        }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => null)
        const message = data?.error?.message

        if (res.status === 402) {
            throw new Error('OpenRouter has no available credits for this model. Use a free model or add credits to the account for this API key.')
        }
        if (res.status === 401 || res.status === 403) {
            throw new Error('OpenRouter rejected the API key. Check OPENROUTER_API_KEY in the backend environment.')
        }

        throw new Error(message || `OpenRouter request failed with status ${res.status}.`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
        throw new Error('OpenRouter returned an empty response. Please try again.')
    }
    return content
}