import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Quality {
  width: number;
  height: number;
  bitrate: string;   // e.g. '2500k'
  label: string;     // e.g. '720p'
}

export interface VideoInfo {
  duration: number;   // seconds
  width: number;
  height: number;
  codec: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';
const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

/** Maximum execution time for ffmpeg/ffprobe commands (ms). */
const EXEC_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Extracts metadata from a video file using ffprobe.
 *
 * @param inputPath  Absolute path to the input video file.
 */
export async function getVideoInfo(inputPath: string): Promise<VideoInfo> {
  try {
    const { stdout } = await execFileAsync(
      FFPROBE_PATH,
      [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        '-select_streams', 'v:0',
        inputPath,
      ],
      { timeout: EXEC_TIMEOUT },
    );

    const probe = JSON.parse(stdout);
    const stream = probe.streams?.[0];
    const format = probe.format;

    if (!stream) {
      throw new Error('No video stream found in file');
    }

    const duration = parseFloat(format?.duration || stream.duration || '0');
    const width = stream.width || 0;
    const height = stream.height || 0;
    const codec = stream.codec_name || 'unknown';

    logger.debug('Extracted video info', { inputPath, duration, width, height, codec });

    return { duration, width, height, codec };
  } catch (error) {
    logger.error('ffprobe failed', {
      inputPath,
      error: (error as Error).message,
    });
    throw new AppError(
      `Failed to extract video info: ${(error as Error).message}`,
      500,
      'FFPROBE_ERROR',
    );
  }
}

/**
 * Transcodes a video into HLS (HTTP Live Streaming) format with multiple
 * quality variants and a master playlist.
 *
 * @param inputPath   Absolute path to the input video file.
 * @param outputDir   Directory where HLS output will be written.
 * @param qualities   Array of quality presets to produce.
 */
export async function transcodeToHls(
  inputPath: string,
  outputDir: string,
  qualities: Quality[],
): Promise<void> {
  // Create output directories for each quality level
  for (const q of qualities) {
    await fs.mkdir(path.join(outputDir, q.label), { recursive: true });
  }

  // Build ffmpeg arguments for multi-bitrate HLS output.
  // We use a single ffmpeg invocation with multiple outputs for efficiency.
  const args: string[] = [
    '-i', inputPath,
    '-hide_banner',
    '-y', // overwrite
  ];

  // For each quality, add a scaled/encoded output
  const varStreamMap: string[] = [];

  for (let i = 0; i < qualities.length; i++) {
    const q = qualities[i];

    args.push(
      // Video filter: scale to target resolution, maintain aspect ratio
      `-filter:v:${i}`, `scale=w=${q.width}:h=${q.height}:force_original_aspect_ratio=decrease,pad=${q.width}:${q.height}:(ow-iw)/2:(oh-ih)/2`,
      // Video codec settings
      `-map`, '0:v:0',
      `-c:v:${i}`, 'libx264',
      `-b:v:${i}`, q.bitrate,
      `-preset`, 'fast',
      `-profile:v:${i}`, 'main',
    );

    // Map audio if present
    args.push(`-map`, '0:a:0?');
    args.push(`-c:a:${i}`, 'aac', `-b:a:${i}`, '128k');

    varStreamMap.push(`v:${i},a:${i}`);
  }

  args.push(
    // HLS settings
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_list_size', '0',
    '-hls_segment_filename', path.join(outputDir, '%v/segment_%03d.ts'),
    '-master_pl_name', 'master.m3u8',
    '-var_stream_map', varStreamMap.join(' '),
    path.join(outputDir, '%v/playlist.m3u8'),
  );

  try {
    logger.info('Starting HLS transcode', {
      inputPath,
      outputDir,
      qualities: qualities.map((q) => q.label),
    });

    await execFileAsync(FFMPEG_PATH, args, { timeout: EXEC_TIMEOUT });

    logger.info('HLS transcode completed', { outputDir });
  } catch (error) {
    logger.error('HLS transcode failed', {
      inputPath,
      error: (error as Error).message,
    });
    throw new AppError(
      `HLS transcode failed: ${(error as Error).message}`,
      500,
      'FFMPEG_HLS_ERROR',
    );
  }
}

/**
 * Transcodes a video to a single MP4 file at the specified quality.
 *
 * @param inputPath   Absolute path to the input video file.
 * @param outputPath  Absolute path for the output MP4 file.
 * @param quality     Target quality preset.
 */
export async function transcodeToMp4(
  inputPath: string,
  outputPath: string,
  quality: Quality,
): Promise<void> {
  const args: string[] = [
    '-i', inputPath,
    '-hide_banner',
    '-y',
    '-vf', `scale=w=${quality.width}:h=${quality.height}:force_original_aspect_ratio=decrease,pad=${quality.width}:${quality.height}:(ow-iw)/2:(oh-ih)/2`,
    '-c:v', 'libx264',
    '-b:v', quality.bitrate,
    '-preset', 'fast',
    '-profile:v', 'main',
    '-movflags', '+faststart', // Enables progressive download
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath,
  ];

  try {
    logger.info('Starting MP4 transcode', {
      inputPath,
      outputPath,
      quality: quality.label,
    });

    await execFileAsync(FFMPEG_PATH, args, { timeout: EXEC_TIMEOUT });

    logger.info('MP4 transcode completed', { outputPath });
  } catch (error) {
    logger.error('MP4 transcode failed', {
      inputPath,
      error: (error as Error).message,
    });
    throw new AppError(
      `MP4 transcode failed: ${(error as Error).message}`,
      500,
      'FFMPEG_MP4_ERROR',
    );
  }
}

/**
 * Generates a JPEG thumbnail from a video at the specified timestamp.
 *
 * @param inputPath   Absolute path to the input video file.
 * @param outputPath  Absolute path for the output JPEG.
 * @param timestamp   Time in seconds at which to capture the thumbnail (default: 1s).
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timestamp: number = 1,
): Promise<void> {
  const args: string[] = [
    '-i', inputPath,
    '-hide_banner',
    '-y',
    '-ss', timestamp.toString(),
    '-vframes', '1',
    '-vf', 'scale=640:-2', // 640px wide, maintain aspect ratio
    '-q:v', '2', // High JPEG quality
    outputPath,
  ];

  try {
    logger.debug('Generating thumbnail', { inputPath, outputPath, timestamp });

    await execFileAsync(FFMPEG_PATH, args, { timeout: 30_000 });

    logger.debug('Thumbnail generated', { outputPath });
  } catch (error) {
    logger.error('Thumbnail generation failed', {
      inputPath,
      error: (error as Error).message,
    });
    throw new AppError(
      `Thumbnail generation failed: ${(error as Error).message}`,
      500,
      'FFMPEG_THUMBNAIL_ERROR',
    );
  }
}
