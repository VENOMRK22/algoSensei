"use client";

import { motion } from "framer-motion";

export interface UserSkills {
    algos: number;
    ds: number;
    system: number;
    debug: number;
    optim: number;
}

export default function SkillRadar({ skills }: { skills?: UserSkills }) {
    // Default fallback if no skills provided
    const displaySkills = [
        { name: "ALGOS", value: skills?.algos || 50 },
        { name: "DS", value: skills?.ds || 50 },
        { name: "SYSTEM", value: skills?.system || 50 },
        { name: "DEBUG", value: skills?.debug || 50 },
        { name: "OPTIM", value: skills?.optim || 50 },
    ];

    // Config
    const numSides = displaySkills.length; // 5
    const radius = 100;
    const center = 150;
    
    // Helper to calculate points
    const getPoint = (index: number, value: number) => {
        const angle = (Math.PI * 2 * index) / numSides - Math.PI / 2;
        const r = (value / 100) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
    };

    const polyPoints = displaySkills.map((s, i) => getPoint(i, s.value)).join(" ");
    const fullPoints = displaySkills.map((_, i) => getPoint(i, 100)).join(" ");

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full aspect-square max-w-[400px] flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-white/5 rounded-full blur-[60px]" />
            
            <svg viewBox="0 0 300 300" className="w-full h-full transform drop-shadow-[0_0_15px_rgba(74,222,128,0.3)] overflow-visible">
                {/* Grid Levels */}
                {[20, 40, 60, 80, 100].map((level, idx) => {
                     const points = displaySkills.map((_, i) => getPoint(i, level)).join(" ");
                     return (
                         <polygon 
                            key={idx}
                            points={points}
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="1"
                         />
                     );
                })}

                {/* Axis Lines */}
                {displaySkills.map((_, i) => {
                    const point = getPoint(i, 100);
                    return (
                        <line 
                            key={i}
                            x1={center} y1={center}
                            x2={point.split(',')[0]} y2={point.split(',')[1]}
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Data Polygon */}
                <motion.polygon
                    points={polyPoints}
                    fill="rgba(74, 222, 128, 0.2)"
                    stroke="#4ADE80"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                {/* Labels */}
                {displaySkills.map((skill, i) => {
                    // Push labels out a bit
                    const angle = (Math.PI * 2 * i) / numSides - Math.PI / 2;
                    const r = radius + 35; // Increased radius for labels to avoid overlap
                    const x = center + r * Math.cos(angle);
                    const y = center + r * Math.sin(angle);
                    
                    return (
                        <text
                            key={i}
                            x={x} y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-white/70 text-[10px] md:text-xs font-mono font-bold tracking-wider"
                        >
                            {skill.name}
                        </text>
                    );
                })}
            </svg>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs font-mono tracking-widest uppercase pointer-events-none">
                Neural Metrics
            </div>
        </motion.div>
    );
}
