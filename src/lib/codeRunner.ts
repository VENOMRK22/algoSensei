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

    // Java support
    if (language === "java") {
        // Case 1: User provided a standalone class with public static void main
        if (normalizedCode.includes("public static void main")) {
            // Extract the original class name
            const classNameMatch = normalizedCode.match(/public\s+class\s+(\w+)/);
            const originalClassName = classNameMatch ? classNameMatch[1] : "Main";

            // Rename the class definition to "Main"
            let runnableCode = normalizedCode.replace(/public\s+class\s+\w+/g, "public class Main");

            // CRITICAL FIX: If the user instantiates their own class (e.g. "PlusOne solver = new PlusOne()"),
            // we must ALSO rename those references to "Main" because we just renamed the class definition.
            if (originalClassName !== "Main") {
                const regex = new RegExp(`\\b${originalClassName}\\b`, 'g');
                runnableCode = runnableCode.replace(regex, "Main");
            }

            return `
import java.util.*;
import java.io.*;
${runnableCode}
            `.trim();
        }

        // Case 2: Standard LeetCode style (Solution class) -> Wrap it

        let safeCode = normalizedCode.replace(/public\s+class\s+\w+/g, "class Solution");

        // Hoist Imports
        const imports = [];
        const lines = safeCode.split('\n');
        const cleanLines = [];
        for (const line of lines) {
            if (line.trim().startsWith('import ')) {
                imports.push(line.trim());
            } else {
                cleanLines.push(line);
            }
        }
        safeCode = cleanLines.join('\n');
        const importBlock = Array.from(new Set([...imports, "import java.util.*;", "import java.io.*;", "import java.lang.reflect.*;"])).join('\n');

        // Helper method for array printing in Java to match JSON format [1,2,3]
        const printerHelper = `
    private static void printResult(Object result) {
        if (result == null) {
            System.out.println("null");
        } else if (result.getClass().isArray()) {
            if (result instanceof int[]) {
                System.out.println(Arrays.toString((int[]) result).replace(" ", ""));
            } else if (result instanceof Object[]) {
                System.out.println(Arrays.deepToString((Object[]) result).replace(" ", ""));
            } else {
                 // Fallback for other arrays
                 System.out.println(Arrays.toString((Object[])result));
            }
        } else {
            System.out.println(result);
        }
    }
        `;

        // Input Parser Helper (Basic Support for int[] and int)
        const parserHelper = `
    private static Object parseInput(String input, Class<?> type) {
        input = input.trim();
        if (type == int[].class) {
            input = input.replace("[", "").replace("]", "");
            if (input.isEmpty()) return new int[0];
            String[] parts = input.split(",");
            int[] arr = new int[parts.length];
            for(int i=0; i<parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
            return arr;
        } else if (type == int.class || type == Integer.class) {
            return Integer.parseInt(input);
        } else if (type == String.class) {
             // Basic quote check
             if (input.startsWith("\\"") && input.endsWith("\\"")) {
                 return input.substring(1, input.length() - 1);
             }
             return input;
        }
        // Fallback: Return raw string or null (improve in future)
        return null; 
    }
        `;

        return `
${importBlock}

public class Main {
    public static void main(String[] args) {
        try {
            Solution sol = new Solution();
            
            // Reflection: Find the first public method that returns something
            Method[] methods = Solution.class.getDeclaredMethods();
            Method targetMethod = null;
            for (Method m : methods) {
                if (Modifier.isPublic(m.getModifiers())) {
                    targetMethod = m;
                    break;
                }
            }

            if (targetMethod == null) {
                System.out.println("Error: No public method found in Solution class.");
                return;
            }

            // Parse Input
            // We assume inputStr comes formatted from the TS side (e.g. "[1,2,3]")
            String rawInput = "${inputStr.replace(/"/g, '\\"')}";
            Class<?>[] paramTypes = targetMethod.getParameterTypes();
            
            Object arg = null;
            if (paramTypes.length > 0) {
                arg = parseInput(rawInput, paramTypes[0]);
            }

            // Invoke
            Object result = targetMethod.invoke(sol, arg);
            
            // Print Output
            printResult(result);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    ${printerHelper}

    ${parserHelper}
}

${safeCode}
        `.trim();
    }

    return userCode;
};
