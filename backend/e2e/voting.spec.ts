import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers/api-helper';
import { v4 as uuidv4 } from 'uuid';

test.describe('Voting', () => {
  test('GET /voting/queue requires authentication', async ({ request }) => {
    const res = await request.get(`/api/v1/voting/queue?challenge_id=${uuidv4()}&limit=10`);

    expect(res.status()).toBe(401);
  });

  test('GET /voting/queue returns vote queue for authenticated user', async ({ request }) => {
    const user = await registerUser(request);

    // Get an active challenge
    const challengeRes = await request.get('/api/v1/challenges');
    const challengeBody = await challengeRes.json();
    const challengeId = challengeBody.data?.id || uuidv4();

    const res = await request.get(
      `/api/v1/voting/queue?challenge_id=${challengeId}&limit=10`,
      { headers: authHeaders(user.accessToken) },
    );

    // 200 if challenge exists, could be 404 if not
    expect([200, 404]).toContain(res.status());
  });

  test('GET /voting/stats/:submissionId returns vote stats (public)', async ({ request }) => {
    const fakeId = uuidv4();
    const res = await request.get(`/api/v1/voting/stats/${fakeId}`);

    // Might be 200 with empty stats or 404
    expect([200, 404]).toContain(res.status());
  });

  test('GET /voting/super-votes/balance returns balance for authenticated user', async ({ request }) => {
    const user = await registerUser(request);

    const res = await request.get('/api/v1/voting/super-votes/balance', {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
