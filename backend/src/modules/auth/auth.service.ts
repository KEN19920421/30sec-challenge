import crypto from 'crypto';
import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors';
import { hashPassword, comparePassword } from './password.service';
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

const PASSWORD_RESET_TTL_SECONDS = 60 * 60; // 1 hour
const PASSWORD_RESET_PREFIX = 'password_reset:';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
 * Registers a new user with email and password.
 */
export async function register(data: {
  email: string;
  password: string;
  username: string;
  display_name: string;
}): Promise<AuthResult> {
  // Check for existing email
  const existingEmail = await db('users')
    .where('email', data.email)
    .first('id');

  if (existingEmail) {
    throw new ValidationError('Validation failed', [
      { field: 'email', message: 'Email is already registered' },
    ]);
  }

  // Check for existing username
  const existingUsername = await db('users')
    .where('username', data.username)
    .first('id');

  if (existingUsername) {
    throw new ValidationError('Validation failed', [
      { field: 'username', message: 'Username is already taken' },
    ]);
  }

  const hashedPassword = await hashPassword(data.password);

  const [user] = await db('users')
    .insert({
      email: data.email,
      username: data.username,
      display_name: data.display_name,
      password_hash: hashedPassword,
      role: 'user',
      subscription_tier: 'free',
    })
    .returning(USER_COLUMNS as unknown as string[]);

  logger.info('User registered', { userId: user.id, email: user.email });

  const tokens = generateTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    subscription_tier: user.subscription_tier,
  });

  return { user: sanitizeUser(user), tokens };
}

/**
 * Authenticates a user by email and password.
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const user: UserRow | undefined = await db('users')
    .where('email', email)
    .first(USER_COLUMNS as unknown as string[]);

  if (!user || !user.password_hash) {
    throw new AuthenticationError('Invalid email or password');
  }

  const isValid = await comparePassword(password, user.password_hash);

  if (!isValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  logger.info('User logged in', { userId: user.id, email: user.email });

  const tokens = generateTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    subscription_tier: user.subscription_tier,
  });

  return { user: sanitizeUser(user), tokens };
}

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
    // Check if a user with this email already exists (maybe registered via
    // email/password) and link the provider to that account.
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
 * Generates a password reset token, stores it in Redis with a 1-hour TTL,
 * and returns a success message.
 *
 * In production you would dispatch an email with the reset link here.
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await db('users').where('email', email).first('id', 'email');

  // Always return success to avoid leaking whether an email exists.
  if (!user) {
    logger.warn('Password reset requested for unknown email', { email });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  await redis.set(
    `${PASSWORD_RESET_PREFIX}${hashedToken}`,
    user.id,
    'EX',
    PASSWORD_RESET_TTL_SECONDS,
  );

  // TODO: Send email with reset link containing `resetToken`
  logger.info('Password reset token generated', {
    userId: user.id,
    // In production, NEVER log the actual token. This is here only as a
    // development convenience; remove before deploying.
    ...(process.env.NODE_ENV === 'development' && { resetToken }),
  });
}

/**
 * Resets the user password given a valid reset token.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const userId = await redis.get(`${PASSWORD_RESET_PREFIX}${hashedToken}`);

  if (!userId) {
    throw new AuthenticationError(
      'Password reset token is invalid or has expired',
    );
  }

  const hashedPassword = await hashPassword(newPassword);

  const updated = await db('users')
    .where('id', userId)
    .update({ password_hash: hashedPassword, updated_at: db.fn.now() });

  if (!updated) {
    throw new NotFoundError('User', userId);
  }

  // Invalidate the token so it cannot be reused
  await redis.del(`${PASSWORD_RESET_PREFIX}${hashedToken}`);

  logger.info('Password reset completed', { userId });
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
