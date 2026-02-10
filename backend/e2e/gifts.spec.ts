import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers/api-helper';

test.describe('Gifts', () => {
  test('GET /gifts/catalog returns gift catalog', async ({ request }) => {
    const res = await request.get('/api/v1/gifts/catalog');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Catalog is grouped by category (object with arrays), not a flat array
    expect(body.data).toBeDefined();
    expect(typeof body.data).toBe('object');
  });

  test('GET /gifts/received returns received gifts for authenticated user', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/gifts/received', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /gifts/sent returns sent gifts for authenticated user', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/gifts/sent', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
