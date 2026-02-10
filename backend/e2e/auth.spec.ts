import { test, expect } from '@playwright/test';
import { registerUser, loginUser, authHeaders, uniqueEmail, uniqueUsername } from './helpers/api-helper';

test.describe('Auth', () => {
  test('POST /auth/register creates a new user and returns tokens', async ({ request }) => {
    const email = uniqueEmail();
    const username = uniqueUsername();

    const res = await request.post('/api/v1/auth/register', {
      data: {
        email,
        password: 'TestPass1',
        username,
        display_name: 'E2E Test User',
      },
    });

    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user).toBeDefined();
    expect(body.data.user.email).toBe(email);
    expect(body.data.user.username).toBe(username);
    expect(body.data.tokens.accessToken).toBeDefined();
    expect(body.data.tokens.refreshToken).toBeDefined();
    // password_hash should never leak
    expect(body.data.user.password_hash).toBeUndefined();
  });

  test('POST /auth/register with duplicate email returns 400', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.post('/api/v1/auth/register', {
      data: {
        email: user.email,
        password: 'TestPass1',
        username: uniqueUsername(),
        display_name: 'Duplicate',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /auth/register with short password returns 400', async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: {
        email: uniqueEmail(),
        password: 'short',
        username: uniqueUsername(),
        display_name: 'Bad Password',
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /auth/login succeeds with correct credentials', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.post('/api/v1/auth/login', {
      data: { email: user.email, password: user.password },
    });

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.tokens.accessToken).toBeDefined();
    expect(body.data.tokens.refreshToken).toBeDefined();
    expect(body.data.user.email).toBe(user.email);
  });

  test('POST /auth/login with wrong password returns 401', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.post('/api/v1/auth/login', {
      data: { email: user.email, password: 'WrongPass1' },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('GET /auth/me returns user info when authenticated', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/auth/me', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(user.email);
    expect(body.data.username).toBe(user.username);
  });

  test('GET /auth/me without token returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/auth/me');

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /auth/refresh returns new tokens', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.post('/api/v1/auth/refresh', {
      data: { refresh_token: user.refreshToken },
    });

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  test('POST /auth/logout succeeds when authenticated', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.post('/api/v1/auth/logout', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /auth/forgot-password returns 200 regardless of email', async ({ request }) => {
    const res = await request.post('/api/v1/auth/forgot-password', {
      data: { email: 'nonexistent@test.com' },
    });

    // Always 200 to avoid leaking email existence
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
