import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini
// Ensure you have GEMINI_API_KEY in your .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    try {
        const { history, message, context } = await req.json();

        // Construct the full prompt context
        // History is the chat history: [{ role: "user" | "model", parts: string }]
        // Context contains { code: string, questionTitle: string, error: string }

        let promptPreamble = "";

        if (context) {
            promptPreamble = `
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

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am AlgoSensei. I will guide the student strictly but helpfully without revealing the answer." }]
                },
                ...(history || [])
            ],
            generationConfig: {
                maxOutputTokens: 250, // Keep it concise
            }
        });

        // If this is an auto-trigger from an error, the message might be the error summary
        const result = await chat.sendMessage(promptPreamble + "\n" + message);
        const response = result.response;
        const text = response.text();

        return NextResponse.json({ text });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: "Professor is currently unavailable (API Error)." }, { status: 500 });
    }
}
