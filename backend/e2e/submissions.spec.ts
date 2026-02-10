import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers/api-helper';
import { v4 as uuidv4 } from 'uuid';

test.describe('Submissions', () => {
  test('POST /submissions/initiate starts an upload', async ({ request }) => {
    const user = await registerUser(request);

    // Get an active challenge first
    const challengeRes = await request.get('/api/v1/challenges');
    const challengeBody = await challengeRes.json();

    // If no active challenge, we use a fake UUID (will get 404 or validation error)
    const challengeId = challengeBody.data?.id || uuidv4();

    const res = await request.post('/api/v1/submissions/initiate', {
      headers: authHeaders(user.accessToken),
      data: {
        challenge_id: challengeId,
        filename: 'test-video.mp4',
        content_type: 'video/mp4',
        file_size: 1024 * 1024,
      },
    });

    // 201 if challenge exists, 404 if not
    if (challengeBody.data?.id) {
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    } else {
      expect([400, 404]).toContain(res.status());
    }
  });

  test('POST /submissions/initiate requires authentication', async ({ request }) => {
    const res = await request.post('/api/v1/submissions/initiate', {
      data: {
        challenge_id: uuidv4(),
        filename: 'test-video.mp4',
        content_type: 'video/mp4',
        file_size: 1024 * 1024,
      },
    });

    expect(res.status()).toBe(401);
  });

  test('GET /submissions/challenge/:challengeId returns submissions', async ({ request }) => {
    // Use a real challenge if available
    const challengeRes = await request.get('/api/v1/challenges');
    const challengeBody = await challengeRes.json();
    const challengeId = challengeBody.data?.id || uuidv4();

    const res = await request.get(`/api/v1/submissions/challenge/${challengeId}`);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /submissions/:id with non-existent UUID returns 404', async ({ request }) => {
    const fakeId = uuidv4();
    const res = await request.get(`/api/v1/submissions/${fakeId}`);

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
