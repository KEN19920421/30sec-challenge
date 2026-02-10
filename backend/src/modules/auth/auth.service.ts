import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  AuthenticationError,
  NotFoundError,
} from '../../shared/errors';
import { generateTokenPair, verifyRefreshToken } from './token.service';
import type { TokenPair } from './token.service';
import { verifyGoogleToken } from './google.strategy';
import { verifyAppleToken } from './apple.strategy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Row shape for the `users` table (selected columns). */
interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  subscription_tier: string;
  created_at: Date;
  updated_at: Date;
}

/** User data returned to API consumers (never includes password_hash). */
export interface SanitizedUser {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  subscription_tier: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthResult {
  user: SanitizedUser;
  tokens: TokenPair;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_BLACKLIST_PREFIX = 'token_blacklist:';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a duration string (e.g. '7d', '24h', '30m', '120s') into seconds.
 * Falls back to 7 days (604800) if the format is unrecognised.
 */
function parseDurationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 604800; // default 7 days
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 604800;
  }
}

/**
 * Adds a refresh token to the Redis blacklist with a TTL matching the maximum
 * refresh token lifetime so that entries automatically expire.
 */
async function blacklistToken(token: string): Promise<void> {
  const ttl = parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRES_IN || '7d');
  await redis.set(`${TOKEN_BLACKLIST_PREFIX}${token}`, '1', 'EX', ttl);
}

/**
 * Checks whether a refresh token has been blacklisted.
 */
async function isTokenBlacklisted(token: string): Promise<boolean> {
  const result = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${token}`);
  return result !== null;
}

/**
 * Strips `password_hash` from a user row so it never leaks to clients.
 */
function sanitizeUser(user: UserRow): SanitizedUser {
  const { password_hash: _pw, ...safe } = user;
  return safe;
}

/**
 * Columns selected for user queries.
 */
const USER_COLUMNS = [
  'id',
  'username',
  'email',
  'password_hash',
  'display_name',
  'avatar_url',
  'bio',
  'role',
  'subscription_tier',
  'created_at',
  'updated_at',
] as const;

/**
 * Same list but without password_hash -- used when we know we don't need it.
 */
const SAFE_USER_COLUMNS = USER_COLUMNS.filter(
  (c) => c !== 'password_hash',
) as unknown as string[];

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Authenticates or registers a user via a third-party social provider.
 *
 * Flow:
 *  1. Verify the ID token with the appropriate provider strategy.
 *  2. Look up an existing `user_auth_providers` record.
 *  3a. If found, fetch the linked user and return tokens.
 *  3b. If not found, create a new user + auth_provider row in a transaction.
 */
export async function socialLogin(
  provider: 'google' | 'apple',
  idToken: string,
): Promise<AuthResult> {
  // Step 1 -- verify with provider
  const profile =
    provider === 'google'
      ? await verifyGoogleToken(idToken)
      : await verifyAppleToken(idToken);

  // Step 2 -- look up existing auth provider link
  const existingLink = await db('user_auth_providers')
    .where({ provider, provider_user_id: profile.provider_user_id })
    .first('user_id');

  if (existingLink) {
    const user: UserRow = await db('users')
      .where('id', existingLink.user_id)
      .first(USER_COLUMNS as unknown as string[]);

    if (!user) {
      throw new NotFoundError('User', existingLink.user_id);
    }

    logger.info('Social login', {
      userId: user.id,
      provider,
    });

    const tokens = generateTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
      subscription_tier: user.subscription_tier,
    });

    return { user: sanitizeUser(user), tokens };
  }

  // Step 3b -- no existing link; create user + auth provider in a transaction
  const result = await db.transaction(async (trx) => {
    // Check if a user with this email already exists and link the provider
    // to that account.
    let user: UserRow | undefined = await trx('users')
      .where('email', profile.email)
      .first(USER_COLUMNS as unknown as string[]);

    if (!user) {
      // Derive a unique username from the email local part
      const baseUsername = profile.email
        .split('@')[0]
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 25);

      let username = baseUsername;
      let suffix = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const taken = await trx('users')
          .where('username', username)
          .first('id');
        if (!taken) break;
        username = `${baseUsername}_${suffix}`;
        suffix++;
      }

      const [newUser] = await trx('users')
        .insert({
          email: profile.email,
          username,
          display_name: profile.name,
          avatar_url: 'avatar_url' in profile ? profile.avatar_url : null,
          role: 'user',
          subscription_tier: 'free',
        })
        .returning(USER_COLUMNS as unknown as string[]);

      user = newUser;
    }

    // Create the auth provider link
    await trx('user_auth_providers').insert({
      user_id: user!.id,
      provider,
      provider_user_id: profile.provider_user_id,
      provider_email: profile.email,
    });

    return user!;
  });

  logger.info('Social login (new link)', {
    userId: result.id,
    provider,
  });

  const tokens = generateTokenPair({
    id: result.id,
    email: result.email,
    role: result.role,
    subscription_tier: result.subscription_tier,
  });

  return { user: sanitizeUser(result), tokens };
}

/**
 * Issues a new token pair given a valid refresh token.
 */
export async function refreshToken(
  token: string,
): Promise<TokenPair> {
  if (await isTokenBlacklisted(token)) {
    throw new AuthenticationError('Token has been revoked');
  }

  const payload = verifyRefreshToken(token);

  const user: UserRow | undefined = await db('users')
    .where('id', payload.sub)
    .first(USER_COLUMNS as unknown as string[]);

  if (!user) {
    throw new AuthenticationError('User associated with this token no longer exists');
  }

  logger.info('Token refreshed', { userId: user.id });

  return generateTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    subscription_tier: user.subscription_tier,
  });
}

/**
 * Blacklists the provided refresh token so it can no longer be used.
 */
export async function logout(refreshToken: string): Promise<void> {
  await blacklistToken(refreshToken);
  logger.info('Refresh token blacklisted on logout');
}

/**
 * Fetches a user by ID, excluding the password hash.
 */
export async function getUserById(id: string): Promise<SanitizedUser> {
  const user = await db('users')
    .where('id', id)
    .first(SAFE_USER_COLUMNS);

  if (!user) {
    throw new NotFoundError('User', id);
  }

  return user as SanitizedUser;
}
