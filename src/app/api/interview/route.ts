import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";

const SYSTEM_PROMPT = `
You are JARVIS, a Senior Principal Engineer at Google conducting a 'Blind Technical Phone Screen'.

**CORE OBJECTIVE:** Evaluate the candidate's Deep Understanding, Communication, and Logic. You cannot see code.

**YOUR BEHAVIORAL PROTOCOL:**
1.  **Be Skeptical:** Never accept the first answer as 'correct'. Always probe deeper. Ask 'Why?', 'Why not X?', or 'What is the complexity?'.
2.  **Natural Correction:** If they are wrong, simply state why. Do NOT use phrases like "Re-evaluate your assumption". Be conversational. (e.g., "Actually, that approach is O(n^2). Can we do better?" is better than a robotic rejection).
3.  **Latency Optimized:** Keep responses SHORT (max 2 sentences). This is a voice conversation.
4.  **Detect Bluffing:** If the user uses technical jargon (e.g., 'HashMap', 'Recursion'), immediately ask them to explain how it works internally.
5.  **Edge Case Obsession:** Always ask how their solution handles: Nulls, Empty Inputs, Negative Numbers, and Massive Scale.

**INTERNAL STATE TRACKING (EXPLICIT):**
You will receive the current state (Stage, Strikes, Count).
**YOU MUST** output a JSON Action block at the end of your response to update this state if events occur.
Format: \`:::JSON { "action": { ... updates ... } } :::\`
Example: \`That is correct. Let's move on. :::JSON { "action": { "conceptsCovered": 2 } } :::\`
**THE "PROBE" PROTOCOL (SOFT SKILLS):**
- If the user answer is *mostly* right but uses the wrong term (e.g., "Array" instead of "Vector"), DO NOT STRIKE immediately.
- Ask a **Probe Question**: "Did you mean a dynamic array?"
- Only Increment 'strikes' if they double-down on the error.
**TERMINATION PROTOCOLS (AUTO-EXECUTE):**
1.  **SUCCESS CAP (The 5-7 Rule):**
    -   If you have asked **5** solid questions and the user nailed them -> **GENERATE VERDICT (HIRE)**.
    -   *Exception:* If you are unsure after 5, ask up to **2** more (Max 7). Absolute hard stop at 7 questions.
2.  **FAILURE MERCY:**
    -   If specific concept failed 2x -> Reply: "Let's move on." (Count this as 1 Concept Strike).
    -   If **2 Concepts Strikes** occur -> **GENERATE VERDICT (NO HIRE)**.
3.  **BEHAVIORAL TERMINATION:**
    -   If user is playful/off-topic -> Warning 1: "Focus. This is a professional screening."
    -   If it happens again -> **GENERATE VERDICT (NO HIRE + Red Flag "Unprofessional Conduct")**.

**THE 4-STAGE INTERVIEW ARCHITECTURE:**
Use the conversation history to determine which stage you are in.
*   **Stage 1: Gatekeeping (Start):** Rapid-fire, definition-based questions to filter out basics. (e.g., "Define a Race Condition.")
*   **Stage 2: Logic Visualization (Middle):** Force the user to "paint a picture" of their data structure/algorithm. (e.g., "Visualize the stack memory for me.")
*   **Stage 3: The Edge Case Trap (Deepen):** Interrupt when they feel safe. Ask about breaking cases.
*   **Stage 4: THE REBUTTAL (Last Chance):**
    -   Tell them CLIEARLY what they failed. (e.g., "I'm concerned about your knowledge of Time Complexity.")
    -   Ask them to defend themselves. ("Why should we hire you despite this?")
*   **Stage 5: The Verdict (End):** Triggered strictly AFTER Rebuttal.
    -   STOP acting as an interviewer.
    -   GENERATE A JSON FEEDBACK OBJECT.
    -   Format:
      {
        "communication_score": (1-10),
        "communication_justification": "Why the score is X. Mention specific speech patterns observed (e.g. 'Used 'um' 15 times', 'Stuttered frequently').",
        "communication_improvements": ["Reduce filler words (um, uh)", "Stop repeating phrases", "Use precise terms (e.g. 'Map' vs 'List')"],
        "technical_accuracy": (1-10),
        "technical_justification": "Why the score is X. Mention correctness/complexity.",
        "technical_improvements": ["Specific tip 1", "Specific tip 2"],
        "red_flags": ["list", "of", "issues"],
        "verdict": "HIRE" | "NO HIRE",
        "summary": "One sentence professional summary."
      }
    -   CRITICAL: Do NOT output markdown ticks.Do NOT output "Here is the verdict".JUST THE RAW JSON.
    - Do not output anything else. Just the JSON.

** CONVERSATION STYLE:**
-   ** Tone:** Professional, Clinical, slightly Intimidating but Fair.Natural, not robotic.
-   ** Opening:** Open the interview as a human hiring manager would.State the topic clearly.Do NOT use a pre - written script.Be unique.
-   ** Efficiency:** If they ramble, interrupt nicely: "Focus on the algorithm logic, please."

    ** CURRENT TOPIC:**
        `;

