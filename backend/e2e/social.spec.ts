import { test, expect } from '@playwright/test';
import { registerUser, authHeaders } from './helpers/api-helper';

test.describe('Social', () => {
  test('POST /social/follow/:userId follows a user', async ({ request }) => {
    const userA = await registerUser(request);
    const userB = await registerUser(request);
    const userBId = userB.user.id as string;

    const res = await request.post(`/api/v1/social/follow/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /social/follow/:userId duplicate follow returns 400', async ({ request }) => {
    const userA = await registerUser(request);
    const userB = await registerUser(request);
    const userBId = userB.user.id as string;

    // First follow
    await request.post(`/api/v1/social/follow/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    // Duplicate follow
    const res = await request.post(`/api/v1/social/follow/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('DELETE /social/follow/:userId unfollows a user', async ({ request }) => {
    const userA = await registerUser(request);
    const userB = await registerUser(request);
    const userBId = userB.user.id as string;

    // Follow first
    await request.post(`/api/v1/social/follow/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    // Unfollow
    const res = await request.delete(`/api/v1/social/follow/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET /social/followers/:userId returns follower list', async ({ request }) => {
    const userA = await registerUser(request);
    const userB = await registerUser(request);
    const userBId = userB.user.id as string;

    // A follows B
    await request.post(`/api/v1/social/follow/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    const res = await request.get(`/api/v1/social/followers/${userBId}`);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /social/block/:userId blocks a user', async ({ request }) => {
    const userA = await registerUser(request);
    const userB = await registerUser(request);
    const userBId = userB.user.id as string;

    const res = await request.post(`/api/v1/social/block/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('DELETE /social/block/:userId unblocks a user', async ({ request }) => {
    const userA = await registerUser(request);
    const userB = await registerUser(request);
    const userBId = userB.user.id as string;

    // Block first
    await request.post(`/api/v1/social/block/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    // Unblock
    const res = await request.delete(`/api/v1/social/block/${userBId}`, {
      headers: authHeaders(userA.accessToken),
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
