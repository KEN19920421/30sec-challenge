// Google Cloud Console OAuth setup for Firebase project sec-challenge-34060
// 1. Configure Google Auth Platform (branding + consent)
// 2. Create Web, iOS, Android OAuth 2.0 clients

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const PROJECT_ID = 'sec-challenge-34060';
const GCP = `https://console.cloud.google.com`;

const IOS_BUNDLE_ID = 'com.thirtysecchallenge.thirtySecChallenge';
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const ANDROID_SHA1 = '8E:59:D2:C2:09:4E:46:1B:15:0F:14:81:B8:6A:A0:08:BC:B9:FA:A0';
const APP_NAME = '30sec Challenge';
const USER_EMAIL = 'sk.appdevelop@gmail.com';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 40;

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

async function dismissPopups(page) {
  await tryClick(page, ['button:has-text("OK")'], 'Cookie', 1000);
  await tryClick(page, ['button[aria-label="吹き出しを閉じます"]'], 'tooltip', 1000);
  await tryClick(page, ['button[aria-label="アカウントの有効化バナー全体を閉じます"]'], 'banner', 1000);
}

// ═══════════════════════════════════════════
// Phase 1: Configure Auth Platform (Branding)
// ═══════════════════════════════════════════
async function setupAuthPlatform(page) {
  console.log('\n📋 Phase 1: Google Auth Platform (ブランディング) を設定...');

  await page.goto(`${GCP}/auth/overview/create?project=${PROJECT_ID}`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await dismissPopups(page);
  await ss(page, 'branding-page');

  // Check if already configured (redirected to overview)
  if (page.url().includes('/auth/overview') && !page.url().includes('/create')) {
    console.log('   ブランディングは既に設定済みです。');
    return true;
  }

  // Fill "アプリ名" - must NOT target the search bar at the top
  // The form inputs are NOT type="search". Target inputs within the main content area.
  const appNameInput = page.locator('input:not([type="search"]):not([aria-label*="検索"]):not([aria-label*="search"]):not([aria-label*="クエリ"])').first();
  try {
    await appNameInput.waitFor({ state: 'visible', timeout: 5000 });
    await appNameInput.click();
    await appNameInput.fill(APP_NAME);
    console.log(`   ✓ アプリ名: ${APP_NAME}`);
  } catch (e) {
    console.log(`   ⚠️ アプリ名入力欄が見つかりません: ${e.message}`);
    return false;
  }

  // Fill "ユーザー サポートメール" - it's a dropdown
  // First close any overlay (search dropdown etc.) by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // The email dropdown is a combobox within the form, not the search bar
  // Try to find it by looking near the "サポートメール" label
  const emailDropdownClicked = await tryClick(page, [
    'mat-form-field:has-text("サポートメール") >> mat-select',
    'mat-form-field:has-text("サポートメール") >> [role="combobox"]',
    'mat-form-field:has-text("メール") >> mat-select',
    // Try the second combobox (first is likely the search bar)
    'mat-select:visible',
    'select:visible',
  ], 'メールドロップダウン', 3000);

  if (emailDropdownClicked) {
    await page.waitForTimeout(1000);
    // Select the user's email from dropdown options
    const emailSelected = await tryClick(page, [
      `mat-option:has-text("${USER_EMAIL}")`,
      `[role="option"]:has-text("${USER_EMAIL}")`,
      `li:has-text("${USER_EMAIL}")`,
      `option:has-text("${USER_EMAIL}")`,
      // Try first option if email not found
      'mat-option:first-child',
      '[role="option"]:first-child',
    ], 'メール選択', 3000);

    if (!emailSelected) {
      console.log('   ⚠️ メールオプションが見つかりません');
    }
  } else {
    // Maybe it's a regular input
    const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
    try {
      await emailInput.waitFor({ state: 'visible', timeout: 2000 });
      await emailInput.fill(USER_EMAIL);
      console.log(`   ✓ メール入力: ${USER_EMAIL}`);
    } catch {
      console.log('   ⚠️ メール入力欄も見つかりません');
    }
  }

  await ss(page, 'branding-filled');

  // Click "次へ" to go to Step 2 (対象/Audience)
  await tryClick(page, ['button:has-text("次へ")', 'button:has-text("Next")'], 'Step1 次へ', 5000);
  await page.waitForTimeout(2000);
  await ss(page, 'branding-step2');

  // Step 2: 対象 (Audience) - select External
  // This might show radio buttons for Internal/External
  const externalClicked = await tryClick(page, [
    'mat-radio-button:has-text("外部")',
    'mat-radio-button:has-text("External")',
    'label:has-text("外部")',
    'label:has-text("External")',
    'input[value="external"]',
  ], '外部ユーザー選択', 3000);

  if (!externalClicked) {
    console.log('   対象選択画面でない場合はスキップ');
  }

  // Click "次へ" for step 2
  await tryClick(page, ['button:has-text("次へ")', 'button:has-text("Next")'], 'Step2 次へ', 5000);
  await page.waitForTimeout(2000);
  await ss(page, 'branding-step3');

  // Step 3: 連絡先情報 - requires at least one email address
  // This is a chip input: type email then press Enter to add it
  console.log('   Step 3: 連絡先情報 - メールアドレス入力');
  const contactInput = page.locator('input:visible:not([type="search"]):not([aria-label*="検索"]):not([aria-label*="クエリ"])').first();
  try {
    await contactInput.waitFor({ state: 'visible', timeout: 5000 });
    await contactInput.click();
    await contactInput.fill(USER_EMAIL);
    // Press Enter to confirm the email (chip input)
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log(`   ✓ 連絡先メール: ${USER_EMAIL}`);
  } catch (e) {
    console.log(`   ⚠️ メール入力失敗: ${e.message}`);
  }

  await ss(page, 'branding-step3-email');

  // Click "次へ" for step 3
  await tryClick(page, ['button:has-text("次へ")', 'button:has-text("Next")'], 'Step3 次へ', 5000);
  await page.waitForTimeout(2000);
  await ss(page, 'branding-step4');

  // Step 4: 終了 - check policy agreement checkbox, then click 続行, then 作成
  console.log('   Step 4: 終了 - ポリシー同意');

  // Check the policy agreement checkbox
  const checkboxClicked = await tryClick(page, [
    'input[type="checkbox"]',
    'mat-checkbox',
    '[role="checkbox"]',
    'label:has-text("同意")',
    'label:has-text("agree")',
  ], 'ポリシー同意チェックボックス', 5000);

  if (!checkboxClicked) {
    // Try clicking the text near the checkbox
    await tryClick(page, [
      'text=Google API サービス',
      'text=ユーザーデータに関するポリシー',
    ], 'ポリシーテキストクリック', 3000);
  }

  await page.waitForTimeout(500);

  // Click "続行" (Continue) button
  await tryClick(page, [
    'button:has-text("続行")',
    'button:has-text("Continue")',
  ], '続行ボタン', 5000);
  await page.waitForTimeout(1000);

  await ss(page, 'branding-step4-agreed');

  // Click "作成" (Create)
  const created = await tryClick(page, [
    'button:has-text("作成")',
    'button:has-text("Create")',
  ], '作成ボタン', 5000);

  if (created) {
    await page.waitForTimeout(5000);
    console.log('   ✅ Google Auth Platform の設定が完了しました。');
  } else {
    console.log('   ⚠️ 作成ボタンが見つかりません');
  }

  await ss(page, 'branding-done');
  return true;
}

// ═══════════════════════════════════════════
// Phase 2: Create OAuth Client
// Uses the classic Credentials page which is more stable
// ═══════════════════════════════════════════
async function createClient(page, type) {
  const label = type === 'web' ? 'ウェブ' : type === 'ios' ? 'iOS' : 'Android';

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🔑 ${label} OAuth クライアントを作成中...`);
  console.log(`${'─'.repeat(50)}`);

  // Use the classic credentials page - more reliable than the new Auth Platform UI
  const credUrl = `${GCP}/apis/credentials/oauthclient?project=${PROJECT_ID}`;
  console.log(`   URL: ${credUrl}`);
  await page.goto(credUrl);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await dismissPopups(page);
  await ss(page, `${type}-cred-page`);

  // Check if we got redirected or the page has a different layout
  const currentUrl = page.url();
  console.log(`   現在のURL: ${currentUrl}`);

  // If redirected to the new Auth Platform, try that instead
  if (currentUrl.includes('/auth/clients')) {
    console.log('   新しい Auth Platform UI にリダイレクトされました。');
    return await createClientNewUI(page, type);
  }

  // Classic Credentials page: Application type dropdown
  // The dropdown is a mat-select or regular select
  let typeSelected = false;

  // The classic page has a "アプリケーションの種類" (Application type) dropdown
  const typeMap = {
    web: ['ウェブ アプリケーション', 'Web application', 'ウェブ'],
    ios: ['iOS', 'iOS アプリ'],
    android: ['Android', 'Android アプリ'],
  };

  // Try clicking the dropdown
  const dropdownClicked = await tryClick(page, [
    'mat-select:visible',
    '[role="combobox"]:visible',
    '[role="listbox"]:visible',
    'select:visible',
  ], 'タイプドロップダウン', 5000);

  if (dropdownClicked) {
    await page.waitForTimeout(1000);
    for (const t of typeMap[type]) {
      if (await tryClick(page, [
        `mat-option:has-text("${t}")`,
        `[role="option"]:has-text("${t}")`,
        `option:has-text("${t}")`,
        `li:has-text("${t}")`,
      ], `タイプ: ${t}`, 2000)) {
        typeSelected = true;
        break;
      }
    }
  }

  if (!typeSelected) {
    console.log('   ドロップダウンが見つかりません。デバッグ情報:');
    const allEls = await page.locator('button:visible, a:visible, mat-select:visible, select:visible, input:visible, [role="combobox"]:visible').all();
    for (let i = 0; i < Math.min(allEls.length, 30); i++) {
      const tag = await allEls[i].evaluate(e => e.tagName);
      const text = (await allEls[i].textContent()).trim().replace(/\s+/g, ' ').substring(0, 80);
      const ariaLabel = await allEls[i].getAttribute('aria-label') || '';
      if (text || ariaLabel) console.log(`   ${tag}[${i}]: "${text}" aria="${ariaLabel}"`);
    }
    await ss(page, `${type}-type-failed`);
    return null;
  }

  await page.waitForTimeout(2000);
  await ss(page, `${type}-type-selected`);

  // Fill form fields - skip search bar inputs
  const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"]):not([aria-label*="search"]):not([aria-label*="クエリ"])').all();
  console.log(`   入力フィールド数: ${inputs.length}`);
  for (let i = 0; i < inputs.length; i++) {
    const p = await inputs[i].getAttribute('placeholder') || '';
    const a = await inputs[i].getAttribute('aria-label') || '';
    const n = await inputs[i].getAttribute('name') || '';
    const v = await inputs[i].inputValue().catch(() => '');
    console.log(`   input[${i}]: placeholder="${p}" aria="${a}" name="${n}" value="${v}"`);
  }

  if (type === 'web') {
    // Name field (first input after type selection)
    if (inputs.length >= 1) {
      await inputs[0].click();
      await inputs[0].fill(`${APP_NAME} Web`);
      console.log(`   ✓ 名前: ${APP_NAME} Web`);
    }
  } else if (type === 'ios') {
    // Name + Bundle ID
    if (inputs.length >= 1) {
      await inputs[0].click();
      await inputs[0].fill(`${APP_NAME} iOS`);
      console.log(`   ✓ 名前: ${APP_NAME} iOS`);
    }
    // Bundle ID - might be a separate field
    const bundleInput = page.locator('input[aria-label*="バンドル"], input[name*="bundle"], input[placeholder*="bundle"], input[placeholder*="com."]').first();
    try {
      await bundleInput.waitFor({ state: 'visible', timeout: 3000 });
      await bundleInput.fill(IOS_BUNDLE_ID);
      console.log(`   ✓ バンドルID: ${IOS_BUNDLE_ID}`);
    } catch {
      // Try second input
      if (inputs.length >= 2) {
        await inputs[1].click();
        await inputs[1].fill(IOS_BUNDLE_ID);
        console.log(`   ✓ バンドルID (input[1]): ${IOS_BUNDLE_ID}`);
      }
    }
    // App Store ID - optional, skip
  } else if (type === 'android') {
    // Name + Package name + SHA-1
    if (inputs.length >= 1) {
      await inputs[0].click();
      await inputs[0].fill(`${APP_NAME} Android`);
      console.log(`   ✓ 名前: ${APP_NAME} Android`);
    }
    // Package name
    const pkgInput = page.locator('input[aria-label*="パッケージ"], input[name*="package"], input[placeholder*="com."]').first();
    try {
      await pkgInput.waitFor({ state: 'visible', timeout: 3000 });
      await pkgInput.fill(ANDROID_PACKAGE);
      console.log(`   ✓ パッケージ名: ${ANDROID_PACKAGE}`);
    } catch {
      if (inputs.length >= 2) {
        await inputs[1].click();
        await inputs[1].fill(ANDROID_PACKAGE);
        console.log(`   ✓ パッケージ名 (input[1]): ${ANDROID_PACKAGE}`);
      }
    }
    // SHA-1
    const shaInput = page.locator('input[aria-label*="SHA"], input[name*="sha"], input[placeholder*="SHA"]').first();
    try {
      await shaInput.waitFor({ state: 'visible', timeout: 3000 });
      await shaInput.fill(ANDROID_SHA1);
      console.log(`   ✓ SHA-1: ${ANDROID_SHA1}`);
    } catch {
      if (inputs.length >= 3) {
        await inputs[2].click();
        await inputs[2].fill(ANDROID_SHA1);
        console.log(`   ✓ SHA-1 (input[2]): ${ANDROID_SHA1}`);
      }
    }
  }

  await ss(page, `${type}-filled`);

  // Click Create / 作成
  const created = await tryClick(page, [
    'button:has-text("作成")',
    'button:has-text("Create")',
    'button:has-text("保存")',
    'button:has-text("Save")',
  ], '作成', 5000);

  if (!created) {
    console.log('   ⚠️ 作成ボタンなし');
    await ss(page, `${type}-no-create`);
    return null;
  }

  await page.waitForTimeout(5000);
  await ss(page, `${type}-created`);

  // Extract client ID and secret from the result dialog/page
  return await extractClientCredentials(page, type);
}

// Fallback: Create client using the new Auth Platform UI
async function createClientNewUI(page, type) {
  console.log('   Auth Platform UI でクライアント作成を試みます...');

  // Look for create button on the clients list page
  const createClicked = await tryClick(page, [
    'a:has-text("クライアントを作成")',
    'button:has-text("クライアントを作成")',
    'a:has-text("Create client")',
    'button:has-text("Create client")',
    'a:has-text("OAuth クライアント ID の作成")',
    'a[href*="/create"]',
    'button:has-text("作成")',
  ], 'クライアント作成ボタン', 5000);

  if (!createClicked) {
    console.log('   クライアント作成ボタンが見つかりません。');
    const els = await page.locator('button:visible, a:visible').all();
    for (let i = 0; i < Math.min(els.length, 30); i++) {
      const tag = await els[i].evaluate(e => e.tagName);
      const text = (await els[i].textContent()).trim().replace(/\s+/g, ' ').substring(0, 80);
      const href = await els[i].getAttribute('href') || '';
      if (text) console.log(`   ${tag}[${i}]: "${text}" ${href ? 'href=' + href : ''}`);
    }
    return null;
  }

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await ss(page, `${type}-newui-form`);

  // Type selection dropdown
  const typeMap = {
    web: ['ウェブ アプリケーション', 'Web application', 'ウェブ'],
    ios: ['iOS'],
    android: ['Android'],
  };

  const dropdowns = await page.locator('mat-select:visible, [role="combobox"]:visible').all();
  let typeSelected = false;

  for (const dd of dropdowns) {
    try {
      await dd.click();
      await page.waitForTimeout(1000);
      for (const t of typeMap[type]) {
        if (await tryClick(page, [
          `mat-option:has-text("${t}")`,
          `[role="option"]:has-text("${t}")`,
        ], `タイプ: ${t}`, 2000)) {
          typeSelected = true;
          break;
        }
      }
      if (typeSelected) break;
      await page.keyboard.press('Escape');
    } catch { /* next */ }
  }

  if (!typeSelected) {
    console.log('   ⚠️ タイプ選択失敗');
    return null;
  }

  await page.waitForTimeout(2000);

  // Fill fields
  const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"])').all();
  if (type === 'web' && inputs.length >= 1) {
    await inputs[0].fill(`${APP_NAME} Web`);
  } else if (type === 'ios') {
    if (inputs.length >= 1) await inputs[0].fill(`${APP_NAME} iOS`);
    if (inputs.length >= 2) await inputs[1].fill(IOS_BUNDLE_ID);
  } else if (type === 'android') {
    if (inputs.length >= 1) await inputs[0].fill(`${APP_NAME} Android`);
    if (inputs.length >= 2) await inputs[1].fill(ANDROID_PACKAGE);
    if (inputs.length >= 3) await inputs[2].fill(ANDROID_SHA1);
  }

  await tryClick(page, [
    'button:has-text("作成")',
    'button:has-text("Create")',
  ], '作成', 5000);

  await page.waitForTimeout(5000);
  return await extractClientCredentials(page, type);
}

// Extract client ID and secret from result
async function extractClientCredentials(page, type) {
  let clientId = null;
  let clientSecret = null;

  await ss(page, `${type}-result`);

  try {
    const bodyText = await page.locator('body').textContent();
    const idMatch = bodyText.match(/(\d+-[a-z0-9]+\.apps\.googleusercontent\.com)/);
    if (idMatch) {
      clientId = idMatch[1];
      console.log(`   ✅ Client ID: ${clientId}`);
    }
    if (type === 'web') {
      const secretMatch = bodyText.match(/GOCSPX-[a-zA-Z0-9_-]+/);
      if (secretMatch) {
        clientSecret = secretMatch[0];
        console.log(`   ✅ Client Secret: ${clientSecret}`);
      }
    }
  } catch { /* */ }

  if (!clientId) {
    console.log('   ⚠️ Client ID を自動取得できませんでした。');
    console.log('   手動でクライアントIDをコピーしてください。');
    // Wait for user to see it
    await page.waitForTimeout(3000);
  }

  // Close dialog if present
  await tryClick(page, [
    'button:has-text("OK")',
    'button:has-text("閉じる")',
    'button:has-text("Close")',
    'button[aria-label="閉じる"]',
    'button[aria-label="Close"]',
  ], 'ダイアログ閉じる', 2000);

  return { clientId, clientSecret };
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════
async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  console.log('🔗 Google Cloud Console を開いています...');
  await page.goto(`${GCP}/apis/credentials?project=${PROJECT_ID}`);
  console.log('⏳ ログインしてください...');
  // Wait until we're on a GCP console page (any path with the project)
  await page.waitForFunction(
    () => window.location.hostname.includes('console.cloud.google.com'),
    { timeout: 300000 }
  );
  await page.waitForTimeout(5000);
  console.log('✅ ログイン完了');

  // Phase 1: Auth Platform setup
  await setupAuthPlatform(page);

  // Phase 2: Create clients
  const web = await createClient(page, 'web');
  const ios = await createClient(page, 'ios');
  const android = await createClient(page, 'android');

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📋 OAuth クライアント作成結果');
  console.log('═'.repeat(50));
  console.log(`  Web:     ${web?.clientId || '手動確認'}`);
  if (web?.clientSecret) console.log(`  Secret:  ${web.clientSecret}`);
  console.log(`  iOS:     ${ios?.clientId || '手動確認'}`);
  console.log(`  Android: ${android?.clientId || '手動確認'}`);

  const results = { project: PROJECT_ID, web, ios, android };
  const rp = path.join(SCREENSHOTS_DIR, 'oauth-results.json');
  fs.writeFileSync(rp, JSON.stringify(results, null, 2));
  console.log(`\n  結果: ${rp}`);
  console.log('  確認後 Enter で終了');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await browser.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
