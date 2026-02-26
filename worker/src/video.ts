import { exec } from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { constants } from 'fs';

const execPromise = util.promisify(exec);

async function checkFileExists(file: string) {
    return fs.access(file, constants.F_OK).then(() => true).catch(() => false);
}

/**
 * Downloads the full video from YouTube as MP4.
 */
export const downloadVideo = async (url: string, outputDir: string, videoId: string): Promise<string> => {
    const outputPath = path.join(outputDir, `full-${videoId}.mp4`);

    // Force MP4 format to ensure compatibility with standard players and FFmpeg concatenation if needed later.
    const command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "${outputPath}" "${url}"`;

    console.log(`[Video] [1/5] Downloading full video: ${outputPath}`);
    await execPromise(command);

    if (!(await checkFileExists(outputPath))) {
        throw new Error(`Video download failed, file not found: ${outputPath}`);
    }

    return outputPath;
};

/**
 * Gets video total duration in seconds using ffprobe.
 */
export const getVideoDuration = async (sourcePath: string): Promise<number> => {
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${sourcePath}"`;
    const { stdout } = await execPromise(command);
    const duration = parseFloat(stdout.trim());

    if (isNaN(duration)) {
        throw new Error(`Failed to parse video duration from ffprobe: ${stdout}`);
    }
    return duration;
};

/**
 * Extracts 16kHz mono audio from a local MP4 source using FFmpeg.
 */
export const extractAudio = async (sourcePath: string, outputPath: string, start?: number, duration?: number): Promise<string> => {
    const sliceConfigs = (start !== undefined && duration !== undefined) ? `-ss ${start} -t ${duration} ` : '';
    const command = `ffmpeg -y ${sliceConfigs}-i "${sourcePath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}"`;

    console.log(`[ExtractAudio] Synthesizing .wav from MP4 format: ${outputPath}` + (sliceConfigs ? ` [Chunk ${start}s - ${start! + duration!}s]` : ''));
    await execPromise(command);

    if (!(await checkFileExists(outputPath))) {
        throw new Error(`Audio extraction failed, file not found: ${outputPath}`);
    }

    return outputPath;
}

/**
 * Cuts a video segment using FFmpeg.
 * Uses stream copying (-c copy) for speed and quality preservation.
 */
export const cutClip = async (sourcePath: string, start: number, end: number, outputPath: string): Promise<void> => {
    // Validating inputs
    if (start < 0 || end <= start) {
        throw new Error(`Invalid time range: ${start} - ${end}`);
    }

    const command = `ffmpeg -y -i "${sourcePath}" -ss ${start} -to ${end} -c copy "${outputPath}"`;

    console.log(`[Video] Cutting clip: ${outputPath} [${start}s -> ${end}s]`);
    await execPromise(command);

    if (!(await checkFileExists(outputPath))) {
        throw new Error(`Clip generation failed: ${outputPath}`);
    }
};
