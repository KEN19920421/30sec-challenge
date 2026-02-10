// Fix Android OAuth client conflict:
// 1. Delete conflicting Android client from skappdevelop project
// 2. Create new Android client in sec-challenge-34060 project

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');

const OLD_PROJECT = 'skappdevelop';
const NEW_PROJECT = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const ANDROID_SHA1 = '8E:59:D2:C2:09:4E:46:1B:15:0F:14:81:B8:6A:A0:08:BC:B9:FA:A0';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 80;

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

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);

  // ===========================
  // Step 1: Check skappdevelop project for Android OAuth client
  // ===========================
  console.log('═══════════════════════════════════════');
  console.log('Step 1: skappdevelop プロジェクトの確認');
  console.log('═══════════════════════════════════════');

  await page.goto(`${GCP}/auth/clients?project=${OLD_PROJECT}`);
  console.log('⏳ ログインしてください...');
  await page.waitForFunction(
    () => window.location.hostname.includes('console.cloud.google.com'),
    { timeout: 300000 }
  );
  await page.waitForTimeout(8000);
  try { await page.locator('button:has-text("OK")').first().click({ timeout: 2000 }); } catch {}

  await ss(page, 'old-project-clients');

  // Check current URL - might be redirected to old credentials page
  const url = page.url();
  console.log(`   URL: ${url}`);

  // Look for Android client in the table
  const bodyText = await page.locator('body').textContent();
  const hasAndroid = bodyText.includes('Android') || bodyText.includes('android');
  console.log(`   Android クライアント存在: ${hasAndroid}`);

  if (hasAndroid) {
    // Try to find and delete the Android client
    console.log('\n   Android クライアントを削除します...');

    // Look for delete button in the Android row
    const rows = await page.locator('table tbody tr, [role="row"]').all();
    for (let i = 0; i < rows.length; i++) {
      const rowText = await rows[i].textContent();
      if (rowText.includes('Android') || rowText.includes('android')) {
        console.log(`   Android 行を発見: ${rowText.trim().replace(/\s+/g, ' ').substring(0, 100)}`);

        // Click delete icon (trash) in this row
        const deleteBtn = rows[i].locator('button[aria-label*="削除"], button:has(mat-icon:text("delete"))');
        try {
          await deleteBtn.click({ timeout: 3000 });
          console.log('   ✓ 削除ボタンクリック');
          await page.waitForTimeout(2000);
          await ss(page, 'old-android-delete-confirm');

          // Confirm deletion
          await tryClick(page, [
            'button:has-text("削除")',
            'button:has-text("Delete")',
            'button:has-text("確認")',
            'button:has-text("OK")',
          ], '削除確認', 5000);

          await page.waitForTimeout(3000);
          console.log('   ✅ Android クライアント削除完了');
          await ss(page, 'old-android-deleted');
        } catch (e) {
          console.log(`   ⚠️ 削除ボタンエラー: ${e.message}`);

          // Try clicking the name to open detail, then delete from there
          const nameLink = rows[i].locator('a').first();
          try {
            await nameLink.click({ timeout: 3000 });
            await page.waitForTimeout(3000);
            console.log('   詳細ページに移動');
            await ss(page, 'old-android-detail');

            // Look for delete button on detail page
            await tryClick(page, [
              'button:has-text("クライアントを削除")',
              'button:has-text("Delete client")',
              'button:has-text("削除")',
            ], '詳細ページ削除', 5000);

            await page.waitForTimeout(2000);
            await tryClick(page, [
              'button:has-text("削除")',
              'button:has-text("Delete")',
              'button:has-text("OK")',
            ], '削除確認', 5000);

            await page.waitForTimeout(3000);
            console.log('   ✅ 詳細ページから削除完了');
          } catch (e2) {
            console.log(`   ⚠️ 詳細ページ削除失敗: ${e2.message}`);
          }
        }
        break;
      }
    }

    // If no table rows found, try the old credentials page
    if (rows.length === 0) {
      console.log('   テーブル行なし。旧 Credentials ページを確認...');
      await page.goto(`${GCP}/apis/credentials?project=${OLD_PROJECT}`);
      await page.waitForTimeout(5000);
      await ss(page, 'old-project-old-creds');
    }
  } else {
    console.log('   Android クライアントが見つかりません。');
    console.log('   旧 Credentials ページを確認...');
    await page.goto(`${GCP}/apis/credentials?project=${OLD_PROJECT}`);
    await page.waitForTimeout(5000);
    await ss(page, 'old-project-old-creds');

    const oldCredText = await page.locator('body').textContent();
    const hasAndroidOld = oldCredText.includes('Android') && oldCredText.includes('OAuth');
    console.log(`   旧ページ Android OAuth: ${hasAndroidOld}`);
  }

  // ===========================
  // Step 2: Create Android client in sec-challenge-34060
  // ===========================
  console.log('\n═══════════════════════════════════════');
  console.log('Step 2: sec-challenge-34060 に Android クライアント作成');
  console.log('═══════════════════════════════════════');

  await page.goto(`${GCP}/auth/clients?project=${NEW_PROJECT}`);
  await page.waitForTimeout(5000);
  await ss(page, 'new-project-clients');

  // Click "クライアントを作成"
  const createClicked = await tryClick(page, [
    'a:has-text("クライアントを作成")',
    'button:has-text("クライアントを作成")',
  ], 'クライアント作成', 5000);

  if (!createClicked) {
    console.log('   ⚠️ 作成ボタンが見つかりません');
    await ss(page, 'new-no-create');
    console.log('\n確認後 Enter で終了');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    await browser.close();
    return;
  }

  await page.waitForTimeout(3000);

  // Dismiss any search popups by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await ss(page, 'new-android-create-form');

  // Select Android from dropdown
  // The dropdown has placeholder "アプリケーションの種類 *"
  const dropdown = page.locator('mat-form-field:has-text("アプリケーションの種類") mat-select, mat-form-field:has-text("アプリケーションの種類") [role="combobox"]').first();
  let typeSelected = false;

  try {
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });
    await dropdown.click();
    await page.waitForTimeout(1000);

    typeSelected = await tryClick(page, [
      'mat-option:has-text("Android")',
      '[role="option"]:has-text("Android")',
    ], 'Android タイプ', 3000);
  } catch {
    // Fallback: try clicking the dropdown by its visible text
    console.log('   mat-form-field セレクタ失敗、フォールバック...');
    const allDropdowns = await page.locator('mat-select:visible').all();
    for (const dd of allDropdowns) {
      try {
        const text = (await dd.textContent()).trim();
        console.log(`   dropdown text: "${text}"`);
        if (text.includes('アプリケーション') || text.includes('種類') || text === '') {
          await dd.click();
          await page.waitForTimeout(1000);
          typeSelected = await tryClick(page, [
            'mat-option:has-text("Android")',
            '[role="option"]:has-text("Android")',
          ], 'Android タイプ (fallback)', 3000);
          if (typeSelected) break;
          await page.keyboard.press('Escape');
        }
      } catch { /* next */ }
    }
  }

  if (!typeSelected) {
    console.log('   ⚠️ Android タイプ選択失敗');
    // Debug info
    const allEls = await page.locator('mat-select:visible, [role="combobox"]:visible, select:visible').all();
    console.log(`   combobox 要素数: ${allEls.length}`);
    for (let i = 0; i < allEls.length; i++) {
      const text = (await allEls[i].textContent()).trim();
      const tag = await allEls[i].evaluate(e => e.tagName);
      console.log(`   [${i}] ${tag}: "${text}"`);
    }
    await ss(page, 'new-android-type-failed');
  } else {
    await page.waitForTimeout(2000);

    // Fill in the form fields
    const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"]):not([aria-label*="search"])').all();
    console.log(`   入力フィールド数: ${inputs.length}`);
    for (let i = 0; i < inputs.length; i++) {
      const p = await inputs[i].getAttribute('placeholder') || '';
      const a = await inputs[i].getAttribute('aria-label') || '';
      console.log(`   input[${i}]: placeholder="${p}" aria="${a}"`);
    }

    // Name (first input)
    if (inputs.length >= 1) {
      await inputs[0].click();
      await inputs[0].fill('30sec Challenge Android');
      console.log('   ✓ 名前: 30sec Challenge Android');
    }
    // Package name (second input)
    if (inputs.length >= 2) {
      await inputs[1].click();
      await inputs[1].fill(ANDROID_PACKAGE);
      console.log(`   ✓ パッケージ名: ${ANDROID_PACKAGE}`);
    }
    // SHA-1 (third input)
    if (inputs.length >= 3) {
      await inputs[2].click();
      await inputs[2].fill(ANDROID_SHA1);
      console.log(`   ✓ SHA-1: ${ANDROID_SHA1}`);
    }

    await ss(page, 'new-android-filled');

    // Click 作成
    await tryClick(page, [
      'button:has-text("作成")',
      'button:has-text("Create")',
    ], '作成', 5000);

    await page.waitForTimeout(5000);
    await ss(page, 'new-android-result');

    // Check result
    const resultText = await page.locator('body').textContent();

    if (resultText.includes('失敗') || resultText.includes('すでに使用')) {
      console.log('   ⚠️ まだ競合があります。手動で解決が必要です。');
      console.log('   → skappdevelop プロジェクトの Android OAuth クライアントを削除してから再試行してください。');
    } else {
      const idMatch = resultText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
      if (idMatch) {
        console.log(`   ✅ Android Client ID: ${idMatch[1]}`);

        // Save to results
        const resultsPath = path.join(SCREENSHOTS_DIR, 'oauth-clients-final.json');
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        results.android = {
          name: '30sec Challenge Android',
          clientId: idMatch[1],
        };
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log('   結果を保存しました。');
      } else {
        console.log('   Client ID を自動取得できませんでした。スクリーンショットを確認してください。');
      }
    }

    // Close dialog
    await tryClick(page, [
      'button:has-text("閉じる")',
      'button:has-text("OK")',
      'button:has-text("Close")',
    ], 'ダイアログ閉じる', 2000);
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await browser.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
