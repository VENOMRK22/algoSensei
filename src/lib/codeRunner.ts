export const formatCodeForExecution = (
    language: string,
    userCode: string,
    testInput: any
): string => {
    // Stringify input for passing into function call
    // Note: Inputs in our DB are stored as actual values (arrays, strings, etc.)
    // We need to convert them to string representation for the code string.

    let inputStr = "";
    // If testInput is a string, assume it is ALREADY a valid code fragment (e.g. "[1,2,3]" or '"abc"').
    // Do NOT add extra quotes.
    if (typeof testInput === 'string') {
        inputStr = testInput;
    } else if (Array.isArray(testInput)) {
        // If it's an actual array object, stringify it
        inputStr = JSON.stringify(testInput);
    } else {
        inputStr = String(testInput);
    }

    // For multi-argument functions, testInput might need to be an array of args?
    // Current assumption: simple single-arg or pre-formatted input.
    // Enhanced approach: If question requires multiple args, testInput should be an array of args.
    // But for MVP, let's assume specific behavior based on question structure usage.
    // For now, let's assume input matches the function signature.

    // Safety check for common issues
    const normalizedCode = userCode.trim();

    if (language === "javascript") {
        return `
${normalizedCode}

// Test Runner
try {
    const result = solution(${inputStr});
    console.log(JSON.stringify(result));
} catch (error) {
    console.error(error.message);
}
        `.trim();
    }

    if (language === "python") {
        // Python needs input formatted correctly (e.g. True/False instead of true/false)
        let pyInput = inputStr
            .replace(/true/g, "True")
            .replace(/false/g, "False")
            .replace(/null/g, "None");

        return `
import json
import sys
import inspect
from typing import * 

${normalizedCode}

# Test Runner
try:
    sol = Solution()
    # Debug Helper
    # print("DEBUG: Analying Solution class...", file=sys.stderr)
    
    # 1. Try to find methods using inspect (most robust)
    methods = [m[0] for m in inspect.getmembers(sol, predicate=inspect.ismethod) if not m[0].startswith('_')]
    
    # 2. Fallback: Check dir() for callables if inspect fails (e.g. static methods or weird binding)
    if not methods:
        methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]

    if not methods:
        raise Exception(f"No callable method found in Solution. Attributes: {dir(sol)}")
        
    method_name = methods[0]
    
    method = getattr(sol, method_name)
    result = method(${pyInput})
    
    # Handle list/dict output for consistent parsing
    if isinstance(result, (list, dict, str, int, float, bool)):
        print(json.dumps(result))
    else:
        print(result)
except Exception as e:
    print(e, file=sys.stderr)
        `.trim();
    }

    // Java support: Strip "public" from Solution class to avoid "class Solution is public, should be declared in a file named Solution.java"
    if (language === "java") {
        const safeCode = normalizedCode.replace(/public\s+class\s+Solution/g, "class Solution");
        return `
import java.util.*;
import java.io.*;

${safeCode}

public class Main {
    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            // MVP: We don't have a robust input parser for Java yet.
            // But we can try to invoke the method if it doesn't require complex args, 
            // or just print a success message so the user knows code compiled.
            System.out.println("Java execution successful (Output validation coming soon).");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
        `.trim();
    }

    return userCode;
};
