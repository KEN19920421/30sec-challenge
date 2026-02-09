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
import { AppError } from '../../shared/errors';
import { getVideoInfo, generateThumbnail } from './ffmpeg.service';
import { getCdnUrl } from '../storage/cdn.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Timestamps (in seconds) at which to generate thumbnail options.
 * The caller (or the user) can later choose which one to use as primary.
 */
const THUMBNAIL_TIMESTAMPS = [0.5, 1, 2, 3, 5];

/** Maximum number of thumbnails to generate (capped at video duration). */
const MAX_THUMBNAILS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    logger.warn('Failed to clean up thumbnail temp directory', {
      dir,
      error: (error as Error).message,
    });
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface ThumbnailResult {
  index: number;
  timestamp: number;
  url: string;
  key: string;
}

/**
 * Generates multiple thumbnail options for a submission at different
 * timestamps throughout the video.
 *
 * Each thumbnail is uploaded to:
 *   `submissions/<submissionId>/thumbnails/thumb_<index>.jpg`
 *
 * The default thumbnail (`thumbnail.jpg`) is set to the one closest to 1 second.
 *
 * @param submissionId  The UUID of the submission.
 * @param videoKey      The S3 key of the source video (raw or transcoded).
 * @returns             Array of generated thumbnail metadata.
 */
export async function generateThumbnails(
  submissionId: string,
  videoKey: string,
): Promise<ThumbnailResult[]> {
  let tempDir: string | undefined;

  try {
    // Prepare temp workspace
    const tempBase = path.join(os.tmpdir(), 'thumbnails');
    await fs.mkdir(tempBase, { recursive: true });
    tempDir = await fs.mkdtemp(path.join(tempBase, `${submissionId}-`));

    const rawVideoPath = path.join(tempDir, 'source.mp4');

    // Download source video
    await downloadFromS3(videoKey, rawVideoPath);

    // Get video duration so we don't try to capture beyond the end
    const info = await getVideoInfo(rawVideoPath);

    // Determine valid timestamps
    const validTimestamps = THUMBNAIL_TIMESTAMPS
      .filter((t) => t < info.duration)
      .slice(0, MAX_THUMBNAILS);

    // If the video is very short, at least capture at 0 seconds
    if (validTimestamps.length === 0) {
      validTimestamps.push(0);
    }

    const results: ThumbnailResult[] = [];
    const s3Prefix = `submissions/${submissionId}/thumbnails`;

    for (let i = 0; i < validTimestamps.length; i++) {
      const timestamp = validTimestamps[i];
      const filename = `thumb_${i}.jpg`;
      const localPath = path.join(tempDir, filename);
      const s3Key = `${s3Prefix}/${filename}`;

      await generateThumbnail(rawVideoPath, localPath, timestamp);
      await uploadToS3(localPath, s3Key, 'image/jpeg');

      results.push({
        index: i,
        timestamp,
        url: getCdnUrl(s3Key),
        key: s3Key,
      });
    }

    // Also upload the default thumbnail (at ~1 second or the first available)
    const defaultResult =
      results.find((r) => r.timestamp === 1) || results[0];

    if (defaultResult) {
      const defaultKey = `submissions/${submissionId}/thumbnail.jpg`;
      const defaultLocalPath = path.join(
        tempDir,
        `thumb_${defaultResult.index}.jpg`,
      );
      await uploadToS3(defaultLocalPath, defaultKey, 'image/jpeg');

      // Update the submission record
      await db('submissions')
        .where({ id: submissionId })
        .update({
          thumbnail_url: getCdnUrl(defaultKey),
          updated_at: db.fn.now(),
        });
    }

    logger.info('Thumbnail generation completed', {
      submissionId,
      count: results.length,
    });

    return results;
  } catch (error) {
    logger.error('Thumbnail generation failed', {
      submissionId,
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir);
    }
  }
}
