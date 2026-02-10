import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers/api-helper';

test.describe('Coins', () => {
  test('GET /coins/packages returns coin packages', async ({ request }) => {
    const res = await request.get('/api/v1/coins/packages');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('GET /coins/balance returns balance for authenticated user', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/coins/balance', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /coins/history returns transaction history for authenticated user', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/coins/history', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
