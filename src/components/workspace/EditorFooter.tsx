import { useState } from "react";
import { Play, CheckCircle, Sparkles, Terminal, X, ChevronUp, ChevronDown, Lightbulb } from "lucide-react";
import { formatCodeForExecution } from "@/lib/codeRunner";
import { updateUserProgress } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import confetti from "canvas-confetti";
import { useParams } from "next/navigation";
import { Question, TestCase } from "@/types/question"; // Ensure TestCase type exists

interface EditorFooterProps {
    code: string;
    language: string;
    testCases?: TestCase[]; // Make optional or required based on usage
    onRun?: () => void;
    onSubmit: () => void;
    onAiToggle: () => void;
    isAiOpen: boolean;
    onHint: () => void;
    onRunComplete?: (result: { stdout: string; stderr: string; isSuccess: boolean }) => void;
}

export default function EditorFooter({ code, language, testCases, onSubmit, onAiToggle, isAiOpen, onRunComplete, onHint }: EditorFooterProps) {
    const { user } = useAuth();
    const params = useParams();
    const currentQuestionId = params?.questionId as string;

    const [isLoading, setIsLoading] = useState(false);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [output, setOutput] = useState<{ stdout: string; stderr: string } | null>(null);

    const handleRunCode = async () => {
        setIsLoading(true);
        setIsConsoleOpen(true);
        setOutput(null);

        try {
            // Prepare code...
            const runInput = testCases && testCases.length > 0 ? testCases[0].input : "";
            const executableCode = formatCodeForExecution(language, code, runInput);

            const response = await fetch("/api/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language,
                    code: executableCode,
                    input: typeof runInput === 'object' ? JSON.stringify(runInput) : String(runInput)
                }),
            });

            const data = await response.json();

            if (data.run) {
                setOutput({
                    stdout: data.run.stdout,
                    stderr: data.run.stderr,
                });

                if (data.run.stderr) {
                    // Trigger AI on Error (Ghost)
                    if (onRunComplete) onRunComplete({ stdout: data.run.stdout, stderr: data.run.stderr, isSuccess: false });
                } else {
                    // Trigger AI on Success (Ghost - for optimization tips)
                    if (onRunComplete) onRunComplete({ stdout: data.run.stdout, stderr: "", isSuccess: true });
                }
            } else {
                setOutput({ stdout: "", stderr: "Error: No output received." });
            }

        } catch (error: any) {
            console.error("Execution error:", error);
            setOutput({ stdout: "", stderr: "Failed to connect to execution server." });
            if (onRunComplete) onRunComplete({ stdout: "", stderr: error.message || "Execution Failed", isSuccess: false });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!testCases || testCases.length === 0) {
            alert("No test cases available for this question.");
            return;
        }

        setIsLoading(true);
        setIsConsoleOpen(true);
        setOutput({ stdout: "🚀 Starting submission...\n", stderr: "" });

        let allPassed = true;

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            const input = testCase.input;
            // Normalize expected output
            const expected = testCase.expectedOutput; // Already stringified in DB

            // Update console for progress
            setOutput(prev => ({
                stdout: (prev?.stdout || "") + `Test Case ${i + 1}/${testCases.length}: Running... `,
                stderr: prev?.stderr || ""
            }));

            // Prepare code
            const executableCode = formatCodeForExecution(language, code, input);

            try {
                const response = await fetch("/api/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        language,
                        code: executableCode,
                        input: typeof input === 'object' ? JSON.stringify(input) : String(input)
                    }),
                });

                const data = await response.json();

                if (data.run && data.run.stderr) {
                    setOutput(prev => ({
                        stdout: (prev?.stdout || "") + "❌ Error\n",
                        stderr: (prev?.stderr || "") + `\n[Test Case ${i + 1} Error]: ${data.run.stderr}`
                    }));
                    allPassed = false;
                    break;
                }

                if (data.run) {
                    const actualRaw = data.run.stdout.trim();
                    // Normalize: Remove whitespace AND quotes to handle Type Mismatches (e.g. "1" vs 1)
                    // This allows ["1", "2"] to match [1, 2]
                    const normalizeStrict = (str: string) => str.replace(/[\s"']/g, "");

                    const actualNorm = normalizeStrict(actualRaw);
                    const expectedNorm = normalizeStrict(expected);

                    if (actualNorm === expectedNorm) {
                        setOutput(prev => ({
                            stdout: (prev?.stdout || "") + "✅ Passed\n",
                            stderr: prev?.stderr || ""
                        }));
                    } else {
                        setOutput(prev => ({
                            stdout: (prev?.stdout || "") + "❌ Failed\n",
                            stderr: (prev?.stderr || "") + `\n[Test Case ${i + 1} Failed]\nExpected: ${expectedNorm}\nActual:   ${actualNorm}`
                        }));
                        allPassed = false;
                        break;
                    }
                } else {
                    allPassed = false;
                    break;
                }

            } catch (err) {
                console.error(err);
                allPassed = false;
                break;
            }
        }

        if (allPassed) {
            setOutput(prev => ({
                stdout: (prev?.stdout || "") + "\n🎉 ALL TEST CASES PASSED! 🎉\n",
                stderr: prev?.stderr || ""
            }));

            // Victory Effect
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            // Update Progress in Firebase
            if (user?.uid && currentQuestionId) {
                try {
                    await updateUserProgress(user.uid, currentQuestionId, 20);
                } catch (e) {
                    console.error("Failed to save progress", e);
                }
            }
        } else {
            setOutput(prev => ({
                stdout: (prev?.stdout || "") + "\nSubmission Failed. Check errors above.\n",
                stderr: prev?.stderr || ""
            }));
        }

        setIsLoading(false);
    };

    return (
        <div className="flex flex-col bg-[#1e1e1e] border-t border-white/5">

            {/* Console Panel (Expandable) */}
            {isConsoleOpen && (
                <div className="h-48 border-b border-white/5 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Console Output</span>
                        <button onClick={() => setIsConsoleOpen(false)} className="text-slate-500 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-slate-400">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                <span>Processing...</span>
                            </div>
                        ) : output ? (
                            <>
                                {output.stderr && (
                                    <div className="text-red-400 whitespace-pre-wrap mb-4 bg-red-900/20 p-2 rounded border border-red-500/20">
                                        {output.stderr}
                                    </div>
                                )}
                                {output.stdout && (
                                    <div className="text-slate-300 whitespace-pre-wrap">
                                        {output.stdout}
                                    </div>
                                )}
                                {!output.stderr && !output.stdout && (
                                    <div className="text-slate-600 italic">No output returned.</div>
                                )}
                            </>
                        ) : (
                            <div className="text-slate-600 italic">Ready to execute.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer Bar */}
            <div className="h-14 flex items-center justify-between px-4">
                {/* Console Trigger */}
                <button
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                    className={`flex items-center gap-2 transition-colors text-sm font-medium ${isConsoleOpen ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <Terminal size={16} />
                    <span>Console</span>
                    {isConsoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">

                    {/* Hint Button */}
                    <button
                        onClick={onHint}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-slate-800 text-yellow-500/80 hover:text-yellow-400 hover:border-yellow-500/30 transition-all text-sm font-medium"
                        title="Get a Hint"
                    >
                        <Lightbulb size={16} />
                        <span>Hint</span>
                    </button>

                    {/* AI Tutor Toggle */}
                    <button
                        onClick={onAiToggle}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-medium
                            ${isAiOpen
                                ? 'bg-purple-600/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(147,51,234,0.15)]'
                                : 'bg-slate-800 text-slate-400 border-white/5 hover:text-purple-300 hover:border-purple-500/30'
                            }`}
                    >
                        <Sparkles size={16} />
                        <span>AI Tutor</span>
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1"></div>

                    {/* Run Code */}
                    <button
                        onClick={handleRunCode}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-slate-200 transition-colors text-sm font-medium
                            ${isLoading ? 'bg-slate-800 cursor-not-allowed text-slate-500' : 'bg-slate-700 hover:bg-slate-600'}`
                        }
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Play size={16} className="fill-current" />
                        )}
                        <span>{isLoading ? 'Running...' : 'Run'}</span>
                    </button>

                    {/* Submit Code */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-white shadow-lg transition-all text-sm font-medium
                            ${isLoading ? 'bg-emerald-900 text-emerald-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}`
                        }
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-emerald-200/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <CheckCircle size={16} />
                        )}
                        <span>{isLoading ? 'Grading...' : 'Submit'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
