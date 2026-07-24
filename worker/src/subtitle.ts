
import { exec } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execPromise = util.promisify(exec);

export interface SubtitleSegment {
    start: number;
    end: number;
    text: string;
}

/**
 * Downloads subtitles for a video and parses them into JSON.
 * Returns an array of segments.
 */
export const getSubtitles = async (url: string, outputDir: string, videoId: string): Promise<SubtitleSegment[]> => {
    // 1. Download VTT using yt-dlp
    // --write-auto-sub: Get auto-generated subs (most reliable for streams)
    // --skip-download: Do NOT download the video
    // we'll try to get ANY available sub, preferring auto-generated ones if no manual subs exist.
    // yt-dlp automatically names output like: video_id.en.vtt or video_id.id.vtt

    const baseFilename = `subs-${videoId}`;
    const outputTemplate = path.join(outputDir, `${baseFilename}.%(ext)s`);

    // Command to get auto-subs (or manual subs if preferred)
    // Using --write-auto-sub and --write-sub to catch both.
    // Also using --sub-lang "en,id,en-orig,id-orig" to be specific but flexible.
    const command = `yt-dlp --write-auto-sub --write-sub --sub-lang "en,id" --skip-download --output "${outputTemplate}" "${url}"`;

    console.log(`[Subtitle] Fetching subtitles: ${command}`);

    try {
        await execPromise(command);
    } catch (e: any) {
        // Check for specific yt-dlp errors
        if (e.stderr && e.stderr.includes('Video unavailable')) {
            throw new Error(`Video unavailable or private: ${url}`);
        }
        if (e.stderr && e.stderr.includes('Sign in to confirm your age')) {
            throw new Error(`Video age-restricted: ${url}`);
        }
        console.warn(`[Subtitle] Warning during fetch: ${e.message}`);
    }

    // finding the file created
    const files = fs.readdirSync(outputDir);
    // looking for any .vtt file matching our base filename
    const subFile = files.find(f => f.startsWith(baseFilename) && f.endsWith('.vtt'));

    if (!subFile) {
        throw new Error(`No subtitles found for video ${videoId}. Cannot proceed with AI analysis.`);
    }

    const fullPath = path.join(outputDir, subFile);
    console.log(`[Subtitle] Found subtitle file: ${fullPath}`);

    // 2. Parse VTT to JSON
    const vttContent = fs.readFileSync(fullPath, 'utf-8');
    const segments = parseVtt(vttContent);

    // Cleanup VTT file
    fs.unlinkSync(fullPath);

    return segments;
};

/**
 * Simple VTT parser
 */
