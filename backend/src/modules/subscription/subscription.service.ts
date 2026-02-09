import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SubscriptionPlan {
  id: string;
  name: string;
  apple_product_id: string | null;
  google_product_id: string | null;
  price_usd: number;
  duration_months: number;
  is_active: boolean;
  features: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  platform: 'apple' | 'google';
  platform_subscription_id: string;
  receipt_data: string | null;
  status: 'active' | 'cancelled' | 'expired' | 'grace_period' | 'billing_retry';
  starts_at: Date;
  expires_at: Date;
  cancelled_at: Date | null;
  is_auto_renewing: boolean;
  created_at: Date;
  updated_at: Date;
}

interface AppleReceiptResponse {
  status: number;
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    expires_date_ms: string;
    is_in_intro_offer_period?: string;
    is_trial_period?: string;
    cancellation_date_ms?: string;
  }>;
  pending_renewal_info?: Array<{
    auto_renew_status: string;
    product_id: string;
    original_transaction_id: string;
  }>;
}

interface GoogleReceiptResponse {
  orderId: string;
  packageName: string;
  productId: string;
  purchaseToken: string;
  expiryTimeMillis: string;
  autoRenewing: boolean;
  paymentState?: number;
  cancelReason?: number;
}

interface VerifyReceiptResult {
  subscription: UserSubscription;
  is_new: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_KEY_PLANS = 'subscription:plans';
const CACHE_TTL_PLANS = 3600; // 1 hour

const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

// ---------------------------------------------------------------------------
// Helper: Verify Apple Receipt
// ---------------------------------------------------------------------------

async function verifyAppleReceipt(receiptData: string): Promise<{
  productId: string;
  platformSubscriptionId: string;
  expiresAt: Date;
  isAutoRenewing: boolean;
  isCancelled: boolean;
}> {
  const sharedSecret = process.env.APPLE_SHARED_SECRET;
  if (!sharedSecret) {
    throw new AppError('Apple shared secret is not configured', 500, 'CONFIG_ERROR');
  }

  const payload = {
    'receipt-data': receiptData,
    password: sharedSecret,
    'exclude-old-transactions': true,
  };

  // Try production first, then sandbox
  let response = await fetch(APPLE_VERIFY_URL_PRODUCTION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let result = await response.json() as AppleReceiptResponse;

  // Status 21007 means this is a sandbox receipt
  if (result.status === 21007) {
    response = await fetch(APPLE_VERIFY_URL_SANDBOX, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    result = await response.json() as AppleReceiptResponse;
  }

  if (result.status !== 0) {
    logger.warn('Apple receipt verification failed', { status: result.status });
    throw new ValidationError('Invalid receipt', [
      { field: 'receipt_data', message: `Apple verification failed with status ${result.status}` },
    ]);
  }

  const latestReceipt = result.latest_receipt_info?.[0];
  if (!latestReceipt) {
    throw new ValidationError('Invalid receipt', [
      { field: 'receipt_data', message: 'No subscription info found in receipt' },
    ]);
  }

  const pendingRenewal = result.pending_renewal_info?.find(
    (r) => r.original_transaction_id === latestReceipt.original_transaction_id,
  );

  return {
    productId: latestReceipt.product_id,
    platformSubscriptionId: latestReceipt.original_transaction_id,
    expiresAt: new Date(parseInt(latestReceipt.expires_date_ms, 10)),
    isAutoRenewing: pendingRenewal?.auto_renew_status === '1',
    isCancelled: !!latestReceipt.cancellation_date_ms,
  };
}

// ---------------------------------------------------------------------------
// Helper: Verify Google Receipt
// ---------------------------------------------------------------------------

async function verifyGoogleReceipt(receiptData: string): Promise<{
  productId: string;
  platformSubscriptionId: string;
  expiresAt: Date;
  isAutoRenewing: boolean;
  isCancelled: boolean;
}> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new AppError('Google service account key is not configured', 500, 'CONFIG_ERROR');
  }

  let parsed: { packageName: string; productId: string; purchaseToken: string };
  try {
    parsed = JSON.parse(receiptData);
  } catch {
    throw new ValidationError('Invalid receipt', [
      { field: 'receipt_data', message: 'Receipt data must be valid JSON for Google Play' },
    ]);
  }

  const { packageName, productId, purchaseToken } = parsed;

  if (!packageName || !productId || !purchaseToken) {
    throw new ValidationError('Invalid receipt', [
      { field: 'receipt_data', message: 'Missing packageName, productId, or purchaseToken' },
    ]);
  }

  // Get OAuth2 access token from service account
  const accessToken = await getGoogleAccessToken(serviceAccountKey);

  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.warn('Google receipt verification failed', { status: response.status, body: errorBody });
    throw new ValidationError('Invalid receipt', [
      { field: 'receipt_data', message: 'Google Play verification failed' },
    ]);
  }

