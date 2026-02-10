// AdMob: register apps + create ad units (v4 - fixed "次へ" step)
// AdMob uses Angular <material-button> not standard <button>
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 300;

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

// Click first matching element - supports material-button and standard elements
async function clickEl(page, selectors, desc, timeout = 5000) {
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

async function addApp(page, platform, appName) {
  console.log(`\n═══ ${platform} アプリを登録 ═══`);

  await page.goto('https://apps.admob.com/v2/apps/list');
  await waitForStable(page, 4000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Step 0: Click register button (empty state or "Add app")
  let clicked = await clickEl(page, [
    'material-button:has-text("アプリを登録して利用を開始")',
    '[role="button"]:has-text("アプリを登録して利用を開始")',
  ], 'アプリ登録ボタン');

  if (!clicked) {
    clicked = await clickEl(page, [
      'material-button:has-text("アプリを追加")',
      '[role="button"]:has-text("アプリを追加")',
      'material-button:has-text("Add app")',
    ], 'アプリ追加ボタン');
  }

  if (!clicked) {
    console.log('   ⚠️ ボタンが見つかりません');
    return null;
  }

  await waitForStable(page, 3000);

  // Step 1: Select platform
  await clickEl(page, [
    `material-radio:has-text("${platform}")`,
    `[role="radio"]:has-text("${platform}")`,
    `label:has-text("${platform}")`,
  ], `プラットフォーム: ${platform}`, 5000);

  await page.waitForTimeout(1000);

  // Step 2: Store listing -> いいえ (No)
  await clickEl(page, [
    'material-radio:has-text("いいえ")',
    '[role="radio"]:has-text("いいえ")',
    'label:has-text("いいえ")',
  ], 'ストア未公開: いいえ', 5000);

  await page.waitForTimeout(1000);
  await ss(page, `${platform.toLowerCase()}-step1`);

  // Step 3: Click "次へ" (Next) - THIS WAS THE MISSING STEP!
  const nextClicked = await clickEl(page, [
    'material-button:has-text("次へ")',
    '[role="button"]:has-text("次へ")',
    'button:has-text("次へ")',
    'material-button:has-text("Next")',
    '[role="button"]:has-text("Next")',
    'button:has-text("Next")',
  ], '次へ', 5000);

  if (!nextClicked) {
    console.log('   ⚠️ 「次へ」ボタンが見つかりません');
    // Debug: dump all material-button texts
    const mbs = await page.locator('material-button:visible, [role="button"]:visible').all();
    for (const mb of mbs) {
      try {
        const t = (await mb.textContent()).trim().substring(0, 50);
        if (t) console.log(`     [btn]: "${t}"`);
      } catch {}
    }
    await ss(page, `${platform.toLowerCase()}-no-next`);
    return null;
  }

  await waitForStable(page, 3000);
  await ss(page, `${platform.toLowerCase()}-step2`);

  // Step 4: Fill app name
  const allInputs = await page.locator('input:visible').all();
  let nameFilled = false;
  for (const input of allInputs) {
    try {
      const placeholder = (await input.getAttribute('placeholder')) || '';
      const ariaLabel = (await input.getAttribute('aria-label')) || '';
      const type = (await input.getAttribute('type')) || 'text';
      if (type !== 'text' && type !== '') continue;
      if (placeholder.includes('検索') || ariaLabel.includes('検索') ||
          placeholder.includes('アプリ、広告ユニット')) continue;
      await input.click();
      await input.fill(appName);
      nameFilled = true;
      console.log(`   ✓ アプリ名: ${appName}`);
      break;
    } catch {}
  }

  if (!nameFilled) {
    // Fallback: try material-input
    const matInputs = await page.locator('material-input input:visible, [debugid] input:visible').all();
    for (const mi of matInputs) {
      try {
        await mi.click();
        await mi.fill(appName);
        nameFilled = true;
        console.log(`   ✓ アプリ名(mat): ${appName}`);
        break;
      } catch {}
    }
  }

  if (!nameFilled) {
    console.log('   ⚠️ アプリ名フィールドが見つかりません');
    // Debug: dump input info
    const inputs = await page.locator('input:visible').all();
    for (const inp of inputs) {
      try {
        const tag = await inp.evaluate(el => el.outerHTML.substring(0, 200));
        console.log(`     [input]: ${tag}`);
      } catch {}
    }
  }

  await page.waitForTimeout(500);
  await ss(page, `${platform.toLowerCase()}-name`);

  // Step 5: Click "アプリを追加" (Add app)
  await clickEl(page, [
    'material-button:has-text("アプリを追加")',
    '[role="button"]:has-text("アプリを追加")',
    'material-button:has-text("Add app")',
    'button:has-text("アプリを追加")',
    'button:has-text("Add app")',
  ], 'アプリ追加', 5000);

  await waitForStable(page, 6000);
  await ss(page, `${platform.toLowerCase()}-created`);

  // Extract App ID (ca-app-pub-XXXX~YYYY)
  const bodyText = await page.locator('body').textContent();
  const appIdMatch = bodyText.match(/(ca-app-pub-\d+~\d+)/);
  let appId = null;
  if (appIdMatch) {
    appId = appIdMatch[1];
    console.log(`   ✅ ${platform} App ID: ${appId}`);
  } else {
    console.log('   ⚠️ App ID 取得失敗');
  }

  // Click Done/完了
  await clickEl(page, [
    'material-button:has-text("完了")',
    '[role="button"]:has-text("完了")',
    'material-button:has-text("Done")',
    'button:has-text("完了")',
  ], '完了', 5000);

  await waitForStable(page, 2000);
  return appId;
}

async function createAdUnit(page, adType, unitName) {
  console.log(`\n   --- ${unitName} ---`);

  const addClicked = await clickEl(page, [
    'material-button:has-text("広告ユニットを追加")',
    '[role="button"]:has-text("広告ユニットを追加")',
    'material-button:has-text("Add ad unit")',
    'button:has-text("広告ユニットを追加")',
  ], '広告ユニット追加');

  if (!addClicked) {
    console.log('   ⚠️ 追加ボタンなし');
    return null;
  }

  await waitForStable(page, 2000);

  // Select ad type card
  const typeLabels = {
    'Banner': ['バナー', 'Banner'],
    'Interstitial': ['インタースティシャル', 'Interstitial'],
    'Rewarded': ['リワード', 'Rewarded'],
    'Native': ['ネイティブ アドバンス', 'Native advanced', 'ネイティブ', 'Native'],
  };
  const labels = typeLabels[adType] || [adType];

  let typeClicked = false;
  for (const label of labels) {
    const selectors = [
      `material-button:has-text("${label}")`,
      `[role="button"]:has-text("${label}")`,
      `material-card:has-text("${label}") material-button`,
    ];
    if (await clickEl(page, selectors, `タイプ: ${label}`, 3000)) {
      typeClicked = true;
      break;
    }
  }

  if (!typeClicked) {
    // Try getByText fallback
    for (const label of labels) {
      try {
        const el = page.getByText(label, { exact: false }).first();
        await el.waitFor({ state: 'visible', timeout: 2000 });
        await el.click();
        typeClicked = true;
        console.log(`   ✓ タイプ(text): ${label}`);
        break;
      } catch {}
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
      if (placeholder.includes('検索') || ariaLabel.includes('検索')) continue;
      const type = (await ni.getAttribute('type')) || 'text';
      if (type !== 'text' && type !== '') continue;
      await ni.click();
      await ni.fill(unitName);
      console.log(`   ✓ 名前: ${unitName}`);
      break;
    } catch {}
  }

  await page.waitForTimeout(500);

  // Click create
  await clickEl(page, [
    'material-button:has-text("広告ユニットを作成")',
    '[role="button"]:has-text("広告ユニットを作成")',
    'material-button:has-text("Create ad unit")',
    'material-button:has-text("作成")',
    'button:has-text("広告ユニットを作成")',
  ], '作成');

  await waitForStable(page, 3000);
  await ss(page, `unit-${adType.toLowerCase()}`);

  // Extract unit ID (ca-app-pub-XXXX/YYYY)
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
  await clickEl(page, [
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
  await clickEl(page, [
    'material-tab:has-text("広告ユニット")',
    '[role="tab"]:has-text("広告ユニット")',
    'a:has-text("広告ユニット")',
  ], '広告ユニットタブ', 5000);
  await waitForStable(page, 2000);

  for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
    const id = await createAdUnit(page, type, `${type}_Android`);
    if (id) results.android.units[type.toLowerCase()] = id;
  }

  // === iOS ===
  results.ios.appId = await addApp(page, 'iOS', '30sec Challenge');

  await clickEl(page, [
    'material-tab:has-text("広告ユニット")',
    '[role="tab"]:has-text("広告ユニット")',
    'a:has-text("広告ユニット")',
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
