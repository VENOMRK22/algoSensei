import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, updateDoc, arrayUnion, increment, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Helper to update user progress
export const updateUserProgress = async (uid: string, questionId: string, xpResult: number) => {
    const userRef = doc(db, "users", uid);

    // Check if already solved to prevent XP farming
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        const data = snap.data();
        const solvedIds = data.solvedQuestionIds || [];

        if (solvedIds.includes(questionId)) {
            // Already solved: Do not increment XP, just ensure ID is there (redundant but safe)
            return;
        }
    }

    // First time solving: Award XP
    const timestamp = new Date().toISOString();

    await updateDoc(userRef, {
        solvedQuestionIds: arrayUnion(questionId),
        xp: increment(xpResult),
        [`solvedAt.${questionId}`]: timestamp
    });
};
