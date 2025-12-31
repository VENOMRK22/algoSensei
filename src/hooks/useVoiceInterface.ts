"use client";

import { useState, useEffect, useRef } from "react";

export interface VoiceState {
    isListening: boolean;
    isSpeaking: boolean;
    transcript: string;
    hasBrowserSupport: boolean;
}

export function useVoiceInterface() {
    const [state, setState] = useState<VoiceState>({
        isListening: false,
        isSpeaking: false,
        transcript: "",
        hasBrowserSupport: false
    });

    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesis | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            // Check Support
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const synthesis = window.speechSynthesis;

            if (SpeechRecognition && synthesis) {
                setState(prev => ({ ...prev, hasBrowserSupport: true }));

                // Init Recognition
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false; // Stop after silence
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = "en-US";

                synthesisRef.current = synthesis;
            }
        }
    }, []);

    const speak = (text: string) => {
        if (!synthesisRef.current) return;

        // Cancel previous speech
        synthesisRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Find a natural voice
        const voices = synthesisRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Zira"));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setState(prev => ({ ...prev, isSpeaking: true }));
        utterance.onend = () => setState(prev => ({ ...prev, isSpeaking: false }));
        utterance.onerror = () => setState(prev => ({ ...prev, isSpeaking: false }));

        synthesisRef.current.speak(utterance);
    };

    const startListening = () => {
        if (!recognitionRef.current) return;

        // Clean previous state
        setState(prev => ({ ...prev, isListening: true, transcript: "" }));

        recognitionRef.current.onresult = (event: any) => {
            let finalTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setState(prev => ({ ...prev, transcript: finalTranscript }));
            }
        };

        recognitionRef.current.onend = () => {
            setState(prev => ({ ...prev, isListening: false }));
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech Error:", event.error);
            setState(prev => ({ ...prev, isListening: false }));
        };

        try {
            recognitionRef.current.start();
        } catch (e) {
            console.warn("Recognition already started or failed", e);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        setState(prev => ({ ...prev, isListening: false }));
    };

    return {
        ...state,
        startListening,
        stopListening,
        speak
    };
}
