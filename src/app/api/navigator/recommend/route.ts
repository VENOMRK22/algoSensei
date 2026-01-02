import { NextResponse } from "next/server";
import { getGroqClient } from "@/lib/groq";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db as firestoreDb } from "@/lib/firebase";
import { ALL_QUESTIONS } from "@/lib/allQuestions";

// Helper to minify question data for the prompt
const minifyQuestions = (questions: any[]) => {
    return questions.map(q => ({
        id: q.id,
        t: q.title,         // title
        d: q.difficulty,    // difficulty
        tags: q.logicTags,  // tags
        cat: q.category     // category
    }));
};

You are the "AlgoSensei Intelligent Curriculum Engine."
Goal: Analyze the student's recent performance and select the single most effective next question.

[CURRICULUM ARCHITECTURE & EVOLUTIONARY TREES]
Use this map to guide "Smooth Transitions" and logical progression.

🌳 Tree 1: The Linear Solver(Arrays / Hashing)
Evolution: Iteration -> Pointers -> Windows -> Hashing
    - Branch A(Two Pointers): Runnning Sum -> Two Sum II -> Remove Duplicates -> Container With Most Water -> 3Sum -> Trapping Rain Water
        - Branch B(Sliding Window): Max Average Subarray -> Longest Substring No Repeats -> Max Consecutive Ones III -> Permutation in String -> Min Window Substring
            - Branch C(Hashing): Two Sum -> Valid Anagram -> Group Anagrams -> Top K Frequent -> Longest Consecutive Sequence

🌳 Tree 2: The Structural Linker(Linked Lists)
Evolution: Memory Pointers -> LIFO / FIFO
    - Branch A(Runner / Slow - Fast): Cycle -> Middle Node -> Cycle II -> Remove Nth Node -> Intersection
        - Branch B(Manipulation): Reverse List -> Palindrome List -> Reorder List -> Reverse K - Group
            - Branch C(Monotonic Stack): Next Greater Element I -> Daily Temperatures -> Largest Rectangle in Histogram

🌳 Tree 3: The Recursive Branch(Trees / Backtracking)
Evolution: DFS -> Backtracking
    - Branch A(Tree Walker): Max Depth -> Invert Tree -> Same Tree -> Subtree of Another Tree -> LCA
        - Branch B(BST Properties): Validate BST -> Kth Smallest -> Delete Node
            - Branch C(Backtracking): Subsets -> Permutations -> Combination Sum -> Word Search -> N - Queens

🌳 Tree 4: The Graph Explorer
Evolution: Matrix -> Adjacency List -> Topology
    - Branch A(Grid / Matrix): Flood Fill -> Number of Islands -> Max Area of Island -> Rotting Oranges
        - Branch B(Explicit Graphs): Clone Graph -> Course Schedule I & II -> Word Ladder

🌳 Tree 5: The Optimizer(DP / Greedy)
Evolution: Memoization -> 1D Table -> 2D Table
    - Branch A(1D DP): Climbing Stairs -> House Robber I & II -> Coin Change -> Word Break -> LIS
        - Branch B(2D DP): Unique Paths -> Min Path Sum -> LCS -> Edit Distance

        [DECISION LOGIC]

Scenario A: The "Speedrunner"(Solved Quickly & Optimal)
    - Observation: User solved Easy / Medium in <5 mins(300s) with Success.
- Action: Advance the "Evolution".Move to the next node in the current Branch(e.g., Two Sum -> Two Sum II).
- Reason: "You mastered [Current Concept]. Let's evolve to the next stage: [Next Concept]."

Scenario B: The "Struggler"(Failed or Heavy Struggle)
    - Observation: User result is 'failed' or 'struggled'(or time > 20 mins).
- Action: REGRESS or REINFORCE.Stay on the same node logic(different question) or go back one step in the Tree.
- Reason: "The concept of [Current Concept] is tricky. Let's cement it with a simpler variation."

Scenario C: The "Explorer"(Boredom Check)
    - Observation: User has solved 5 + questions of the same Topic / Branch in a row.
- Action: Lateral Shift.Jump to a PARALLEL Branch in the SAME Tree, or a NEW Tree entirely.
- Reason: "You've done a lot of [Current Branch]. Let's try applying this logic to [New Branch]."

Output Format(JSON ONLY):
{
    "questionId": "string",
        "actionType": "speedrun" | "remedial" | "lateral" | "next_step",
            "reasoning": "string"
}

export async function POST(req: Request) {
    const groq = getGroqClient();
    try {
        const { userId, currentQuestionId, result, timeTaken } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // 1. Fetch User Profile
        const userRef = doc(firestoreDb, "users", userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data() || {};

        const solvedIds = new Set(userData.solvedQuestionIds || []);

        // 2. Filter Candidates (Skill Tree Logic acts as a Hard Filter first)
        const unsolvedQuestions = ALL_QUESTIONS.filter(q => !solvedIds.has(q.id));

        // Remove Locked Questions (Prerequisites not met)
        const availableCandidates = unsolvedQuestions.filter(q => {
            if (!q.prerequisites || q.prerequisites.length === 0) return true;
            return q.prerequisites.every(id => solvedIds.has(id));
        });

        if (availableCandidates.length === 0) {
            return NextResponse.json({ message: "All available questions solved!", questionId: null });
        }

        // 3. Prepare AI Context
        const currentQuestion = ALL_QUESTIONS.find(q => q.id === currentQuestionId);
        const minifiedCandidates = minifyQuestions(availableCandidates);

        // Limit candidates for context window if needed (though list is small enough for Llama 3 70b)

        const prompt = `
[STUDENT STATUS]
[STUDENT STATUS]
Just Finished: ${currentQuestion ? currentQuestion.title : "None (Startup)"} (ID: ${currentQuestionId})
Result: ${result}
Time Taken: ${timeTaken} seconds
Topic: ${currentQuestion ? currentQuestion.category : "N/A"}
Known Topics: ${JSON.stringify(userData.knownTopics || [])}

[CANDIDATE POOL]
${JSON.stringify(minifiedCandidates)}

[INSTRUCTION]
Select the best next question based on the logical scenarios. Return JSON only.
`;

        console.log("🧠 Navigator AI: Thinking...", { result, timeTaken, candidates: minifiedCandidates.length });

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            response_format: { type: "json_object" }
        });

        const decisionJson = completion.choices[0]?.message?.content;
        if (!decisionJson) throw new Error("Empty AI Response");

        const decision = JSON.parse(decisionJson);
        console.log("🧠 Decision:", decision);

        // Update User's Recommended State
        await updateDoc(userRef, {
            recommendedNextQuestion: {
                id: decision.questionId,
                reason: decision.reasoning,
                timestamp: Date.now(),
                strategy: decision.actionType
            }
        });

        return NextResponse.json(decision);

    } catch (error: any) {
        console.error("Navigator Recommend Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
