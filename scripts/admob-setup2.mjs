// AdMob setup: sign up + register apps + create ad units
// AdMob console URL is https://apps.admob.com/
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 210;

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

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Step 1: Go to AdMob signup/console
  console.log('🔗 AdMob コンソールに移動...');
  await page.goto('https://apps.admob.com/v2/home');

  console.log('⏳ ページ読み込み待ち...');
  console.log('   AdMob アカウントのセットアップが必要な場合は画面の指示に従ってください。');
  console.log('   (利用規約の同意、AdSense との連携など)');

  // Wait for AdMob dashboard to load
  let dashboardReady = false;
  for (let i = 0; i < 180; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    const text = await page.locator('body').textContent().catch(() => '');

    // Check if on signup page
    if (url.includes('signup') || text.includes('さあ始めましょう') || text.includes('Get started with AdMob') || text.includes('AdMob のご利用開始')) {
      if (i % 20 === 0) {
        console.log('   AdMob サインアップページ検出。自動セットアップ中...');
        await ss(page, 'admob-signup');
      }

      // Select "いいえ" radio (don't want marketing emails)
      try {
        const radios = await page.locator('input[type="radio"]:visible, [role="radio"]:visible').all();
        if (radios.length >= 2) {
          await radios[1].click(); // second option = "いいえ"
          console.log('   ✓ メール配信: いいえ');
        }
      } catch {}

      // Check the terms checkbox
      const checkboxes = await page.locator('input[type="checkbox"]:visible, mat-checkbox:visible, [role="checkbox"]:visible').all();
      for (const cb of checkboxes) {
        try {
          const checked = await cb.isChecked().catch(() => false);
          if (!checked) await cb.click();
        } catch {}
      }

      // Click "AdMob のご利用開始" button
      await page.waitForTimeout(500);
      const startClicked = await clickFirst(page, [
        'button:has-text("AdMob のご利用開始")',
        'button:has-text("GET STARTED")',
        'button:has-text("Start using AdMob")',
        'button:has-text("始める")',
        'button:has-text("利用開始")',
      ], 'AdMob 利用開始', 3000);

      if (startClicked) {
        console.log('   AdMob アカウント作成中...');
        await page.waitForTimeout(10000);
      }
      continue;
    }

    // Check if on AdSense setup
    if (text.includes('AdSense') && (text.includes('link') || text.includes('connect') || text.includes('関連付け'))) {
      if (i % 20 === 0) {
        console.log('   AdSense との関連付けが必要です。画面の指示に従ってください。');
        await ss(page, 'admob-adsense');
      }
      continue;
    }

    // Dashboard ready
    if (url.includes('apps.admob.com') && (text.includes('Apps') || text.includes('アプリ') || text.includes('Add your first app') || text.includes('最初のアプリ'))) {
      dashboardReady = true;
      console.log('✅ AdMob ダッシュボード表示');
      break;
    }

    if (i % 30 === 0 && i > 0) {
      console.log(`   ... 待機中 (${i * 2}秒) URL: ${url.substring(0, 80)}`);
      await ss(page, `admob-wait-${i}`);
    }
  }

  if (!dashboardReady) {
    console.log('⚠️ AdMob ダッシュボードのタイムアウト');
    await ss(page, 'admob-timeout');
    console.log('\n確認後 Enter で終了');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    await context.close();
    return;
  }

  await page.waitForTimeout(2000);
  await ss(page, 'admob-dashboard');

  const results = {
    android: { appId: null, units: {} },
    ios: { appId: null, units: {} },
  };

  // Step 2: Add Android app
  console.log('\n═══ Android アプリを追加 ═══');

  // Click Apps in sidebar or "Add your first app"
  await clickFirst(page, [
    'a:has-text("Apps")',
    'a:has-text("アプリ")',
    'button:has-text("Add your first app")',
    'button:has-text("最初のアプリを追加")',
    'button:has-text("Add app")',
    'button:has-text("アプリを追加")',
  ], 'アプリページ', 5000);

  await page.waitForTimeout(2000);

  // Click "Add app" if not already in add flow
  await clickFirst(page, [
    'button:has-text("Add app")',
    'button:has-text("アプリを追加")',
    'button:has-text("Add your first app")',
  ], 'アプリ追加', 3000);

  await page.waitForTimeout(2000);
  await ss(page, 'add-android');

  // Select Android
  await clickFirst(page, [
    'label:has-text("Android")',
    'button:has-text("Android")',
    '[role="radio"]:has-text("Android")',
    'mat-radio-button:has-text("Android")',
  ], 'Android', 5000);

  await page.waitForTimeout(1000);

  // Select "No" for "Is the app listed on a supported app store?"
  await clickFirst(page, [
    'label:has-text("No")',
    'label:has-text("いいえ")',
    '[role="radio"]:has-text("No")',
    'mat-radio-button:has-text("No")',
  ], 'ストア未公開', 3000);

  await page.waitForTimeout(1000);

  // Fill app name
  const inputs = await page.locator('input[type="text"]:visible').all();
  for (const input of inputs) {
    try {
      const val = await input.inputValue();
      if (!val || val.length < 2) {
        await input.fill('30sec Challenge');
        console.log('   ✓ アプリ名: 30sec Challenge');
        break;
      }
    } catch {}
  }

  await ss(page, 'android-form');

  // Click Add / Continue
  await clickFirst(page, [
    'button:has-text("Add")',
    'button:has-text("追加")',
    'button:has-text("Continue")',
    'button:has-text("続行")',
  ], '追加', 5000);

  await page.waitForTimeout(5000);
  await ss(page, 'android-created');

  // Extract Android App ID
  let bodyText = await page.locator('body').textContent();
  let appIdMatch = bodyText.match(/(ca-app-pub-\d+~\d+)/);
  if (appIdMatch) {
    results.android.appId = appIdMatch[1];
    console.log(`   ✅ Android App ID: ${results.android.appId}`);
  } else {
    console.log('   ⚠️ App ID 自動取得失敗。スクリーンショットを確認してください。');
  }

  // Click "Done" or "Create ad unit" or navigate to create ad units
  // First let's try "Done" to finish app creation
  await clickFirst(page, [
    'button:has-text("Done")',
    'button:has-text("完了")',
    'button:has-text("DONE")',
  ], '完了', 3000);

  await page.waitForTimeout(2000);

  // Now add ad units for Android
  console.log('\n   📋 Android 広告ユニット作成...');

  // Navigate to the app's ad units page
  // Click on the app in the sidebar or apps list
  const adTypes = [
    { type: 'Banner', name: 'Banner_Android', ja: 'バナー' },
    { type: 'Interstitial', name: 'Interstitial_Android', ja: 'インタースティシャル' },
    { type: 'Rewarded', name: 'Rewarded_Android', ja: 'リワード' },
    { type: 'Native advanced', name: 'Native_Android', ja: 'ネイティブ' },
  ];

  for (const ad of adTypes) {
    console.log(`\n   --- ${ad.name} ---`);

    // Go to Ad units page for this app
    await clickFirst(page, [
      'a:has-text("Ad units")',
      'a:has-text("広告ユニット")',
    ], '広告ユニットページ', 3000);

    await page.waitForTimeout(1000);

    await clickFirst(page, [
      'button:has-text("Add ad unit")',
      'button:has-text("広告ユニットを追加")',
    ], '追加', 5000);

    await page.waitForTimeout(2000);

    // Select ad type
    const typeClicked = await clickFirst(page, [
      `[role="button"]:has-text("${ad.type}")`,
      `button:has-text("${ad.type}")`,
      `a:has-text("${ad.type}")`,
      `div:has-text("${ad.type}")`,
      `[role="button"]:has-text("${ad.ja}")`,
      `button:has-text("${ad.ja}")`,
    ], `タイプ: ${ad.type}`, 5000);

    if (!typeClicked) {
      console.log(`   ⚠️ ${ad.type} が見つかりません`);
      await ss(page, `adtype-fail-${ad.type.toLowerCase()}`);
      continue;
    }

    await page.waitForTimeout(1500);

    // Fill name
    const nameInputs = await page.locator('input[type="text"]:visible').all();
    for (const ni of nameInputs) {
      try {
        const val = await ni.inputValue();
        if (!val || val.includes('unit')) {
          await ni.fill(ad.name);
          console.log(`   ✓ 名前: ${ad.name}`);
          break;
        }
      } catch {}
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
    await ss(page, `ad-${ad.type.toLowerCase()}-android`);

    // Extract ad unit ID
    const unitText = await page.locator('body').textContent();
    const unitMatch = unitText.match(/(ca-app-pub-\d+\/\d+)/);
    if (unitMatch) {
      const key = ad.type.toLowerCase().replace(' ', '_');
      results.android.units[key] = unitMatch[1];
      console.log(`   ✅ ${ad.type}: ${unitMatch[1]}`);
    }

    // Click Done to go back
    await clickFirst(page, [
      'button:has-text("Done")',
      'button:has-text("完了")',
    ], '完了', 3000);

    await page.waitForTimeout(1000);
  }

  // Step 3: Add iOS app
  console.log('\n═══ iOS アプリを追加 ═══');

  // Go to Apps page
  await clickFirst(page, [
    'a:has-text("Apps")',
    'a:has-text("アプリ")',
    'button:has-text("Apps")',
  ], 'アプリページ', 3000);

  await page.waitForTimeout(2000);

  await clickFirst(page, [
    'button:has-text("Add app")',
    'button:has-text("アプリを追加")',
  ], 'アプリ追加', 5000);

  await page.waitForTimeout(2000);

  // Select iOS
  await clickFirst(page, [
    'label:has-text("iOS")',
    'button:has-text("iOS")',
    '[role="radio"]:has-text("iOS")',
    'mat-radio-button:has-text("iOS")',
  ], 'iOS', 5000);

  await page.waitForTimeout(1000);

  await clickFirst(page, [
    'label:has-text("No")',
    'label:has-text("いいえ")',
    '[role="radio"]:has-text("No")',
  ], 'ストア未公開', 3000);

  await page.waitForTimeout(1000);

  const iosInputs = await page.locator('input[type="text"]:visible').all();
  for (const input of iosInputs) {
    try {
      const val = await input.inputValue();
      if (!val || val.length < 2) {
        await input.fill('30sec Challenge');
        console.log('   ✓ アプリ名: 30sec Challenge');
        break;
      }
    } catch {}
  }

  await ss(page, 'ios-form');

  await clickFirst(page, [
    'button:has-text("Add")',
    'button:has-text("追加")',
    'button:has-text("Continue")',
  ], '追加', 5000);

  await page.waitForTimeout(5000);
  await ss(page, 'ios-created');

  bodyText = await page.locator('body').textContent();
  appIdMatch = bodyText.match(/(ca-app-pub-\d+~\d+)/);
  if (appIdMatch) {
    results.ios.appId = appIdMatch[1];
    console.log(`   ✅ iOS App ID: ${results.ios.appId}`);
  }

  await clickFirst(page, [
    'button:has-text("Done")',
    'button:has-text("完了")',
  ], '完了', 3000);

  await page.waitForTimeout(2000);

  // Create iOS ad units
  console.log('\n   📋 iOS 広告ユニット作成...');

  const iosAdTypes = [
    { type: 'Banner', name: 'Banner_iOS', ja: 'バナー' },
    { type: 'Interstitial', name: 'Interstitial_iOS', ja: 'インタースティシャル' },
    { type: 'Rewarded', name: 'Rewarded_iOS', ja: 'リワード' },
    { type: 'Native advanced', name: 'Native_iOS', ja: 'ネイティブ' },
  ];

  for (const ad of iosAdTypes) {
    console.log(`\n   --- ${ad.name} ---`);

    await clickFirst(page, [
      'a:has-text("Ad units")',
      'a:has-text("広告ユニット")',
    ], '広告ユニットページ', 3000);

    await page.waitForTimeout(1000);

    await clickFirst(page, [
      'button:has-text("Add ad unit")',
      'button:has-text("広告ユニットを追加")',
    ], '追加', 5000);

    await page.waitForTimeout(2000);

    await clickFirst(page, [
      `[role="button"]:has-text("${ad.type}")`,
      `button:has-text("${ad.type}")`,
      `a:has-text("${ad.type}")`,
      `[role="button"]:has-text("${ad.ja}")`,
      `button:has-text("${ad.ja}")`,
    ], `タイプ: ${ad.type}`, 5000);

    await page.waitForTimeout(1500);

    const nameInputs2 = await page.locator('input[type="text"]:visible').all();
    for (const ni of nameInputs2) {
      try {
        const val = await ni.inputValue();
        if (!val || val.includes('unit')) {
          await ni.fill(ad.name);
          console.log(`   ✓ 名前: ${ad.name}`);
          break;
        }
      } catch {}
    }

    await clickFirst(page, [
      'button:has-text("Create ad unit")',
      'button:has-text("広告ユニットを作成")',
      'button:has-text("Create")',
      'button:has-text("Done")',
    ], '作成', 5000);

    await page.waitForTimeout(3000);
    await ss(page, `ad-${ad.type.toLowerCase()}-ios`);

    const unitText = await page.locator('body').textContent();
    const unitMatch = unitText.match(/(ca-app-pub-\d+\/\d+)/);
    if (unitMatch) {
      const key = ad.type.toLowerCase().replace(' ', '_');
      results.ios.units[key] = unitMatch[1];
      console.log(`   ✅ ${ad.type}: ${unitMatch[1]}`);
    }

    await clickFirst(page, [
      'button:has-text("Done")',
      'button:has-text("完了")',
    ], '完了', 3000);

    await page.waitForTimeout(1000);
  }

  // Print final results
  console.log('\n═══════════════════════════════════════');
  console.log('📋 AdMob 設定結果');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(results, null, 2));
  console.log('═══════════════════════════════════════');

  const outPath = path.join(SCREENSHOTS_DIR, 'admob-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n結果保存: ${outPath}`);

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
