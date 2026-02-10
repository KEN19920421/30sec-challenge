import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers/api-helper';
import { v4 as uuidv4 } from 'uuid';

test.describe('Challenges', () => {
  test('GET /challenges returns current challenge', async ({ request }) => {
    const res = await request.get('/api/v1/challenges');

    // May be 200 with data or 200 with null data if no active challenge
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /challenges/history returns paginated results', async ({ request }) => {
    const res = await request.get('/api/v1/challenges/history?page=1&limit=10');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /challenges/upcoming returns upcoming challenges', async ({ request }) => {
    const res = await request.get('/api/v1/challenges/upcoming');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /challenges/:id with non-existent UUID returns 404', async ({ request }) => {
    const fakeId = uuidv4();
    const res = await request.get(`/api/v1/challenges/${fakeId}`);

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('GET /challenges/:id with invalid UUID returns 400', async ({ request }) => {
    const res = await request.get('/api/v1/challenges/not-a-uuid');

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('POST /challenges requires admin role', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.post('/api/v1/challenges', {
      headers: authHeaders(user.accessToken),
      data: {
        title: 'Unauthorized Challenge',
        description: 'This should fail because user is not admin.',
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
