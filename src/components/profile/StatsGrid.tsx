"use client";

import { motion } from "framer-motion";
import { Trophy, Zap, Target, Activity } from "lucide-react";

export interface UserStats {
    rank: number | string;
    solved: number;
    streak: number;
    level: string;
}

interface StatItemProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    delay: number;
}

function StatItem({ label, value, icon, color, delay }: StatItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay, duration: 0.5 }}
            className="relative group w-full"
        >
            <div className="absolute inset-0 bg-white/5 rounded-xl blur-sm group-hover:bg-white/10 transition-all duration-500" />
            <div className="relative border border-white/10 bg-black/40 backdrop-blur-md p-4 rounded-xl flex items-center gap-4 transition-all duration-300 hover:border-white/30 hover:-translate-y-1 w-full h-full">
                <div className={`p-3 rounded-lg bg-black/50 ${color} bg-opacity-10 border border-white/5 shrink-0`}>
                    <div className={color}>
                        {icon}
                    </div>
                </div>
                <div className="min-w-0">
                    <div className="text-2xl font-bold font-mono text-white tracking-wider group-hover:text-green-400 transition-colors truncate">
                        {value}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-widest font-semibold truncate">
                        {label}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function StatsGrid({ stats }: { stats?: UserStats }) {
    // Default fallback if no stats provided
    const displayStats = {
        rank: stats?.rank || "N/A",
        solved: stats?.solved || 0,
        streak: stats?.streak || 0,
        level: stats?.level || process.env.NEXT_PUBLIC_APP_VERSION || "v1.0.0",
    };

    const statItems = [
        { label: "Global Rank", value: `#${displayStats.rank.toLocaleString()}`, icon: <Trophy className="w-5 h-5" />, color: "text-yellow-400", delay: 0.1 },
        { label: "Problems Solved", value: displayStats.solved, icon: <Target className="w-5 h-5" />, color: "text-blue-400", delay: 0.2 },
        { label: "Current Streak", value: `${displayStats.streak} Days`, icon: <Zap className="w-5 h-5" />, color: "text-amber-500", delay: 0.3 },
        { label: "System Level", value: displayStats.level, icon: <Activity className="w-5 h-5" />, color: "text-green-500", delay: 0.4 },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {statItems.map((stat, index) => (
                <StatItem key={index} {...stat} />
            ))}
        </div>
    );
}