const parseVtt = (vttData: string): SubtitleSegment[] => {
    const lines = vttData.split('\n');
    const segments: SubtitleSegment[] = [];

    let currentStart = 0;
    let currentEnd = 0;
    let currentText: string[] = [];

    const timeRegex = /((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s-->\s((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/;

    let isHeader = true;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (!line) continue;
        if (line === 'WEBVTT') { isHeader = false; continue; }
        if (line.startsWith('Kind:') || line.startsWith('Language:')) continue;
        if (/^\d+$/.test(line)) continue; // sequence numbers

        const timeMatch = line.match(timeRegex);
        if (timeMatch) {
            // If we have pending text from previous segment
            if (currentText.length > 0) {
                segments.push({
                    start: currentStart,
                    end: currentEnd,
                    text: currentText.join(' ').replace(/<[^>]*>/g, '').trim()
                });
                currentText = [];
            }

            currentStart = parseTime(timeMatch[1]);
            currentEnd = parseTime(timeMatch[2]);
        } else {
            // Text content
            if (!line.includes('-->')) {
                currentText.push(line);
            }
        }
    }

    // Push last segment
    if (currentText.length > 0) {
        segments.push({
            start: currentStart,
            end: currentEnd,
            text: currentText.join(' ').replace(/<[^>]*>/g, '').trim()
        });
    }

    return segments;
};

const parseTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    let seconds = 0;

    if (parts.length === 3) {
        seconds += parseInt(parts[0]) * 3600;
        seconds += parseInt(parts[1]) * 60;
        seconds += parseFloat(parts[2]);
    } else if (parts.length === 2) {
        seconds += parseInt(parts[0]) * 60;
        seconds += parseFloat(parts[1]);
    }
    return seconds;
};

import { TranscriptSegment } from './selector';

/**
 * Generates an Advanced SubStation Alpha (.ass) subtitle file.
 * Creates a dynamic "karaoke" style effect where the current spoken word
 * is highlighted in yellow, while the surrounding words are white/grey.
 *
 * @param transcript Word-level transcript data for the whole video
 * @param outputPath Path where the .ass file will be saved
 * @param clipStart Start time of the clip in seconds
 * @param clipEnd End time of the clip in seconds
 */
interface StyleSettings {
    fontName: string;
    fontSize: number;
    primaryStyleColor: string;
    outlineStyleColor: string;
    backStyleColor: string;
    activeHighlightColor: string;
    inactiveHighlightColor: string;
    outline: number;
    shadow: number;
    bold: number;
}

const STYLES_MAP: Record<string, StyleSettings> = {
    DEFAULT: {
        fontName: "Arial Black",
        fontSize: 95,
        primaryStyleColor: "&H00FFFFFF&",
        outlineStyleColor: "&H00000000&",
        backStyleColor: "&H80000000&",
        activeHighlightColor: "&H00FFFF&", // Yellow
        inactiveHighlightColor: "&HFFFFFF&",
        outline: 6,
        shadow: 2,
        bold: -1
    },
    CYBERPUNK: {
        fontName: "Impact",
        fontSize: 110,
        primaryStyleColor: "&H00FFFFFF&",
        outlineStyleColor: "&H00000000&",
        backStyleColor: "&H80000000&",
        activeHighlightColor: "&H00FF00&", // Neon Green
        inactiveHighlightColor: "&HFFFFFF&",
        outline: 8,
        shadow: 0,
        bold: -1
    },
    CUTE: {
        fontName: "Comic Sans MS",
        fontSize: 90,
        primaryStyleColor: "&H00FFFFFF&",
        outlineStyleColor: "&H0082004B&", // Indigo BGR: 82,00,4B
        backStyleColor: "&H80000000&",
        activeHighlightColor: "&HFF00FF&", // Pink/Magenta
        inactiveHighlightColor: "&HFFFFFF&",
        outline: 5,
        shadow: 1,
        bold: -1
    },
    MINIMALIST: {
        fontName: "Arial",
        fontSize: 80,
        primaryStyleColor: "&H00F0F0F0&",
        outlineStyleColor: "&H00222222&",
        backStyleColor: "&H00000000&",
        activeHighlightColor: "&HFFFF00&", // Cyan BGR: FF,FF,00
        inactiveHighlightColor: "&HF0F0F0&",
        outline: 3,
        shadow: 0,
        bold: 0
    }
};

interface AspectRatioSettings {
    playResX: number;
    playResY: number;
    marginV: number;
}

const ASPECT_RATIO_MAP: Record<string, AspectRatioSettings> = {
    '9:16': { playResX: 1080, playResY: 1920, marginV: 600 },
    '16:9': { playResX: 1920, playResY: 1080, marginV: 80 },
    '1:1': { playResX: 1080, playResY: 1080, marginV: 150 }
};

/**
 * Generates an Advanced SubStation Alpha (.ass) subtitle file.
 * Creates a dynamic "karaoke" style effect where the current spoken word
 * is highlighted in active color, while the surrounding words are white/grey.
 *
 * @param transcript Word-level transcript data for the whole video
 * @param outputPath Path where the .ass file will be saved
 * @param clipStart Start time of the clip in seconds
 * @param clipEnd End time of the clip in seconds
 * @param subtitleStyle Selected subtitle style configuration
 * @param aspectRatio Target aspect ratio configuration
 */
export async function generateAssSubtitles(
    transcript: TranscriptSegment[],
    outputPath: string,
    clipStart: number,
    clipEnd: number,
    subtitleStyle: string = 'DEFAULT',
    aspectRatio: string = '9:16'
): Promise<string> {
    const activeStyle = STYLES_MAP[subtitleStyle.toUpperCase()] || STYLES_MAP.DEFAULT;
    const activeLayout = ASPECT_RATIO_MAP[aspectRatio] || ASPECT_RATIO_MAP['9:16'];

    // Advanced SubStation Alpha (ASS) Header
    const assHeader = `[Script Info]
ScriptType: v4.00+
PlayResX: ${activeLayout.playResX}
PlayResY: ${activeLayout.playResY}
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${activeStyle.fontName},${activeStyle.fontSize},${activeStyle.primaryStyleColor},&H000000FF,${activeStyle.outlineStyleColor},${activeStyle.backStyleColor},${activeStyle.bold},0,0,0,100,100,0,0,1,${activeStyle.outline},${activeStyle.shadow},2,30,30,${activeLayout.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Time formatting helper for .ass files (H:MM:SS.cs)
    const formatTime = (seconds: number) => {
        // ASS format expects duration relative to the start of the final video file (which starts at 0)
        const relativeSec = Math.max(0, seconds - clipStart);

        const h = Math.floor(relativeSec / 3600);
        const m = Math.floor((relativeSec % 3600) / 60);
        const s = Math.floor(relativeSec % 60);
        const cs = Math.floor((relativeSec % 1) * 100);

        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    };

    let eventsBody = "";

    // Filter segments to only those that fall within our clip time boundary
    const clipSegments = transcript.filter(seg => seg.end > clipStart && seg.start < clipEnd);

    for (const segment of clipSegments) {
        let segmentWords = segment.words;
        if (!segmentWords || segmentWords.length === 0) {
            const wordsText = segment.text.trim().split(/\s+/).filter(w => w.length > 0);
            if (wordsText.length === 0) continue;
            const duration = segment.end - segment.start;
            const wordDuration = duration / Math.max(1, wordsText.length);
            segmentWords = wordsText.map((word, idx) => ({
                text: word,
                start: segment.start + idx * wordDuration,
                end: segment.start + (idx + 1) * wordDuration
            }));
        }

        // Clip the event line times strictly to the video duration
        const lineStartAss = formatTime(Math.max(segment.start, clipStart));
        const lineEndAss = formatTime(Math.min(segment.end, clipEnd));

const hexToAssColor = (hex: string): string => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 6) {
        const r = cleanHex.substring(0, 2);
        const g = cleanHex.substring(2, 4);
        const b = cleanHex.substring(4, 6);
        return `${b}${g}${r}`; // ASS is BGR
    }
    return cleanHex;
};

        // Create sequential karaoke highlighting.
        for (let i = 0; i < segmentWords.length; i++) {
            const activeWord = segmentWords[i];

            // If the word isn't inside our target clip timeframe physically, ignore drawing it
            if (activeWord.end < clipStart || activeWord.start > clipEnd) {
                continue;
            }

            const wordStartAss = formatTime(Math.max(activeWord.start, clipStart));
            const wordEndAss = formatTime(Math.min(activeWord.end, clipEnd));

            let dialogueLine = `Dialogue: 0,${wordStartAss},${wordEndAss},Default,,0,0,0,,`;

            // Build the string: Inactive, ACTIVE, Inactive
            const styledWords = segmentWords.map((w: any, index) => {
                const text = w.text.toUpperCase();
                const wordTextColor = w.textColor ? hexToAssColor(w.textColor) : null;
                const wordOutlineColor = w.outlineColor ? hexToAssColor(w.outlineColor) : null;
                
                let wordStyleTags = "";
                if (wordTextColor) {
                    wordStyleTags += `\\c&H${wordTextColor}&`;
                }
                if (wordOutlineColor) {
                    wordStyleTags += `\\3c&H${wordOutlineColor}&`;
                }

                if (index === i) {
                    const activeColor = activeStyle.activeHighlightColor.replace(/&H|&/g, '');
                    return `{\\c&H${activeColor}&\\3c&H000000&}${text}{\\c&H${activeStyle.inactiveHighlightColor.replace(/&H|&/g, '')}&\\3c&H${activeStyle.outlineStyleColor.replace(/&H|&/g, '')}&}`;
                } else {
                    if (wordStyleTags) {
                        return `{${wordStyleTags}}${text}{\\c&H${activeStyle.inactiveHighlightColor.replace(/&H|&/g, '')}&\\3c&H${activeStyle.outlineStyleColor.replace(/&H|&/g, '')}&}`;
                    }
                    return text;
                }
            });

            dialogueLine += styledWords.join(" ") + "\\n\n";
            eventsBody += dialogueLine;
        }
    }

    const fullAssContent = assHeader + eventsBody;

    await fs.promises.writeFile(outputPath, fullAssContent);

    return outputPath;
}
