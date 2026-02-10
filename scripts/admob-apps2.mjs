// AdMob: register apps + create ad units (fixed version)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 270;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

// Wait for navigation/loading to settle
async function waitForStable(page, ms = 3000) {
  await page.waitForTimeout(ms);
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
}

async function addApp(page, platform, appName) {
  console.log(`\n═══ ${platform} アプリを登録 ═══`);

  // Go to apps list
  await page.goto('https://apps.admob.com/v2/apps/list');
  await waitForStable(page, 4000);
  await ss(page, `${platform.toLowerCase()}-list`);

  // Close any search dropdown by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Click the "アプリを登録して利用を開始" button (NOT the search bar!)
  // This is the blue button in the center of the empty state
  const registerBtn = page.locator('button:has-text("アプリを登録して利用を開始"), a:has-text("アプリを登録して利用を開始"), button:has-text("Add your first app"), button:has-text("アプリを追加"), a:has-text("Add app")');

  try {
    await registerBtn.first().waitFor({ state: 'visible', timeout: 8000 });
    await registerBtn.first().click();
    console.log('   ✓ アプリ登録ボタンクリック');
  } catch {
    // If the empty state button is not found, try the sidebar or header "Add app" button
    console.log('   初期ボタンなし、別の追加ボタンを探索...');
    // Try clicking the "アプリ" in sidebar first, then look for add button
    const addBtn = page.locator('[aria-label="アプリを追加"], [aria-label="Add app"]');
    try {
      await addBtn.first().waitFor({ state: 'visible', timeout: 5000 });
      await addBtn.first().click();
      console.log('   ✓ アプリ追加ボタン(代替)クリック');
    } catch {
      console.log('   ⚠️ 追加ボタンが見つかりません');
      await ss(page, `${platform.toLowerCase()}-no-btn`);
      return null;
    }
  }

  await waitForStable(page, 3000);
  await ss(page, `${platform.toLowerCase()}-add-dialog`);

  // Now we should be on the add app flow
  // Step 1: Select platform
  const platformLabel = platform === 'Android' ? 'Android' : 'iOS';

  // Try clicking the platform radio/option
  const platformSelectors = [
    `label:has-text("${platformLabel}")`,
    `[role="radio"]:has-text("${platformLabel}")`,
    `mat-radio-button:has-text("${platformLabel}")`,
    `div[role="radiogroup"] >> text="${platformLabel}"`,
  ];

  let platformSelected = false;
  for (const sel of platformSelectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      platformSelected = true;
      console.log(`   ✓ プラットフォーム: ${platformLabel}`);
      break;
    } catch {}
  }

  if (!platformSelected) {
    console.log(`   ⚠️ プラットフォーム選択失敗`);
    await ss(page, `${platform.toLowerCase()}-platform-fail`);
  }

  await page.waitForTimeout(1000);

  // Step 2: "Is the app listed on a supported app store?" -> No
  const noSelectors = [
    'label:has-text("いいえ")',
    'label:has-text("No")',
    '[role="radio"]:has-text("いいえ")',
    '[role="radio"]:has-text("No")',
  ];

  for (const sel of noSelectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      console.log('   ✓ ストア未公開: いいえ');
      break;
    } catch {}
  }

  await page.waitForTimeout(1000);

  // Step 3: Fill app name - find text input that is NOT the search bar
  // The form input should be within the main content area, not the header
  const formInputs = await page.locator('main input[type="text"]:visible, [role="main"] input[type="text"]:visible, .app-content input[type="text"]:visible, mat-form-field input:visible, input[aria-label*="アプリ"]:visible, input[aria-label*="app"i]:visible, input[placeholder*="アプリ"]:visible').all();

  let nameFilled = false;
  for (const input of formInputs) {
    try {
      // Skip if it looks like a search input
      const placeholder = await input.getAttribute('placeholder') || '';
      const ariaLabel = await input.getAttribute('aria-label') || '';
      if (placeholder.includes('検索') || ariaLabel.includes('検索') ||
          placeholder.includes('search') || ariaLabel.includes('search')) {
        continue;
      }
      await input.fill(appName);
      nameFilled = true;
      console.log(`   ✓ アプリ名: ${appName}`);
      break;
    } catch {}
  }

  if (!nameFilled) {
    // Fallback: try all visible text inputs, skip the first one if it's the search bar
    const allInputs = await page.locator('input[type="text"]:visible').all();
    for (const input of allInputs) {
      try {
        const placeholder = await input.getAttribute('placeholder') || '';
        const ariaLabel = await input.getAttribute('aria-label') || '';
        // Skip search bar
        if (placeholder.includes('検索') || ariaLabel.includes('検索') ||
            placeholder.includes('search') || ariaLabel.includes('Search') ||
            placeholder.includes('アプリ、広告ユニット')) {
          continue;
        }
        const val = await input.inputValue();
        if (!val || val.length < 2) {
          await input.fill(appName);
          nameFilled = true;
          console.log(`   ✓ アプリ名(fallback): ${appName}`);
          break;
        }
      } catch {}
    }
  }

  if (!nameFilled) {
    console.log('   ⚠️ アプリ名入力フィールドが見つかりません');
    await ss(page, `${platform.toLowerCase()}-no-name-input`);
  }

  await page.waitForTimeout(500);
  await ss(page, `${platform.toLowerCase()}-form-filled`);

  // Step 4: Click "追加" / "Add"
  const addSelectors = [
    'button:has-text("アプリを追加")',
    'button:has-text("Add app")',
    'button:has-text("追加")',
    'button:has-text("Add")',
  ];

  for (const sel of addSelectors) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      // Make sure it's not disabled
      const disabled = await btn.getAttribute('disabled');
      if (disabled !== null && disabled !== 'false') continue;
      await btn.click();
      console.log('   ✓ アプリ追加ボタンクリック');
      break;
    } catch {}
  }

  await waitForStable(page, 5000);
  await ss(page, `${platform.toLowerCase()}-created`);

  // Extract App ID (format: ca-app-pub-XXXX~XXXX)
  const bodyText = await page.locator('body').textContent();
  const appIdMatch = bodyText.match(/(ca-app-pub-\d+~\d+)/);
  let appId = null;
  if (appIdMatch) {
    appId = appIdMatch[1];
    console.log(`   ✅ ${platform} App ID: ${appId}`);
  } else {
    console.log('   ⚠️ App ID 取得失敗 - ページテキストを確認');
    // Print a snippet of the page text for debugging
    const snippet = bodyText.substring(0, 500).replace(/\s+/g, ' ');
    console.log(`   テキスト: ${snippet}`);
  }

  // Click "完了" / "Done" to proceed
  for (const sel of ['button:has-text("完了")', 'button:has-text("Done")', 'button:has-text("次へ")', 'button:has-text("Next")']) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log('   ✓ 完了');
      break;
    } catch {}
  }

  await waitForStable(page, 3000);
  return appId;
}

