import { exec } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execPromise = util.promisify(exec);

/**
 * Downloads the full video from YouTube as MP4.
 */
export const downloadVideo = async (url: string, outputDir: string, videoId: string): Promise<string> => {
    const outputPath = path.join(outputDir, `full-${videoId}.mp4`);

    // Force MP4 format to ensure compatibility with standard players and FFmpeg concatenation if needed later.
    // Ref: https://github.com/yt-dlp/yt-dlp
    const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${url}"`;

    console.log(`[Video] Downloading full video: ${command}`);
    await execPromise(command);

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Video download failed, file not found: ${outputPath}`);
    }

    return outputPath;
};

/**
 * Cuts a video segment using FFmpeg.
 * Uses stream copying (-c copy) for speed and quality preservation.
 */
export const cutClip = async (sourcePath: string, start: number, end: number, outputPath: string): Promise<void> => {
    // Validating inputs
    if (start < 0 || end <= start) {
        throw new Error(`Invalid time range: ${start} - ${end}`);
    }

    // ffmpeg -y -i input.mp4 -ss <start> -to <end> -c copy output.mp4
    // Using -ss before -i is faster aka "Input Seeking" but might be less accurate for -c copy.
    // User requested: ffmpeg -y -i video.mp4 -ss ... -to ... -c copy
    // We will follow the user's requested format which puts -ss after -i (Output Seeking/Input slicing depending on position).
    // Actually, user wrote: "ffmpeg -y -i video.mp4 -ss 00:01:20 -to 00:01:55 -c copy clip_1.mp4"
    // This places -ss AFTER -i.

    const command = `ffmpeg -y -i "${sourcePath}" -ss ${start} -to ${end} -c copy "${outputPath}"`;

    console.log(`[Video] Cutting clip: ${command}`);
    await execPromise(command);

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Clip generation failed: ${outputPath}`);
    }
};
