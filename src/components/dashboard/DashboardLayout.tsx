"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [particles, setParticles] = useState<number[]>([]);

    useEffect(() => {
        setParticles([...Array(20)].map((_, i) => i));
    }, []);

    return (
        <div className="flex h-screen bg-transparent overflow-hidden">
            <div className="aurora-bg" />

            {/* Floating Particles */}
            <div className="particles-container">
                {particles.map((i) => (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            opacity: Math.random() * 0.5 + 0.3
                        }}
                    />
                ))}
            </div>

            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar relative z-10 w-full">
                <div className="max-w-7xl mx-auto md:space-y-10 pb-24 md:pb-0">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileNav />
        </div>
    );
}
