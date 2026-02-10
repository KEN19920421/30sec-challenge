// AdMob: register apps + create ad units
// Key insight: AdMob uses Angular <material-button> (not <button>/<a>),
// so we must use [role="button"] or material-button selectors.
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 280;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function waitForStable(page, ms = 3000) {
  await page.waitForTimeout(ms);
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
}

// Click first matching element from a list of selectors
// Supports material-button, button, a, and role="button"
async function clickMat(page, selectors, desc, timeout = 5000) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.click();
      console.log(`   ✓ ${desc}`);
      return true;
    } catch {}
  }
  return false;
}

// Click element by visible text (works for any element type)
async function clickByText(page, text, desc, timeout = 5000) {
  try {
    const el = page.getByText(text, { exact: true });
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
    console.log(`   ✓ ${desc}`);
    return true;
  } catch {}
  return false;
}

async function addApp(page, platform, appName) {
  console.log(`\n═══ ${platform} アプリを登録 ═══`);

  await page.goto('https://apps.admob.com/v2/apps/list');
  await waitForStable(page, 4000);

  // Close search dropdown if open
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await ss(page, `${platform.toLowerCase()}-list`);

  // Click "アプリを登録して利用を開始" - this is a <material-button role="button">
  let clicked = await clickMat(page, [
    'material-button:has-text("アプリを登録して利用を開始")',
    '[role="button"]:has-text("アプリを登録して利用を開始")',
    'material-button:has-text("Add your first app")',
  ], 'アプリ登録ボタン');

  if (!clicked) {
    // Second app: the page will show existing apps, use "アプリを追加" instead
    clicked = await clickMat(page, [
      'material-button:has-text("アプリを追加")',
      '[role="button"]:has-text("アプリを追加")',
      'material-button:has-text("Add app")',
      '[role="button"]:has-text("Add app")',
    ], 'アプリ追加ボタン');
  }

  if (!clicked) {
    // Fallback: use getByText
    clicked = await clickByText(page, 'アプリを登録して利用を開始', 'アプリ登録(text)');
  }

  if (!clicked) {
    console.log('   ⚠️ ボタンが見つかりません');
    await ss(page, `${platform.toLowerCase()}-no-btn`);
    return null;
  }

  await waitForStable(page, 3000);
  await ss(page, `${platform.toLowerCase()}-add-step1`);

  // Select platform
  const plat = platform === 'iOS' ? 'iOS' : 'Android';
  let platClicked = await clickMat(page, [
    `material-radio:has-text("${plat}")`,
    `[role="radio"]:has-text("${plat}")`,
    `label:has-text("${plat}")`,
    `material-radio-button:has-text("${plat}")`,
  ], `プラットフォーム: ${plat}`, 5000);

  if (!platClicked) {
    platClicked = await clickByText(page, plat, `プラットフォーム: ${plat}(text)`);
  }

  await page.waitForTimeout(1000);

  // "Is app listed in store?" -> No
  await clickMat(page, [
    'material-radio:has-text("いいえ")',
    '[role="radio"]:has-text("いいえ")',
    'label:has-text("いいえ")',
    'material-radio:has-text("No")',
    '[role="radio"]:has-text("No")',
    'label:has-text("No")',
  ], 'ストア未公開: いいえ', 5000);

  await page.waitForTimeout(1500);
  await ss(page, `${platform.toLowerCase()}-add-step2`);

  // Fill app name - skip search bar inputs
  const allInputs = await page.locator('input:visible').all();
  let nameFilled = false;
  for (const input of allInputs) {
    try {
      const placeholder = (await input.getAttribute('placeholder')) || '';
      const ariaLabel = (await input.getAttribute('aria-label')) || '';
      const type = (await input.getAttribute('type')) || 'text';
      // Skip search bar and non-text inputs
      if (type !== 'text') continue;
      if (placeholder.includes('検索') || ariaLabel.includes('検索') ||
          placeholder.includes('search') || ariaLabel.includes('Search') ||
          placeholder.includes('アプリ、広告ユニット')) continue;

      await input.click();
      await input.fill(appName);
      nameFilled = true;
      console.log(`   ✓ アプリ名: ${appName}`);
      break;
    } catch {}
  }

  if (!nameFilled) {
    console.log('   ⚠️ アプリ名フィールドが見つかりません');
  }

  await page.waitForTimeout(500);
  await ss(page, `${platform.toLowerCase()}-form`);

  // Click "追加" / "アプリを追加"
  await clickMat(page, [
    'material-button:has-text("アプリを追加")',
    '[role="button"]:has-text("アプリを追加")',
    'material-button:has-text("Add app")',
    'material-button:has-text("追加")',
    '[role="button"]:has-text("追加")',
    'material-button:has-text("Add")',
    'button:has-text("アプリを追加")',
    'button:has-text("Add app")',
  ], 'アプリ追加', 5000);

  await waitForStable(page, 5000);
  await ss(page, `${platform.toLowerCase()}-created`);

  // Extract App ID
  const bodyText = await page.locator('body').textContent();
  const appIdMatch = bodyText.match(/(ca-app-pub-\d+~\d+)/);
  let appId = null;
  if (appIdMatch) {
    appId = appIdMatch[1];
    console.log(`   ✅ ${platform} App ID: ${appId}`);
  } else {
    console.log('   ⚠️ App ID 取得失敗');
    // Debug: print snippet
    console.log(`   テキスト(先頭300): ${bodyText.substring(0, 300).replace(/\s+/g, ' ')}`);
  }

  // Click Done/完了
  await clickMat(page, [
    'material-button:has-text("完了")',
    '[role="button"]:has-text("完了")',
    'material-button:has-text("Done")',
    'button:has-text("完了")',
    'button:has-text("Done")',
  ], '完了', 5000);

  await waitForStable(page, 2000);
  return appId;
}

