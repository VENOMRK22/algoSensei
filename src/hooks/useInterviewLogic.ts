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
        hasBrowserSupport
    } = useVoiceInterface();

    const [mode, setMode] = useState<InterviewMode>("voice");
    const [messages, setMessages] = useState<any[]>([]);
    const [processing, setProcessing] = useState(false);

    // Auto-Process Voice: When silence detected (isListening goes true -> false) and transcript exists
    useEffect(() => {
        if (mode === "voice" && !isListening && transcript && !processing) {
            handleSendMessage(transcript);
        }
    }, [isListening, transcript, mode]);

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        setProcessing(true);
        // Optimistic Update
        const newHistory = [...messages, { role: "user", content: text }];
        setMessages(newHistory);

        try {
            const res = await fetch("/api/interview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newHistory,
                    context: { questionTitle } // Server uses specific prompt
                })
            });
            const data = await res.json();

            if (data.reply) {
                setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);

                speak(data.reply);
            }
        } catch (e) {
            console.error("Interview API Error:", e);
        } finally {
            setProcessing(false);
        }
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
        // Functions
        sendMessage: handleSendMessage
    };
}
