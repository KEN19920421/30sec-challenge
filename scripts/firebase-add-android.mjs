// Firebase Console - Add Android app only
// Run after iOS app is already registered.

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FLUTTER_DIR = path.join(PROJECT_ROOT, 'flutter_app');
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');

const FIREBASE_PROJECT_ID = 'sec-challenge-34060';
const BASE_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}`;

const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const ANDROID_NICKNAME = '30sec Challenge Android';
const ANDROID_SHA1 = '8E:59:D2:C2:09:4E:46:1B:15:0F:14:81:B8:6A:A0:08:BC:B9:FA:A0';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let step = 20; // Start from 20 to not overwrite iOS screenshots

async function screenshot(page, name) {
  step++;
  const filepath = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`   📸 ${filepath}`);
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  console.log('🔗 Firebase Console を開いています...');
  await page.goto(`${BASE_URL}/settings/general`);

  console.log('⏳ ログインしてください...');
  await page.waitForURL(`**/project/${FIREBASE_PROJECT_ID}/**`, { timeout: 300000 });
  await page.waitForTimeout(5000);
  console.log('✅ 設定ページが読み込まれました。');

  // Scroll down to reveal the "アプリの追加" button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await screenshot(page, 'android-settings');

  // Find and click "Add app" button - now includes "の" variant
  console.log('\n📱 Android アプリを追加しています...');

  const addAppSelectors = [
    'button:has-text("アプリの追加")',   // After first app is registered
    'button:has-text("アプリを追加")',   // When no apps exist
    'button:has-text("Add app")',
    'button[aria-label*="Android アプリ"]',
    'button[aria-label*="Android"]',
  ];

  let clicked = false;
  for (const sel of addAppSelectors) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log(`   ✓ "${sel}" をクリック`);
      clicked = true;
      break;
    } catch { /* try next */ }
  }

  if (!clicked) {
    // Debug: list all buttons
    const buttons = await page.locator('button:visible').all();
    for (let i = 0; i < buttons.length; i++) {
      const text = (await buttons[i].textContent()).trim().replace(/\s+/g, ' ').substring(0, 80);
      const ariaLabel = await buttons[i].getAttribute('aria-label') || '';
      if (text || ariaLabel) {
        console.log(`   button[${i}]: text="${text}" aria="${ariaLabel}"`);
      }
    }
    console.log('   ⚠️ 手動で「アプリの追加」ボタンをクリックしてください (60秒待機)...');
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 60000 });
  }

  await page.waitForTimeout(2000);
  await screenshot(page, 'android-after-add-click');

  // Select Android platform
  const androidSelectors = [
    'button[aria-label*="Android"]',
    'button:has-text("Android")',
    '[data-platform="android"]',
  ];

  for (const sel of androidSelectors) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log(`   ✓ Android プラットフォーム選択 (${sel})`);
      break;
    } catch { /* try next */ }
  }

  await page.waitForTimeout(2000);
  await screenshot(page, 'android-form');

  // Wait for form
  try {
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    console.log('   ⚠️ フォームが表示されませんでした。');
    await screenshot(page, 'android-no-form');
    process.exit(1);
  }

  // Fill form
  const inputs = await page.locator('input:visible').all();
  console.log(`   入力フィールド数: ${inputs.length}`);
  for (let i = 0; i < inputs.length; i++) {
    const placeholder = await inputs[i].getAttribute('placeholder') || '';
    const name = await inputs[i].getAttribute('name') || '';
    console.log(`   input[${i}]: placeholder="${placeholder}" name="${name}"`);
  }

  // Package name
  if (inputs.length >= 1) {
    await inputs[0].click();
    await inputs[0].fill(ANDROID_PACKAGE);
    console.log(`   ✓ パッケージ名: ${ANDROID_PACKAGE}`);
  }

  // Nickname
  if (inputs.length >= 2) {
    await inputs[1].click();
    await inputs[1].fill(ANDROID_NICKNAME);
    console.log(`   ✓ ニックネーム: ${ANDROID_NICKNAME}`);
  }

  // SHA-1
  if (inputs.length >= 3) {
    await inputs[2].click();
    await inputs[2].fill(ANDROID_SHA1);
    console.log(`   ✓ SHA-1: ${ANDROID_SHA1}`);
  }

  await screenshot(page, 'android-form-filled');

  // Register
  const regSelectors = [
    'button:has-text("アプリを登録")',
    'button:has-text("Register app")',
    'button:has-text("登録")',
    'button:has-text("Register")',
  ];

  for (const sel of regSelectors) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log(`   ✓ 登録 (${sel})`);
      break;
    } catch { /* try next */ }
  }

  await page.waitForTimeout(5000);
  await screenshot(page, 'android-registered');

  // Download google-services.json
  const destPath = path.join(FLUTTER_DIR, 'android', 'app', 'google-services.json');
  console.log(`   google-services.json をダウンロード中...`);

  const dlSelectors = [
    'a:has-text("google-services.json")',
    'button:has-text("google-services.json")',
    'a[download]',
    'button:has-text("ダウンロード")',
    'button:has-text("Download")',
  ];

  let downloaded = false;
  for (const sel of dlSelectors) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        btn.click(),
      ]);
      await download.saveAs(destPath);
      console.log(`   ✅ google-services.json → ${destPath}`);
      downloaded = true;
      break;
    } catch { /* try next */ }
  }

  if (!downloaded) {
    console.log(`   ⚠️ ダウンロードできませんでした。`);
    console.log(`   → 手動で google-services.json をダウンロードし ${destPath} に配置してください`);
  }

  // Click through wizard
  for (let i = 0; i < 5; i++) {
    const nextSelectors = [
      'button:has-text("次へ")',
      'button:has-text("Next")',
      'button:has-text("続行")',
      'button:has-text("Continue")',
      'button:has-text("コンソールに進む")',
      'button:has-text("Continue to console")',
      'button:has-text("Skip")',
      'button:has-text("スキップ")',
      'button:has-text("このステップをスキップ")',
    ];

    let found = false;
    for (const sel of nextSelectors) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 3000 });
        await btn.click();
        console.log(`   → ${sel}`);
        found = true;
        await page.waitForTimeout(2000);
        break;
      } catch { /* try next */ }
    }
    if (!found) break;
  }

  await screenshot(page, 'android-done');
  console.log('\n✅ Android アプリの追加が完了しました。');
  console.log('\n確認後 Enter で終了');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await browser.close();
}

main().catch(e => {
  console.error('エラー:', e.message);
  process.exit(1);
});
