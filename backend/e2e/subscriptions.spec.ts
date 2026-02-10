import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers/api-helper';

test.describe('Subscriptions', () => {
  test('GET /subscriptions/plans returns available plans', async ({ request }) => {
    const res = await request.get('/api/v1/subscriptions/plans');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /subscriptions/status returns subscription status for authenticated user', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/subscriptions/status', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /subscriptions/status requires authentication', async ({ request }) => {
    const res = await request.get('/api/v1/subscriptions/status');

    expect(res.status()).toBe(401);
  });
});
