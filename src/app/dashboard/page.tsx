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
            <div className="space-y-8 animate-pulse max-w-6xl mx-auto mt-10">
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
        <div className="flex-1 overflow-y-auto custom-scrollbar focus-mode-wrapper">
            <div className="max-w-6xl mx-auto space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                    <div>
                        <h2 className="text-4xl font-bold tracking-tight mb-2 text-white">Dashboard</h2>
                        <p className="text-slate-400 text-lg">Track your progress and master new algorithms.</p>
                    </div>
                    <button
                        onClick={() => router.push("/navigator")}
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20 px-8 h-14 font-bold text-white group relative overflow-hidden transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 fill-white" />
                            Open Navigator HQ
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    </button>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-6">
                    <StatCard icon={Zap} label="Total XP" value={currentXP} color="oklch(0.7 0.2 80)" />
                    <StatCard icon={Trophy} label="Current Rank" value={`Lvl ${currentLevel}`} color="oklch(0.7 0.2 300)" />
                    <StatCard icon={Target} label="Questions Solved" value={solvedCount} color="oklch(0.7 0.2 160)" />
                </div>

                {/* Learning Path */}
                <div className="space-y-12">
                    {LEVELS.map((level) => {
                        const levelTopics = TOPICS.filter(t => t.level === level.id);
                        const levelColorClass =
                            level.id === 1 ? 'bg-blue-500' :
                                level.id === 2 ? 'bg-cyan-500' :
                                    level.id === 3 ? 'bg-indigo-500' :
                                        level.id === 4 ? 'bg-violet-500' :
                                            'bg-fuchsia-500';

                        return (
                            <section key={level.id} className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className={`h-6 w-1 rounded-full ${levelColorClass}`} />
                                    <h3 className="text-xl font-bold text-white">{level.title}</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {levelTopics.map((topic) => {
                                        const solved = getSolvedForTopic(topic.id);
                                        const total = 10; // Hardcoded goal per topic for visual progress
                                        return (
                                            <LearningPathCard
                                                key={topic.id}
                                                icon={topic.icon}
                                                title={topic.title}
                                                description={topic.description}
                                                progress={solved}
                                                total={total}
                                            />
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
