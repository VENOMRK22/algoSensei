"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useRouter } from "next/navigation";
import { Zap, Home, ArrowRight, Trophy, Star, Activity } from "lucide-react";

interface VictoryOverlayProps {
    show: boolean;
    questionTitle: string;
    xpEarned: number;
    currentXP: number;
    onClose?: () => void;
    userId: string;
}

export default function VictoryOverlay({
    show,
    questionTitle,
    xpEarned,
    currentXP,
    onClose,
    userId
}: VictoryOverlayProps) {
    const router = useRouter();
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const [showConfetti, setShowConfetti] = useState(false);
    const [navLoading, setNavLoading] = useState(false);

    // Initialize window size for confetti
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });

            const handleResize = () => {
                setWindowSize({ width: window.innerWidth, height: window.innerHeight });
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Trigger confetti on show
    useEffect(() => {
        if (show) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 5000); // Stop confetti after 5s
            return () => clearTimeout(timer);
        }
    }, [show]);

    const handleNextChallenge = async () => {
        setNavLoading(true);
        try {
            // Call Smart Navigator
            const res = await fetch("/api/navigator", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: userId })
            });
            const decision = await res.json();

            if (decision.questionId) {
                router.push(`/practice/${decision.questionId}`);
            } else {
                // Fallback or finished
                router.push("/dashboard");
            }
        } catch (error) {
            console.error("Navigator Error:", error);
            router.push("/dashboard"); // Fail safe
        } finally {
            setNavLoading(false);
        }
    };

    if (!show) return null;

    // Level Calculation (Simple Mock)
    const level = Math.floor(currentXP / 100) + 1;
    const progress = currentXP % 100;

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    {/* 1. Backdrop Blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    {/* 2. Confetti */}
                    {showConfetti && (
                        <div className="absolute inset-0 pointer-events-none z-0">
                            <Confetti
                                width={windowSize.width}
                                height={windowSize.height}
                                numberOfPieces={200}
                                recycle={true}
                                colors={['#6366f1', '#a855f7', '#ec4899', '#fbbf24', '#34d399']}
                            />
                        </div>
                    )}

                    {/* 3. Victory Card */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
                        className="relative z-10 bg-slate-900 border border-indigo-500/50 p-8 md:p-12 rounded-3xl shadow-[0_0_100px_rgba(99,102,241,0.3)] max-w-lg w-full text-center overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px]" />
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px]" />

                        {/* Content */}
                        <div className="relative z-20 space-y-8">

                            {/* Header */}
                            <div className="space-y-2">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                    className="inline-flex p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/40 mb-4"
                                >
                                    <Trophy size={48} className="text-white" />
                                </motion.div>
                                <h2 className="text-4xl font-extrabold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 drop-shadow-sm">
                                    Problem Solved!
                                </h2>
                                <div className="inline-block px-4 py-1.5 rounded-full bg-slate-800 border border-indigo-500/30 text-indigo-300 font-medium text-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                    {questionTitle}
                                </div>
                            </div>

                            {/* Stats & XP */}
                            <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center justify-between text-slate-400 text-sm font-medium uppercase tracking-wider">
                                    <span>XP Gained</span>
                                    <span>Current Level</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div className="flex items-center gap-2 text-3xl font-bold text-emerald-400">
                                        <span>+{xpEarned}</span>
                                        <span className="text-sm text-emerald-500/70 mb-1">XP</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white">
                                        Lvl {level}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative"
                                    >
                                        <div className="absolute inset-0 bg-white/20" />
                                    </motion.div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    onClick={handleNextChallenge}
                                    disabled={navLoading}
                                    className={`
                                        group relative w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-xl shadow-indigo-600/20 overflow-hidden
                                        transition-all hover:scale-[1.02] active:scale-[0.98]
                                        ${navLoading ? 'opacity-80 cursor-wait' : 'animate-pulse-subtle'}
                                    `}
                                >
                                    <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 skew-x-12 -translate-x-full" />
                                    <div className="flex items-center justify-center gap-2 relative z-10">
                                        {navLoading ? (
                                            <>
                                                <Activity className="animate-spin" />
                                                <span>Curating Next Step...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="fill-white" />
                                                <span>Next Challenge</span>
                                                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </div>
                                </button>

                                <button
                                    onClick={() => router.push("/dashboard")}
                                    className="w-full py-3 rounded-xl border border-white/10 text-slate-400 font-medium hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Home size={18} />
                                    <span>Back to Dashboard</span>
                                </button>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
