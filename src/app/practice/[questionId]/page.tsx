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

    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col overflow-hidden">
            {/* Main Workspace Layout */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">

                    {/* LEFT PANEL: Description */}
                    <ResizablePanel defaultSize={40} minSize={20}>
                        <ProblemDescription question={question} />
                    </ResizablePanel>

                    <ResizableHandle className="w-1.5 bg-slate-900 border-l border-r border-white/5 hover:bg-blue-500/20 transition-colors" />

                    {/* RIGHT PANEL: Editor & Tools */}
                    <ResizablePanel defaultSize={60} minSize={30}>
                        <div className="h-full flex flex-col">
                            {/* Top: Editor */}
                            <div className="flex-1 overflow-hidden">
                                <ResizablePanelGroup direction="horizontal">
                                    {/* Code Editor Area */}
                                    <ResizablePanel defaultSize={isAiPanelOpen ? 70 : 100} minSize={30}>
                                        <CodeEditor
                                            question={question}
                                            language={language}
                                            setLanguage={setLanguage}
                                            code={code}
                                            setCode={setCode}
                                        />
                                    </ResizablePanel>

                                    {/* AI Panel (Conditional Slide-in) */}
                                    {isAiPanelOpen && (
                                        <>
                                            <ResizableHandle className="w-1.5 bg-slate-900 border-l border-r border-white/5" />
                                            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                                                <AIPanel isOpen={isAiPanelOpen} onClose={() => setIsAiPanelOpen(false)} />
                                            </ResizablePanel>
                                        </>
                                    )}
                                </ResizablePanelGroup>
                            </div>

                            {/* Bottom: Footer */}
                            <EditorFooter
                                code={code}
                                language={language}
                                onRun={handleRun}
                                testCases={question?.testCases} // Pass available test cases
                                onSubmit={handleSubmit}
                                onAiToggle={() => setIsAiPanelOpen(!isAiPanelOpen)}
                                isAiOpen={isAiPanelOpen}
                            />
                        </div>
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>
        </div>
    );
}
