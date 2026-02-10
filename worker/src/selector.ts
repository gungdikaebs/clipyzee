export interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
}

export interface ClipCandidate {
    start: number;
    end: number;
    reason: string;
}

// 1. Keyword Signal Rule
const KEYWORDS = [
    "kenapa",
    "jadi",
    "karena",
    "makanya",
    "yang menarik",
    "yang gue liat",
    "percaya",
    "resolusi",
    "masalah",
    "ini yang",
    "gue bilang"
];

// 2. Anti-Filler Rule
const FILLERS = ["oke", "ya", "nah", "eh", "gitu"];

// 3. Duration Rule (Seconds)
const MIN_DURATION = 15;
const MAX_DURATION = 45;
const TARGET_DURATION = 30; // Target window size ~25-35s

/**
 * Selects interesting clip candidates based on deterministic rules:
 * 1. Build a rolling window of transcript segments.
 * 2. Expand window until it hits the target duration (30s).
 * 3. Validate against Duration, Keyword, and Anti-Filler rules.
 * 4. Yield non-overlapping candidates.
 */
export function selectClips(transcript: TranscriptSegment[]): ClipCandidate[] {
    const candidates: ClipCandidate[] = [];

    if (!transcript || transcript.length === 0) return [];

    let i = 0;
    while (i < transcript.length) {
        let windowText = "";
        let windowStart = transcript[i].start;
        let windowEnd = transcript[i].end;
        let j = i;
        let foundCandidate = false;

        // Build window
        while (j < transcript.length) {
            const segment = transcript[j];
            const currentDuration = segment.end - windowStart;

            // Stop if we exceed max duration (HARD LIMIT)
            if (currentDuration > MAX_DURATION) break;

            windowText += " " + segment.text.toLowerCase();
            windowEnd = segment.end;

            // Evaluate window once it reaches sufficient duration
            // Strategy: Aim for TARGET_DURATION (30s) to bias towards ~30s clips.
            // If we are at the end of the transcript, evaluate whatever we have (if >= MIN).
            if (currentDuration >= TARGET_DURATION || j === transcript.length - 1) {
                if (currentDuration >= MIN_DURATION) {
                    const evaluation = evaluateWindow(windowText);
                    if (evaluation.isValid) {
                        candidates.push({
                            start: windowStart,
                            end: windowEnd,
                            reason: evaluation.reason
                        });

                        // Move Start Pointer:
                        // Skip to the segment AFTER this clip to avoid heavy overlap.
                        i = j;
                        foundCandidate = true;
                        break;
                    }
                }
            }
            j++;
        }

        // If no candidate found starting at 'i', just advance 'i' by 1 to try next position
        if (!foundCandidate) {
            i++;
        } else {
            // Check loop increment - 'i' was set to 'j', and outer loop continues.
            // We need to ensure we don't process 'j' again as the start.
            // The outer loop condition is 'while (i < transcript.length)', manual increment is needed if we didn't break?
            // Wait, if foundCandidate, i = j. Then we loop back.
            // The next iteration starts at 'i'. 'j' was the last included index.
            // So next start should be 'j + 1'.
            i++;
        }
    }

    return candidates;
}

function evaluateWindow(text: string): { isValid: boolean; reason: string } {
    // 1. Keyword Check
    // We check if at least one keyword is present
    const foundKeywords = KEYWORDS.filter(kw => text.includes(kw.toLowerCase()));

    if (foundKeywords.length === 0) {
        return { isValid: false, reason: "" };
    }

    // 2. Anti-Filler Rule
    // Avoid segments dominated by filler words (> 30%)
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const fillerCount = words.filter(w => FILLERS.includes(w)).length;

    if (words.length > 0 && (fillerCount / words.length) > 0.3) {
        return { isValid: false, reason: "Too many fillers" };
    }

    // 3. Generate Selection Reason
    const reason = `Contains signal words: ${foundKeywords.slice(0, 2).join(", ")}`;

    return { isValid: true, reason };
}
