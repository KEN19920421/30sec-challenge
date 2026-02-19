// Verify Google Cloud Console OAuth setup (v2 - persistent context)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 780;

const PROJECT_ID = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${step}-${name}.png`);
}

async function main() {
  const userDataDir = path.join(__dirname, '_gcloud-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Open credentials page
  console.log('🔗 Google Cloud Console を開いています...');
  await page.goto(`${GCP}/apis/credentials?project=${PROJECT_ID}`);
  await page.waitForTimeout(3000);

  // Check if logged in
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes('ログイン') || bodyText.includes('Sign in') || page.url().includes('accounts.google.com')) {
    console.log('⏸️  Googleアカウントでログインしてください...');
    // Wait for redirect back to console
    for (let i = 0; i < 300; i++) {
      await page.waitForTimeout(2000);
      if (page.url().includes('console.cloud.google.com')) break;
    }
    await page.waitForTimeout(5000);
  }
  console.log('✅ ログイン完了');

  // Credentials page
  console.log('\n📋 認証情報ページ...');
  await page.goto(`${GCP}/apis/credentials?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, '01-credentials');

  // OAuth consent screen overview
  console.log('\n📋 OAuth同意画面...');
  await page.goto(`${GCP}/auth/overview?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, '02-consent');

  // Branding
  console.log('\n📋 ブランディング...');
  await page.goto(`${GCP}/auth/branding?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, '03-branding');

  // Clients
  console.log('\n📋 OAuthクライアント一覧...');
  await page.goto(`${GCP}/auth/clients?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, '04-clients');

  console.log('\n⏸️  確認・設定が必要な場合はブラウザで操作してください。');
  console.log('   完了したら Enter を押してください。');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, '05-final');
  await context.close();
  console.log('✅ 完了');
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
