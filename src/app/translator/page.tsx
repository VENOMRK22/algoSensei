"use client";

import { useState } from "react";
import { Editor } from "@monaco-editor/react";
import { ArrowRightLeft, Sparkles, Copy, Check, MessageSquare } from "lucide-react";


// Simple toggle component if shadcn switch is missing
const SimpleSwitch = ({ checked, onCheckedChange }: { checked: boolean, onCheckedChange: (c: boolean) => void }) => (
    <button
        onClick={() => onCheckedChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${checked ? 'left-6' : 'left-1'}`} />
    </button>
);

const TARGET_LANGUAGES = [
    { id: "python", label: "Python" },
    { id: "java", label: "Java" },
    { id: "javascript", label: "JavaScript" },
    { id: "cpp", label: "C++" },
    { id: "typescript", label: "TypeScript" },
];

const SOURCE_LANGUAGES = [
    { id: "auto", label: "✨ Auto Detect" },
    ...TARGET_LANGUAGES
];

export default function TranslatorPage() {
    const [sourceCode, setSourceCode] = useState("// Paste your code here...");
    const [sourceLang, setSourceLang] = useState("auto"); // Default Auto

    const [targetCode, setTargetCode] = useState("");
    const [targetLang, setTargetLang] = useState("python");

    const [isLoading, setIsLoading] = useState(false);
    const [includeComments, setIncludeComments] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleTranslate = async () => {
        if (!sourceCode.trim()) return;
        setIsLoading(true);

        try {
            const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceCode,
                    sourceLang: sourceLang === 'auto' ? null : sourceLang, // Send null if auto
                    targetLang,
                    includeComments
                })
            });
            const data = await res.json();

            if (data.translatedCode) {
                setTargetCode(data.translatedCode);
            } else {
                alert("Translation failed: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            console.error(error);
            alert("Failed to connect to translator.");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(targetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-outfit">

            {/* Header / Config Bar */}
            <div className="h-20 border-b border-white/10 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <ArrowRightLeft className="text-indigo-400" size={20} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Code Translator</h1>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6">

                    <div className="flex items-center gap-3 bg-slate-800/50 py-2 px-4 rounded-full border border-white/5">
                        <MessageSquare size={16} className={includeComments ? "text-indigo-400" : "text-slate-400"} />
                        <span className="text-sm font-medium text-slate-300">Explain Changes</span>
                        <SimpleSwitch checked={includeComments} onCheckedChange={setIncludeComments} />
                    </div>

                    <button
                        onClick={handleTranslate}
                        disabled={isLoading}
                        className={`
                            flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all
                            ${isLoading
                                ? 'bg-slate-800 text-slate-500 cursor-wait'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 shadow-lg shadow-indigo-500/20 text-white'
                            }
                        `}
                    >
                        {isLoading ? (
                            <>Converting...</>
                        ) : (
                            <>
                                <Sparkles size={18} className="fill-white" />
                                Translate Code
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content: Split View */}
            <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-80px)] overflow-hidden">

                {/* LEFT: SOURCE */}
                <div className="flex-1 flex flex-col border-r border-white/10 bg-[#1e1e1e]">
                    <div className="h-12 flex items-center justify-between px-4 bg-[#252526] border-b border-white/5">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Source (Auto-Detect)</span>
                        <select
                            value={sourceLang}
                            onChange={(e) => setSourceLang(e.target.value)}
                            className="bg-slate-800 border border-white/10 text-xs text-white rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                            {SOURCE_LANGUAGES.map(lang => (
                                <option key={lang.id} value={lang.id} className="bg-slate-900 text-white">{lang.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            language={sourceLang === 'auto' ? undefined : sourceLang} // Undefined allows Monaco to guess or default
                            theme="vs-dark"
                            value={sourceCode}
                            onChange={(val) => setSourceCode(val || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                padding: { top: 20 },
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>
                </div>

                {/* RIGHT: TARGET */}
                <div className="flex-1 flex flex-col bg-[#1e1e1e]">
                    <div className="h-12 flex items-center justify-between px-4 bg-[#252526] border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Translated Output</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={targetLang}
                                onChange={(e) => setTargetLang(e.target.value)}
                                className="bg-indigo-600/20 border border-indigo-500/30 text-xs text-indigo-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                            >
                                {TARGET_LANGUAGES.map(lang => (
                                    <option key={lang.id} value={lang.id} className="bg-slate-900 text-white">{lang.label}</option>
                                ))}
                            </select>

                            {targetCode && (
                                <button
                                    onClick={copyToClipboard}
                                    className="p-1.5 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
                                    title="Copy Source"
                                >
                                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 relative">
                        <div className="absolute inset-0">
                            <Editor
                                height="100%"
                                language={targetLang} // Dynamic Language Highlighting
                                theme="vs-dark"
                                value={targetCode}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    padding: { top: 20 },
                                    scrollBeyondLastLine: false,
                                    readOnly: true // Result is read-only
                                }}
                            />
                        </div>
                        {/* Empty State Overlay */}
                        {!targetCode && !isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center space-y-2 opacity-30">
                                    <ArrowRightLeft size={48} className="mx-auto" />
                                    <p className="text-lg font-medium">Ready to Translate</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
