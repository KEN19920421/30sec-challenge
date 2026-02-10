import { test, expect } from '@playwright/test';

test.describe('Health Check', () => {
  test('GET /api/health returns 200 with status ok', async ({ request }) => {
    const res = await request.get('/api/health');

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.timestamp).toBeDefined();
  });
});