async function createAdUnit(page, adType, unitName) {
  console.log(`\n   --- ${unitName} ---`);

  // Click "Add ad unit" button
  const addUnitSelectors = [
    'button:has-text("広告ユニットを追加")',
    'button:has-text("Add ad unit")',
    'a:has-text("広告ユニットを追加")',
    'a:has-text("Add ad unit")',
  ];

  let addClicked = false;
  for (const sel of addUnitSelectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await el.click();
      addClicked = true;
      console.log('   ✓ 広告ユニット追加ボタン');
      break;
    } catch {}
  }

  if (!addClicked) {
    console.log('   ⚠️ 追加ボタンなし');
    await ss(page, `unit-no-btn-${adType.toLowerCase()}`);
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
    // Try clicking "選択" / "Select" button within the card
    const cardSelectors = [
      `div:has-text("${label}") >> button:has-text("選択")`,
      `div:has-text("${label}") >> button:has-text("Select")`,
      `button:has-text("${label}")`,
      `a:has-text("${label}")`,
    ];
    for (const sel of cardSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ state: 'visible', timeout: 2000 });
        await el.click();
        typeClicked = true;
        console.log(`   ✓ タイプ: ${label}`);
        break;
      } catch {}
    }
    if (typeClicked) break;
  }

  if (!typeClicked) {
    // Fallback: find any clickable element containing the type name
    const allButtons = await page.locator('[role="button"], button, a, [role="option"]').all();
    for (const btn of allButtons) {
      try {
        const text = (await btn.textContent()).trim();
        if (labels.some(l => text.includes(l)) && await btn.isVisible()) {
          await btn.click();
          typeClicked = true;
          console.log(`   ✓ タイプ(fallback): ${text.substring(0, 30)}`);
          break;
        }
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

  // Fill unit name - find input within the form (not search bar)
  const nameInputs = await page.locator('input[type="text"]:visible').all();
  for (const ni of nameInputs) {
    try {
      const placeholder = await ni.getAttribute('placeholder') || '';
      const ariaLabel = await ni.getAttribute('aria-label') || '';
      if (placeholder.includes('検索') || ariaLabel.includes('検索') ||
          placeholder.includes('search') || ariaLabel.includes('Search')) {
        continue;
      }
      await ni.fill(unitName);
      console.log(`   ✓ 名前: ${unitName}`);
      break;
    } catch {}
  }

  await page.waitForTimeout(500);

  // Click create
  for (const sel of [
    'button:has-text("広告ユニットを作成")',
    'button:has-text("Create ad unit")',
    'button:has-text("作成")',
    'button:has-text("Create")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log('   ✓ 作成クリック');
      break;
    } catch {}
  }

  await waitForStable(page, 3000);
  await ss(page, `unit-${adType.toLowerCase()}-${unitName.includes('Android') ? 'android' : 'ios'}`);

  // Extract unit ID (format: ca-app-pub-XXXX/YYYY)
  const text = await page.locator('body').textContent();
  const idMatch = text.match(/(ca-app-pub-\d+\/\d+)/);
  let unitId = null;
  if (idMatch) {
    unitId = idMatch[1];
    console.log(`   ✅ ${adType}: ${unitId}`);
  } else {
    console.log('   ⚠️ Unit ID 取得失敗');
  }

  // Click done
  for (const sel of ['button:has-text("完了")', 'button:has-text("Done")']) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log('   ✓ 完了');
      break;
    } catch {}
  }

  await page.waitForTimeout(1500);
  return unitId;
}

async function navigateToAdUnitsTab(page) {
  // Navigate to the Ad units tab for the current app
  for (const sel of [
    'a:has-text("広告ユニット")',
    'a:has-text("Ad units")',
    '[role="tab"]:has-text("広告ユニット")',
    '[role="tab"]:has-text("Ad units")',
  ]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await el.click();
      console.log('   ✓ 広告ユニットタブ');
      await waitForStable(page, 2000);
      return true;
    } catch {}
  }
  console.log('   ⚠️ 広告ユニットタブ見つからず');
  return false;
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

  // Navigate to Ad units tab and create units
  if (await navigateToAdUnitsTab(page)) {
    for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
      const id = await createAdUnit(page, type, `${type}_Android`);
      if (id) results.android.units[type.toLowerCase()] = id;
    }
  }

  // === iOS ===
  results.ios.appId = await addApp(page, 'iOS', '30sec Challenge');

  // Navigate to Ad units tab and create units
  if (await navigateToAdUnitsTab(page)) {
    for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
      const id = await createAdUnit(page, type, `${type}_iOS`);
      if (id) results.ios.units[type.toLowerCase()] = id;
    }
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
