import { s3Config } from '../../config/s3';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * CDN base URL. Falls back to the S3/MinIO endpoint when not configured.
 */
const CDN_BASE_URL = (
  process.env.CDN_BASE_URL || s3Config.cdnBaseUrl
).replace(/\/+$/, ''); // strip trailing slashes

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Converts an S3 object key to a publicly-accessible CDN URL.
 *
 * @param key  The S3 object key (e.g. `submissions/<id>/hls/master.m3u8`).
 * @returns    The full CDN URL for the object.
 */
export function getCdnUrl(key: string): string {
  // Ensure the key does not start with a slash to avoid double-slash in URL
  const sanitizedKey = key.replace(/^\/+/, '');
  return `${CDN_BASE_URL}/${sanitizedKey}`;
}

/**
 * Returns the CDN URL for a video at a specific quality level.
 *
 * The convention is:
 *   submissions/<submissionId>/hls/<quality>/playlist.m3u8  (HLS)
 *   submissions/<submissionId>/mp4/<quality>.mp4              (MP4 fallback)
 *
 * For the HLS master playlist, pass `quality = 'master'`.
 *
 * @param submissionId  The submission UUID.
 * @param quality       Quality label (e.g. `'720p'`, `'480p'`, `'master'`).
 */
export function getVideoUrl(submissionId: string, quality: string): string {
  if (quality === 'master') {
    return getCdnUrl(`submissions/${submissionId}/hls/master.m3u8`);
  }

  // Default to HLS variant playlist
  return getCdnUrl(`submissions/${submissionId}/hls/${quality}/playlist.m3u8`);
}

/**
 * Returns the CDN URL for a submission's thumbnail image.
 *
 * @param submissionId  The submission UUID.
 */
export function getThumbnailUrl(submissionId: string): string {
  return getCdnUrl(`submissions/${submissionId}/thumbnail.jpg`);
}
