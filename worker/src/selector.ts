export interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
}

export interface ClipCandidate {
    start: number;
    end: number;
    reason: string;
    score: number;
}

// Global Configuration
const TARGET_DURATION = 45; // Ideal length
const MIN_DURATION = 30;    // Absolute minimum seconds
const MAX_DURATION = 60;    // Absolute maximum seconds
const EVAL_STEP_SECS = 5;   // Sliding window advance frequency

// Emotional Keywords & Hooks
const CONFLICT_WORDS = ["anjir", "gila", "serius", "jujur", "capek", "parah", "hancur", "mustahil", "bangsat", "goblok", "sial"];
const HOOK_WORDS = ["bayangin", "dengerin", "ternyata", "rahasia", "alasan", "fakta", "solusi", "gimana cara", "tahu gak", "pernah mikir"];
const LAUGH_WORDS = ["wkwk", "haha", "hahaha"];
const FILLERS = ["oke", "ya", "nah", "eh", "gitu", "kayak", "emang", "hmm", "enggak"];

/**
 * Calculates the percentage of filler words inside a text segment.
 */
function computeFillerDensity(words: string[]): number {
    if (words.length === 0) return 0;
    const fillerCount = words.filter(w => FILLERS.includes(w)).length;
    return fillerCount / words.length;
}

/**
 * Validates if the text string contains any significant emotional markers (+2 signals).
 */
function hasEmotionalMarkers(text: string): boolean {
    const lowerText = text.toLowerCase();
    const hasExclamation = text.includes('!');
    const hasAllCaps = /\b[A-Z]{3,}\b/.test(text); // Finds acronyms/shouting
    const hasLaughs = LAUGH_WORDS.some(lw => lowerText.includes(lw));
    const hasHooks = HOOK_WORDS.some(hw => lowerText.includes(hw));

    return hasExclamation || hasAllCaps || hasLaughs || hasHooks;
}

/**
 * Determines the numeric retention score for a given window of text.
 * Requires a score >= 5 to be considered viable.
 */
function calculateScore(text: string, duration: number = 0): { score: number, traits: string[] } {
    let score = 0;
    const traits: string[] = [];
    const lowerText = text.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 0);

    // +3: Strong Conflict Words
    const foundConflict = CONFLICT_WORDS.filter(w => lowerText.includes(w));
    if (foundConflict.length > 0) {
        score += 3;
        traits.push(`Conflict (${foundConflict[0]})`);
    }

    // +2: Hook Words
    const foundHook = HOOK_WORDS.filter(w => lowerText.includes(w));
    if (foundHook.length > 0) {
        score += 2;
        traits.push(`Hook (${foundHook[0]})`);
    }

    // +2: Exclamation Marks
    if (text.includes('!')) {
        score += 2;
        traits.push('Exclamation');
    }

    // +2: Uppercase Emphasis
    if (/\b[A-Z]{3,}\b/.test(text)) {
        score += 2;
        traits.push('Shouting/Emphasis');
    }

    // +2: Laughter
    if (LAUGH_WORDS.some(lw => lowerText.includes(lw))) {
        score += 2;
        traits.push('Laughter');
    }

    // +2: Speaking Rate (WPS - energetic speech)
    if (duration > 0) {
        const wps = words.length / duration;
        if (wps > 2.5) { // Empirically, > 2.5 words/sec can indicate high energy
            score += 2;
            traits.push('Energetic/Fast Paced');
        }
    }

    // +1: Short Shock Sentence (implies rapid engagement if window started abruptly)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.some(s => s.trim().split(/\s+/).length < 6)) {
        score += 1;
        traits.push('Punchy Sentence');
    }

    // -2: High Filler Density
    const fillerDensity = computeFillerDensity(words);
    if (fillerDensity > 0.3) {
        score -= 2;
        traits.push('High Fillers');
    }

    // -3: Monotone (No Markers)
    if (score === 0 || (score < 3 && !hasEmotionalMarkers(text))) {
        score -= 3;
        traits.push('Monotone/Boring');
    }

    return { score, traits };
}

