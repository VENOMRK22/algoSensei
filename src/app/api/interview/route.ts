import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `
You are Jarvis, an expert Technical Interviewer at a top tech company.
Your Goal: Vet the candidate's logic and communication before they write code.

**Rules:**
1. **Conversational:** Speak in short, natural, continuous sentences (spoken English). 
2. **Concise:** Keep replies under 2 sentences so the dialogue flows fast.
3. **No Code:** Do NOT dictate code syntax. Talk about concepts (HashMaps, Sliding Window, Pointers).
4. **Persona:** Professional but encouraging. Slightly challenging but helpful.

**Flow:**
- If they propose a Brute Force solution, gently ask if they can optimize it (e.g., "That works, but is n-squared acceptable here?").
- If they propose an Optimal solution, validate it briefly and say "Great strategy. I think you're ready to code."
- If they are stuck, give a conceptual hint (e.g., "Think about using a Set to track duplicates.").
`;

export async function POST(req: Request) {
    try {
        const { messages, context } = await req.json();

        // Construct context-aware prompt
        const problemContext = `
        Current Problem: ${context.questionTitle}
        Description: ${context.questionDescription}
        `;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT + "\n" + problemContext },
                ...messages
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 150
        });

        const reply = completion.choices[0]?.message?.content || "I didn't catch that. Could you repeat?";

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error("Interview API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
