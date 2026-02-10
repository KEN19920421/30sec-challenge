// Create Android OAuth client in sec-challenge-34060
// Uses persistent browser context for session reuse
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
let step = 150;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Navigate to OAuth client creation page
  console.log('🔗 OAuth クライアント作成ページに移動...');
  await page.goto(`${GCP}/auth/clients/create?project=${PROJECT_ID}`);

  // Wait for GCP console to load (may need login)
  console.log('⏳ ログインが必要な場合はログインしてください...');
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('console.cloud.google.com') && !url.includes('accounts.google.com')) {
      const text = await page.locator('body').textContent().catch(() => '');
      if (text.length > 300 && (text.includes('client') || text.includes('クライアント') || text.includes('Application type') || text.includes('アプリケーション'))) {
        console.log('✅ ページ読み込み完了');
        break;
      }
    }
    if (i % 15 === 0 && i > 0) console.log(`   ... 待機中 (${i * 2}秒)`);
  }

  await page.waitForTimeout(3000);

  // Dismiss popups (Gemini, tooltips, etc.)
  for (const sel of ['button:has-text("OK")', 'button[aria-label="吹き出しを閉じます"]', 'button[aria-label="Close"]']) {
    try { await page.locator(sel).first().click({ timeout: 1000 }); } catch {}
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  await ss(page, 'android-create-page');

  // Step 1: Select "Android" from the application type dropdown
  console.log('\n📋 アプリケーションの種類: Android を選択...');

  // Find and click the dropdown
  let dropdownClicked = false;

  // Try mat-select elements
  const matSelects = await page.locator('mat-select:visible').all();
  console.log(`   mat-select 数: ${matSelects.length}`);
  for (let i = 0; i < matSelects.length; i++) {
    try {
      const text = (await matSelects[i].textContent()).trim();
      console.log(`   mat-select[${i}]: "${text}"`);
      await matSelects[i].click();
      dropdownClicked = true;
      console.log(`   ✓ mat-select[${i}] クリック`);
      break;
    } catch {}
  }

  if (!dropdownClicked) {
    // Try role=combobox
    const comboboxes = await page.locator('[role="combobox"]:visible').all();
    console.log(`   combobox 数: ${comboboxes.length}`);
    for (const cb of comboboxes) {
      try {
        await cb.click();
        dropdownClicked = true;
        console.log('   ✓ combobox クリック');
        break;
      } catch {}
    }
  }

  if (!dropdownClicked) {
    console.log('   ⚠️ ドロップダウンが見つかりません');
    await ss(page, 'android-no-dropdown');
    // Try reloading
    await page.reload();
    await page.waitForTimeout(8000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    const retry = await page.locator('mat-select:visible').all();
    if (retry.length > 0) {
      await retry[0].click();
      dropdownClicked = true;
      console.log('   ✓ リロード後にドロップダウンクリック');
    }
  }

  if (!dropdownClicked) {
    console.log('   ❌ ドロップダウンが見つかりません。手動で作成してください。');
    await ss(page, 'android-failed');
    await context.close();
    return;
  }

  await page.waitForTimeout(1500);
  await ss(page, 'android-dropdown-open');

  // Select Android option
  let androidSelected = false;
  for (const sel of [
    'mat-option:has-text("Android")',
    '[role="option"]:has-text("Android")',
    'li:has-text("Android")',
  ]) {
    try {
      await page.locator(sel).first().click({ timeout: 3000 });
      androidSelected = true;
      console.log(`   ✓ Android 選択 (${sel})`);
      break;
    } catch {}
  }

  if (!androidSelected) {
    // List available options
    const opts = await page.locator('mat-option, [role="option"]').all();
    for (let i = 0; i < opts.length; i++) {
      const text = (await opts[i].textContent()).trim();
      console.log(`   option[${i}]: "${text}"`);
      if (text.includes('Android')) {
        await opts[i].click();
        androidSelected = true;
        console.log(`   ✓ Android 選択 (index ${i})`);
        break;
      }
    }
  }

  if (!androidSelected) {
    console.log('   ❌ Android オプションが見つかりません');
    await page.keyboard.press('Escape');
    await ss(page, 'android-no-option');
    await context.close();
    return;
  }

  await page.waitForTimeout(2000);

  // Step 2: Fill in the form fields
  console.log('\n📝 フォーム入力...');
  const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"]):not([aria-label*="search"]):not([aria-label*="Search"])').all();
  console.log(`   入力フィールド数: ${inputs.length}`);

  for (let i = 0; i < inputs.length; i++) {
    try {
      const placeholder = await inputs[i].getAttribute('placeholder') || '';
      const name = await inputs[i].getAttribute('name') || '';
      const label = await inputs[i].getAttribute('aria-label') || '';
      console.log(`   input[${i}]: placeholder="${placeholder}" name="${name}" label="${label}"`);
    } catch {}
  }

  // Fill name, package name, SHA-1
  if (inputs.length >= 1) {
    await inputs[0].fill('30sec Challenge Android');
    console.log('   ✓ 名前: 30sec Challenge Android');
  }
  if (inputs.length >= 2) {
    await inputs[1].fill(ANDROID_PACKAGE);
    console.log(`   ✓ パッケージ名: ${ANDROID_PACKAGE}`);
  }
  if (inputs.length >= 3) {
    await inputs[2].fill(ANDROID_SHA1);
    console.log(`   ✓ SHA-1: ${ANDROID_SHA1}`);
  }

  await page.waitForTimeout(1000);
  await ss(page, 'android-form-filled');

  // Step 3: Click Create
  console.log('\n📋 作成ボタンをクリック...');
  let created = false;
  for (const sel of [
    'button:has-text("作成")',
    'button:has-text("Create")',
    'button[type="submit"]',
  ]) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible()) {
        await btn.click();
        created = true;
        console.log(`   ✓ ${sel}`);
        break;
      }
    } catch {}
  }

  if (!created) {
    console.log('   ⚠️ 作成ボタンが見つかりません');
    const btns = await page.locator('button:visible').all();
    for (let i = 0; i < btns.length; i++) {
      const text = (await btns[i].textContent()).trim();
      if (text.length > 0 && text.length < 30) console.log(`   button[${i}]: "${text}"`);
    }
  }

  await page.waitForTimeout(6000);
  await ss(page, 'android-result');

  // Check result
  const bodyText = await page.locator('body').textContent();

  if (bodyText.includes('失敗') || bodyText.includes('すでに使用') || bodyText.includes('already') || bodyText.includes('error') || bodyText.includes('Error')) {
    console.log('\n⚠️ 作成に失敗しました。');

    // Check specific error
    if (bodyText.includes('すでに使用') || bodyText.includes('already')) {
      console.log('   パッケージ名+SHA-1 がまだ使用中です。');
      console.log('   削除の伝播に時間がかかっている可能性があります。');

      // Try without SHA-1
      console.log('\n📋 SHA-1 なしでリトライ...');
      try {
        // Close error dialog
        for (const sel of ['button:has-text("閉じる")', 'button:has-text("Close")', 'button:has-text("OK")']) {
          try { await page.locator(sel).first().click({ timeout: 2000 }); } catch {}
        }
        await page.waitForTimeout(1000);

        // Clear SHA-1 field
        if (inputs.length >= 3) {
          await inputs[2].fill('');
          console.log('   SHA-1 フィールドをクリア');
        }

        // Click create again
        for (const sel of ['button:has-text("作成")', 'button:has-text("Create")']) {
          try {
            await page.locator(sel).first().click({ timeout: 5000 });
            console.log(`   ✓ ${sel}`);
            break;
          } catch {}
        }

        await page.waitForTimeout(6000);
        await ss(page, 'android-retry-result');

        const retryText = await page.locator('body').textContent();
        if (!retryText.includes('失敗') && !retryText.includes('error')) {
          const idMatch = retryText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
          if (idMatch) {
            console.log(`\n✅ Android Client ID (SHA-1なし): ${idMatch[1]}`);
            console.log('   後で SHA-1 を追加してください。');
            saveResult(idMatch[1]);
          }
        } else {
          console.log('   SHA-1 なしでも失敗。');
        }
      } catch (e) {
        console.log(`   リトライエラー: ${e.message}`);
      }
    }
  } else {
    // Success - extract client ID
    const idMatch = bodyText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);
    if (idMatch) {
      console.log(`\n✅ Android Client ID: ${idMatch[1]}`);
      saveResult(idMatch[1]);
    } else {
      console.log('\n⚠️ Client ID を自動取得できませんでした。スクリーンショットを確認してください。');

      // Try to find it in credential elements
      const codeEls = await page.locator('code, input[readonly], [class*="client-id"]').all();
      for (const el of codeEls) {
        try {
          const text = ((await el.textContent().catch(() => '')) || (await el.inputValue().catch(() => ''))).trim();
          if (text.includes('.apps.googleusercontent.com')) {
            console.log(`   Found: ${text}`);
            saveResult(text);
            break;
          }
        } catch {}
      }
    }
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

function saveResult(clientId) {
  try {
    const resultsPath = path.join(SCREENSHOTS_DIR, 'oauth-clients-final.json');
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    results.android = { name: '30sec Challenge Android', clientId };
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log('   結果ファイル更新完了');
  } catch (e) {
    console.log(`   結果保存: ${e.message}`);
    // Save standalone
    const standalone = { android: { name: '30sec Challenge Android', clientId } };
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'android-oauth.json'), JSON.stringify(standalone, null, 2));
  }
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