export async function POST(req: Request) {
    const groq = getGroqClient();
    try {
        const { messages, context } = await req.json();

        // Construct context-aware prompt
        // Construct context-aware prompt
        const currentState = context.interviewState || { stage: 'GATEKEEPING', strikes: 0, conceptsCovered: 0 };
        const codeSnapshot = context.codeSnapshot;
        const viperData = context.viper || { score: 100, issues: [] };
        const averageConfidence = context.averageConfidence || 100;

        // 🐍 Viper Logic: Analyze Confidence & Behavior
        let viperContext = `
            === VIPER VISION (LONG TERM STATS) ===
            Average Confidence Score: ${averageConfidence}/100
            
            SCORING RULES:
            1. Communication Score is PRIMARILY based on verbal clarity, fluency, and articulation.
            2. Viper Score is a SECONDARY modifier.
               - If < 60: PENALIZE the score.
               - If > 90: Small bonus.
            
            CRITICAL: COMMUNICATION ANALYSIS MUST BE GRANULAR.
            - Analyze the transcript for SPEECH PATTERNS:
              * Filler words ("um", "uh", "hmm", "like") -> If frequent, listed in 'communication_improvements' as "Reduce filler words".
              * Repetition ("stopping again again") -> List as "Avoid unnecessary repetition".
              * Vocabulary -> If they use "thingy" or "stuff" instead of technical terms, list "Use precise technical vocabulary".
              * Fluency -> If sentences run on or make no sense, list "Improve sentence coherence".
            - Do NOT give generic advice like "Be more confident". BE SPECIFIC about what they said wrong.
        `;

        if (viperData.score < 50 || viperData.issues.length > 0) {
            viperContext += `
            === VIPER VISION (LIVE SNAPSHOT) ===
            Current Score: ${viperData.score}/100
            Detected Issues: ${viperData.issues.join(", ")}

INSTRUCTION:
- If "Multiple Faces": STOP immediately. "I detect multiple people. This is a 1-on-1 screening."
    - If "Distracted": "Please keep your focus on the screen."
        - If Score < 40: "You seem nervous. Take a breath."
            - If "Absent": "Please return to the camera frame."
                `;
        }

        // 👁️ Hawkeye Logic: If code is provided, analyze it
        let hawkeyeContext = "";
        if (codeSnapshot) {
            hawkeyeContext = `
                === HAWKEYE EYES(VISUAL CONTEXT) ===
                    User is currently writing this code:
\`\`\`
            ${codeSnapshot.replace(":::SNAPSHOT:::", "")}
            \`\`\`
            INSTRUCTION: Scan this code.
            - If they are writing "Anti-Patterns" (e.g., O(n^2) nested loops for a 2-Sum), INTERRUPT THEM nicely.
            - If they are staring valid code, say "Good start."
            - If this is a SNAPSHOT update, keep your reply VERY SHORT (1-3 words) unless there is a critical error.
            `;
        }

        const problemContext = `
        Current Problem: ${context.questionTitle}
        Description: ${context.questionDescription}
        
        === CURRENT INTERVIEW STATE ===
        STAGE: ${currentState.stage}
        STRIKES: ${currentState.strikes}
        CONCEPTS COVERED: ${currentState.conceptsCovered}
        
        INSTRUCTIONS:
        - If the user fails a concept CLEARLY, Increment 'strikes'.
        - If the user makes a minor slip, DO NOT increment strike yet. Ask a Probe question.
        - If the user passes a concept, Increment 'conceptsCovered'.
        - If conceptsCovered >= 2 AND Stage is GATEKEEPING -> Set stage: 'LOGIC'.
        - If conceptsCovered >= 4 AND Stage is LOGIC -> Set stage: 'EDGE_CASES'.
        - If strikes >= 3 AND Stage is NOT 'REBUTTAL' -> Set stage: 'REBUTTAL'. Prompt: "I have concerns. Defend your case."
        - If Stage is REBUTTAL -> Set stage: 'VERDICT'.
        - If Stage is VERDICT -> STOP TALKING. OUTPUT STRICT JSON ONLY. NO MARKDOWN. NO PREAMBLE. { "verdict": ... }
        `;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT + "\n" + problemContext + "\n" + hawkeyeContext + "\n" + viperContext },
                ...messages
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 1000
        });

        let reply = completion.choices[0]?.message?.content || "I didn't catch that. Could you repeat?";
        let action = null;
        let verdict = null;

        // 🧠 Robust Parsing: Scan for nested JSON blocks (Actions or Verdicts)
        try {
            // Regex to find ANY valid JSON object structure specifically containing "verdict" or "action" keys
            // This is a naive but effective recursive-like pattern for single-level nested objects which is usually what LLMs output.
            const jsonRegex = /{(?:[^{}]|{[^{}]*})*"(?:verdict|action|technical_accuracy|communication_score)"(?:[^{}]|{[^{}]*})*}[\s\S]*?$/;

            // Search for the LAST occurrence if multiple, as the verdict usually comes at the end.
            const matches = reply.match(new RegExp(jsonRegex, 'g'));

            if (matches && matches.length > 0) {
                const jsonStr = matches[matches.length - 1];
                let jsonBlob;

                try {
                    jsonBlob = JSON.parse(jsonStr);
                } catch (jsonErr) {
                    console.warn("JSON Parse Failed, attempting repair...", jsonStr);
                    // Simple repair: if it ends uniquely, try adding '}'
                    try {
                        jsonBlob = JSON.parse(jsonStr + "}");
                    } catch (e2) {
                        // If repair fails, we STILL want to clean the chat
                        if (jsonStr.includes("verdict") || jsonStr.includes("communication_score")) {
                            console.log("Verdict detected but malformed. Silencing chat.");
                            reply = "";
                            verdict = { verdict: "NO HIRE", communication_score: 1, technical_accuracy: 1, summary: "Audit Error", red_flags: ["Malformed JSON"] };
                        } else if (jsonStr.includes("action") || jsonStr.includes('stage":')) {
                            console.log("Action raw JSON detected. Stripping text.");
                            reply = reply.replace(jsonStr, "").trim();
                        }
                    }
                }

                if (jsonBlob) {
                    // Case 1: Verdict (Detected either by 'verdict' key OR 'communication_score' presence)
                    if (jsonBlob.verdict || jsonBlob.communication_score) {
                        // Ensure verdict logic runs even if 'verdict' key is missing but others are present
                        if (!jsonBlob.verdict) jsonBlob.verdict = "NO HIRE"; // Default fallback if missing

                        verdict = jsonBlob;
                        reply = ""; // 🤫 FORCE SILENCE. No "I think we're done..." text.
                    }
                    // Case 2: Action only
                    else if (jsonBlob.action) {
                        action = jsonBlob.action;
                        // For actions, we just strip the JSON string from the reply
                        reply = reply.replace(jsonStr, "").trim();
                    }
                }
            } else {
                // Fallback: Legacy IndexOf (for simple cases)
                const start = reply.indexOf('{');
                const end = reply.lastIndexOf('}');
                if (start > -1 && end > start) {
                    const potentialJson = reply.substring(start, end + 1);
                    try {
                        const jsonBlob = JSON.parse(potentialJson);
                        if (jsonBlob.verdict) {
                            verdict = jsonBlob;
                            reply = "";
                        } else if (jsonBlob.action) {
                            action = jsonBlob.action;
                            reply = reply.replace(potentialJson, "").trim();
                        }
                    } catch (e) { /* ignore */ }
                }
            }

            // Final Safety Net: If "verdict" or "action" keyword found in what remains, SILENCE IT anyway.
            if (reply.toLowerCase().includes('"verdict":') || reply.includes("communication_score")) {
                console.warn("Leaked verdict detected in reply. Forcing silence.");
                reply = "";
            }
            if (reply.includes('"action":')) {
                reply = reply.replace(/{[\s\S]*?"action":[\s\S]*?}/g, "").trim();
            }

            // Final Aggressive Cleanup of any leaking markers
            if (reply.length > 0) {
                reply = reply
                    .replace(/:::JSON/gi, "")
                    .replace(/:::/g, "")
                    .replace(/json/gi, "") // Stray "json"
                    .trim();
            }

        } catch (e) {
            console.warn("Parsing Logic Error:", e);
        }

        return NextResponse.json({ reply, action, verdict });

    } catch (error: any) {
        console.error("Interview API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
