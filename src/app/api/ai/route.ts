import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Initialize Groq Client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// The "Brain" - Preserved Logic
const SYSTEM_PROMPT = `
You are AlgoSensei, a helpful and insightful Coding Mentor.
Style: Concise, structured, and easy to scan.
Format: Use Bullet Points (•) for your explanations. Avoid big paragraphs.
Highlighting: Use **Bold Markdown** for key concepts, variable names, and important instructions.

**CRITICAL INSTRUCTION:**
Analyze the user's code/output and determine which **ONE** Scenario applies. 
**Output ONLY the content for that single scenario.** Do not combine them.

**Scenario A: Logic or Syntax Error**
(Trigger: Code failed to run, error message present, or incorrect output)
• **Error:** Identify the specific line and error type.
• **Why:** Explain the issue in 1 sentence.
• **Fix:** Suggest the correct logic concept.

**Scenario B: Getting Stuck / Asking for Help**
(Trigger: User asks "What next?" or output is empty but no error)
• Give a specific hint about the **Next Logical Step**.
• Explain **Why** this step helps.

**Scenario C: Success / Correct Output**
(Trigger: Code ran successfully AND output matches expected result)
• **DO NOT** output "Error: None" or any analysis.
• Output EXACTLY this line: "**Your solution looks correct. You are ready to Submit!**"
• Follow with 1 short bullet of praise (e.g., "Great use of HashMap for O(n) time!").
`;

export async function POST(req: Request) {
    if (!process.env.GROQ_API_KEY) {
        console.error("Error: GROQ_API_KEY is missing.");
        return NextResponse.json({ text: "System Error: Groq API Key is missing. Please add it to .env.local" });
    }

    try {
        const { history, message, context } = await req.json();

        // 1. Construct Prompt Context
        let promptContext = "";

        // Check if this is an automated run result (Ghost Trigger)
        if (context?.executionResult) {
            promptContext = `
[System Log: Output="${context.executionResult.stdout || ''}", Error="${context.executionResult.stderr || ''}", Code="${context.code || ''}"]
Problem Context: ${context.questionTitle}
User Question: ${message || "Analyze this execution result."}
`;
        } else if (context) {
            // Standard Chat Context
            promptContext = `
[STUDENT CONTEXT]
Problem: ${context.questionTitle}
Current Code:
\`\`\`${context.language || 'text'}
${context.code}
\`\`\`
[/STUDENT CONTEXT]
User Question: ${message}
`;
        } else {
            promptContext = `User Question: ${message}`;
        }

        // 2. Prepare Messages for Groq (OpenAI Compatible)
        // Convert Gemini History (parts) to Groq History (content)
        const groqHistory = (history || []).map((msg: any) => ({
            role: msg.role === "model" ? "assistant" : "user",
            content: msg.parts?.[0]?.text || msg.content || ""
        }));

        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...groqHistory,
            { role: "user", content: promptContext }
        ];

        // 3. Call Groq Llama 3
        console.log("🚀 Sending request to Groq (Llama3-8b)...");

        const completion = await groq.chat.completions.create({
            messages: messages as any,
            model: "llama-3.3-70b-versatile", // Latest Stable Llama 3.3
            temperature: 0.6,
            max_tokens: 1024,
            stream: false
        });

        const reply = completion.choices[0]?.message?.content || "";

        if (reply) {
            console.log("✅ Groq Response Received");
            return NextResponse.json({ text: reply });
        } else {
            throw new Error("Empty response from Groq");
        }

    } catch (error: any) {
        console.error("Groq API Error:", error);
        return NextResponse.json({ text: `System Error: ${error.message}` });
    }
}
