
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("Fetching available models...");

    try {
        // Did not find a direct listModels method on the main class in some versions, 
        // effectively we can try to key off a known model or just catch the error details.
        // But actually the ModelManager usually exposes this.
        // Let's try to just instantiate a model and see if we can get info, 
        // or just rely on the error message from the previous run which suggested ListModels.
        // Wait, the error said "Call ListModels to see...".
        // The SDK might not expose listModels directly on the client in all versions.
        // Let's try raw fetch if SDK doesn't support it easily, OR assume the user needs 'gemini-1.5-flash-latest'.

        // Actually, let's try a fallback: 'gemini-pro' just to see if it works.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash works!", result.response.text());

    } catch (e: any) {
        console.error("Error with gemini-1.5-flash:", e.message);

        try {
            console.log("Trying gemini-1.5-flash-latest...");
            const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const result2 = await model2.generateContent("Hello");
            console.log("gemini-1.5-flash-latest works!");
        } catch (e2: any) {
            console.error("Error with gemini-1.5-flash-latest:", e2.message);
        }
    }
}

listModels();
