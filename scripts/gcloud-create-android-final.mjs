// Final attempt: Create Android OAuth client with robust dropdown handling

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
let step = 95;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  console.log('🔗 クライアント作成ページに移動...');
  await page.goto(`${GCP}/auth/clients/create?project=${PROJECT_ID}`);
  console.log('⏳ ログインしてください...');

  // Wait for the GCP console to load
  await page.waitForFunction(
    () => window.location.hostname.includes('console.cloud.google.com'),
    { timeout: 300000 }
  );
  // Wait for the page content to fully render
  console.log('   ページ読み込み中...');
  await page.waitForTimeout(10000);

  // Dismiss any popups
  for (const sel of ['button:has-text("OK")', 'button[aria-label="吹き出しを閉じます"]']) {
    try { await page.locator(sel).first().click({ timeout: 1000 }); } catch {}
  }
  // Close Gemini search if open
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  await ss(page, 'android-create-initial');

  // Check if form exists
  const hasDropdown = await page.locator('mat-select').count();
  const hasForm = await page.locator('mat-form-field').count();
  console.log(`   mat-select count: ${hasDropdown}, mat-form-field count: ${hasForm}`);

  if (hasDropdown === 0 && hasForm === 0) {
    console.log('   フォームが見つかりません。リロードします...');
    await page.reload();
    await page.waitForTimeout(8000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }

  // Click the dropdown - try multiple approaches
  console.log('\n   ドロップダウンを探しています...');

  // Approach 1: Click by mat-select tag
  let dropdownClicked = false;
  const matSelects = await page.locator('mat-select').all();
  console.log(`   mat-select 要素数: ${matSelects.length}`);

  for (let i = 0; i < matSelects.length; i++) {
    try {
      const isVisible = await matSelects[i].isVisible();
      const text = await matSelects[i].textContent();
      console.log(`   mat-select[${i}]: visible=${isVisible} text="${text.trim()}"`);
      if (isVisible) {
        await matSelects[i].click();
        dropdownClicked = true;
        console.log(`   ✓ mat-select[${i}] クリック`);
        break;
      }
    } catch {}
  }

  // Approach 2: Click by aria-label or role
  if (!dropdownClicked) {
    const comboboxes = await page.locator('[role="combobox"]').all();
    console.log(`   combobox 要素数: ${comboboxes.length}`);
    for (let i = 0; i < comboboxes.length; i++) {
      try {
        const isVisible = await comboboxes[i].isVisible();
        if (isVisible) {
          await comboboxes[i].click();
          dropdownClicked = true;
          console.log(`   ✓ combobox[${i}] クリック`);
          break;
        }
      } catch {}
    }
  }

  // Approach 3: Click by the dropdown arrow icon
  if (!dropdownClicked) {
    try {
      const arrow = page.locator('.mat-select-arrow, .mat-mdc-select-arrow, mat-select .mat-icon').first();
      await arrow.click({ timeout: 5000 });
      dropdownClicked = true;
      console.log('   ✓ ドロップダウン矢印クリック');
    } catch {}
  }

  if (!dropdownClicked) {
    console.log('   ⚠️ ドロップダウンが見つかりません');
    // Debug: show all interactive elements
    const allEls = await page.locator('button, a, select, input, mat-select, [role="combobox"], [role="listbox"]').all();
    for (let i = 0; i < Math.min(allEls.length, 20); i++) {
      try {
        const tag = await allEls[i].evaluate(e => e.tagName);
        const text = (await allEls[i].textContent()).trim().replace(/\s+/g, ' ').substring(0, 60);
        const isVis = await allEls[i].isVisible();
        if (isVis) console.log(`   [${i}] ${tag}: "${text}"`);
      } catch {}
    }
    await ss(page, 'android-no-dropdown');

    console.log('\n⚠️ 手動で Android クライアントを作成してください:');
    console.log(`   URL: ${GCP}/auth/clients/create?project=${PROJECT_ID}`);
    console.log(`   タイプ: Android`);
    console.log(`   名前: 30sec Challenge Android`);
    console.log(`   パッケージ名: ${ANDROID_PACKAGE}`);
    console.log(`   SHA-1: ${ANDROID_SHA1}`);
    console.log('\n   作成したら Client ID を入力してください (or "skip"):');

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const input = await new Promise(r => process.stdin.once('data', d => r(d.trim())));

    if (input && input !== 'skip') {
      console.log(`   入力された Client ID: ${input}`);
      updateResults(input);
    }
    await browser.close();
    return;
  }

  // Wait for dropdown to open
  await page.waitForTimeout(1500);
  await ss(page, 'android-dropdown-open');

  // Select Android
  let selected = false;
  for (const sel of [
    'mat-option:has-text("Android")',
    '[role="option"]:has-text("Android")',
    'li:has-text("Android")',
  ]) {
    try {
      await page.locator(sel).first().click({ timeout: 3000 });
      console.log(`   ✓ Android 選択 (${sel})`);
      selected = true;
      break;
    } catch {}
  }

  if (!selected) {
    console.log('   ⚠️ Android オプションが見つかりません');
    // List all options
    const opts = await page.locator('mat-option, [role="option"]').all();
    for (let i = 0; i < opts.length; i++) {
      const text = (await opts[i].textContent()).trim();
      console.log(`   option[${i}]: "${text}"`);
    }
    await page.keyboard.press('Escape');
    await ss(page, 'android-no-option');
    await browser.close();
    return;
  }

  await page.waitForTimeout(2000);

  // Fill form
  const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"]):not([aria-label*="search"])').all();
  console.log(`   入力フィールド数: ${inputs.length}`);

  if (inputs.length >= 1) {
    await inputs[0].fill('30sec Challenge Android');
    console.log('   ✓ 名前');
  }
  if (inputs.length >= 2) {
    await inputs[1].fill(ANDROID_PACKAGE);
    console.log('   ✓ パッケージ名');
  }
  if (inputs.length >= 3) {
    await inputs[2].fill(ANDROID_SHA1);
    console.log('   ✓ SHA-1');
  }

  await ss(page, 'android-final-filled');

  // Create
  try {
    await page.locator('button:has-text("作成")').first().click({ timeout: 5000 });
    console.log('   ✓ 作成クリック');
  } catch {
    try {
      await page.locator('button:has-text("Create")').first().click({ timeout: 3000 });
    } catch {}
  }

  await page.waitForTimeout(6000);
  await ss(page, 'android-final-result');

  const bodyText = await page.locator('body').textContent();

  if (bodyText.includes('失敗') || bodyText.includes('すでに使用')) {
    console.log('   ⚠️ 作成失敗。競合がまだ解決されていません。');
    console.log('   → 「削除した OAuth クライアントを復元」ページで完全削除が必要な場合があります。');
    console.log('   → または、削除の反映に数分～数時間かかる場合があります。');

    // Try without SHA-1
    try {
      await page.locator('button:has-text("閉じる")').first().click({ timeout: 3000 });
    } catch {}
    await page.waitForTimeout(1000);

    if (inputs.length >= 3) {
      await inputs[2].fill('');
      console.log('\n   SHA-1 なしでリトライ...');
      try {
        await page.locator('button:has-text("作成")').first().click({ timeout: 5000 });
        await page.waitForTimeout(6000);
        await ss(page, 'android-nosha-result');

        const retryText = await page.locator('body').textContent();
        if (!retryText.includes('失敗')) {
          const idMatch = retryText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
          if (idMatch) {
            console.log(`   ✅ Android Client ID (SHA-1なし): ${idMatch[1]}`);
            updateResults(idMatch[1]);
          }
        } else {
          console.log('   SHA-1 なしでも失敗。');
        }
      } catch {}
    }
  } else {
    const idMatch = bodyText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
    if (idMatch) {
      console.log(`   ✅ Android Client ID: ${idMatch[1]}`);
      updateResults(idMatch[1]);
    } else {
      console.log('   Client ID 自動取得失敗。スクリーンショットを確認してください。');
    }
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await browser.close();
}

function updateResults(clientId) {
  try {
    const resultsPath = path.join(SCREENSHOTS_DIR, 'oauth-clients-final.json');
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    results.android = { name: '30sec Challenge Android', clientId };
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log('   結果ファイル更新完了');
  } catch (e) {
    console.log(`   結果保存エラー: ${e.message}`);
  }
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