  const result = await response.json() as GoogleReceiptResponse;

  return {
    productId: result.productId || productId,
    platformSubscriptionId: result.orderId,
    expiresAt: new Date(parseInt(result.expiryTimeMillis, 10)),
    isAutoRenewing: result.autoRenewing,
    isCancelled: result.cancelReason !== undefined,
  };
}

/**
 * Obtains a Google OAuth2 access token using a service account key.
 */
async function getGoogleAccessToken(serviceAccountKeyJson: string): Promise<string> {
  const cacheKey = 'google:access_token';
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  let serviceAccount: { client_email: string; private_key: string; token_uri: string };
  try {
    serviceAccount = JSON.parse(serviceAccountKeyJson);
  } catch {
    throw new AppError('Invalid Google service account key JSON', 500, 'CONFIG_ERROR');
  }

  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const jwtClaim = Buffer.from(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: serviceAccount.token_uri || 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');

  const crypto = await import('crypto');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${jwtHeader}.${jwtClaim}`);
  const signature = signer.sign(serviceAccount.private_key, 'base64url');

  const jwt = `${jwtHeader}.${jwtClaim}.${signature}`;

  const tokenUrl = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new AppError('Failed to obtain Google access token', 500, 'GOOGLE_AUTH_ERROR');
  }

  const data = await response.json() as { access_token: string; expires_in: number };

  // Cache the token with a small buffer before expiry
  await redis.set(cacheKey, data.access_token, 'EX', data.expires_in - 60);

  return data.access_token;
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Returns all active subscription plans, with Redis caching.
 */
export async function getPlans(): Promise<SubscriptionPlan[]> {
  const cached = await redis.get(CACHE_KEY_PLANS);
  if (cached) {
    return JSON.parse(cached);
  }

  const plans = await db('subscription_plans')
    .where('is_active', true)
    .orderBy('price_usd', 'asc')
    .select('*');

  await redis.set(CACHE_KEY_PLANS, JSON.stringify(plans), 'EX', CACHE_TTL_PLANS);

  return plans;
}

/**
 * Verifies an in-app purchase receipt and creates/updates the user subscription.
 */
export async function verifyReceipt(
  userId: string,
  platform: 'apple' | 'google',
  receiptData: string,
): Promise<VerifyReceiptResult> {
  // Verify with the platform
  const verification = platform === 'apple'
    ? await verifyAppleReceipt(receiptData)
    : await verifyGoogleReceipt(receiptData);

  if (verification.isCancelled) {
    throw new ValidationError('Receipt verification failed', [
      { field: 'receipt_data', message: 'This subscription has been cancelled or refunded' },
    ]);
  }

  // Find the matching plan by product ID
  const productIdColumn = platform === 'apple' ? 'apple_product_id' : 'google_product_id';
  const plan = await db('subscription_plans')
    .where(productIdColumn, verification.productId)
    .where('is_active', true)
    .first();

  if (!plan) {
    throw new NotFoundError('Subscription plan', verification.productId);
  }

  const platformSubscriptionId = verification.platformSubscriptionId;

  // Check if subscription already exists
  const existing = await db('user_subscriptions')
    .where('user_id', userId)
    .where('platform_subscription_id', platformSubscriptionId)
    .first();

  let subscription: UserSubscription;
  let isNew: boolean;

  if (existing) {
    // Update existing subscription
    [subscription] = await db('user_subscriptions')
      .where('id', existing.id)
      .update({
        plan_id: plan.id,
        receipt_data: receiptData,
        status: 'active',
        expires_at: verification.expiresAt,
        is_auto_renewing: verification.isAutoRenewing,
        cancelled_at: null,
        updated_at: db.fn.now(),
      })
      .returning('*');

    isNew = false;
  } else {
    // Create new subscription
    [subscription] = await db('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        platform,
        platform_subscription_id: platformSubscriptionId,
        receipt_data: receiptData,
        status: 'active',
        starts_at: new Date(),
        expires_at: verification.expiresAt,
        is_auto_renewing: verification.isAutoRenewing,
      })
      .returning('*');

    isNew = true;
  }

  // Update user subscription tier
  await db('users')
    .where('id', userId)
    .update({
      subscription_tier: 'pro',
      subscription_expires_at: verification.expiresAt,
      updated_at: db.fn.now(),
    });

  // Invalidate cached user data
  await redis.del(`user:${userId}`);

  logger.info('Subscription verified', {
    userId,
    platform,
    planId: plan.id,
    isNew,
    expiresAt: verification.expiresAt,
  });

  return { subscription, is_new: isNew };
}

/**
 * Returns the current subscription status for a user.
 */
export async function getStatus(userId: string): Promise<{
  has_active_subscription: boolean;
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
}> {
  const subscription = await db('user_subscriptions')
    .where('user_id', userId)
    .whereIn('status', ['active', 'grace_period', 'billing_retry'])
    .orderBy('expires_at', 'desc')
    .first();

  if (!subscription) {
    return {
      has_active_subscription: false,
      subscription: null,
      plan: null,
    };
  }

  const plan = subscription.plan_id
    ? await db('subscription_plans').where('id', subscription.plan_id).first()
    : null;

  return {
    has_active_subscription: true,
    subscription,
    plan,
  };
}

/**
 * Cancels a user subscription (marks it as cancelled but keeps it active until expiry).
 */
export async function cancelSubscription(
  userId: string,
  subscriptionId: string,
): Promise<UserSubscription> {
  const subscription = await db('user_subscriptions')
    .where('id', subscriptionId)
    .where('user_id', userId)
    .first();

  if (!subscription) {
    throw new NotFoundError('Subscription', subscriptionId);
  }

  if (subscription.status === 'cancelled' || subscription.status === 'expired') {
    throw new ValidationError('Cannot cancel subscription', [
      { field: 'id', message: `Subscription is already ${subscription.status}` },
    ]);
  }

  const [updated] = await db('user_subscriptions')
    .where('id', subscriptionId)
    .update({
      status: 'cancelled',
      is_auto_renewing: false,
      cancelled_at: new Date(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  logger.info('Subscription cancelled', { userId, subscriptionId });

  return updated;
}

/**
 * Restores purchases from a receipt (e.g., after reinstalling the app).
 */
export async function restorePurchases(
  userId: string,
  platform: 'apple' | 'google',
  receiptData: string,
): Promise<VerifyReceiptResult> {
  // Restore is essentially the same as verify -- re-verify the receipt
  // and create/update the subscription record for this user.
  return verifyReceipt(userId, platform, receiptData);
}

/**
 * Handles webhook notifications from Apple (Server Notifications V2).
 */
export async function handleWebhook(
  platform: 'apple' | 'google',
  payload: Record<string, unknown>,
): Promise<void> {
  if (platform === 'apple') {
    await handleAppleWebhook(payload);
  } else {
    await handleGoogleWebhook(payload);
  }
}

async function handleAppleWebhook(payload: Record<string, unknown>): Promise<void> {
  const notificationType = payload.notification_type as string;
  const signedTransactionInfo = payload.data as Record<string, unknown> | undefined;

  logger.info('Apple webhook received', { notificationType });

  const originalTransactionId =
    (signedTransactionInfo?.original_transaction_id as string) ||
    (payload.original_transaction_id as string);

  if (!originalTransactionId) {
    logger.warn('Apple webhook missing original_transaction_id', { payload });
    return;
  }

  const subscription = await db('user_subscriptions')
    .where('platform', 'apple')
    .where('platform_subscription_id', originalTransactionId)
    .first();

  if (!subscription) {
    logger.warn('Apple webhook: subscription not found', { originalTransactionId });
    return;
  }

  switch (notificationType) {
    case 'DID_RENEW':
    case 'SUBSCRIBED': {
      const expiresDateMs =
        (signedTransactionInfo?.expires_date_ms as string) ||
        (payload.expires_date_ms as string);
      const expiresAt = expiresDateMs
        ? new Date(parseInt(expiresDateMs, 10))
        : subscription.expires_at;

      await db('user_subscriptions')
        .where('id', subscription.id)
        .update({
          status: 'active',
          expires_at: expiresAt,
          is_auto_renewing: true,
          updated_at: db.fn.now(),
        });

      await db('users')
        .where('id', subscription.user_id)
        .update({
          subscription_tier: 'pro',
          subscription_expires_at: expiresAt,
          updated_at: db.fn.now(),
        });

      await redis.del(`user:${subscription.user_id}`);
      logger.info('Apple subscription renewed', { subscriptionId: subscription.id });
      break;
    }

    case 'DID_FAIL_TO_RENEW':
    case 'GRACE_PERIOD_EXPIRED': {
      await db('user_subscriptions')
        .where('id', subscription.id)
        .update({
          status: notificationType === 'DID_FAIL_TO_RENEW' ? 'billing_retry' : 'expired',
          is_auto_renewing: false,
          updated_at: db.fn.now(),
        });

      if (notificationType === 'GRACE_PERIOD_EXPIRED') {
        await db('users')
          .where('id', subscription.user_id)
          .update({
            subscription_tier: 'free',
            subscription_expires_at: null,
            updated_at: db.fn.now(),
          });
      }

      await redis.del(`user:${subscription.user_id}`);
      logger.info('Apple subscription billing issue', {
        subscriptionId: subscription.id,
        type: notificationType,
      });
      break;
    }

    case 'CANCEL':
    case 'REFUND':
    case 'REVOKE': {
      await db('user_subscriptions')
        .where('id', subscription.id)
        .update({
          status: 'cancelled',
          is_auto_renewing: false,
          cancelled_at: new Date(),
          updated_at: db.fn.now(),
        });

      await db('users')
        .where('id', subscription.user_id)
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          updated_at: db.fn.now(),
        });

      await redis.del(`user:${subscription.user_id}`);
      logger.info('Apple subscription cancelled/refunded', {
        subscriptionId: subscription.id,
        type: notificationType,
      });
      break;
    }

    default:
      logger.info('Apple webhook unhandled notification type', { notificationType });
  }
}

async function handleGoogleWebhook(payload: Record<string, unknown>): Promise<void> {
  const message = payload.message as Record<string, unknown> | undefined;
  if (!message?.data) {
    logger.warn('Google webhook: missing message data');
    return;
  }

  let notification: Record<string, unknown>;
  try {
    const decoded = Buffer.from(message.data as string, 'base64').toString('utf-8');
    notification = JSON.parse(decoded);
  } catch {
    logger.warn('Google webhook: failed to decode message data');
    return;
  }

  const subscriptionNotification = notification.subscriptionNotification as
    | Record<string, unknown>
    | undefined;
  if (!subscriptionNotification) {
    logger.info('Google webhook: not a subscription notification');
    return;
  }

  const notificationType = subscriptionNotification.notificationType as number;
  const purchaseToken = subscriptionNotification.purchaseToken as string;

  logger.info('Google webhook received', { notificationType, purchaseToken });

  // Find subscription by looking up receipt data that contains this purchase token
  const subscription = await db('user_subscriptions')
    .where('platform', 'google')
    .whereRaw("receipt_data::text LIKE ?", [`%${purchaseToken}%`])
    .first();

  if (!subscription) {
    logger.warn('Google webhook: subscription not found', { purchaseToken });
    return;
  }

  // Google notification types:
  // 1: RECOVERED, 2: RENEWED, 3: CANCELED, 4: PURCHASED,
  // 5: ON_HOLD, 6: IN_GRACE_PERIOD, 7: RESTARTED,
  // 12: REVOKED, 13: EXPIRED
  switch (notificationType) {
    case 1: // RECOVERED
    case 2: // RENEWED
    case 4: // PURCHASED
    case 7: { // RESTARTED
      // Re-verify to get updated expiry
      try {
        if (subscription.receipt_data) {
          const verification = await verifyGoogleReceipt(subscription.receipt_data);
          await db('user_subscriptions')
            .where('id', subscription.id)
            .update({
              status: 'active',
              expires_at: verification.expiresAt,
              is_auto_renewing: verification.isAutoRenewing,
              updated_at: db.fn.now(),
            });

          await db('users')
            .where('id', subscription.user_id)
            .update({
              subscription_tier: 'pro',
              subscription_expires_at: verification.expiresAt,
              updated_at: db.fn.now(),
            });
        }
      } catch (err) {
        logger.error('Google webhook: failed to re-verify receipt', { error: err });
      }

      await redis.del(`user:${subscription.user_id}`);
      break;
    }

    case 3: // CANCELED
    case 12: { // REVOKED
      await db('user_subscriptions')
        .where('id', subscription.id)
        .update({
          status: 'cancelled',
          is_auto_renewing: false,
          cancelled_at: new Date(),
          updated_at: db.fn.now(),
        });

      await db('users')
        .where('id', subscription.user_id)
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          updated_at: db.fn.now(),
        });

      await redis.del(`user:${subscription.user_id}`);
      break;
    }

    case 5: // ON_HOLD
    case 6: { // IN_GRACE_PERIOD
      await db('user_subscriptions')
        .where('id', subscription.id)
        .update({
          status: notificationType === 6 ? 'grace_period' : 'billing_retry',
          updated_at: db.fn.now(),
        });

      await redis.del(`user:${subscription.user_id}`);
      break;
    }

    case 13: { // EXPIRED
      await db('user_subscriptions')
        .where('id', subscription.id)
        .update({
          status: 'expired',
          is_auto_renewing: false,
          updated_at: db.fn.now(),
        });

      await db('users')
        .where('id', subscription.user_id)
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          updated_at: db.fn.now(),
        });

      await redis.del(`user:${subscription.user_id}`);
      break;
    }

    default:
      logger.info('Google webhook unhandled notification type', { notificationType });
  }
}

/**
 * Cron job: checks for expired subscriptions and downgrades users.
 */
export async function checkExpired(): Promise<number> {
  const now = new Date();

  // Find active subscriptions that have expired
  const expiredSubscriptions = await db('user_subscriptions')
    .whereIn('status', ['active', 'grace_period', 'billing_retry'])
    .where('expires_at', '<', now)
    .where('is_auto_renewing', false)
    .select('id', 'user_id');

  if (expiredSubscriptions.length === 0) {
    return 0;
  }

  const subscriptionIds = expiredSubscriptions.map((s: { id: string }) => s.id);
  const userIds = [...new Set(expiredSubscriptions.map((s: { user_id: string }) => s.user_id))];

  // Mark subscriptions as expired
  await db('user_subscriptions')
    .whereIn('id', subscriptionIds)
    .update({
      status: 'expired',
      updated_at: db.fn.now(),
    });

  // For each user, check if they have any other active subscription
  for (const userId of userIds) {
    const activeSubscription = await db('user_subscriptions')
      .where('user_id', userId)
      .where('status', 'active')
      .where('expires_at', '>', now)
      .first();

    if (!activeSubscription) {
      await db('users')
        .where('id', userId)
        .update({
          subscription_tier: 'free',
          subscription_expires_at: null,
          updated_at: db.fn.now(),
        });

      await redis.del(`user:${userId}`);
    }
  }

  logger.info('Expired subscriptions processed', {
    count: expiredSubscriptions.length,
    userIds,
  });

  return expiredSubscriptions.length;
}
