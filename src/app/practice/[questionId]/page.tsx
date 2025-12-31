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

    // AI State
    const [history, setHistory] = useState<any[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"problem" | "ai">("problem");
    const [hasUnreadAi, setHasUnreadAi] = useState(false); // Red Dot State

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

    // Added: Update code when language changes
    useEffect(() => {
        if (question) {
            setCode(question.defaultCode[language] || "");
        }
    }, [language, question]);

    const handleRun = () => {
        alert("Running Code... (Logic coming soon)");
    };

    const handleSubmit = () => {
        alert("Submitting Code... (Logic coming soon)");
    };

    const handleSendMessage = async (userMessage: string) => {
        // Add User Message (Visible)
        const newHistory = [...history, { role: "user", text: userMessage }];
        setHistory(newHistory);
        setAiLoading(true);
        setActiveTab("ai"); // Force switch on manual chat
        setHasUnreadAi(false); // Clear dot if user is typing

        try {
            const response = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history: newHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
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
            setHistory(prev => [...prev, { role: "model", text: "Something went wrong." }]);
        } finally {
            setAiLoading(false);
        }
    };

    // "Ghost" Trigger - Silent send
    const handleRunComplete = async (result: { stdout: string; stderr: string; isSuccess: boolean }) => {
        setAiLoading(true);
        // Do NOT add user message to history.
        // If Error -> Switch tab immediately.
        if (!result.isSuccess) {
            setActiveTab("ai");
            setHasUnreadAi(false);
        } else {
            // If Success -> Don't switch, just show Red Dot.
            setHasUnreadAi(true);
        }

        try {
            const response = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
                    message: "", // Empty message signals "System Event" to our updated API
                    context: {
                        code,
                        language,
                        questionTitle: question?.title,
                        executionResult: result // Pass the full result object
                    }
                }),
            });

            const data = await response.json();
            if (data.text) {
                // Append AI response ONLY
                setHistory(prev => [...prev, { role: "model", text: data.text }]);
            }
        } catch (error) {
            console.error("AI Ghost Error:", error);
        } finally {
            setAiLoading(false);
        }
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
                                    onClick={() => {
                                        setActiveTab("ai");
                                        setHasUnreadAi(false);
                                    }}
                                    className={`relative px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-indigo-300'}`}
                                >
                                    <Sparkles size={12} />
                                    AI Tutor
                                    {/* Red Dot Notification */}
                                    {hasUnreadAi && activeTab !== 'ai' && (
                                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    )}
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
                                onRunComplete={handleRunComplete}
                                onHint={() => {
                                    setActiveTab("ai");
                                    handleSendMessage("Can you give me a small hint about the next step? Don't give me the answer.");
                                }}
                            />
                        </div>
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>
        </div>
    );
}
