// Get iOS client ID and create Android client from old Credentials page

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const PROJECT_ID = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const ANDROID_SHA1 = '8E:59:D2:C2:09:4E:46:1B:15:0F:14:81:B8:6A:A0:08:BC:B9:FA:A0';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 70;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);

  // Go to the old credentials page
  console.log('🔗 Credentials ページを開いています...');
  await page.goto(`${GCP}/apis/credentials?project=${PROJECT_ID}`);

  console.log('⏳ ログインしてください...');
  await page.waitForFunction(
    () => window.location.hostname.includes('console.cloud.google.com'),
    { timeout: 300000 }
  );
  await page.waitForTimeout(8000);

  // Dismiss popups
  try { await page.locator('button:has-text("OK")').first().click({ timeout: 2000 }); } catch {}

  console.log('✅ Credentials ページ');
  await ss(page, 'credentials-page');

  // ===========================
  // Step 1: Get iOS client ID
  // ===========================
  console.log('\n📋 iOS クライアント詳細を取得中...');

  // Click on "30sec Challenge iOS" link
  const iosLink = page.locator('a:has-text("30sec Challenge iOS")').first();
  try {
    await iosLink.waitFor({ state: 'visible', timeout: 10000 });
    await iosLink.click();
    await page.waitForTimeout(5000);
    await ss(page, 'ios-detail');

    // Try to extract the full client ID from the page
    const bodyText = await page.locator('body').textContent();
    const iosIdMatch = bodyText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
    if (iosIdMatch) {
      console.log(`   ✅ iOS Client ID: ${iosIdMatch[1]}`);
    } else {
      console.log('   312153915766 prefix not found, trying broader match...');
      const allMatches = [...bodyText.matchAll(/(\d{9,15}-[a-z0-9]+\.apps\.googleusercontent\.com)/g)];
      for (const m of allMatches) {
        console.log(`   found: ${m[1]}`);
      }
    }

    // Also try to find it via the copy button or specific element
    // The client ID is usually in a readonly input or a specific div
    const clientIdEl = page.locator('[data-field="clientId"], input[readonly], .client-id, [class*="client-id"]').first();
    try {
      const val = await clientIdEl.inputValue({ timeout: 3000 });
      if (val) console.log(`   (element value): ${val}`);
    } catch {
      // Try text content approach
      const possibleEls = await page.locator('div:has-text(".apps.googleusercontent.com")').all();
      for (const el of possibleEls.slice(0, 5)) {
        const text = (await el.textContent()).trim();
        const m = text.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
        if (m) {
          console.log(`   (div text): ${m[1]}`);
          break;
        }
      }
    }
  } catch (e) {
    console.log(`   エラー: ${e.message}`);
  }

  // ===========================
  // Step 2: Create Android client
  // ===========================
  console.log('\n📋 Android OAuth クライアントを作成中...');

  // Navigate to create OAuth client page
  await page.goto(`${GCP}/apis/credentials/oauthclient?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);

  // Check if redirected to new UI
  const currentUrl = page.url();
  console.log(`   URL: ${currentUrl}`);

  if (currentUrl.includes('/auth/')) {
    // New Auth Platform UI
    console.log('   新 UI にリダイレクト。クライアント作成ページに移動...');
    await page.goto(`${GCP}/auth/clients?project=${PROJECT_ID}`);
    await page.waitForTimeout(3000);

    // Click "クライアントを作成"
    try {
      await page.locator('a:has-text("クライアントを作成")').first().click({ timeout: 5000 });
    } catch {
      await page.locator('button:has-text("クライアントを作成")').first().click({ timeout: 5000 });
    }
    await page.waitForTimeout(3000);
  }

  await ss(page, 'android-create-page');

  // Select Android type from dropdown
  let typeSelected = false;
  const dropdown = page.locator('mat-select:visible, [role="combobox"]:visible').first();
  try {
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });
    await dropdown.click();
    await page.waitForTimeout(1000);

    // Select Android
    for (const t of ['Android', 'Android アプリ']) {
      try {
        await page.locator(`mat-option:has-text("${t}"), [role="option"]:has-text("${t}")`).first().click({ timeout: 2000 });
        console.log(`   ✓ タイプ: ${t}`);
        typeSelected = true;
        break;
      } catch { /* next */ }
    }
  } catch (e) {
    console.log(`   ⚠️ ドロップダウンエラー: ${e.message}`);
  }

  if (!typeSelected) {
    console.log('   ⚠️ タイプ選択失敗');
    await ss(page, 'android-type-failed');
  } else {
    await page.waitForTimeout(2000);

    // Fill form
    const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"])').all();
    console.log(`   入力フィールド数: ${inputs.length}`);
    for (let i = 0; i < inputs.length; i++) {
      const p = await inputs[i].getAttribute('placeholder') || '';
      const a = await inputs[i].getAttribute('aria-label') || '';
      const n = await inputs[i].getAttribute('name') || '';
      console.log(`   input[${i}]: placeholder="${p}" aria="${a}" name="${n}"`);
    }

    // Name
    if (inputs.length >= 1) {
      await inputs[0].click();
      await inputs[0].fill('30sec Challenge Android');
      console.log('   ✓ 名前: 30sec Challenge Android');
    }
    // Package name
    if (inputs.length >= 2) {
      await inputs[1].click();
      await inputs[1].fill(ANDROID_PACKAGE);
      console.log(`   ✓ パッケージ名: ${ANDROID_PACKAGE}`);
    }
    // SHA-1
    if (inputs.length >= 3) {
      await inputs[2].click();
      await inputs[2].fill(ANDROID_SHA1);
      console.log(`   ✓ SHA-1: ${ANDROID_SHA1}`);
    }

    await ss(page, 'android-filled');

    // Click 作成
    try {
      await page.locator('button:has-text("作成")').first().click({ timeout: 5000 });
      console.log('   ✓ 作成ボタンクリック');
    } catch {
      try {
        await page.locator('button:has-text("Create")').first().click({ timeout: 3000 });
      } catch {}
    }

    await page.waitForTimeout(5000);
    await ss(page, 'android-result');

    // Check for error or success
    const resultText = await page.locator('body').textContent();

    if (resultText.includes('失敗') || resultText.includes('error') || resultText.includes('Error')) {
      console.log('   ⚠️ Android クライアント作成失敗');
      // Check if it's the duplicate error
      if (resultText.includes('すでに使用されている')) {
        console.log('   → パッケージ名+SHA-1 が他プロジェクトで使用中');
        console.log('   → SHA-1 なしで作成を試みます...');

        // Close error dialog
        try {
          await page.locator('button:has-text("閉じる"), button:has-text("Close")').first().click({ timeout: 3000 });
        } catch {}
        await page.waitForTimeout(1000);

        // Clear SHA-1 field and retry
        if (inputs.length >= 3) {
          await inputs[2].click();
          await inputs[2].fill('');
          console.log('   SHA-1 をクリア');
        }

        await ss(page, 'android-no-sha');

        try {
          await page.locator('button:has-text("作成")').first().click({ timeout: 5000 });
          await page.waitForTimeout(5000);
          await ss(page, 'android-retry-result');

          const retryText = await page.locator('body').textContent();
          const androidIdMatch = retryText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
          if (androidIdMatch) {
            console.log(`   ✅ Android Client ID (SHA-1なし): ${androidIdMatch[1]}`);
          }
        } catch (e) {
          console.log(`   ⚠️ リトライ失敗: ${e.message}`);
        }
      }
    } else {
      const androidIdMatch = resultText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
      if (androidIdMatch) {
        console.log(`   ✅ Android Client ID: ${androidIdMatch[1]}`);
      }
    }
  }

  // ===========================
  // Summary
  // ===========================
  console.log('\n═══════════════════════════════════════');
  console.log('📋 最終確認 - Credentials ページに戻ります');
  console.log('═══════════════════════════════════════');

  await page.goto(`${GCP}/apis/credentials?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, 'final-credentials');

  // Extract all OAuth client IDs
  const finalText = await page.locator('body').textContent();
  const allOAuthIds = [...finalText.matchAll(/(312153915766-[a-z0-9]+)/g)];
  const uniqueIds = [...new Set(allOAuthIds.map(m => m[1]))];
  console.log(`\n  OAuth Client ID プレフィックス (${uniqueIds.length}個):`);
  for (const id of uniqueIds) {
    console.log(`  ${id}`);
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await browser.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
