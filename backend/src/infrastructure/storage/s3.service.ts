import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, s3Config } from '../../config/s3';
import { logger } from '../../config/logger';
import { AppError } from '../../shared/errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PresignedUploadResult {
  url: string;
  key: string;
}

export interface ObjectMetadata {
  contentType: string | undefined;
  contentLength: number | undefined;
  lastModified: Date | undefined;
  eTag: string | undefined;
}

// ---------------------------------------------------------------------------
// Default expiration for presigned URLs (seconds)
// ---------------------------------------------------------------------------

const DEFAULT_UPLOAD_EXPIRES = 15 * 60; // 15 minutes
const DEFAULT_DOWNLOAD_EXPIRES = 60 * 60; // 1 hour

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Generates a presigned URL that clients can use to upload directly to S3.
 *
 * @param key          The S3 object key (e.g. `submissions/<id>/raw.mp4`).
 * @param contentType  The expected MIME type of the uploaded file.
 * @param expiresIn    URL validity in seconds (defaults to 15 minutes).
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = DEFAULT_UPLOAD_EXPIRES,
): Promise<PresignedUploadResult> {
  try {
    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    logger.debug('Generated presigned upload URL', { key, contentType, expiresIn });

    return { url, key };
  } catch (error) {
    logger.error('Failed to generate presigned upload URL', {
      key,
      error: (error as Error).message,
    });
    throw new AppError('Failed to generate upload URL', 500, 'S3_PRESIGN_ERROR');
  }
}

/**
 * Generates a presigned URL for downloading / streaming an S3 object.
 *
 * @param key        The S3 object key.
 * @param expiresIn  URL validity in seconds (defaults to 1 hour).
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = DEFAULT_DOWNLOAD_EXPIRES,
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    logger.debug('Generated presigned download URL', { key, expiresIn });

    return url;
  } catch (error) {
    logger.error('Failed to generate presigned download URL', {
      key,
      error: (error as Error).message,
    });
    throw new AppError('Failed to generate download URL', 500, 'S3_PRESIGN_ERROR');
  }
}

/**
 * Deletes a single object from S3.
 *
 * @param key  The S3 object key to delete.
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    await s3Client.send(command);

    logger.debug('Deleted S3 object', { key });
  } catch (error) {
    logger.error('Failed to delete S3 object', {
      key,
      error: (error as Error).message,
    });
    throw new AppError('Failed to delete object', 500, 'S3_DELETE_ERROR');
  }
}

/**
 * Retrieves metadata for an S3 object without downloading its body.
 *
 * @param key  The S3 object key.
 */
export async function headObject(key: string): Promise<ObjectMetadata> {
  try {
    const command = new HeadObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      eTag: response.ETag,
    };
  } catch (error) {
    logger.error('Failed to head S3 object', {
      key,
      error: (error as Error).message,
    });
    throw new AppError('Failed to retrieve object metadata', 500, 'S3_HEAD_ERROR');
  }
}
