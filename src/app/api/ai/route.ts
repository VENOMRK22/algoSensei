import { NextResponse } from "next/server";

// Configuration
const CANDIDATE_MODELS = [
    "gemini-2.0-flash",         // New fast model
    "gemini-2.0-flash-lite",    // Lightweight
    "gemini-1.5-flash",         // Fallback
    "gemini-pro-latest",        // Stable alias
    "gemini-pro"                // Legacy safe mode
];

const SYSTEM_PROMPT = `
You are AlgoSensei, a strict but helpful computer science professor. 
Your goal is to help the student debug their code or understand the algorithm WITHOUT giving away the answer.

RULES:
1. NEVER provide the full corrected code. If you must show code, show only a snippet or a pseudo-code pattern.
2. Identify the logic error or syntax mistake clearly.
3. Give a Socratic hint (e.g., "Look at how you're incrementing 'i', is that correct for a while loop?").
4. Be concise. Keep your responses to 2-3 sentences max. 
5. If the student asks for the answer, firmly refuse and guide them back to the logic.
6. Use markdown for code snippets.

CONTEXT:
User is solving a coding problem. They might send you their current code and an error message.
`;

export async function POST(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Error: GEMINI_API_KEY is missing.");
        return NextResponse.json({ text: "System Error: Gemini API Key is missing." });
    }

    try {
        const { history, message, context } = await req.json();

        // 1. Construct Prompt Context
        let promptContext = "";
        if (context) {
            promptContext = `
[STUDENT CONTEXT]
Problem: ${context.questionTitle}
Current Code:
\`\`\`${context.language || 'text'}
${context.code}
\`\`\`
${context.error ? `Error Log:\n${context.error}` : ""}
[/STUDENT CONTEXT]
`;
        }

        // 2. Build Contents Array
        // We merge the System Prompt + Context + User Message into the latest message
        // Or construct a chat history. 
        // Best approach for compatibility: Prepend System Prompt to history? 
        // Actually, "systemInstruction" is supported in beta but let's stick to standard message merging for "gemini-pro" safety.

        const fullUserMessage = `${SYSTEM_PROMPT}\n\n${promptContext}\n\nUser Question: ${message}`;

        // Combine existing history with the NEW message
        // History from frontend is: [{ role: "user" | "model", parts: [{ text: "..." }] }]
        // We need to append the new user turn.
        const contents = [
            ...(history || []),
            {
                role: "user",
                parts: [{ text: fullUserMessage }]
            }
        ];

        // 3. Try Models Sequentially
        let finalResponse = null;
        let lastError = null;

        for (const model of CANDIDATE_MODELS) {
            console.log(`Trying model: ${model}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: contents,
                        generationConfig: {
                            maxOutputTokens: 300,
                            temperature: 0.7
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                        finalResponse = data.candidates[0].content.parts[0].text;
                        console.log(`Success with ${model}`);
                        break; // Stop loop on success
                    }
                } else {
                    const errText = await response.text();
                    console.warn(`Failed ${model}: ${response.status} - ${errText}`);
                    lastError = `[${model}] ${response.status}: ${errText}`;
                }
            } catch (err: any) {
                console.warn(`Network Error on ${model}:`, err);
                lastError = err.message;
            }
        }

        if (finalResponse) {
            return NextResponse.json({ text: finalResponse });
        } else {
            console.error("All models failed. Last error:", lastError);
            return NextResponse.json({ text: `AI Tutor Unavailable. (All models failed. Last Error: ${lastError})` });
        }

    } catch (error: any) {
        console.error("Gemini Route Critical Error:", error);
        return NextResponse.json({ text: `System Error: ${error.message}` });
    }
}
