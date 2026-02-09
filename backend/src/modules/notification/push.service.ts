import admin from 'firebase-admin';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
// notification.service imported if needed for preference checks

// ---------------------------------------------------------------------------
// Firebase initialization
// ---------------------------------------------------------------------------

/**
 * Initialize Firebase Admin SDK if not already initialized.
 * Expects FIREBASE_SERVICE_ACCOUNT_KEY env var with the JSON key, or
 * GOOGLE_APPLICATION_CREDENTIALS pointing to the key file.
 */
function ensureFirebaseInitialized(): void {
  if (admin.apps.length > 0) return;

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    logger.info('Firebase Admin SDK initialized');
  } catch (err) {
    logger.error('Failed to initialize Firebase Admin SDK', { error: err });
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: string;
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Sends a push notification to a single user across all their registered
 * devices. Checks notification preferences before sending.
 */
export async function sendPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  ensureFirebaseInitialized();

  // Get user's active push tokens
  const tokens: PushToken[] = await db('push_tokens')
    .where('user_id', userId)
    .select('*');

  if (tokens.length === 0) {
    logger.debug('Push skipped: no registered devices', { userId });
    return;
  }

  const tokenStrings = tokens.map((t) => t.token);

  await sendToTokens(tokenStrings, { title, body, data }, userId);
}

/**
 * Sends a push notification to multiple users.
 * Batches the tokens and sends in groups of 500 (FCM limit).
 */
export async function sendPushToMany(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  ensureFirebaseInitialized();

  if (userIds.length === 0) return;

  // Get all push tokens for users who have push enabled
  const usersWithPush = await db('notification_preferences')
    .whereIn('user_id', userIds)
    .andWhere('push_enabled', true)
    .select('user_id');

  const enabledUserIds = usersWithPush.map((u: any) => u.user_id);

  // Also include users who don't have preferences yet (defaults to enabled)
  const usersWithPrefs = new Set(
    (
      await db('notification_preferences')
        .whereIn('user_id', userIds)
        .select('user_id')
    ).map((u: any) => u.user_id),
  );

  const usersWithoutPrefs = userIds.filter((id) => !usersWithPrefs.has(id));
  const finalUserIds = [...enabledUserIds, ...usersWithoutPrefs];

  if (finalUserIds.length === 0) {
    logger.debug('Bulk push skipped: no eligible users');
    return;
  }

  const tokens: PushToken[] = await db('push_tokens')
    .whereIn('user_id', finalUserIds)
    .select('*');

  if (tokens.length === 0) {
    logger.debug('Bulk push skipped: no registered devices');
    return;
  }

  const tokenStrings = tokens.map((t) => t.token);

  // FCM allows up to 500 tokens per batch
  const BATCH_SIZE = 500;
  for (let i = 0; i < tokenStrings.length; i += BATCH_SIZE) {
    const batch = tokenStrings.slice(i, i + BATCH_SIZE);
    await sendToTokens(batch, { title, body, data });
  }
}

/**
 * Registers a device push token for a user.
 * Upserts to handle re-registration of the same token.
 */
export async function registerDevice(
  userId: string,
  token: string,
  platform: string,
): Promise<void> {
  // Check if this token already exists for this user
  const existing = await db('push_tokens')
    .where({ user_id: userId, token })
    .first('id');

  if (existing) {
    // Update the platform and timestamp
    await db('push_tokens')
      .where('id', existing.id)
      .update({
        platform,
        updated_at: db.fn.now(),
      });
  } else {
    // Remove the token from any other user (device transferred)
    await db('push_tokens').where('token', token).delete();

    await db('push_tokens').insert({
      user_id: userId,
      token,
      platform,
    });
  }

  logger.info('Push device registered', { userId, platform });
}

/**
 * Removes a push token for a user.
 */
export async function unregisterDevice(
  userId: string,
  token: string,
): Promise<void> {
  const deleted = await db('push_tokens')
    .where({ user_id: userId, token })
    .delete();

  if (deleted) {
    logger.info('Push device unregistered', { userId });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Sends a multicast FCM message to an array of device tokens.
 * Cleans up invalid tokens that FCM reports as unregistered.
 */
async function sendToTokens(
  tokens: string[],
  payload: PushPayload,
  userId?: string,
): Promise<void> {
  if (tokens.length === 0) return;

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    logger.info('Push notification sent', {
      userId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];

      response.responses.forEach((resp, index) => {
        if (
          !resp.success &&
          resp.error &&
          (resp.error.code === 'messaging/registration-token-not-registered' ||
            resp.error.code === 'messaging/invalid-registration-token')
        ) {
          invalidTokens.push(tokens[index]);
        }
      });

      if (invalidTokens.length > 0) {
        await db('push_tokens')
          .whereIn('token', invalidTokens)
          .delete();

        logger.info('Cleaned up invalid push tokens', {
          count: invalidTokens.length,
        });
      }
    }
  } catch (err) {
    logger.error('Failed to send push notification', {
      error: err,
      userId,
      tokenCount: tokens.length,
    });
  }
}
