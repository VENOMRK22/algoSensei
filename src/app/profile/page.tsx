"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Save, User, Loader2 } from "lucide-react";
import DashboardBranding from "@/components/dashboard/DashboardBranding";
import { TechGridBackground } from "@/components/ui/tech-grid-background";

export default function ProfilePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [nickname, setNickname] = useState("");
    const [avatarIndex, setAvatarIndex] = useState<number | null>(null);

    // Load User Data
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.nickname) setNickname(data.nickname);
                    if (typeof data.avatarIndex === 'number') setAvatarIndex(data.avatarIndex);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchUserData();
        else router.push("/login");
    }, [user, router]);

    const handleSave = async () => {
        if (!user || user.uid === undefined) return;
        setSaving(true);
        try {
            const docRef = doc(db, "users", user.uid);
            await updateDoc(docRef, {
                nickname: nickname,
                avatarIndex: avatarIndex
            });
            // Show success or redirect?
            // Maybe just a toast? For now, we'll redirect to dashboard.
            router.push("/dashboard");
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <Loader2 className="w-10 h-10 animate-spin text-green-500" />
        </div>
    );

    return (
        <div className="min-h-screen relative overflow-hidden bg-background text-foreground flex flex-col items-center">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <TechGridBackground />
                <div className="absolute inset-0 bg-black/80" /> {/* Dark overlay for focus */}
            </div>

            <div className="relative z-10 w-full max-w-2xl px-6 py-12 flex flex-col items-center space-y-12">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-2"
                >
                    <h1 className="text-4xl font-bold font-mono tracking-wider text-white">
                        IDENTITY <span className="text-green-500">PROTOCOL</span>
                    </h1>
                    <p className="text-white/40">Configure your digital persona for the AlgoVerse.</p>
                </motion.div>

                {/* Form Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl space-y-8"
                >
                    {/* Nickname Input */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-white/60 uppercase tracking-widest pl-1">
                            Operative Callsign (Nickname)
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="Enter your codename..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all font-mono text-lg"
                            />
                        </div>
                    </div>

                    {/* Avatar Selection */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-white/60 uppercase tracking-widest pl-1">
                            Select Avatar Signal
                        </label>

                        {/* 3x3 Grid of Sprites */}
                        <div className="grid grid-cols-3 gap-4">
                            {[...Array(9)].map((_, idx) => {
                                const row = Math.floor(idx / 3);
                                const col = idx % 3;
                                const isSelected = avatarIndex === idx;

                                return (
                                    <motion.div
                                        key={idx}
                                        onClick={() => setAvatarIndex(idx)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'border-white/5 hover:border-white/20'}`}
                                    >
                                        <div
                                            className="w-full h-full bg-cover"
                                            style={{
                                                backgroundImage: 'url(/avatars_grid.png)',
                                                backgroundSize: '300% 300%', // 3x Grid
                                                backgroundPosition: `${col * 50}% ${row * 50}%`
                                                // 0% 0%, 50% 0%, 100% 0%
                                                // 0% 50%, 50% 50%, 100% 50%
                                                // ... actually backgroundPosition percentages work differently for sprites.
                                                // For 3 columns: 0%, 50%, 100%. 
                                                // For 3 rows: 0%, 50%, 100%.
                                            }}
                                        />
                                        {/* Scanline Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !nickname}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold py-4 rounded-xl shadow-lg hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all flex items-center justify-center gap-2 text-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Establishing Uplink...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Confirm Identity
                            </>
                        )}
                    </button>

                </motion.div>
            </div>
        </div>
    );
}
