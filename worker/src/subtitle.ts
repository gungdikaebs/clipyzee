
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
