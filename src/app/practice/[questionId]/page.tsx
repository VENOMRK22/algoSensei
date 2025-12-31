"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Question } from "@/types/question";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import ProblemDescription from "@/components/workspace/ProblemDescription";
import CodeEditor from "@/components/workspace/CodeEditor";
import EditorFooter from "@/components/workspace/EditorFooter";
import AIPanel from "@/components/workspace/AIPanel";
import AiTutorPanel from "@/components/workspace/AiTutorPanel";
import { Sparkles } from "lucide-react";

export default function PracticePage() {
    const { questionId } = useParams();
    const router = useRouter();

    const [question, setQuestion] = useState<Question | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Editor State
    const [language, setLanguage] = useState<"javascript" | "python" | "java">("javascript");
    const [code, setCode] = useState("");

    // UI State
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

    // Fetch Question
    useEffect(() => {
        if (!questionId) return;

        const fetchQuestion = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, "questions", questionId as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const qData = docSnap.data() as Question;
                    setQuestion(qData);
                    // Set default code based on current language
                    // Note: Use 'javascript' as simplified key if needed, or map strictly
                    setCode(qData.defaultCode[language] || "");
                } else {
                    setNotFound(true);
                }
            } catch (error) {
                console.error("Error fetching question:", error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestion();
    }, [questionId]);

    // Update code when language changes (if user hasn't typed much? Or just always reset for now?)
    // In a real app, we'd cache the user's draft for each language.
    // For now, let's just reset to default boilerplate of the new language.
    useEffect(() => {
        if (question) {
            setCode(question.defaultCode[language] || "");
        }
    }, [language, question]);

    if (loading) {
        return (
            <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-medium animate-pulse">Loading Workspace...</p>
            </div>
        );
    }

    if (notFound || !question) {
        return (
            <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-3xl font-bold text-white mb-2">Problem Not Found</h1>
                <p className="text-slate-400 mb-6">The question ID you are looking for does not exist.</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    const handleRun = () => {
        alert("Running Code... (Logic coming soon)");
    };

    const handleSubmit = () => {
        alert("Submitting Code... (Logic coming soon)");
    };

    // AI State
    const [history, setHistory] = useState<any[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"problem" | "ai">("problem");

    // Fetch Question logic... (omitted for brevity, keep existing)
    // ...

    const handleSendMessage = async (userMessage: string) => {
        // Add User Message
        const newHistory = [...history, { role: "user", text: userMessage }];
        setHistory(newHistory);
        setAiLoading(true);

        try {
            const response = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history: newHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })), // Format for Gemini
                    message: userMessage,
                    context: {
                        code,
                        language,
                        questionTitle: question?.title,
                    }
                }),
            });

            const data = await response.json();
            if (data.text) {
                setHistory(prev => [...prev, { role: "model", text: data.text }]);
            }
        } catch (error) {
            console.error("AI Error:", error);
            setHistory(prev => [...prev, { role: "model", text: "Something went wrong. I cannot answer right now." }]);
        } finally {
            setAiLoading(false);
        }
    };

    // Auto-trigger from Footer (passed down)
    const handleAiErrorTrigger = async (errorLog: string) => {
        setActiveTab("ai");
        // Don't send immediately visible message to user, maybe just a system note? 
        // Or simulation: User says "I got this error..."
        const userMessage = `I got this error when running my code:\n${errorLog}\n\nPlease help me fix it without giving the answer.`;
        handleSendMessage(userMessage);
    };


    if (loading) return <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-slate-400">Loading Workspace...</div>;
    if (notFound || !question) return <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-white">Problem Not Found</div>;

    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">

                    {/* LEFT PANEL: Description OR AI */}
                    <ResizablePanel defaultSize={40} minSize={20}>
                        <div className="flex flex-col h-full relative">
                            {/* Tabs Switcher for Left Panel */}
                            <div className="absolute top-4 right-6 z-10 flex bg-slate-900/80 p-1 rounded-lg backdrop-blur-sm border border-white/5 shadow-lg">
                                <button
                                    onClick={() => setActiveTab("problem")}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'problem' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    Problem
                                </button>
                                <button
                                    onClick={() => setActiveTab("ai")}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-indigo-300'}`}
                                >
                                    <Sparkles size={12} />
                                    AI Tutor
                                </button>
                            </div>

                            {activeTab === "problem" ? (
                                <ProblemDescription question={question} />
                            ) : (
                                <AiTutorPanel
                                    history={history}
                                    setHistory={setHistory}
                                    isLoading={aiLoading}
                                    onSendMessage={handleSendMessage}
                                />
                            )}
                        </div>
                    </ResizablePanel>

                    <ResizableHandle className="w-1.5 bg-slate-900 border-l border-r border-white/5 hover:bg-blue-500/20 transition-colors" />

                    {/* RIGHT PANEL: Editor & Tools */}
                    <ResizablePanel defaultSize={60} minSize={30}>
                        <div className="h-full flex flex-col">
                            {/* Top: Editor */}
                            <div className="flex-1 overflow-hidden">
                                <CodeEditor
                                    question={question}
                                    language={language}
                                    setLanguage={setLanguage}
                                    code={code}
                                    setCode={setCode}
                                />
                            </div>

                            {/* Bottom: Footer */}
                            <EditorFooter
                                code={code}
                                language={language}
                                testCases={question?.testCases}
                                onSubmit={handleSubmit}
                                onAiToggle={() => setActiveTab(prev => prev === 'ai' ? 'problem' : 'ai')}
                                isAiOpen={activeTab === 'ai'}
                                onRunError={handleAiErrorTrigger} // Pass the trigger callback
                            />
                        </div>
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>
        </div>
    );
}
