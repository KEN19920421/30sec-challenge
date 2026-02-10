import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers/api-helper';

test.describe('Admin', () => {
  test('GET /admin/dashboard requires admin role (returns 403 for regular user)', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/admin/dashboard', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('GET /admin/users requires admin role (returns 403 for regular user)', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/admin/users', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('GET /admin/moderation requires admin role (returns 403 for regular user)', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/admin/moderation', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('GET /admin/dashboard requires authentication (returns 401 without token)', async ({ request }) => {
    const res = await request.get('/api/v1/admin/dashboard');

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /admin/challenges requires admin role', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.post('/api/v1/admin/challenges', {
      headers: authHeaders(user.accessToken),
      data: {
        title: 'Unauthorized Challenge',
        description: 'This should fail with 403 for non-admin users.',
        category: 'general',
        difficulty: 'easy',
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 86400000).toISOString(),
        voting_ends_at: new Date(Date.now() + 172800000).toISOString(),
      },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
