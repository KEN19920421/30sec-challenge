// AdMob setup: register apps + create ad units
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const IOS_BUNDLE_ID = 'com.thirtysecchallenge.thirtySecChallenge';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 200;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function waitForAdmob(page, maxSec = 120) {
  for (let i = 0; i < maxSec; i++) {
    await page.waitForTimeout(1000);
    const text = await page.locator('body').textContent().catch(() => '');
    if (text.length > 300 && !text.includes('Just a moment')) return true;
    if (i % 20 === 0 && i > 0) console.log(`   ... 待機中 (${i}秒)`);
  }
  return false;
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

// Create a single ad unit
async function createAdUnit(page, appUrl, unitType, unitName) {
  console.log(`\n   📋 広告ユニット作成: ${unitName} (${unitType})...`);

  // Go to app's ad units page
  await page.goto(appUrl);
  await page.waitForTimeout(3000);
  await waitForAdmob(page, 30);

  // Click "Add ad unit" or "広告ユニットを追加"
  const addClicked = await clickFirst(page, [
    'button:has-text("Add ad unit")',
    'button:has-text("広告ユニットを追加")',
    'a:has-text("Add ad unit")',
    'a:has-text("広告ユニットを追加")',
  ], '広告ユニット追加', 5000);

  if (!addClicked) {
    console.log('   ⚠️ 追加ボタンが見つかりません');
    return null;
  }

  await page.waitForTimeout(2000);

  // Select ad unit type (Banner, Interstitial, Rewarded, Native)
  const typeClicked = await clickFirst(page, [
    `button:has-text("${unitType}")`,
    `a:has-text("${unitType}")`,
    `[role="button"]:has-text("${unitType}")`,
    `div:has-text("${unitType}") >> button`,
  ], `タイプ: ${unitType}`, 5000);

  // Also try Japanese
  if (!typeClicked) {
    const typeMap = { 'Banner': 'バナー', 'Interstitial': 'インタースティシャル', 'Rewarded': 'リワード', 'Native advanced': 'ネイティブ アドバンス' };
    const jaType = typeMap[unitType] || unitType;
    await clickFirst(page, [
      `button:has-text("${jaType}")`,
      `a:has-text("${jaType}")`,
      `[role="button"]:has-text("${jaType}")`,
    ], `タイプ: ${jaType}`, 3000);
  }

  await page.waitForTimeout(2000);

  // Fill ad unit name
  const nameInput = page.locator('input[type="text"]:visible').first();
  try {
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill(unitName);
    console.log(`   ✓ 名前: ${unitName}`);
  } catch {
    console.log('   ⚠️ 名前入力失敗');
  }

  await page.waitForTimeout(500);

  // Click Create
  await clickFirst(page, [
    'button:has-text("Create ad unit")',
    'button:has-text("広告ユニットを作成")',
    'button:has-text("Done")',
    'button:has-text("完了")',
    'button:has-text("Create")',
    'button:has-text("作成")',
  ], '作成', 5000);

  await page.waitForTimeout(3000);
  await ss(page, `adunit-${unitType.toLowerCase()}`);

  // Extract ad unit ID
  const bodyText = await page.locator('body').textContent();
  const idMatch = bodyText.match(/(ca-app-pub-\d+\/\d+)/);
  if (idMatch) {
    console.log(`   ✅ Ad Unit ID: ${idMatch[1]}`);
    // Click Done to go back
    await clickFirst(page, [
      'button:has-text("Done")',
      'button:has-text("完了")',
    ], '完了', 3000);
    await page.waitForTimeout(1000);
    return idMatch[1];
  }

  console.log('   ⚠️ ID取得失敗');
  return null;
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

  // Step 1: Navigate to AdMob
  console.log('🔗 AdMob に移動...');
  await page.goto('https://admob.google.com/home');

  console.log('⏳ ページ読み込み待ち (ログインが必要な場合はログインしてください)...');
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    const text = await page.locator('body').textContent().catch(() => '');

    // Check if we need to sign up for AdMob
    if (text.includes('Get started') || text.includes('始める') || text.includes('Sign up') || text.includes('利用を開始')) {
      console.log('📋 AdMob アカウントのセットアップが必要です...');

      // Accept terms
      const checkboxes = await page.locator('input[type="checkbox"]:visible, mat-checkbox:visible').all();
      for (const cb of checkboxes) {
        try { await cb.click(); } catch {}
      }

      await clickFirst(page, [
        'button:has-text("Get started")',
        'button:has-text("始める")',
        'button:has-text("Continue")',
        'button:has-text("続行")',
        'button:has-text("Sign up")',
        'button:has-text("利用を開始")',
      ], 'AdMob 開始', 5000);

      await page.waitForTimeout(5000);
      break;
    }

    if (url.includes('admob.google.com') && (text.includes('Apps') || text.includes('アプリ') || text.includes('Home') || text.includes('ホーム'))) {
      console.log('✅ AdMob ダッシュボード表示');
      break;
    }

    if (i % 15 === 0 && i > 0) console.log(`   ... 待機中 (${i * 2}秒)`);
  }

  await page.waitForTimeout(3000);
  await ss(page, 'admob-home');

  const results = {
    android: { appId: null, units: {} },
    ios: { appId: null, units: {} },
  };

  // Step 2: Add Android App
  console.log('\n═══════════════════════════════════════');
  console.log('📱 Android アプリを追加...');
  console.log('═══════════════════════════════════════');

  await page.goto('https://admob.google.com/apps');
  await page.waitForTimeout(3000);
  await waitForAdmob(page, 30);

  // Check if apps already exist
  const appsText = await page.locator('body').textContent();
  if (appsText.includes(ANDROID_PACKAGE) || appsText.includes('thirty_sec_challenge')) {
    console.log('   Android アプリは既に登録されています');
    // Try to find the app ID
    const appIdMatch = appsText.match(/(ca-app-pub-\d+~\d+)/);
    if (appIdMatch) {
      results.android.appId = appIdMatch[1];
      console.log(`   App ID: ${results.android.appId}`);
    }
  } else {
    // Click "Add app" button
    await clickFirst(page, [
      'button:has-text("Add app")',
      'button:has-text("アプリを追加")',
      'a:has-text("Add app")',
    ], 'アプリ追加', 5000);

    await page.waitForTimeout(2000);
    await ss(page, 'add-app-dialog');

    // Select Android platform
    await clickFirst(page, [
      'button:has-text("Android")',
      '[role="radio"]:has-text("Android")',
      'label:has-text("Android")',
      'div:has-text("Android") >> input[type="radio"]',
    ], 'Android 選択', 5000);

    await page.waitForTimeout(1000);

    // Choose "No" for published on store (or skip if not asked)
    await clickFirst(page, [
      'label:has-text("No")',
      '[role="radio"]:has-text("No")',
      'label:has-text("いいえ")',
    ], 'ストア未公開', 3000);

    await page.waitForTimeout(1000);

    // Fill app name
    const appNameInput = page.locator('input[type="text"]:visible').first();
    try {
      await appNameInput.fill('30sec Challenge');
      console.log('   ✓ アプリ名: 30sec Challenge');
    } catch {}

    await ss(page, 'android-app-form');

    // Click Add
    await clickFirst(page, [
      'button:has-text("Add")',
      'button:has-text("追加")',
      'button:has-text("Continue")',
      'button:has-text("続行")',
    ], '追加', 5000);

    await page.waitForTimeout(5000);
    await ss(page, 'android-app-created');

    // Extract App ID
    const resultText = await page.locator('body').textContent();
    const appIdMatch = resultText.match(/(ca-app-pub-\d+~\d+)/);
    if (appIdMatch) {
      results.android.appId = appIdMatch[1];
      console.log(`   ✅ Android App ID: ${results.android.appId}`);
    }

    // Click Done/Continue
    await clickFirst(page, [
      'button:has-text("Done")',
      'button:has-text("完了")',
      'button:has-text("Next")',
      'button:has-text("次へ")',
    ], '完了', 5000);
  }

  await page.waitForTimeout(2000);

  // Step 3: Add iOS App
  console.log('\n═══════════════════════════════════════');
  console.log('📱 iOS アプリを追加...');
  console.log('═══════════════════════════════════════');

  await page.goto('https://admob.google.com/apps');
  await page.waitForTimeout(3000);
  await waitForAdmob(page, 30);

  const iosCheck = await page.locator('body').textContent();
  if (iosCheck.includes(IOS_BUNDLE_ID) || (iosCheck.includes('30sec Challenge') && iosCheck.includes('iOS'))) {
    console.log('   iOS アプリは既に登録されています');
    const iosIdMatch = iosCheck.match(/(ca-app-pub-\d+~\d+)/g);
    if (iosIdMatch && iosIdMatch.length > 1) {
      results.ios.appId = iosIdMatch[1]; // second one might be iOS
    }
  } else {
    await clickFirst(page, [
      'button:has-text("Add app")',
      'button:has-text("アプリを追加")',
    ], 'アプリ追加', 5000);

    await page.waitForTimeout(2000);

    // Select iOS
    await clickFirst(page, [
      'button:has-text("iOS")',
      '[role="radio"]:has-text("iOS")',
      'label:has-text("iOS")',
    ], 'iOS 選択', 5000);

    await page.waitForTimeout(1000);

    await clickFirst(page, [
      'label:has-text("No")',
      '[role="radio"]:has-text("No")',
      'label:has-text("いいえ")',
    ], 'ストア未公開', 3000);

    await page.waitForTimeout(1000);

    const iosInput = page.locator('input[type="text"]:visible').first();
    try {
      await iosInput.fill('30sec Challenge');
      console.log('   ✓ アプリ名: 30sec Challenge');
    } catch {}

    await ss(page, 'ios-app-form');

    await clickFirst(page, [
      'button:has-text("Add")',
      'button:has-text("追加")',
      'button:has-text("Continue")',
    ], '追加', 5000);

    await page.waitForTimeout(5000);
    await ss(page, 'ios-app-created');

    const iosResultText = await page.locator('body').textContent();
    const iosAppIdMatch = iosResultText.match(/(ca-app-pub-\d+~\d+)/);
    if (iosAppIdMatch) {
      results.ios.appId = iosAppIdMatch[1];
      console.log(`   ✅ iOS App ID: ${results.ios.appId}`);
    }

    await clickFirst(page, [
      'button:has-text("Done")',
      'button:has-text("完了")',
    ], '完了', 5000);
  }

  await page.waitForTimeout(2000);

  // Step 4: Create ad units for each app
  // We need the app-specific URLs to create ad units
  // Navigate to apps list and find the URLs
  console.log('\n═══════════════════════════════════════');
  console.log('📋 広告ユニットを作成...');
  console.log('═══════════════════════════════════════');

  await page.goto('https://admob.google.com/apps');
  await page.waitForTimeout(3000);
  await waitForAdmob(page, 30);
  await ss(page, 'apps-list');

  // Find app links
  const appLinks = await page.locator('a[href*="/apps/"]').all();
  let androidAppUrl = null;
  let iosAppUrl = null;

  for (const link of appLinks) {
    try {
      const href = await link.getAttribute('href');
      const text = (await link.textContent()).trim();
      if (text.includes('Android') || text.includes('android')) {
        androidAppUrl = href.includes('http') ? href : `https://admob.google.com${href}`;
        console.log(`   Android app URL: ${androidAppUrl}`);
      }
      if (text.includes('iOS') || text.includes('ios') || text.includes('iPhone')) {
        iosAppUrl = href.includes('http') ? href : `https://admob.google.com${href}`;
        console.log(`   iOS app URL: ${iosAppUrl}`);
      }
    } catch {}
  }

  // If we found app URLs, create ad units
  const adTypes = ['Banner', 'Interstitial', 'Rewarded', 'Native advanced'];

  if (androidAppUrl) {
    // Navigate to Android app's ad units page
    const adUnitsUrl = androidAppUrl.replace(/\/overview/, '/adunits') + (androidAppUrl.includes('/adunits') ? '' : '/adunits');
    for (const adType of adTypes) {
      const name = `${adType}_Android`;
      const id = await createAdUnit(page, adUnitsUrl, adType, name);
      if (id) results.android.units[adType.toLowerCase().replace(' ', '_')] = id;
    }
  }

  if (iosAppUrl) {
    const adUnitsUrl = iosAppUrl.replace(/\/overview/, '/adunits') + (iosAppUrl.includes('/adunits') ? '' : '/adunits');
    for (const adType of adTypes) {
      const name = `${adType}_iOS`;
      const id = await createAdUnit(page, adUnitsUrl, adType, name);
      if (id) results.ios.units[adType.toLowerCase().replace(' ', '_')] = id;
    }
  }

  // Print results
  console.log('\n═══════════════════════════════════════');
  console.log('📋 AdMob 設定結果');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(results, null, 2));
  console.log('═══════════════════════════════════════');

  const outPath = path.join(SCREENSHOTS_DIR, 'admob-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`結果保存: ${outPath}`);

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
