// Verify Google Cloud Console OAuth setup for sec-challenge-34060
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 770;

const PROJECT_ID = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${step}-${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  // Login
  console.log('🔗 Google Cloud Console を開いています...');
  await page.goto(`${GCP}/apis/credentials?project=${PROJECT_ID}`);
  console.log('⏳ Googleアカウントでログインしてください...');
  await page.waitForFunction(
    () => window.location.hostname.includes('console.cloud.google.com'),
    { timeout: 300000 }
  );
  await page.waitForTimeout(5000);
  console.log('✅ ログイン完了');

  // Check OAuth credentials page
  console.log('\n📋 認証情報ページ...');
  await ss(page, '01-credentials');

  // Navigate to OAuth consent screen
  console.log('\n📋 OAuth同意画面を確認...');
  await page.goto(`${GCP}/auth/overview?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, '02-consent-overview');

  const consentText = await page.locator('body').textContent().catch(() => '');

  // Check publishing status
  if (consentText.includes('テスト') || consentText.includes('Testing')) {
    console.log('   ⚠️ 同意画面はテストモードです。本番公開が必要です。');
  } else if (consentText.includes('本番') || consentText.includes('Production') || consentText.includes('公開')) {
    console.log('   ✅ 同意画面は本番モードです。');
  }

  // Check branding
  await page.goto(`${GCP}/auth/branding?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, '03-branding');

  // Check OAuth clients list
  console.log('\n📋 OAuthクライアント一覧...');
  await page.goto(`${GCP}/auth/clients?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, '04-clients');

  console.log('\n⏸️  確認してください:');
  console.log('   1. OAuth同意画面が「本番」(Production) になっているか');
  console.log('   2. Web / iOS / Android クライアントが全て存在するか');
  console.log('   3. アプリ名・サポートメールが正しいか');
  console.log('\n   設定変更が必要な場合はブラウザで操作してください。');
  console.log('   完了したら Enter を押してください。');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, '05-final');
  await browser.close();
  console.log('✅ 完了');
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
