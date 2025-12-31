import Editor, { OnMount } from "@monaco-editor/react";
import { useRef, useState, useEffect } from "react";
import { Question } from "@/types/question";
import { ChevronDown } from "lucide-react";

interface CodeEditorProps {
    question: Question;
    language: "javascript" | "python" | "java";
    setLanguage: (lang: "javascript" | "python" | "java") => void;
    code: string;
    setCode: (code: string) => void;
}

export default function CodeEditor({ question, language, setLanguage, code, setCode }: CodeEditorProps) {
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
    };

    // Auto-update code when language changes, usually handled by parent, 
    // but we need to ensure the parent is passing the correct 'code' prop.

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e]">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-white/5">
                <div className="flex items-center gap-2">
                    {/* Language Selector */}
                    <div className="relative group">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="appearance-none bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 pl-3 pr-8 py-1.5 rounded-md border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>vim mode: off</span>
                    <span>tab: 4 spaces</span>
                </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={(value) => setCode(value || "")}
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: true }, // Enabled for scrolling navigation
                        fontSize: 14,
                        lineHeight: 24,
                        fontFamily: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
                        fontLigatures: true,
                        scrollBeyondLastLine: true, // Allow scrolling past content
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        wordWrap: "on",
                        tabSize: 4,
                    }}
                />
            </div>
        </div>
    );
}
