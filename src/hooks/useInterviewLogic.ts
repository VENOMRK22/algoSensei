"use client";

import { useState, useRef, useEffect } from "react";
import { useVoiceInterface } from "./useVoiceInterface";

export type InterviewMode = "voice" | "text";

export function useInterviewLogic(questionTitle: string) {
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

    // Auto-Process Voice: When silence detected (isListening goes true -> false) and transcript exists
    useEffect(() => {
        if (mode === "voice" && !isListening && transcript && !processing) {
            handleSendMessage(transcript);
        }
    }, [isListening, transcript, mode]);

    const handleSendMessage = async (text: string, isSystemCommand = false) => {
        if (!text.trim() && !isSystemCommand) return;

        setProcessing(true);
        // Optimistic Update only for user messages
        let newHistory = messages;
        if (!isSystemCommand) {
            newHistory = [...messages, { role: "user", content: text }];
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
                        isSystemCommand
                    }
                })
            });
            const data = await res.json();

            if (data.reply) {
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
        feedback
    };
}
