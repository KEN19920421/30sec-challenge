import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, s3Config } from '../../config/s3';
import { logger } from '../../config/logger';
import db from '../../config/database';
import { AppError, ValidationError } from '../../shared/errors';
import {
  getVideoInfo,
  transcodeToHls,
  transcodeToMp4,
  generateThumbnail,
  type Quality,
} from './ffmpeg.service';
import { getCdnUrl } from '../storage/cdn.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VIDEO_DURATION_SECONDS = 35;

const VALID_VIDEO_CODECS = ['h264', 'hevc', 'vp9', 'av1', 'mpeg4', 'vp8'];

/** Quality presets for HLS transcoding. */
const HLS_QUALITIES: Quality[] = [
  { width: 1280, height: 720, bitrate: '2500k', label: '720p' },
  { width: 854, height: 480, bitrate: '1200k', label: '480p' },
  { width: 640, height: 360, bitrate: '700k', label: '360p' },
];

/** Quality preset for MP4 fallback. */
const MP4_QUALITY: Quality = {
  width: 1280,
  height: 720,
  bitrate: '2500k',
  label: '720p',
};

const THUMBNAIL_TIMESTAMP_SECONDS = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a unique temporary directory for processing a submission.
 */
async function createTempDir(submissionId: string): Promise<string> {
  const tempBase = path.join(os.tmpdir(), 'transcode');
  await fs.mkdir(tempBase, { recursive: true });
  const dir = await fs.mkdtemp(path.join(tempBase, `${submissionId}-`));
  return dir;
}

/**
 * Downloads an S3 object to a local file path.
 */
async function downloadFromS3(key: string, destPath: string): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new AppError('Empty response body from S3', 500, 'S3_DOWNLOAD_ERROR');
  }

  const writeStream = createWriteStream(destPath);
  await pipeline(response.Body as Readable, writeStream);
}

/**
 * Uploads a local file to S3.
 */
async function uploadToS3(
  localPath: string,
  key: string,
  contentType: string,
): Promise<void> {
  const body = await fs.readFile(localPath);

  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Recursively uploads an entire directory to S3 with the specified key prefix.
 */
async function uploadDirectoryToS3(
  localDir: string,
  keyPrefix: string,
): Promise<void> {
  const entries = await fs.readdir(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    const s3Key = `${keyPrefix}/${entry.name}`;

    if (entry.isDirectory()) {
      await uploadDirectoryToS3(localPath, s3Key);
    } else {
      const contentType = resolveContentType(entry.name);
      await uploadToS3(localPath, s3Key, contentType);
    }
  }
}

/**
 * Determines the MIME type from a file extension.
 */
function resolveContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/MP2T',
    '.mp4': 'video/mp4',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Safely removes a temporary directory and all its contents.
 */
async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
    logger.debug('Cleaned up temp directory', { dir });
  } catch (error) {
    // Non-fatal -- log and move on
    logger.warn('Failed to clean up temp directory', {
      dir,
      error: (error as Error).message,
    });
  }
}

/**
 * Updates the submission record in the database.
 */
