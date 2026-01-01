"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TOPICS, LEVELS } from "@/lib/topics";
import { getQuestionsByTopicId } from "@/lib/allQuestions";
import { Question } from "@/types/question";
import StatCard from "@/components/dashboard/StatCard";
import LearningPathCard from "@/components/dashboard/LearningPathCard";
import { Trophy, Target, Zap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TechGridBackground } from "@/components/ui/tech-grid-background";

export default function DashboardPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        const itemsRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(itemsRef, (doc) => {
            if (doc.exists()) {
                setUserData(doc.data());
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, router]);

    // Derived Stats
    const currentXP = userData?.xp || 0;
    const currentLevel = Math.floor(currentXP / 100) + 1;
    const solvedCount = userData?.solvedQuestionIds?.length || 0;

    const getSolvedForTopic = (topicId: string) => {
        if (!userData?.solvedQuestionIds) return 0;
        const topicQuestions = getQuestionsByTopicId(topicId);
        if (!topicQuestions.length) return 0;
        const topicQuestionIds = new Set(topicQuestions.map((q: Question) => q.id));
        const solvedInTopic = userData.solvedQuestionIds.filter((id: string) => topicQuestionIds.has(id));
        return solvedInTopic.length;
    };

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse max-w-6xl mx-auto mt-10 p-6">
                <div className="flex justify-between items-end">
                    <div className="h-10 w-48 bg-white/5 rounded-lg"></div>
                    <div className="h-14 w-48 bg-white/5 rounded-2xl"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white/5 rounded-3xl"></div>)}
                </div>
                <div className="space-y-12">
                    <div className="h-8 w-64 bg-white/5 rounded-lg"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-3xl"></div>)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex-1 overflow-hidden h-full">
             {/* Dynamic Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <TechGridBackground />
            </div>

            <div className="relative z-10 h-full overflow-y-auto custom-scrollbar focus-mode-wrapper p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="max-w-6xl mx-auto space-y-10 pb-20"
                >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-white/5 pb-6">
                        <div>
                            <motion.h2 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-4xl font-bold tracking-tighter mb-2 text-white font-mono uppercase"
                            >
                                Dashboard
                            </motion.h2>
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-muted-foreground text-lg"
                            >
                                System Status: Active // User: {user?.displayName || 'Cadet'}
                            </motion.p>
                        </div>
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.push("/navigator")}
                            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 font-bold uppercase tracking-widest text-sm shadow-[0_0_20px_var(--primary)] hover:shadow-[0_0_30px_var(--primary)] transition-all flex items-center gap-2 group"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 fill-current" />
                                Navigator HQ
                            </span>
                        </motion.button>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: Zap, label: "Total XP", value: currentXP, color: "oklch(0.7 0.18 70)" },
                            { icon: Trophy, label: "Rank", value: `Lvl.${currentLevel}`, color: "oklch(0.7 0.16 170)" },
                            { icon: Target, label: "Solved", value: solvedCount, color: "oklch(0.7 0.2 140)" }
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + (i * 0.1) }}
                            >
                                <StatCard {...stat} />
                            </motion.div>
                        ))}
                    </div>

                    {/* Learning Path */}
                    <div className="space-y-16">
                        {LEVELS.map((level, levelIndex) => {
                            const levelTopics = TOPICS.filter(t => t.level === level.id);
                            
                            // Industrial Color Mapping
                            const levelColorClass =
                                level.id === 1 ? 'bg-[var(--chart-1)]' :
                                    level.id === 2 ? 'bg-[var(--chart-2)]' :
                                        level.id === 3 ? 'bg-[var(--chart-3)]' :
                                            level.id === 4 ? 'bg-[var(--chart-4)]' :
                                                'bg-[var(--chart-5)]';

                            return (
                                <motion.section 
                                    key={level.id} 
                                    className="space-y-6"
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`h-8 w-1.5 ${levelColorClass}`} />
                                        <h3 className="text-2xl font-bold text-white font-mono uppercase tracking-wide">{level.title}</h3>
                                        <div className="h-px bg-white/10 flex-1" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {levelTopics.map((topic, topicIndex) => {
                                            const solved = getSolvedForTopic(topic.id);
                                            const total = 10;
                                            return (
                                                <motion.div
                                                    key={topic.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    whileInView={{ opacity: 1, scale: 1 }}
                                                    viewport={{ once: true }}
                                                    transition={{ delay: topicIndex * 0.1, duration: 0.4 }}
                                                >
                                                    <LearningPathCard
                                                        icon={topic.icon}
                                                        title={topic.title}
                                                        description={topic.description}
                                                        progress={solved}
                                                        total={total}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.section>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
