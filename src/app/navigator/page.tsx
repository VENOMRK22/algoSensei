"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOPICS } from "@/lib/topics";
import { ALL_QUESTIONS, getQuestionsByTopicId, TOPIC_ID_TO_CATEGORY } from "@/lib/allQuestions";
import { Question } from "@/types/question";
import { Zap, Trophy, BrainCircuit, Activity, ChevronRight, CheckCircle2, AlertCircle, TrendingUp, ChevronLeft, ChevronRight as ChevronNext } from "lucide-react";
import { TechGridBackground } from "@/components/ui/tech-grid-background";
import { motion } from "framer-motion";

const formatSmartDate = (isoString?: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

    // Check Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

export default function NavigatorPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [navLoading, setNavLoading] = useState(false);

    // Pagination for History
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // --- NAVIGATION LOGIC ---
    // --- NAVIGATION LOGIC ---
    const handleSmartStart = async () => {
        if (!user || !userData) return;
        setNavLoading(true);

        const currentSolved = new Set(userData.solvedQuestionIds || []);
        const CACHE_KEY = `navigator_rec_${user.uid}`;

        try {
            // 1. Check Cache
            const cachedParams = localStorage.getItem(CACHE_KEY);
            if (cachedParams) {
                const decision = JSON.parse(cachedParams);
                // If we have a recommendation AND the user hasn't solved it yet -> Use it!
                if (decision.questionId && !currentSolved.has(decision.questionId)) {
                    console.log("🧭 Using Cached Recommendation:", decision.questionId);
                    router.push(`/practice/${decision.questionId}`);
                    return; // Exit early
                }
            }

            // 2. Fetch Fresh (Cache Miss or Expired/Solved)
            const res = await fetch("/api/navigator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid })
            });

            const decision = await res.json();

            if (decision.error) {
                alert("Navigator Error: " + decision.error);
                return;
            }

            if (decision.message === "All questions solved!") {
                alert("You have solved everything! Great job!");
                return;
            }

            // 3. Update Cache & Redirect
            localStorage.setItem(CACHE_KEY, JSON.stringify(decision));
            router.push(`/practice/${decision.questionId}`);

        } catch (error) {
            console.error("Navigator Error:", error);
            alert("Failed to start session.");
        } finally {
            setNavLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return; // Wait for Auth

        const itemsRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(itemsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setUserData(data);

                // REDIRECT IF NEW USER (No Onboarding Flag)
                // We allow a small delay or check to ensure data is fully loaded
                if (data && !data.hasOnboarded) {
                    router.replace("/onboarding");
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, router]);

    if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Navigator...</div>;

    // --- DERIVED STATS ---
    const solvedIds = new Set(userData?.solvedQuestionIds || []);
    const solvedCount = solvedIds.size;

    // Determine Level
    // Simple logic: < 10 Solved = Novice, 10-30 = Intermediate, 30+ = Advanced
    let levelTitle = "Novice";
    let levelColor = "text-blue-400";
    if (solvedCount >= 10) { levelTitle = "Apprentice"; levelColor = "text-indigo-400"; }
    if (solvedCount >= 30) { levelTitle = "Expert"; levelColor = "text-purple-400"; }
    if (solvedCount >= 50) { levelTitle = "Grandmaster"; levelColor = "text-amber-400"; }

    // --- SKILL MATRIX ---
    // Categorize topics based on solved count
    // Strong: >= 5 solved
    // Mid: 1-4 solved
    // Weak: 0 solved
    const skillMatrix = {
        strong: [] as typeof TOPICS,
        mid: [] as typeof TOPICS,
        weak: [] as typeof TOPICS
    };

    TOPICS.forEach(topic => {
        // Need to count REAL solved in this topic
        // We do this by cross-referencing ALL_QUESTIONS
        // Note: Ideally we'd have a map, but filter finding is fast enough for <1000 items
        const topicQs = ALL_QUESTIONS.filter(q => q.category === TOPIC_ID_TO_CATEGORY[topic.id]);
        const solvedInTopic = topicQs.filter(q => solvedIds.has(q.id)).length;

        if (solvedInTopic >= 5) skillMatrix.strong.push(topic);
        else if (solvedInTopic >= 1) skillMatrix.mid.push(topic);
        else skillMatrix.weak.push(topic);
    });

    // --- HISTORY LIST ---
    const solvedQuestionsList = ALL_QUESTIONS.filter(q => solvedIds.has(q.id)).reverse(); // Show newest first (mock reverse if array order isn't guaranteed)
    // Pagination
    const totalHistoryPages = Math.ceil(solvedQuestionsList.length / ITEMS_PER_PAGE);
    const visibleHistory = solvedQuestionsList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


    // --- ANIMATION VARIANTS ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="relative min-h-screen text-foreground font-sans overflow-hidden">
             {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <TechGridBackground />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-6 md:p-12 space-y-12">
                
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-12"
                >
                    {/* 1. HEADER & HERO ACTION */}
                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                                    <BrainCircuit className="text-primary" size={24} />
                                </div>
                                <h1 className="text-3xl font-bold tracking-tighter uppercase font-mono">Smart Navigator HQ</h1>
                            </div>
                            <p className="text-muted-foreground max-w-xl text-lg">
                                Your personalized command center. The AI tracks your progress and adapts the curriculum to your exact skill gap.
                            </p>
                        </div>

                        <button
                            onClick={handleSmartStart}
                            disabled={navLoading}
                            className={`
                                group relative overflow-hidden rounded-xl bg-primary text-primary-foreground px-8 py-6 transition-all hover:scale-105 hover:shadow-[0_0_40px_var(--primary)] active:scale-95 border border-primary/50
                                ${navLoading ? 'opacity-80 cursor-wait' : 'shadow-2xl shadow-primary/20'}
                            `}
                        >
                            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 skew-x-12 -translate-x-full" />
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    {navLoading ? (
                                        <Activity className="animate-spin text-primary-foreground" size={32} />
                                    ) : (
                                        <>
                                            <Zap className="fill-current text-primary-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping opacity-30" size={40} />
                                            <Zap className="fill-current text-primary-foreground relative z-10" size={32} />
                                        </>
                                    )}
                                </div>
                                <div className="text-left">
                                    <div className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider font-mono">Ready to Train?</div>
                                    <div className="text-2xl font-bold text-primary-foreground uppercase tracking-tight">{navLoading ? "Analyzing..." : "Start Adaptive Session"}</div>
                                </div>
                                <ChevronRight className="text-primary-foreground/80 group-hover:translate-x-1 transition-transform" size={24} />
                            </div>
                        </button>
                    </motion.div>

                    {/* 2. KEY STATS */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border-l-4 border-l-emerald-500">
                            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <CheckCircle2 className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold font-mono">{solvedCount}</div>
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Solved</div>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border-l-4 border-l-amber-500">
                            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <Trophy className="text-amber-400" size={24} />
                            </div>
                            <div>
                                <div className={`text-2xl font-bold font-mono ${levelColor}`}>{levelTitle}</div>
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Rank</div>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border-l-4 border-l-blue-500">
                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <TrendingUp className="text-blue-400" size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold font-mono">{skillMatrix.strong.length}</div>
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Strong Topics</div>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-xl flex items-center gap-4 border-l-4 border-l-rose-500">
                            <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                                <AlertCircle className="text-rose-400" size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold font-mono">{skillMatrix.weak.length}</div>
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Topics to Improve</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3. SKILL MATRIX */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Strong Column */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-sm font-mono">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" /> Strong Areas
                            </div>
                            <div className="bg-card/30 border border-emerald-500/20 rounded-xl p-4 min-h-[200px] space-y-2 backdrop-blur-sm">
                                {skillMatrix.strong.length === 0 && <div className="text-muted-foreground text-sm italic">Keep practicing to build mastery!</div>}
                                {skillMatrix.strong.map(t => (
                                    <div key={t.id} className="flex items-center gap-3 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors">
                                        <t.icon className="text-emerald-400" size={16} />
                                        <span className="text-emerald-100 text-sm font-medium">{t.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mid Column */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider text-sm font-mono">
                                <div className="w-2 h-2 rounded-full bg-blue-400" /> Developing
                            </div>
                            <div className="bg-card/30 border border-blue-500/20 rounded-xl p-4 min-h-[200px] space-y-2 backdrop-blur-sm">
                                {skillMatrix.mid.length === 0 && <div className="text-muted-foreground text-sm italic">Start solving new topics!</div>}
                                {skillMatrix.mid.map(t => (
                                    <div key={t.id} className="flex items-center gap-3 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
                                        <t.icon className="text-blue-400" size={16} />
                                        <span className="text-blue-100 text-sm font-medium">{t.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weak Column */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-muted-foreground font-bold uppercase tracking-wider text-sm font-mono">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground" /> Not Started / Weak
                            </div>
                            <div className="bg-card/30 border border-white/5 rounded-xl p-4 min-h-[200px] space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar backdrop-blur-sm">
                                {skillMatrix.weak.map(t => (
                                    <div key={t.id} className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg transition-colors opacity-60 hover:opacity-100 group">
                                        <t.icon className="text-muted-foreground group-hover:text-foreground transition-colors" size={16} />
                                        <span className="text-muted-foreground group-hover:text-foreground text-sm font-medium transition-colors">{t.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* 4. HISTORY TABLE (Paginated) */}
                    <motion.div variants={itemVariants} className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold font-mono uppercase tracking-wide">Solved History</h2>
                            <div className="text-sm text-muted-foreground font-mono">
                                Showing {visibleHistory.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, solvedQuestionsList.length)} of {solvedQuestionsList.length}
                            </div>
                        </div>

                        <div className="bg-card/40 rounded-xl border border-white/5 overflow-hidden backdrop-blur-md">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/5 text-xs uppercase tracking-wider text-muted-foreground font-mono">
                                        <th className="p-4 pl-6 font-medium">Problem</th>
                                        <th className="p-4 font-medium">Difficulty</th>
                                        <th className="p-4 font-medium">Category</th>
                                        <th className="p-4 font-medium">Date</th>
                                        <th className="p-4 font-medium text-right pr-6">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {visibleHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground italic">No questions solved yet. Start your journey!</td>
                                        </tr>
                                    ) : (
                                        visibleHistory.map(q => (
                                            <tr key={q.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="p-4 pl-6 font-medium text-foreground">{q.title}</td>
                                                <td className="p-4">
                                                    <span className={`
                                                        px-2 py-0.5 rounded text-xs font-semibold font-mono
                                                        ${q.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            q.difficulty === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}
                                                    `}>
                                                        {q.difficulty}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-muted-foreground text-sm">{q.category}</td>
                                                <td className="p-4 text-muted-foreground text-sm font-mono">
                                                    {formatSmartDate(userData?.solvedAt?.[q.id])}
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    <button
                                                        onClick={() => router.push(`/practice/${q.id}`)}
                                                        className="text-primary hover:text-primary/80 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity font-mono uppercase tracking-wider"
                                                    >
                                                        Review
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalHistoryPages > 1 && (
                            <div className="flex justify-center gap-4 mt-6">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-primary"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="flex items-center px-4 font-mono text-muted-foreground">
                                    Page {currentPage} of {totalHistoryPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalHistoryPages, p + 1))}
                                    disabled={currentPage === totalHistoryPages}
                                    className="p-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-primary"
                                >
                                    <ChevronNext size={20} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
