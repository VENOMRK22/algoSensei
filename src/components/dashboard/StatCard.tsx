"use client"

import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"

interface StatCardProps {
    icon: LucideIcon
    label: string
    value: string | number
    color: string
}

export default function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="glass-panel glow-card p-6 rounded-3xl flex-1 min-w-[200px] relative overflow-hidden group"
        >
            <div
                className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 opacity-20 transition-opacity group-hover:opacity-40`}
                style={{ backgroundColor: color }}
            />

            <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground font-medium">{label}</p>
                    <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                </div>
            </div>
        </motion.div>
    )
}
