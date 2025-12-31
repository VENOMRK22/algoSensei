"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Code, MessageSquare, Send, Keyboard, Mic as MicIcon } from "lucide-react";
import { useInterviewLogic, InterviewMode } from "@/hooks/useInterviewLogic";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function InterviewPage() {
    const { questionId } = useParams();
    const router = useRouter();
    const [questionTitle, setQuestionTitle] = useState("Loading...");

    // logic hook
    const {
        mode, setMode, messages, processing, sendMessage,
        isListening, isSpeaking, transcript, startListening, stopListening, hasBrowserSupport
    } = useInterviewLogic(questionTitle);

    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch Question
    useEffect(() => {
        if (!questionId) return;
        const fetchQ = async () => {
            const snap = await getDoc(doc(db, "questions", questionId as string));
            if (snap.exists()) {
                setQuestionTitle(snap.data().title);
            }
        };
        fetchQ();
    }, [questionId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleTextSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;
        sendMessage(inputText);
        setInputText("");
    };

    if (!hasBrowserSupport) return <div className="p-10 text-white">Browser not supported.</div>;

    return (
        <div className="h-screen bg-slate-950 flex flex-col items-center relative overflow-hidden font-outfit text-white">

            {/* Header / Mode Toggle */}
            <div className="z-20 w-full max-w-4xl p-6 flex items-center justify-between backdrop-blur-sm bg-slate-900/50 border-b border-white/5 sticky top-0">
                <div>
                    <div className="text-indigo-400 text-xs font-bold tracking-wider uppercase mb-1">Mock Interview</div>
                    <h1 className="text-xl font-bold">{questionTitle}</h1>
                </div>

                {/* Mode Toggle */}
                <div className="flex bg-slate-800 rounded-full p-1 border border-white/10">
                    <button
                        onClick={() => setMode("voice")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === 'voice' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <MicIcon size={14} />
                        Voice
                    </button>
                    <button
                        onClick={() => setMode("text")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${mode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Keyboard size={14} />
                        Text
                    </button>
                </div>

                <button
                    onClick={() => router.push(`/practice/${questionId}`)}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all text-sm font-bold"
                >
                    <Code size={16} />
                    <span>Start Coding</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 w-full max-w-3xl relative flex flex-col">

                {/* Voice Mode Visuals */}
                <AnimatePresence>
                    {mode === "voice" && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 flex flex-col items-center justify-center z-10"
                        >
                            {/* Visualizer */}
                            <div className="relative mb-12">
                                <AnimatePresence>
                                    {isListening && (
                                        <>
                                            <motion.div initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 bg-indigo-500 rounded-full" />
                                            <motion.div initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }} className="absolute inset-0 bg-purple-500 rounded-full" />
                                        </>
                                    )}
                                    {isSpeaking && (
                                        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="absolute inset-0 bg-emerald-500/30 rounded-full blur-xl" />
                                    )}
                                </AnimatePresence>

                                <button
                                    onClick={isListening ? stopListening : startListening}
                                    className={`
                                        relative w-32 h-32 rounded-full flex items-center justify-center text-white shadow-2xl transition-all z-20
                                        ${isListening ? 'bg-red-500 scale-110' : processing ? 'bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-105'}
                                    `}
                                >
                                    {isListening ? <Square className="fill-white" size={32} /> : processing ? <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mic size={40} />}
                                </button>
                            </div>

                            {/* Status */}
                            <div className="text-center h-24 px-4 w-full">
                                {isListening ? (
                                    <div className="text-2xl font-light text-slate-200 animate-pulse">
                                        Thinking... <br />
                                        <span className="text-lg text-slate-400 mt-2 block opacity-70">"{transcript}"</span>
                                    </div>
                                ) : processing ? (
                                    <div className="text-xl text-slate-400">Processing response...</div>
                                ) : isSpeaking ? (
                                    <div className="text-2xl font-medium text-white">Jarvis is speaking...</div>
                                ) : (
                                    <div className="text-slate-500">Tap to speak</div>
                                )}
                            </div>

                            {/* Last Message Bubble */}
                            <div className="mt-8 w-full px-6">
                                {messages.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={messages.length}
                                        className={`p-6 rounded-2xl max-w-xl mx-auto backdrop-blur-md border border-white/5 shadow-xl text-center bg-slate-800/80 text-indigo-100`}
                                    >
                                        <p className="text-lg leading-relaxed">
                                            {messages[messages.length - 1].content}
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Text Mode Visuals */}
                <AnimatePresence>
                    {mode === "text" && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                            className="absolute inset-0 flex flex-col z-10"
                        >
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-300 rounded-tl-none border border-white/10'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {processing && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none flex gap-1">
                                            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                                            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100" />
                                            <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Bar */}
                            <div className="p-4 bg-slate-900 border-t border-white/10">
                                <form onSubmit={handleTextSubmit} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Type your response..."
                                        className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputText.trim() || processing}
                                        className="p-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Send size={20} />
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
}
