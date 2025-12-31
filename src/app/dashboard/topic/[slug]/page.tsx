"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Question } from "@/types/question";
import { ArrowLeft, CheckCircle, Circle, Play, Lock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// Mapping from URL slug to Firestore 'category' field
// Mapping from URL slug to Firestore 'category' field
const SLUG_TO_CATEGORY: Record<string, string> = {
    'math-logic': 'Basic Math & Logic',
    'arrays': 'Arrays',
    'strings': 'Strings',
    'linked-lists': 'Linked Lists',
    'two-pointers': 'Two Pointers',
    'sliding-window': 'Sliding Window',
    'binary-search': 'Binary Search',
    'sorting': 'Sorting Algorithms',
    'recursion': 'Recursion',
    'hashing': 'Hashing (HashMaps)',
    'stacks-queues': 'Stacks & Queues',
    'bit-manipulation': 'Bit Manipulation',
    'binary-trees': 'Binary Trees',
    'bst': 'Binary Search Trees',
    'heaps': 'Heaps',
    'greedy': 'Greedy Algorithms',
    'backtracking': 'Backtracking',
    'dp-1d': '1D Dynamic Programming',
    'dp-2d': '2D Dynamic Programming',
    'graphs': 'Graphs',
};

export default function TopicDetailsPage() {
    const { slug } = useParams();
    const router = useRouter();
    const { user } = useAuth();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [topicName, setTopicName] = useState<string>("");
    const [solvedIds, setSolvedIds] = useState<string[]>([]);

    useEffect(() => {
        if (!slug) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Determine Category Name
                const categoryName = SLUG_TO_CATEGORY[slug as string];
                setTopicName(categoryName || "Unknown Topic");

                if (categoryName) {
                    // Fetch Questions
                    const q = query(collection(db, "questions"), where("category", "==", categoryName));
                    const querySnapshot = await getDocs(q);

                    const fetchedQuestions: Question[] = [];
                    querySnapshot.forEach((doc) => {
                        fetchedQuestions.push(doc.data() as Question);
                    });

                    // Sort by order
                    fetchedQuestions.sort((a, b) => a.order - b.order);
                    setQuestions(fetchedQuestions);
                }

                // Fetch User Progress
                if (user) {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        setSolvedIds(userDoc.data().solvedQuestionIds || []);
                    }
                }

            } catch (error) {
                console.error("Error fetching topic data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug, user]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-blue-500 animate-pulse">Loading Questions...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 font-outfit">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {topicName}
                        </h1>
                        <p className="text-slate-400 text-sm">
                            {questions.length} Questions Available
                        </p>
                    </div>
                </div>

                {/* Question List */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
                    {questions.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            <p>No questions found for this topic yet.</p>
                            <p className="text-sm mt-2">Did you run the seed script?</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {questions.map((q) => {
                                const isSolved = solvedIds.includes(q.id);
                                return (
                                    <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            {isSolved ? (
                                                <CheckCircle className="text-emerald-500" size={20} />
                                            ) : (
                                                <Circle className="text-slate-600 group-hover:text-slate-400 transition-colors" size={20} />
                                            )}

                                            <div>
                                                <h3 className="font-medium text-slate-200 group-hover:text-white transition-colors">
                                                    {q.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${q.difficulty === 'Easy' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' :
                                                        q.difficulty === 'Medium' ? 'border-amber-500/20 text-amber-400 bg-amber-500/10' :
                                                            'border-red-500/20 text-red-400 bg-red-500/10'
                                                        }`}>
                                                        {q.difficulty}
                                                    </span>
                                                    {q.logicTags?.map(tag => (
                                                        <span key={tag} className="text-xs text-slate-500 capitalize">
                                                            {tag.replace(/-/g, ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <Link href={`/practice/${q.id}`}>
                                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-sm font-medium">
                                                Solve
                                                <Play size={14} />
                                            </button>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
