import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

// Interface for the output we want from Gemini
export interface ClipCandidate {
    start: string; // "00:00:10"
    end: string;   // "00:00:20"
    reason: string;
    score: number; // 1-10
}

export const analyzeTranscript = async (transcript: string): Promise<ClipCandidate[]> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are a viral content editor. Your job is to find the most interesting, funny, or viral-worthy segments from the following transcript of a YouTube video.
    
    Target:
    - Funny moments
    - High energy moments
    - Insightful/Deep thoughts
    - "Hot takes" or controversial opinions

    Return STRICT JSON format only. No markdown formatting.
    The output should be an array of objects with:
    - start: time string (HH:MM:SS or MM:SS)
    - end: time string (HH:MM:SS or MM:SS)
    - reason: short explanation why this is viral
    - score: 1-10 viral potential

    If the transcript is boring, return an empty array.

    Transcript:
    ${transcript}
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Cleanup markdown code blocks if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const candidates: ClipCandidate[] = JSON.parse(text);
        return candidates;

    } catch (error) {
        console.error("Error analyzing transcript with Gemini:", error);
        return [];
    }
};
