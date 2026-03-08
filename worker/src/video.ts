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
 * Downloads the full audio from YouTube to speed up Analysis.
 */
export const downloadAudioOnly = async (url: string, outputDir: string, videoId: string): Promise<string> => {
    const outputPath = path.join(outputDir, `audio-source-${videoId}.m4a`);

    const command = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -o "${outputPath}" "${url}"`;

    console.log(`[Video] [1/5] Downloading audio-only source: ${outputPath}`);
    await execPromise(command);

    if (!(await checkFileExists(outputPath))) {
        throw new Error(`Audio download failed, file not found: ${outputPath}`);
    }

    return outputPath;
};

/**
 * Renders a specific timeline directly using yt-dlp section download.
 */
export const downloadClip = async (url: string, outputDir: string, jobId: string, startSec: number, endSec: number): Promise<string> => {
    // Determine bounds in HH:MM:SS format
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startFormatted = formatTime(startSec);
    const endFormatted = formatTime(endSec);
    const timeSafePath = `${startFormatted.replace(/:/g, '-')}_${endFormatted.replace(/:/g, '-')}`;

    // We utilize %(title)s placeholder directly in yt-dlp alongside our start/end
    const outputPath = path.join(outputDir, `%(title)s_${timeSafePath}.%(ext)s`);

    // Specific yt-dlp scheme as defined by user constraints
    const command = `yt-dlp -f "bv*[height<=1080][fps>=60]+ba/bv*[height<=1080]+ba/bv*+ba/b" --download-sections "*${startFormatted}-${endFormatted}" --merge-output-format mp4 -o "${outputPath}" "${url}"`;

    console.log(`[Render] Initiating targeted download for ${startFormatted} to ${endFormatted}`);
    await execPromise(command);

    // Because yt-dlp uses %(title)s, we don't precisely know the exact filename.
    // However, yt-dlp writes stdout indicating the destination.
    // A simpler way is to query the directory for the latest file created, or use '--print filename'.

    // Let's run a quick discovery to find what it actually outputted
    const findCmd = `ls -t "${outputDir}" | grep "${timeSafePath}.mp4" | head -n 1`;
    const { stdout } = await execPromise(findCmd);
    const generatedFileName = stdout.trim();

    if (!generatedFileName) {
        throw new Error(`Failed to locate the targeted download clip in ${outputDir}`);
    }

    return path.join(outputDir, generatedFileName);
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
