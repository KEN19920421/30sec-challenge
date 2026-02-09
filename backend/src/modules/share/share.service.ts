import crypto from 'crypto';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHARE_BASE_URL = process.env.SHARE_BASE_URL || 'https://app.example.com';
const SHORT_CODE_LENGTH = 8;
const SHORT_CODE_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year
const SHARE_PREFIX = 'share:';
const METADATA_CACHE_TTL = 300; // 5 minutes
const METADATA_CACHE_PREFIX = 'share_meta:';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShareUrl {
  short_code: string;
  url: string;
  submission_id: string;
}

export interface ShareMetadata {
  title: string;
  description: string;
  image_url: string | null;
  url: string;
  submission_id: string;
  user: {
    display_name: string;
    username: string;
  };
  challenge: {
    title: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a URL-safe random short code.
 */
function generateShortCode(): string {
  return crypto
    .randomBytes(Math.ceil(SHORT_CODE_LENGTH * 0.75))
    .toString('base64url')
    .slice(0, SHORT_CODE_LENGTH);
}

/**
 * Returns the Redis key for a short code mapping.
 */
function shareKey(shortCode: string): string {
  return `${SHARE_PREFIX}${shortCode}`;
}

/**
 * Returns the Redis key for a submission's existing share code (reverse lookup).
 */
function reverseShareKey(submissionId: string): string {
  return `${SHARE_PREFIX}rev:${submissionId}`;
}

/**
 * Returns the Redis key for share metadata cache.
 */
function metadataCacheKey(submissionId: string): string {
  return `${METADATA_CACHE_PREFIX}${submissionId}`;
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Generates (or retrieves an existing) short URL for a submission.
 *
 * The mapping shortCode -> submissionId is stored in Redis with a 1-year TTL.
 * A reverse mapping submissionId -> shortCode is also kept so the same
 * submission always returns the same URL.
 *
 * @throws NotFoundError if the submission does not exist.
 */
export async function generateShareUrl(submissionId: string): Promise<ShareUrl> {
  // Verify submission exists
  const submission = await db('submissions')
    .where('id', submissionId)
    .whereNull('deleted_at')
    .first('id');

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  // Check if this submission already has a share code
  const existingCode = await redis.get(reverseShareKey(submissionId));

  if (existingCode) {
    // Refresh TTL on both keys
    await redis.expire(shareKey(existingCode), SHORT_CODE_TTL_SECONDS);
    await redis.expire(reverseShareKey(submissionId), SHORT_CODE_TTL_SECONDS);

    return {
      short_code: existingCode,
      url: `${SHARE_BASE_URL}/s/${existingCode}`,
      submission_id: submissionId,
    };
  }

  // Generate a unique short code
  let shortCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    shortCode = generateShortCode();
    // Check for collision
    const exists = await redis.exists(shareKey(shortCode));
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    logger.error('Failed to generate unique short code after max attempts', { submissionId });
    throw new Error('Unable to generate unique share URL. Please try again.');
  }

  // Store the mapping (short code -> submission ID) and reverse mapping
  const pipeline = redis.pipeline();
  pipeline.set(shareKey(shortCode), submissionId, 'EX', SHORT_CODE_TTL_SECONDS);
  pipeline.set(reverseShareKey(submissionId), shortCode, 'EX', SHORT_CODE_TTL_SECONDS);
  await pipeline.exec();

  logger.info('Share URL generated', { shortCode, submissionId });

  return {
    short_code: shortCode,
    url: `${SHARE_BASE_URL}/s/${shortCode}`,
    submission_id: submissionId,
  };
}

/**
 * Resolves a short code back to the submission data.
 *
 * @throws NotFoundError if the short code is invalid or the submission no longer exists.
 */
export async function resolveShareUrl(
  shortCode: string,
): Promise<Record<string, unknown>> {
  const submissionId = await redis.get(shareKey(shortCode));

  if (!submissionId) {
    throw new NotFoundError('Share link', shortCode);
  }

  const submission = await db('submissions')
    .select(
      'submissions.id',
      'submissions.user_id',
      'submissions.challenge_id',
      'submissions.video_url',
      'submissions.thumbnail_url',
      'submissions.caption',
      'submissions.vote_count',
      'submissions.created_at',
      'users.username',
      'users.display_name',
      'users.avatar_url',
      'challenges.title as challenge_title',
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .leftJoin('challenges', 'submissions.challenge_id', 'challenges.id')
    .where('submissions.id', submissionId)
    .whereNull('submissions.deleted_at')
    .first();

  if (!submission) {
    // Clean up the stale mapping
    await redis.del(shareKey(shortCode));
    throw new NotFoundError('Submission', submissionId);
  }

  return submission;
}

/**
 * Returns Open Graph metadata for social media previews.
 *
 * Includes the submission's thumbnail, the user's display name, and the
 * challenge title -- everything a social platform needs to render a rich card.
 *
 * Results are cached in Redis for 5 minutes.
 *
 * @throws NotFoundError if the submission does not exist.
 */
export async function getShareMetadata(
  submissionId: string,
): Promise<ShareMetadata> {
  // Check cache
  const cached = await redis.get(metadataCacheKey(submissionId));
  if (cached) {
    return JSON.parse(cached);
  }

  const submission = await db('submissions')
    .select(
      'submissions.id',
      'submissions.thumbnail_url',
      'submissions.caption',
      'submissions.challenge_id',
      'users.display_name',
      'users.username',
      'challenges.title as challenge_title',
    )
    .leftJoin('users', 'submissions.user_id', 'users.id')
    .leftJoin('challenges', 'submissions.challenge_id', 'challenges.id')
    .where('submissions.id', submissionId)
    .whereNull('submissions.deleted_at')
    .first();

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  // Build the description
  const challengePart = submission.challenge_title
    ? ` for "${submission.challenge_title}"`
    : '';
  const captionPart = submission.caption
    ? ` - ${submission.caption}`
    : '';
  const description = `${submission.display_name}'s submission${challengePart}${captionPart}`;

  // Determine the share URL (use existing or fall back to direct link)
  const existingCode = await redis.get(reverseShareKey(submissionId));
  const url = existingCode
    ? `${SHARE_BASE_URL}/s/${existingCode}`
    : `${SHARE_BASE_URL}/submissions/${submissionId}`;

  const metadata: ShareMetadata = {
    title: submission.challenge_title
      ? `${submission.display_name} - ${submission.challenge_title}`
      : `${submission.display_name}'s Video`,
    description,
    image_url: submission.thumbnail_url || null,
    url,
    submission_id: submissionId,
    user: {
      display_name: submission.display_name,
      username: submission.username,
    },
    challenge: submission.challenge_title
      ? { title: submission.challenge_title }
      : null,
  };

  // Cache the metadata
  await redis.set(
    metadataCacheKey(submissionId),
    JSON.stringify(metadata),
    'EX',
    METADATA_CACHE_TTL,
  );

  return metadata;
}
