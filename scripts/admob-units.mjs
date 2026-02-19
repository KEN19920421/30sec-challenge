// AdMob: create ad units for already-registered apps (v6)
// Both apps already registered. Known App IDs from list page:
//   Android: ca-app-pub-3076631895164482~3138704463
//   iOS:     ca-app-pub-3076631895164482~5533767669
// Key findings:
//   - AdMob uses <material-button> (not <button>)
//   - Ad type cards have "選択" links at bottom
//   - Create button text is "広告ユニットの作成" (NOT "を作成")
//   - Name input placeholder: "広告ユニットの名前を..."
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 340;

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

async function selectAdType(page, jpName) {
  // Find the "選択" link within the card containing jpName using page.evaluate
  return await page.evaluate((targetName) => {
    const allElements = document.querySelectorAll('a, [role="link"], span, div');
    for (const el of allElements) {
      const text = el.textContent?.trim();
      if (text !== '選択' && text !== 'Select') continue;

      // Walk up to find a parent card containing the target type name
      let parent = el.parentElement;
      for (let i = 0; i < 6; i++) {
        if (!parent) break;
        // Check direct children text, not all descendants (to avoid matching other cards)
        const childTexts = Array.from(parent.children).map(c => c.textContent?.trim() || '');
        const allText = parent.textContent || '';
        if (allText.includes(targetName)) {
          el.click();
          return true;
        }
        parent = parent.parentElement;
      }
    }
    return false;
  }, jpName);
}

async function createAdUnit(page, adType, unitName, appUrl) {
  console.log(`\n   --- ${unitName} ---`);

  // Navigate to app's ad units page
  await page.goto(appUrl);
  await waitForStable(page, 3000);

  // Click 広告ユニット tab
  await clickEl(page, [
    '[role="tab"]:has-text("広告ユニット")',
    'material-tab:has-text("広告ユニット")',
    'a:has-text("広告ユニット")',
  ], '広告ユニットタブ', 5000);
  await waitForStable(page, 2000);

  // Click "広告ユニットを追加" button
  const addClicked = await clickEl(page, [
    'material-button:has-text("広告ユニットを追加")',
    '[role="button"]:has-text("広告ユニットを追加")',
    'material-button:has-text("Add ad unit")',
  ], '広告ユニット追加');

  if (!addClicked) {
    console.log('   ⚠️ 追加ボタンなし');
    await ss(page, `no-add-${adType.toLowerCase()}`);
    return null;
  }

  await waitForStable(page, 2000);

  // Select ad type by clicking "選択" in the correct card
  const typeNames = {
    'Banner': 'バナー',
    'Interstitial': 'インタースティシャル',
    'Rewarded': 'リワード',
    'Native': 'ネイティブ アドバンス',
  };
  const jpName = typeNames[adType];

  const typeSelected = await selectAdType(page, jpName);
  if (typeSelected) {
    console.log(`   ✓ タイプ選択: ${jpName}`);
  } else {
    console.log(`   ⚠️ ${adType} タイプ選択失敗`);
    await ss(page, `type-fail-${adType.toLowerCase()}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    return null;
  }

  await waitForStable(page, 2000);

  // Fill unit name in the input with placeholder "広告ユニットの名前を..."
  let nameFilled = false;
  const nameInputs = await page.locator('input:visible').all();
  for (const ni of nameInputs) {
    try {
      const placeholder = (await ni.getAttribute('placeholder')) || '';
      if (placeholder.includes('広告ユニットの名前') || placeholder.includes('Ad unit name')) {
        await ni.click();
        await ni.fill(unitName);
        nameFilled = true;
        console.log(`   ✓ 名前: ${unitName}`);
        break;
      }
    } catch {}
  }

  if (!nameFilled) {
    // Fallback: try any text input that's not the search bar
    for (const ni of nameInputs) {
      try {
        const placeholder = (await ni.getAttribute('placeholder')) || '';
        const ariaLabel = (await ni.getAttribute('aria-label')) || '';
        const type = (await ni.getAttribute('type')) || 'text';
        if (type !== 'text' && type !== '') continue;
        if (placeholder.includes('検索') || ariaLabel.includes('検索') ||
            placeholder.includes('アプリ、広告ユニット')) continue;
        await ni.click();
        await ni.fill(unitName);
        nameFilled = true;
        console.log(`   ✓ 名前(fallback): ${unitName}`);
        break;
      } catch {}
    }
  }

  await page.waitForTimeout(500);

  // Click "広告ユニットの作成" (NOTE: の not を!)
  const createClicked = await clickEl(page, [
    'material-button:has-text("広告ユニットの作成")',
    '[role="button"]:has-text("広告ユニットの作成")',
    'material-button:has-text("広告ユニットを作成")',
    'material-button:has-text("Create ad unit")',
    'button:has-text("広告ユニットの作成")',
    'button:has-text("Create ad unit")',
  ], '広告ユニット作成');

  if (!createClicked) {
    console.log('   ⚠️ 作成ボタンクリック失敗');
    await ss(page, `create-fail-${adType.toLowerCase()}`);
    return null;
  }

  // Wait longer for creation to complete
  await waitForStable(page, 6000);
  await ss(page, `unit-result-${adType.toLowerCase()}`);

  // Extract unit ID (ca-app-pub-XXXX/YYYY)
  const text = await page.locator('body').textContent();
  const idMatch = text.match(/(ca-app-pub-\d+\/\d+)/);
  let unitId = null;
  if (idMatch) {
    unitId = idMatch[1];
    console.log(`   ✅ ${adType}: ${unitId}`);
  } else {
    console.log('   ⚠️ Unit ID 取得失敗');
    // Check for ID in format without ca-app-pub prefix
    const numMatch = text.match(/広告ユニット ID[:\s]*([\d/]+)/);
    if (numMatch) console.log(`   数値ID: ${numMatch[1]}`);
  }

  // Click 完了 (Done) to return
  await clickEl(page, [
    'material-button:has-text("完了")',
    '[role="button"]:has-text("完了")',
    'material-button:has-text("Done")',
  ], '完了', 5000);

  await waitForStable(page, 2000);
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

  // Known App IDs from previous run
  const results = {
    android: {
      appId: 'ca-app-pub-3076631895164482~3138704463',
      appUrl: 'https://admob.google.com/v2/apps/3138704463/overview',
      units: {},
    },
    ios: {
      appId: 'ca-app-pub-3076631895164482~5533767669',
      appUrl: 'https://admob.google.com/v2/apps/5533767669/overview',
      units: {},
    },
  };

  // Create ad units for Android
  console.log('\n═══ Android 広告ユニット作成 ═══');
  for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
    const id = await createAdUnit(page, type, `${type}_Android`, results.android.appUrl);
    if (id) results.android.units[type.toLowerCase()] = id;
  }

  // Create ad units for iOS
  console.log('\n═══ iOS 広告ユニット作成 ═══');
  for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
    const id = await createAdUnit(page, type, `${type}_iOS`, results.ios.appUrl);
    if (id) results.ios.units[type.toLowerCase()] = id;
  }

  // Print results
  console.log('\n═══════════════════════════════════════');
  console.log('📋 AdMob 設定結果');
  console.log('═══════════════════════════════════════');
  const output = {
    android: { appId: results.android.appId, units: results.android.units },
    ios: { appId: results.ios.appId, units: results.ios.units },
  };
  console.log(JSON.stringify(output, null, 2));
  console.log('═══════════════════════════════════════');

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'admob-results.json'), JSON.stringify(output, null, 2));
  console.log('結果保存完了');

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
