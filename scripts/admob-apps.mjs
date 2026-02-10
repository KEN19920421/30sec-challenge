// AdMob: add apps + create ad units (account already created)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 260;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function clickFirst(page, selectors, desc, timeout = 5000) {
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
  console.log(`\n═══ ${platform} アプリを追加 ═══`);

  // Navigate to Apps
  await page.goto('https://apps.admob.com/v2/apps/list');
  await page.waitForTimeout(3000);

  // Click "Add app" or "アプリを追加"
  await clickFirst(page, [
    'button:has-text("アプリを追加")',
    'button:has-text("Add app")',
    'a:has-text("アプリを追加")',
    'a:has-text("Add app")',
  ], 'アプリ追加', 8000);

  await page.waitForTimeout(2000);
  await ss(page, `add-${platform.toLowerCase()}`);

  // Select platform
  await clickFirst(page, [
    `label:has-text("${platform}")`,
    `[role="radio"]:has-text("${platform}")`,
    `mat-radio-button:has-text("${platform}")`,
    `button:has-text("${platform}")`,
  ], `${platform} 選択`, 5000);

  await page.waitForTimeout(1000);

  // "Is the app listed?" -> No
  await clickFirst(page, [
    'label:has-text("いいえ")',
    'label:has-text("No")',
    '[role="radio"]:has-text("いいえ")',
    '[role="radio"]:has-text("No")',
  ], 'ストア未公開', 3000);

  await page.waitForTimeout(1000);

  // Fill app name
  const inputs = await page.locator('input[type="text"]:visible').all();
  for (const input of inputs) {
    try {
      const val = await input.inputValue();
      if (!val || val.length < 2) {
        await input.fill(appName);
        console.log(`   ✓ アプリ名: ${appName}`);
        break;
      }
    } catch {}
  }

  await page.waitForTimeout(500);
  await ss(page, `${platform.toLowerCase()}-form`);

  // Add
  await clickFirst(page, [
    'button:has-text("アプリを追加")',
    'button:has-text("Add app")',
    'button:has-text("追加")',
    'button:has-text("Add")',
  ], '追加', 5000);

  await page.waitForTimeout(5000);
  await ss(page, `${platform.toLowerCase()}-created`);

  // Extract App ID
  const bodyText = await page.locator('body').textContent();
  const appIdMatch = bodyText.match(/(ca-app-pub-\d+~\d+)/);
  let appId = null;
  if (appIdMatch) {
    appId = appIdMatch[1];
    console.log(`   ✅ ${platform} App ID: ${appId}`);
  } else {
    console.log(`   ⚠️ App ID 取得失敗`);
  }

  // Click Done
  await clickFirst(page, [
    'button:has-text("完了")',
    'button:has-text("Done")',
    'button:has-text("次へ")',
    'button:has-text("Next")',
  ], '完了', 5000);

  await page.waitForTimeout(2000);
  return appId;
}

async function createAdUnit(page, adType, unitName) {
  console.log(`\n   --- ${unitName} ---`);

  // Click "Add ad unit"
  const addClicked = await clickFirst(page, [
    'button:has-text("広告ユニットを追加")',
    'button:has-text("Add ad unit")',
    'a:has-text("広告ユニットを追加")',
  ], '広告ユニット追加', 5000);

  if (!addClicked) {
    console.log('   ⚠️ 追加ボタンなし');
    return null;
  }

  await page.waitForTimeout(2000);

  // Select type card
  const typeMap = {
    'Banner': ['バナー', 'Banner'],
    'Interstitial': ['インタースティシャル', 'Interstitial'],
    'Rewarded': ['リワード', 'Rewarded'],
    'Native': ['ネイティブ アドバンス', 'Native advanced', 'ネイティブ', 'Native'],
  };
  const typeNames = typeMap[adType] || [adType];

  let typeClicked = false;
  for (const tn of typeNames) {
    if (await clickFirst(page, [
      `text="${tn}" >> .. >> button`,
      `button:has-text("${tn}")`,
      `a:has-text("${tn}")`,
      `div:has-text("${tn}") >> .. >> button:has-text("選択")`,
      `div:has-text("${tn}") >> .. >> button:has-text("Select")`,
    ], `タイプ: ${tn}`, 3000)) {
      typeClicked = true;
      break;
    }
  }

  // Also try clicking the card directly
  if (!typeClicked) {
    const cards = await page.locator('[role="button"], button, a').all();
    for (const card of cards) {
      try {
        const text = (await card.textContent()).trim();
        if (typeNames.some(tn => text.includes(tn)) && await card.isVisible()) {
          await card.click();
          typeClicked = true;
          console.log(`   ✓ タイプ: ${text.substring(0, 30)}`);
          break;
        }
      } catch {}
    }
  }

  if (!typeClicked) {
    console.log(`   ⚠️ ${adType} タイプ選択失敗`);
    await ss(page, `type-fail-${adType.toLowerCase()}`);
    // Try pressing Escape and return
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    return null;
  }

  await page.waitForTimeout(2000);

  // Fill name
  const nameInputs = await page.locator('input[type="text"]:visible').all();
  for (const ni of nameInputs) {
    try {
      await ni.fill(unitName);
      console.log(`   ✓ 名前: ${unitName}`);
      break;
    } catch {}
  }

  await page.waitForTimeout(500);

  // Create
  await clickFirst(page, [
    'button:has-text("広告ユニットを作成")',
    'button:has-text("Create ad unit")',
    'button:has-text("作成")',
    'button:has-text("Create")',
  ], '作成', 5000);

  await page.waitForTimeout(3000);
  await ss(page, `unit-${adType.toLowerCase()}`);

  // Extract unit ID
  const text = await page.locator('body').textContent();
  const idMatch = text.match(/(ca-app-pub-\d+\/\d+)/);
  let unitId = null;
  if (idMatch) {
    unitId = idMatch[1];
    console.log(`   ✅ ${adType}: ${unitId}`);
  } else {
    console.log(`   ⚠️ Unit ID 取得失敗`);
  }

  // Done
  await clickFirst(page, [
    'button:has-text("完了")',
    'button:has-text("Done")',
  ], '完了', 3000);

  await page.waitForTimeout(1000);
  return unitId;
}

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled', '--disable-popup-blocking'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(120000);

  const results = { android: { appId: null, units: {} }, ios: { appId: null, units: {} } };

  // Add Android app
  results.android.appId = await addApp(page, 'Android', '30sec Challenge');

  // Create Android ad units
  // Navigate to the app's Ad units tab
  await clickFirst(page, [
    'a:has-text("広告ユニット")',
    'a:has-text("Ad units")',
  ], '広告ユニットタブ', 5000);
  await page.waitForTimeout(2000);

  for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
    const id = await createAdUnit(page, type, `${type}_Android`);
    if (id) results.android.units[type.toLowerCase()] = id;
  }

  // Add iOS app
  results.ios.appId = await addApp(page, 'iOS', '30sec Challenge');

  // Create iOS ad units
  await clickFirst(page, [
    'a:has-text("広告ユニット")',
    'a:has-text("Ad units")',
  ], '広告ユニットタブ', 5000);
  await page.waitForTimeout(2000);

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
