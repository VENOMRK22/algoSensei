const https = require('https');
const fs = require('fs');
const path = require('path');

// 1. Get Key from .env.local
const envPath = path.join(__dirname, '../.env.local');
let apiKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=(.*)/);
    if (match && match[1]) {
        apiKey = match[1].trim();
        // Remove surrounding quotes if present (smart dotenv behavior)
        if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) {
            apiKey = apiKey.substring(1, apiKey.length - 1);
        }
    }
} catch (e) {
    console.error("Could not read .env.local");
    process.exit(1);
}

if (!apiKey) {
    console.error("No API Key found in .env.local");
    process.exit(1);
}

console.log("Found API Key:", apiKey.substring(0, 5) + "...");
console.log("Checking available models...");

// 2. Call ListModels
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", JSON.stringify(json.error, null, 2));
            } else if (json.models) {
                console.log("✅ SUCCESS! Available User Models:");
                const generateModels = json.models
                    .filter(m => m.supportedGenerationMethods.includes("generateContent"))
                    .map(m => m.name.replace("models/", ""));

                console.log(generateModels.join("\n"));
            } else {
                console.log("Response:", json);
            }
        } catch (e) {
            console.error("Parse Error:", data);
        }
    });
}).on('error', (e) => {
    console.error("Network Error:", e);
});
