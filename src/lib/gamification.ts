
import { Difficulty } from "@/types/question";

export const XP_REWARDS = {
    Easy: 20,
    Medium: 30,
    Hard: 50
};

export const getXPForDifficulty = (difficulty: Difficulty | string): number => {
    // Normalize case
    const diff = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
    return XP_REWARDS[diff as keyof typeof XP_REWARDS] || 20;
};

// Rank Titles based on Level
export const getRankTitle = (level: number): string => {
    if (level >= 100) return "Legend";
    if (level >= 80) return "Master";
    if (level >= 50) return "Expert";
    if (level >= 30) return "Adept";
    if (level >= 10) return "Apprentice";
    return "Novice";
};

export interface LevelProgress {
    currentLevel: number;
    currentLevelXP: number; // XP earned in current level
    nextLevelXP: number;    // Total XP required for next level from current level start
    progressPercent: number;
}

export const calculateLevel = (totalXP: number): LevelProgress => {
    let level = 1;
    let xp = totalXP;
    let cap = 100;

    // Level 1 cap = 100
    // Level 2 cap = 100
    // ...
    // Level 5 cap = 100 (Total 500 to reach lvl 6)
    // Level 6 cap = 120

    while (true) {
        // Determine cap based on current level
        // For levels 1-5 (0-4 index group): 100
        // For levels 6-10 (1- group): 120
        const capIncrementGroups = Math.floor((level - 1) / 5);
        cap = 100 + (capIncrementGroups * 20);

        if (xp < cap) {
            return {
                currentLevel: level,
                currentLevelXP: xp,
                nextLevelXP: cap,
                progressPercent: (xp / cap) * 100
            };
        }

        xp -= cap;
        level++;
    }
};
