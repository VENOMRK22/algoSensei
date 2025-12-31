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
import TopicCard from "@/components/dashboard/TopicCard";
import { Trophy, Target, Zap, Activity, ChevronRight } from "lucide-react";

export default function DashboardPage() {
    const { user } = useAuth();
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // --- SMART NAVIGATOR STATE ---
    // (Moved to new page logic, removed from here)

    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }

        // Real-time listener for user stats
        const itemsRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(itemsRef, (doc) => {
            if (doc.exists()) {
                setUserData(doc.data());
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, router]);


    // Generic Logic & Stats (Refactored to be safe even if loading)
    const currentXP = userData?.xp || 0;
    const currentLevel = Math.floor(currentXP / 100) + 1;
    const solvedCount = userData?.solvedQuestionIds?.length || 0;

    // Helper to count solved questions per topic
    const getSolvedForTopic = (topicId: string) => {
        if (!userData?.solvedQuestionIds) return 0;
        const topicQuestions = getQuestionsByTopicId(topicId);
        if (!topicQuestions.length) return 0;
        const topicQuestionIds = new Set(topicQuestions.map((q: Question) => q.id));
        const solvedInTopic = userData.solvedQuestionIds.filter((id: string) => topicQuestionIds.has(id));
        return solvedInTopic.length;
    };

    // Loading Skeleton (MUST be after all hooks)
    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="h-8 w-48 bg-slate-800 rounded-lg"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-800 rounded-2xl"></div>)}
                </div>
                <div className="space-y-12">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="space-y-4">
                            <div className="h-6 w-32 bg-slate-800 rounded-lg"></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(j => <div key={j} className="h-56 bg-slate-800 rounded-2xl"></div>)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-10 relative">
            {/* Welcome Header & Action */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold font-outfit text-white">
                        Dashboard
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Track your progress and master new algorithms.
                    </p>
                </div>

                {/* SMART START BUTTON - REDIRECT TO HQ */}
                <button
                    onClick={() => router.push("/navigator")}
                    className={`
                        group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/25
                    `}
                >
                    <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 skew-x-12 -translate-x-full" />
                    <div className="flex items-center gap-2 font-semibold text-white">
                        <Zap className="fill-white" size={20} />
                        <span>Open Navigator HQ</span>
                    </div>
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Total XP"
                    value={currentXP}
                    icon={Zap}
                    color="amber"
                />
                <StatCard
                    label="Current Rank"
                    value={`Lvl ${currentLevel}`}
                    icon={Trophy}
                    color="purple"
                />
                <StatCard
                    label="Questions Solved"
                    value={solvedCount}
                    icon={Target}
                    color="emerald"
                />
            </div>

            {/* Course Map - Grouped by Levels */}
            <div className="space-y-12">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Activity size={20} className="text-blue-400" />
                    <h2 className="text-xl font-bold text-white">Learning Path</h2>
                </div>

                {LEVELS.map((level) => {
                    // Filter topics for this level
                    const levelTopics = TOPICS.filter(t => t.level === level.id);

                    return (
                        <div key={level.id} className="space-y-5">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                                <h3 className="text-lg font-bold text-slate-200">{level.title}</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {levelTopics.map((topic) => (
                                    <TopicCard
                                        key={topic.id}
                                        {...topic}
                                        solved={getSolvedForTopic(topic.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Dev Tool: Seed Database Button */}
            {/* TODO: Remove this in production */}

        </div>
    );
}
