// Retry creating Android OAuth client after waiting for deletion to propagate

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const NEW_PROJECT = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const ANDROID_SHA1 = '8E:59:D2:C2:09:4E:46:1B:15:0F:14:81:B8:6A:A0:08:BC:B9:FA:A0';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 90;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function tryClick(page, selectors, desc, timeout = 3000) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.click();
      console.log(`   ✓ ${desc} (${sel})`);
      return true;
    } catch { /* next */ }
  }
  return false;
}

async function attemptCreate(page, withSha1) {
  // Navigate to clients list
  await page.goto(`${GCP}/auth/clients?project=${NEW_PROJECT}`);
  await page.waitForTimeout(4000);

  // Click "クライアントを作成"
  await tryClick(page, [
    'a:has-text("クライアントを作成")',
    'button:has-text("クライアントを作成")',
  ], 'クライアント作成', 5000);

  await page.waitForTimeout(3000);
  await page.keyboard.press('Escape'); // dismiss any search popup
  await page.waitForTimeout(500);

  // Select Android type
  const dropdown = page.locator('mat-form-field:has-text("アプリケーションの種類") mat-select').first();
  try {
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });
    await dropdown.click();
  } catch {
    // Fallback
    const dd = page.locator('mat-select:visible').first();
    await dd.click();
  }
  await page.waitForTimeout(1000);

  const typeClicked = await tryClick(page, [
    'mat-option:has-text("Android")',
    '[role="option"]:has-text("Android")',
  ], 'Android', 3000);

  if (!typeClicked) {
    console.log('   ⚠️ タイプ選択失敗');
    return null;
  }

  await page.waitForTimeout(2000);

  // Fill fields
  const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"])').all();

  if (inputs.length >= 1) {
    await inputs[0].fill('30sec Challenge Android');
    console.log('   ✓ 名前');
  }
  if (inputs.length >= 2) {
    await inputs[1].fill(ANDROID_PACKAGE);
    console.log(`   ✓ パッケージ名`);
  }
  if (withSha1 && inputs.length >= 3) {
    await inputs[2].fill(ANDROID_SHA1);
    console.log(`   ✓ SHA-1`);
  } else if (!withSha1) {
    console.log('   (SHA-1 なしで作成)');
  }

  await ss(page, `android-attempt-${withSha1 ? 'sha1' : 'nosha1'}`);

  // Click 作成
  await tryClick(page, ['button:has-text("作成")'], '作成', 5000);
  await page.waitForTimeout(5000);
  await ss(page, `android-result-${withSha1 ? 'sha1' : 'nosha1'}`);

  // Check result
  const bodyText = await page.locator('body').textContent();

  if (bodyText.includes('失敗') || bodyText.includes('error') || bodyText.includes('Error')) {
    // Close error dialog
    await tryClick(page, ['button:has-text("閉じる")', 'button:has-text("Close")'], 'close', 2000);
    return null;
  }

  const idMatch = bodyText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
  if (idMatch) {
    return idMatch[1];
  }

  return 'unknown';
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);

  console.log('🔗 Google Cloud Console...');
  await page.goto(`${GCP}/auth/clients?project=${NEW_PROJECT}`);
  console.log('⏳ ログインしてください...');
  await page.waitForFunction(
    () => window.location.hostname.includes('console.cloud.google.com'),
    { timeout: 300000 }
  );
  await page.waitForTimeout(5000);
  try { await page.locator('button:has-text("OK")').first().click({ timeout: 2000 }); } catch {}

  // First try: with SHA-1
  console.log('\n📋 Attempt 1: SHA-1 あり');
  let clientId = await attemptCreate(page, true);

  if (clientId) {
    console.log(`\n✅ Android Client ID: ${clientId}`);
  } else {
    // Second try: without SHA-1
    console.log('\n📋 Attempt 2: SHA-1 なし');
    clientId = await attemptCreate(page, false);

    if (clientId) {
      console.log(`\n✅ Android Client ID (SHA-1なし): ${clientId}`);
      console.log('   後で Google Cloud Console から SHA-1 を追加してください。');
    } else {
      console.log('\n⚠️ 両方失敗。手動作成が必要です。');
      console.log('   1. https://console.cloud.google.com/auth/clients?project=sec-challenge-34060 を開く');
      console.log('   2. 「クライアントを作成」→ Android を選択');
      console.log(`   3. パッケージ名: ${ANDROID_PACKAGE}`);
      console.log(`   4. SHA-1: ${ANDROID_SHA1}`);
    }
  }

  if (clientId && clientId !== 'unknown') {
    // Update results file
    const resultsPath = path.join(SCREENSHOTS_DIR, 'oauth-clients-final.json');
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    results.android = { name: '30sec Challenge Android', clientId };
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log('   結果を保存しました。');
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await browser.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