/**
 * Removes overlapping clips, favoring the one with the highest score.
 * A mathematical sweep to prevent repeating outputs of the same underlying video timeframes.
 */
function removeOverlaps(candidates: ClipCandidate[]): ClipCandidate[] {
    // 1. Sort highest score first
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const finalized: ClipCandidate[] = [];

    // 2. Add to list only if timeline doesn't intersect existing chosen blocks
    for (const current of sorted) {
        let overlaps = false;
        for (const fixed of finalized) {
            // Overlap Math: Math.max(0, Math.min(end1, end2) - Math.max(start1, start2)) > 0
            if (current.start < fixed.end && current.end > fixed.start) {
                overlaps = true;
                break;
            }
        }

        if (!overlaps) finalized.push(current);
    }

    return finalized;
}

/**
 * Core Orchestrator:
 * Iterates through transcript producing deterministic windows based on emotional scores.
 * 
 * Returns the Top 5 - 10 clips purely mathematically sorted.
 */
export function selectClips(transcript: TranscriptSegment[]): ClipCandidate[] {
    if (!transcript || transcript.length === 0) return [];

    let candidates: ClipCandidate[] = [];
    let i = 0;

    while (i < transcript.length) {
        const startSegment = transcript[i];
        let j = i;
        let windowText = "";
        let currentDuration = 0;
        let foundCandidate = false; // FLIPPED TO FALSE: Fixed logic bug

        // PRE-CHECK: Early Trigger Logic
        // If the starting segment houses an immediate trigger word, force a window creation.
        const startTextLower = startSegment.text.toLowerCase();
        const containsUrgentHook = CONFLICT_WORDS.some(w => startTextLower.includes(w)) ||
            HOOK_WORDS.some(w => startTextLower.includes(w));

        while (j < transcript.length) {
            const segment = transcript[j];
            currentDuration = segment.end - startSegment.start;

            if (currentDuration > MAX_DURATION) {
                break; // Hard abort loop if window breaches 60 seconds
            }

            windowText += " " + segment.text;

            // Reached evaluation territory?
            if (currentDuration >= MIN_DURATION && currentDuration <= MAX_DURATION) {

                // Pause gap detection: try cutting when there's a natural breath/pause (> 0.4s) or punctuation
                const isCleanCut = /[.!?]$/.test(segment.text.trim()) ||
                    (j < transcript.length - 1 && transcript[j + 1].start - segment.end >= 0.4) ||
                    j === transcript.length - 1;

                if (isCleanCut && (currentDuration >= TARGET_DURATION || containsUrgentHook || j === transcript.length - 1)) {

                    const { score, traits } = calculateScore(windowText, currentDuration);
                    const fillerRatio = computeFillerDensity(windowText.toLowerCase().split(/\s+/));

                    if (score >= 5 && fillerRatio <= 0.3) {
                        candidates.push({
                            start: startSegment.start,
                            end: segment.end,
                            score,
                            reason: `Score ${score}. Traits: ${traits.join(', ')}`
                        });

                        // We successfully locked a candidate. 
                        // To prevent immediate identical cascading clips, fast forward the window origin 'i' manually
                        i = j;
                        foundCandidate = true;
                        break;
                    }
                }
            }
            j++;
        }

        if (!foundCandidate || j >= transcript.length - 1) {
            // Standard Sliding Window Evaluation every ~5 seconds.
            // If we failed to find a valid clip staring at 'i', we skip forward roughly 5 seconds in physical transcript time.
            let nextSecGoal = startSegment.start + EVAL_STEP_SECS;
            while (i < transcript.length && transcript[i].start < nextSecGoal) {
                i++;
            }
        } else {
            // If we found a candidate, 'i' was manually mutated to 'j' above. Advance by 1 to start fresh for the next block.
            i++;
        }
    }

    // Post-Process: De-duplicate and rank
    let bestClips = removeOverlaps(candidates);

    // Sort descending by score again
    bestClips.sort((a, b) => b.score - a.score);

    // Hard Limit to Top 5-10 Output constraint
    return bestClips.slice(0, 10);
}
