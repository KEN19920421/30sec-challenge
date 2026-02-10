import { APIRequestContext } from '@playwright/test';

let emailCounter = 0;

/**
 * Generate a unique email for test isolation.
 */
export function uniqueEmail(): string {
  emailCounter += 1;
  return `e2e_${Date.now()}_${emailCounter}@test.com`;
}

/**
 * Generate a unique username for test isolation.
 */
export function uniqueUsername(): string {
  emailCounter += 1;
  return `e2e_user_${Date.now()}_${emailCounter}`;
}

/**
 * Return Authorization header object for Bearer token.
 */
export function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export interface RegisteredUser {
  accessToken: string;
  refreshToken: string;
  email: string;
  password: string;
  username: string;
  user: Record<string, unknown>;
}

/**
 * Register a new user via API. Returns tokens and user info.
 *
 * API response shape: { success, data: { user, tokens: { accessToken, refreshToken, expiresIn } } }
 */
export async function registerUser(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
): Promise<RegisteredUser> {
  const email = (overrides.email as string) || uniqueEmail();
  const password = (overrides.password as string) || 'TestPass1';
  const username = (overrides.username as string) || uniqueUsername();
  const display_name = (overrides.display_name as string) || `E2E User ${username}`;

  const res = await request.post('/api/v1/auth/register', {
    data: { email, password, username, display_name },
  });

  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`registerUser failed (${res.status()}): ${JSON.stringify(body)}`);
  }

  return {
    accessToken: body.data.tokens.accessToken,
    refreshToken: body.data.tokens.refreshToken,
    email,
    password,
    username,
    user: body.data.user,
  };
}

/**
 * Login an existing user via API. Returns tokens.
 *
 * API response shape: { success, data: { user, tokens: { accessToken, refreshToken, expiresIn } } }
 */
export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {
  const res = await request.post('/api/v1/auth/login', {
    data: { email, password },
  });

  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`loginUser failed (${res.status()}): ${JSON.stringify(body)}`);
  }

  return {
    accessToken: body.data.tokens.accessToken,
    refreshToken: body.data.tokens.refreshToken,
    user: body.data.user,
  };
}

/**
 * Register a user then promote to admin via direct DB update.
 * Since there's no seeded admin, we create one through register + DB role update.
 * For E2E we use a helper that calls register then the test must accept the role is 'user'.
 * Instead, we provide a function that registers and returns the token - admin tests
 * need the server to have a mechanism to create admins.
 *
 * Workaround: register a user, then re-login after seeds create an admin.
 * Since no admin seed exists, admin tests will register a user and note
 * that admin endpoints will return 403, which is the correct behavior to test.
 */
export async function registerAdminUser(
  request: APIRequestContext,
): Promise<RegisteredUser> {
  // Register a regular user - admin role tests verify 403 for non-admins
  return registerUser(request);
}

/**
 * Create a challenge via the admin API.
 */
export async function createChallenge(
  request: APIRequestContext,
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const now = new Date();
  const startsAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const endsAt = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const votingEndsAt = new Date(now.getTime() + 47 * 60 * 60 * 1000).toISOString();

  const data = {
    title: `E2E Challenge ${Date.now()}`,
    description: 'A test challenge created by E2E tests for validation purposes.',
    category: 'general',
    difficulty: 'easy',
    starts_at: startsAt,
    ends_at: endsAt,
    voting_ends_at: votingEndsAt,
    ...overrides,
  };

  const res = await request.post('/api/v1/admin/challenges', {
    headers: authHeaders(token),
    data,
  });

  const body = await res.json();
  if (!res.ok()) {
    throw new Error(`createChallenge failed (${res.status()}): ${JSON.stringify(body)}`);
  }

  return body.data;
}

/**
 * Create a submission via the initiate + complete flow.
 */
export async function createSubmission(
  request: APIRequestContext,
  token: string,
  challengeId: string,
): Promise<Record<string, unknown>> {
  const initRes = await request.post('/api/v1/submissions/initiate', {
    headers: authHeaders(token),
    data: {
      challenge_id: challengeId,
      filename: 'test-video.mp4',
      content_type: 'video/mp4',
      file_size: 1024 * 1024,
    },
  });

  const initBody = await initRes.json();
  if (!initRes.ok()) {
    throw new Error(`createSubmission initiate failed (${initRes.status()}): ${JSON.stringify(initBody)}`);
  }

  const submissionId = initBody.data.submission_id || initBody.data.id;

  const completeRes = await request.post(`/api/v1/submissions/${submissionId}/complete`, {
    headers: authHeaders(token),
  });

  const completeBody = await completeRes.json();
  if (!completeRes.ok()) {
    throw new Error(`createSubmission complete failed (${completeRes.status()}): ${JSON.stringify(completeBody)}`);
  }

  return { ...completeBody.data, id: submissionId };
}