async function createAdUnit(page, adType, unitName) {
  console.log(`\n   --- ${unitName} ---`);

  // Click "広告ユニットを追加"
  const addClicked = await clickMat(page, [
    'material-button:has-text("広告ユニットを追加")',
    '[role="button"]:has-text("広告ユニットを追加")',
    'material-button:has-text("Add ad unit")',
    'button:has-text("広告ユニットを追加")',
    'a:has-text("広告ユニットを追加")',
  ], '広告ユニット追加');

  if (!addClicked) {
    console.log('   ⚠️ 追加ボタンなし');
    return null;
  }

  await waitForStable(page, 2000);
  await ss(page, `unit-type-${adType.toLowerCase()}`);

  // Select ad type
  const typeLabels = {
    'Banner': ['バナー', 'Banner'],
    'Interstitial': ['インタースティシャル', 'Interstitial'],
    'Rewarded': ['リワード', 'Rewarded'],
    'Native': ['ネイティブ アドバンス', 'Native advanced', 'ネイティブ', 'Native'],
  };
  const labels = typeLabels[adType] || [adType];

  let typeClicked = false;
  for (const label of labels) {
    if (await clickMat(page, [
      `material-button:has-text("${label}")`,
      `[role="button"]:has-text("${label}")`,
      `material-card:has-text("${label}") material-button`,
      `div:has-text("${label}") >> material-button:has-text("選択")`,
      `div:has-text("${label}") >> material-button:has-text("Select")`,
    ], `タイプ: ${label}`, 3000)) {
      typeClicked = true;
      break;
    }
  }

  // Fallback: try clicking any visible card/button with the type name
  if (!typeClicked) {
    for (const label of labels) {
      if (await clickByText(page, label, `タイプ(text): ${label}`, 2000)) {
        typeClicked = true;
        break;
      }
    }
  }

  if (!typeClicked) {
    console.log(`   ⚠️ ${adType} タイプ選択失敗`);
    await ss(page, `type-fail-${adType.toLowerCase()}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    return null;
  }

  await waitForStable(page, 2000);

  // Fill unit name
  const nameInputs = await page.locator('input:visible').all();
  for (const ni of nameInputs) {
    try {
      const placeholder = (await ni.getAttribute('placeholder')) || '';
      const ariaLabel = (await ni.getAttribute('aria-label')) || '';
      const type = (await ni.getAttribute('type')) || 'text';
      if (type !== 'text') continue;
      if (placeholder.includes('検索') || ariaLabel.includes('検索')) continue;
      await ni.click();
      await ni.fill(unitName);
      console.log(`   ✓ 名前: ${unitName}`);
      break;
    } catch {}
  }

  await page.waitForTimeout(500);

  // Click create
  await clickMat(page, [
    'material-button:has-text("広告ユニットを作成")',
    '[role="button"]:has-text("広告ユニットを作成")',
    'material-button:has-text("Create ad unit")',
    'material-button:has-text("作成")',
    'material-button:has-text("Create")',
    'button:has-text("広告ユニットを作成")',
  ], '作成');

  await waitForStable(page, 3000);
  await ss(page, `unit-created-${adType.toLowerCase()}`);

  // Extract unit ID
  const text = await page.locator('body').textContent();
  const idMatch = text.match(/(ca-app-pub-\d+\/\d+)/);
  let unitId = null;
  if (idMatch) {
    unitId = idMatch[1];
    console.log(`   ✅ ${adType}: ${unitId}`);
  } else {
    console.log('   ⚠️ Unit ID 取得失敗');
  }

  // Done
  await clickMat(page, [
    'material-button:has-text("完了")',
    '[role="button"]:has-text("完了")',
    'material-button:has-text("Done")',
    'button:has-text("完了")',
  ], '完了', 3000);

  await page.waitForTimeout(1500);
  return unitId;
}

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 400,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled', '--disable-popup-blocking'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(120000);

  const results = { android: { appId: null, units: {} }, ios: { appId: null, units: {} } };

  // === Android ===
  results.android.appId = await addApp(page, 'Android', '30sec Challenge');

  // Navigate to Ad units tab
  await clickMat(page, [
    'material-tab:has-text("広告ユニット")',
    '[role="tab"]:has-text("広告ユニット")',
    'a:has-text("広告ユニット")',
    'material-tab:has-text("Ad units")',
    '[role="tab"]:has-text("Ad units")',
  ], '広告ユニットタブ', 5000);
  await waitForStable(page, 2000);

  for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
    const id = await createAdUnit(page, type, `${type}_Android`);
    if (id) results.android.units[type.toLowerCase()] = id;
  }

  // === iOS ===
  results.ios.appId = await addApp(page, 'iOS', '30sec Challenge');

  await clickMat(page, [
    'material-tab:has-text("広告ユニット")',
    '[role="tab"]:has-text("広告ユニット")',
    'a:has-text("広告ユニット")',
    'material-tab:has-text("Ad units")',
    '[role="tab"]:has-text("Ad units")',
  ], '広告ユニットタブ', 5000);
  await waitForStable(page, 2000);

  for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
    const id = await createAdUnit(page, type, `${type}_iOS`);
    if (id) results.ios.units[type.toLowerCase()] = id;
  }

  // Print results
  console.log('\n═══════════════════════════════════════');
  console.log('📋 AdMob 設定結果');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(results, null, 2));
  console.log('═══════════════════════════════════════');

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'admob-results.json'), JSON.stringify(results, null, 2));
  console.log('結果保存完了');

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
