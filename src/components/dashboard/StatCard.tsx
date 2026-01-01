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
            whileHover={{ y: -2 }}
            className="glass-panel glow-card p-6 rounded-xl flex-1 min-w-[200px] relative overflow-hidden group border-l-4 transition-all duration-300 hover:backdrop-blur-xl"
            style={{ borderLeftColor: color }}
        >
            {/* Tech grid background opacity */}
            <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]" />

            <div className="flex items-center gap-4 relative z-10">
                <div 
                    className="p-3 rounded-lg border flex items-center justify-center transition-colors group-hover:bg-white/5"
                    style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}
                >
                    <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                    <h3 className="text-2xl font-bold tracking-tight font-mono">{value}</h3>
                </div>
            </div>
            
            {/* Corner accent */}
            <div 
                className="absolute top-0 right-0 w-16 h-16 opacity-10 transition-opacity group-hover:opacity-20"
                style={{ 
                    backgroundImage: `linear-gradient(135deg, ${color} 0%, transparent 50%)`
                }} 
            />
        </motion.div>
    )
}
