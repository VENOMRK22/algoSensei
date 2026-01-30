"use client";

import { useState, useRef, useEffect } from "react";
import { useVoiceInterface } from "./useVoiceInterface";

export type InterviewMode = "voice" | "text";
export type InterviewStage = 'GATEKEEPING' | 'LOGIC' | 'EDGE_CASES' | 'REBUTTAL' | 'VERDICT';

export interface InterviewState {
    stage: InterviewStage;
    strikes: number;
    conceptsCovered: number;
}

export interface ViperData {
    score: number;
    issues: string[];
}

// 📖 Technical Dictionary (Client-Side "Spellcheck" for STT)
// This fixes common homophones WITHOUT using heavy AI.
const TECHNICAL_FIXES: Record<string, string> = {
    "hash map": "HashMap",
    "hash maps": "HashMaps",
    "tree map": "TreeMap",
    "linked list": "LinkedList",
    "array list": "ArrayList",
    "java script": "JavaScript",
    "type script": "TypeScript",
    "no jazz": "Node.js",
    "know jazz": "Node.js",
    "reactor": "React",
    "read acts": "Redux",
    "view": "Vue",
    "angular js": "Angular",
    "sequel": "SQL",
    "no sequel": "NoSQL",
    "mongo db": "MongoDB",
    "post gress": "PostgreSQL",
    "redis": "Redis",
    "docker": "Docker",
    "coober netties": "Kubernetes",
    "big o": "Big O",
    "oh of n": "O(n)",
    "n squared": "n^2",
    "constant time": "O(1)",
    "dynamic programming": "Dynamic Programming",
    "recursion": "Recursion",
    "binary search": "Binary Search",
    "depth first": "DFS",
    "breadth first": "BFS",
};

function sanitizeTranscript(text: string): string {
    let clean = text.toLowerCase();
    Object.entries(TECHNICAL_FIXES).forEach(([bad, good]) => {
        // Regex to replace whole words only
        const regex = new RegExp(`\\b${bad}\\b`, 'gi');
        clean = clean.replace(regex, good);
    });
    return clean; // Returns text with fixed technical casing/spelling
}

export function useInterviewLogic(questionTitle: string, code: string = "") {
    const {
        isListening,
        isSpeaking,
        transcript,
        startListening,
        stopListening,
        speak,
        hasBrowserSupport,
        error
    } = useVoiceInterface();

    const [mode, setMode] = useState<InterviewMode>("voice");
    const [messages, setMessages] = useState<any[]>([]);
    const [processing, setProcessing] = useState(false);
    const [feedback, setFeedback] = useState<any | null>(null);
    const [interviewState, setInterviewState] = useState<InterviewState>({
        stage: 'GATEKEEPING',
        strikes: 0,
        conceptsCovered: 0
    });

    // 🐍 Viper Data Ref (No Re-render needed for logic, we just read it on send)
    const viperRef = useRef<ViperData>({ score: 100, issues: [] });

    // Function for UI to update Viper stats
    const updateViperStats = (score: number, issues: string[]) => {
        viperRef.current = { score, issues };
    };

    // 👁️ Hawkeye: 60s Code Snapshot Timer
    useEffect(() => {
        if (mode !== "voice" || !code || code.length < 10) return;

        const timer = setInterval(() => {
            // Send silent system message with code
            handleSendMessage(`:::SNAPSHOT::: \n${code}`, true);
        }, 60000); // 60s

        return () => clearInterval(timer);
    }, [code, mode]);

    // Auto-Process Voice: When silence detected (isListening goes true -> false) and transcript exists
    useEffect(() => {
        if (mode === "voice" && !isListening && transcript && !processing) {
            handleSendMessage(transcript);
        }
    }, [isListening, transcript, mode]);

    const handleSendMessage = async (text: string, isSystemCommand = false) => {
        if (!text.trim() && !isSystemCommand) return;

        // 🧹 Sanitize Voice Input (Fix Technical Jargon)
        const procText = isSystemCommand ? text : sanitizeTranscript(text);

        setProcessing(true);
        // Optimistic Update only for user messages
        let newHistory = messages;
        if (!isSystemCommand) {
            newHistory = [...messages, { role: "user", content: procText }];
            setMessages(newHistory);
        }

        try {
            const res = await fetch("/api/interview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newHistory,
                    context: {
                        questionTitle,
                        isSystemCommand,
                        interviewState, // 🧠 Inject the Brain State
                        codeSnapshot: isSystemCommand && text.startsWith(":::SNAPSHOT:::") ? text : null, // 👁️ Hawkeye Context
                        viper: viperRef.current // 🐍 Viper Context
                    }
                })
            });
            const data = await res.json();

            if (data.reply) {
                // 🧠 State Update from AI
                if (data.action) {
                    console.log("🧠 AI Action:", data.action);
                    setInterviewState(prev => ({ ...prev, ...data.action }));
                }

                // Check if reply is the JSON verdict
                let isVerdict = false;
                let parsedVerdict = null;
                try {
                    const cleanReply = data.reply;
                    // Fix: Regex to find the first valid JSON object block { ... }
                    // This handles markdown ```json, prefixes, suffixes, etc.
                    const jsonMatch = cleanReply.match(/\{[\s\S]*\}/);

                    if (jsonMatch) {
                        const jsonString = jsonMatch[0];
                        parsedVerdict = JSON.parse(jsonString);
                        if (parsedVerdict.verdict && parsedVerdict.communication_score) isVerdict = true;
                    }
                } catch (e) {
                    console.warn("JSON Parse Attempt Failed:", e);
                }

                if (isVerdict && parsedVerdict) {
                    setFeedback(parsedVerdict);
                    speak("Interview complete. I have generated your performance audit.");
                } else {
                    setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
                    speak(data.reply);
                }
            }
        } catch (e) {
            console.error("Interview API Error:", e);
        } finally {
            setProcessing(false);
        }
    };

    const endInterview = () => {
        handleSendMessage("SYSTEM: End interview and generate verdict.", true);
    };

    return {
        mode,
        setMode,
        messages,
        processing,
        // Voice Props
        isListening,
        isSpeaking,
        transcript,
        startListening,
        stopListening,
        hasBrowserSupport,
        error,
        // Functions
        sendMessage: (text: string) => handleSendMessage(text),
        endInterview,
        feedback,
        updateViperStats
    };
}
