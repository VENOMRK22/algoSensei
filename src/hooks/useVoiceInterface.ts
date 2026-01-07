"use client";

import { useState, useEffect, useRef } from "react";

export interface VoiceState {
    isListening: boolean;
    isSpeaking: boolean;
    transcript: string;
    hasBrowserSupport: boolean;
    error: string | null;
}

export function useVoiceInterface() {
    const [state, setState] = useState<VoiceState>({
        isListening: false,
        isSpeaking: false,
        transcript: "",
        hasBrowserSupport: false,
        error: null
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

        // Find a natural confident male voice
        const voices = synthesisRef.current.getVoices();

        // Priority list for "Confident Male"
        const preferredVoice = voices.find(v =>
            v.name.includes("Google UK English Male") || // Deep, professional
            v.name.includes("Microsoft James") ||        // Standard Windows Male
            v.name.includes("Daniel") ||                 // Mac/iOS Male
            v.name.includes("Google US English")         // Fallback high quality
        );

        if (preferredVoice) {
            utterance.voice = preferredVoice;
            // Slight pitch drop for authority if it's a standard voice
            if (preferredVoice.name.includes("Google US English")) {
                utterance.pitch = 0.9;
                utterance.rate = 1.05; // Slightly faster for efficiency
            } else {
                utterance.pitch = 1.0;
                utterance.rate = 1.0;
            }
        }

        utterance.onstart = () => setState(prev => ({ ...prev, isSpeaking: true }));
        utterance.onend = () => setState(prev => ({ ...prev, isSpeaking: false }));
        utterance.onerror = () => setState(prev => ({ ...prev, isSpeaking: false }));

        synthesisRef.current.speak(utterance);
    };

    const startListening = () => {
        if (!recognitionRef.current) return;

        // Clean previous state
        setState(prev => ({ ...prev, isListening: true, transcript: "", error: null }));

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
            if (event.error === 'no-speech') return; // Simply ignore silence, don't log error

            console.error("Speech Error:", event.error);
            let errorMessage = "Voice error occurred.";
            if (event.error === 'network') errorMessage = "Network error. Please check your connection.";
            if (event.error === 'not-allowed') errorMessage = "Microphone access denied.";

            setState(prev => ({ ...prev, isListening: false, error: errorMessage }));
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
