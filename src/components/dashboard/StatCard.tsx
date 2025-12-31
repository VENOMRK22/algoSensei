import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: "blue" | "purple" | "emerald" | "amber";
    className?: string; // Allow custom classes
}

const COLOR_STYLES = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function StatCard({ label, value, icon: Icon, color, className }: StatCardProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-4 p-5 rounded-2xl border bg-slate-900/50 backdrop-blur-md transition-all hover:scale-[1.02]",
                COLOR_STYLES[color],
                className
            )}
        >
            <div className={cn("p-3 rounded-xl", `bg-${color}-500/20`)}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-slate-400 text-sm font-medium">{label}</p>
                <h4 className="text-2xl font-bold text-slate-100 font-outfit">{value}</h4>
            </div>
        </div>
    );
}
