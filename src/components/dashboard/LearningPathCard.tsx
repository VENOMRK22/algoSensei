"use client"

import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

interface LearningPathCardProps {
    icon: LucideIcon
    title: string
    description: string
    progress: number
    total: number
}

export default function LearningPathCard({ icon: Icon, title, description, progress, total }: LearningPathCardProps) {
    const percentage = total > 0 ? (progress / total) * 100 : 0

    return (
        <motion.div whileHover={{ scale: 1.02 }} className="glass-panel glow-card p-6 rounded-3xl group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/10 transition-colors">
                <Icon className="w-6 h-6 text-blue-400" />
            </div>

            <h4 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors">{title}</h4>
            <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{description}</p>

            <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-blue-400">
                        {progress} / {total}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                </div>
            </div>
        </motion.div>
    )
}
