import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.E2E_PORT || '3001';
const baseURL = process.env.BASE_URL || `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  webServer: {
    command: `PORT=${port} npm run dev`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: {
      NODE_ENV: 'development',
      PORT: port,
      RATE_LIMIT_DISABLED: 'true',
    },
  },
});
