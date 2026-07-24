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

    const command = `yt-dlp --extractor-args "youtube:player_client=default,-android_sdkless" -f "bestaudio[ext=m4a]/bestaudio/best" -o "${outputPath}" "${url}"`;

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

    // Use deterministic naming invariant with Job ID instead of YouTube title
    const filePrefix = `clip_${jobId}_${timeSafePath}`;
    const outputPath = path.join(outputDir, `${filePrefix}.%(ext)s`);

    // Specific yt-dlp scheme as defined by user constraints
    const command = `yt-dlp --extractor-args "youtube:player_client=default,-android_sdkless" -f "bv*[height<=1080][fps>=60]+ba/bv*[height<=1080]+ba/bv*+ba/b" --download-sections "*${startFormatted}-${endFormatted}" --merge-output-format mp4 -o "${outputPath}" "${url}"`;

    console.log(`[Render] Initiating targeted download for ${startFormatted} to ${endFormatted} with prefix ${filePrefix}`);
    await execPromise(command);

    // Robust discovery using Node.JS native fs instead of brittle Bash ls/grep
    const files = await fs.readdir(outputDir);
    const generatedFileName = files.find(file => file.startsWith(filePrefix));

    if (!generatedFileName) {
        throw new Error(`Failed to locate the targeted download clip starting with ${filePrefix} in ${outputDir}`);
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

/**
 * Renders a final vertical clip with burned-in ASS subtitles.
 * It applies a 9:16 crop to the center of the video and burns the subtitles using the 'ass' video filter.
 */
export const renderClipWithSubtitles = async (
    sourcePath: string,
    assPath: string,
    outputPath: string,
    aspectRatio: string = '9:16',
    clipStart: number = 0,
    segments: any[] = []
): Promise<string> => {
    // Need to ensure the ass filter path is absolute and properly escaped for FFmpeg
    const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

    // Build conditional FFmpeg expression for cropX based on segment timestamps
    let cropXExpr = "50"; // default fallback to center
    if (segments && segments.length > 0) {
        // Sort segments chronologically
        const sorted = [...segments].sort((a, b) => a.start - b.start);
        for (let i = sorted.length - 1; i >= 0; i--) {
            const seg = sorted[i];
            const relStart = Math.max(0, seg.start - clipStart).toFixed(2);
            const relEnd = (seg.end - clipStart).toFixed(2);
            const segCropX = seg.cropX !== undefined ? seg.cropX : 50;
            // Build nested ternary: if time is within relative bounds of segment, use its cropX; else fall back
            cropXExpr = `if(and(gte(t,${relStart}),lt(t,${relEnd})),${segCropX},${cropXExpr})`;
        }
    }

    // Video Filters (vf) based on aspect ratio:
    let vfQueue = "";
    if (aspectRatio === '1:1') {
        // Square crop: center crop to square with dynamic panning expression, then scale to 1080x1080 to match subtitle canvas
        vfQueue = `crop=ih:ih:(iw-ow)*(${cropXExpr}/100),scale=1080:1080:flags=lanczos,ass='${escapedAssPath}'`;
    } else if (aspectRatio === '4:3') {
        // Standard TV crop: crop to 4:3 with dynamic panning expression, then scale to 1440x1080 to match subtitle canvas
        vfQueue = `crop=ih*(4/3):ih:(iw-ow)*(${cropXExpr}/100),scale=1440:1080:flags=lanczos,ass='${escapedAssPath}'`;
    } else if (aspectRatio === '16:9') {
        // Landscape: no crop, scale to 1920x1080 to match subtitle canvas
        vfQueue = `scale=1920:1080:flags=lanczos,ass='${escapedAssPath}'`;
    } else {
        // Default 9:16 Vertical crop: crop center with dynamic panning expression, scale to 1080x1920 to match subtitle canvas
        vfQueue = `crop=ih*(9/16):ih:(iw-ow)*(${cropXExpr}/100),scale=1080:1920:flags=lanczos,ass='${escapedAssPath}'`;
    }

    // -c:v libx264 - fast encode, high quality
    // -preset fast - acceptable speed vs compression ratio
    // -c:a copy - copy audio without re-encoding
    const command = `ffmpeg -y -i "${sourcePath}" -vf "${vfQueue}" -c:v libx264 -preset fast -crf 23 -c:a copy "${outputPath}"`;

    console.log(`[Video] Rendering clip (Aspect: ${aspectRatio}) with subtitles: ${outputPath}`);
    await execPromise(command);

    if (!(await checkFileExists(outputPath))) {
        throw new Error(`Clip rendering failed: ${outputPath}`);
    }

    return outputPath;
};