async function updateSubmission(
  submissionId: string,
  data: Record<string, unknown>,
): Promise<void> {
  await db('submissions')
    .where({ id: submissionId })
    .update({
      ...data,
      updated_at: db.fn.now(),
    });
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Processes a submitted video end-to-end:
 *
 *   1. Download the raw upload from S3 to a temporary directory.
 *   2. Probe the file for duration, resolution, and codec.
 *   3. Validate constraints (max 35 seconds, valid codec).
 *   4. Transcode to HLS (720p, 480p, 360p) and MP4 fallback (720p).
 *   5. Generate a JPEG thumbnail at the 1-second mark.
 *   6. Upload all outputs to S3.
 *   7. Update the submission record with URLs and `status = 'ready'`.
 *   8. Clean up the temporary directory.
 *
 * @param submissionId  The UUID of the submission.
 * @param videoKey      The S3 key of the raw uploaded video.
 */
export async function processVideo(
  submissionId: string,
  videoKey: string,
): Promise<void> {
  let tempDir: string | undefined;

  try {
    // Mark submission as processing
    await updateSubmission(submissionId, { status: 'processing' });

    // 1. Prepare temp workspace
    tempDir = await createTempDir(submissionId);
    const rawVideoPath = path.join(tempDir, 'raw.mp4');

    logger.info('Starting video processing', { submissionId, videoKey, tempDir });

    // 2. Download raw video
    await downloadFromS3(videoKey, rawVideoPath);
    logger.info('Downloaded raw video from S3', { submissionId, videoKey });

    // 3. Get video info
    const info = await getVideoInfo(rawVideoPath);
    logger.info('Video info extracted', { submissionId, ...info });

    // 4. Validate
    if (info.duration > MAX_VIDEO_DURATION_SECONDS) {
      await updateSubmission(submissionId, {
        status: 'failed',
        error_message: `Video duration (${info.duration.toFixed(1)}s) exceeds the maximum of ${MAX_VIDEO_DURATION_SECONDS}s`,
      });
      throw new ValidationError(
        `Video duration exceeds ${MAX_VIDEO_DURATION_SECONDS} seconds`,
      );
    }

    if (!VALID_VIDEO_CODECS.includes(info.codec.toLowerCase())) {
      await updateSubmission(submissionId, {
        status: 'failed',
        error_message: `Unsupported video codec: ${info.codec}`,
      });
      throw new ValidationError(`Unsupported video codec: ${info.codec}`);
    }

    // 5. Transcode to HLS
    const hlsOutputDir = path.join(tempDir, 'hls');
    await fs.mkdir(hlsOutputDir, { recursive: true });
    await transcodeToHls(rawVideoPath, hlsOutputDir, HLS_QUALITIES);
    logger.info('HLS transcode completed', { submissionId });

    // 6. Transcode to MP4 fallback
    const mp4OutputPath = path.join(tempDir, '720p.mp4');
    await transcodeToMp4(rawVideoPath, mp4OutputPath, MP4_QUALITY);
    logger.info('MP4 transcode completed', { submissionId });

    // 7. Generate thumbnail
    const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');
    await generateThumbnail(rawVideoPath, thumbnailPath, THUMBNAIL_TIMESTAMP_SECONDS);
    logger.info('Thumbnail generated', { submissionId });

    // 8. Upload outputs to S3
    const s3Prefix = `submissions/${submissionId}`;

    // HLS directory
    await uploadDirectoryToS3(hlsOutputDir, `${s3Prefix}/hls`);
    logger.info('HLS files uploaded to S3', { submissionId });

    // MP4 fallback
    await uploadToS3(mp4OutputPath, `${s3Prefix}/mp4/720p.mp4`, 'video/mp4');
    logger.info('MP4 fallback uploaded to S3', { submissionId });

    // Thumbnail
    await uploadToS3(thumbnailPath, `${s3Prefix}/thumbnail.jpg`, 'image/jpeg');
    logger.info('Thumbnail uploaded to S3', { submissionId });

    // 9. Build URLs and update record
    const videoUrl = getCdnUrl(`${s3Prefix}/hls/master.m3u8`);
    const mp4Url = getCdnUrl(`${s3Prefix}/mp4/720p.mp4`);
    const thumbnailUrl = getCdnUrl(`${s3Prefix}/thumbnail.jpg`);

    await updateSubmission(submissionId, {
      status: 'ready',
      video_url: videoUrl,
      mp4_url: mp4Url,
      thumbnail_url: thumbnailUrl,
      duration: Math.round(info.duration * 100) / 100,
      width: info.width,
      height: info.height,
      error_message: null,
    });

    logger.info('Video processing completed successfully', {
      submissionId,
      videoUrl,
      thumbnailUrl,
    });
  } catch (error) {
    // If the error is already a validation error (already handled above), re-throw
    if (error instanceof ValidationError) {
      throw error;
    }

    // Mark as failed for unexpected errors
    try {
      await updateSubmission(submissionId, {
        status: 'failed',
        error_message: (error as Error).message,
      });
    } catch (dbError) {
      logger.error('Failed to update submission status to failed', {
        submissionId,
        error: (dbError as Error).message,
      });
    }

    logger.error('Video processing failed', {
      submissionId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });

    throw error;
  } finally {
    // 10. Clean up temp files
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
