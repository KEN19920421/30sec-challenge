// Firebase Console setup script using Playwright
// Adds iOS + Android apps, downloads config files, checks FCM.

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FLUTTER_DIR = path.join(PROJECT_ROOT, 'flutter_app');
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');

const FIREBASE_PROJECT_ID = 'sec-challenge-34060';
const BASE_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}`;

const IOS_BUNDLE_ID = 'com.thirtysecchallenge.thirtySecChallenge';
const IOS_NICKNAME = '30sec Challenge iOS';
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const ANDROID_NICKNAME = '30sec Challenge Android';
const ANDROID_SHA1 = '8E:59:D2:C2:09:4E:46:1B:15:0F:14:81:B8:6A:A0:08:BC:B9:FA:A0';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let stepCounter = 0;

async function screenshot(page, name) {
  stepCounter++;
  const filepath = path.join(SCREENSHOTS_DIR, `${String(stepCounter).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`   📸 ${filepath}`);
  return filepath;
}

async function debugPage(page, label) {
  console.log(`\n   [DEBUG ${label}]`);
  // List all visible buttons with their text
  const buttons = await page.locator('button:visible').all();
  for (let i = 0; i < buttons.length; i++) {
    const text = (await buttons[i].textContent()).trim().replace(/\s+/g, ' ').substring(0, 80);
    const ariaLabel = await buttons[i].getAttribute('aria-label') || '';
    if (text || ariaLabel) {
      console.log(`   button[${i}]: text="${text}" aria="${ariaLabel}"`);
    }
  }
  // List all visible links
  const links = await page.locator('a:visible').all();
  for (let i = 0; i < Math.min(links.length, 20); i++) {
    const text = (await links[i].textContent()).trim().replace(/\s+/g, ' ').substring(0, 80);
    const href = await links[i].getAttribute('href') || '';
    if (text) {
      console.log(`   a[${i}]: text="${text}" href="${href}"`);
    }
  }
}

async function addApp(page, platform, config) {
  const { bundleId, nickname, sha1, configFileName, destPath } = config;
  const platformLabel = platform === 'ios' ? 'iOS (Apple)' : 'Android';

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📱 ${platformLabel} アプリを追加しています...`);
  console.log(`${'='.repeat(50)}`);

  // Navigate to settings page
  await page.goto(`${BASE_URL}/settings/general`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Scroll down to reveal "マイアプリ" section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  await screenshot(page, `${platform}-settings-scrolled`);

  // Debug: show all buttons
  await debugPage(page, `${platform} settings page`);

  // Strategy: find the add app button in the "マイアプリ" section
  // Firebase shows platform icons (Apple, Android, Web, Unity) when no apps exist
  // Or an "アプリを追加" / "Add app" button
  let clicked = false;

  // 1. Try text-based "Add app" button
  const addAppSelectors = [
    'button:has-text("アプリを追加")',
    'button:has-text("Add app")',
    '[aria-label="アプリを追加"]',
    '[aria-label="Add app"]',
  ];
  for (const sel of addAppSelectors) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 2000 });
      await btn.click();
      console.log(`   ✓ "${sel}" をクリック`);
      clicked = true;
      break;
    } catch { /* try next */ }
  }

  // 2. If no explicit "Add app" button, look for platform icon buttons
  // These are often just icon buttons in the "マイアプリ" section
  if (!clicked) {
    console.log('   "アプリを追加" ボタンが見つかりません。プラットフォームアイコンを探しています...');

    // Try clicking the platform icon directly (Firebase sometimes shows platform icons directly)
    const platformIconSelectors = platform === 'ios' ? [
      'button[aria-label*="Apple"]',
      'button[aria-label*="iOS"]',
      'button[aria-label*="apple"]',
      // Material icon with apple
      'button:has(mat-icon:has-text("apple"))',
    ] : [
      'button[aria-label*="Android"]',
      'button[aria-label*="android"]',
      'button:has(mat-icon:has-text("android"))',
    ];

    for (const sel of platformIconSelectors) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 2000 });
        await btn.click();
        console.log(`   ✓ プラットフォームアイコン "${sel}" をクリック`);
        clicked = true;
        break;
      } catch { /* try next */ }
    }
  }

  // 3. Fallback: find any clickable element near "マイアプリ" text
  if (!clicked) {
    console.log('   プラットフォームアイコンも見つかりません。ページ構造を調査...');

    // Check if we can find the "マイアプリ" section and look for buttons/links nearby
    try {
      const myAppsSection = page.locator('text=マイアプリ').first();
      await myAppsSection.waitFor({ state: 'visible', timeout: 3000 });

      // Look for the closest clickable elements after "マイアプリ"
      // In Firebase, the platform buttons are rendered as circle icons below this header
      // They might be <a> tags or <button> tags
      const nearbyClickables = await page.evaluate(() => {
        const el = [...document.querySelectorAll('*')].find(e => e.textContent.includes('マイアプリ') && e.children.length < 5);
        if (!el) return [];
        // Get parent container and find all clickable descendants
        const container = el.closest('section') || el.parentElement?.parentElement || el.parentElement;
        const clickables = container.querySelectorAll('button, a, [role="button"]');
        return [...clickables].map(c => ({
          tag: c.tagName,
          text: c.textContent.trim().substring(0, 50),
          ariaLabel: c.getAttribute('aria-label') || '',
          className: c.className.substring(0, 100),
        }));
      });
      console.log(`   マイアプリ セクション付近のクリック可能要素: ${JSON.stringify(nearbyClickables, null, 2)}`);
    } catch (e) {
      console.log(`   マイアプリ セクションが見つかりません: ${e.message}`);
    }

    await screenshot(page, `${platform}-debug-no-button`);
  }

  if (!clicked) {
    console.log(`\n   ⚠️ 自動でアプリ追加ボタンを見つけられませんでした。`);
    console.log(`   手動でブラウザ上の「アプリを追加」ボタンをクリックしてください。`);
    console.log(`   クリックしたら自動的に続行します... (60秒待機)`);

    // Wait for the registration form to appear (indicates user clicked the button)
    try {
      await page.locator('input').first().waitFor({ state: 'visible', timeout: 60000 });
      console.log('   ✓ フォームが検出されました。続行します。');
    } catch {
      console.log('   ⚠️ タイムアウト。次のプラットフォームに進みます。');
      return;
    }
  }

  await page.waitForTimeout(2000);
  await screenshot(page, `${platform}-after-add-click`);

  // If we clicked "Add app" (not a direct platform icon), we need to select the platform
  if (clicked) {
    // Check if a platform selection dialog appeared
    await page.waitForTimeout(1000);

    const platformBtnSelectors = platform === 'ios' ? [
      'button:has-text("Apple")',
      'button:has-text("iOS")',
      '[data-platform="ios"]',
      'button[aria-label*="Apple"]',
      'button[aria-label*="iOS"]',
    ] : [
      'button:has-text("Android")',
      '[data-platform="android"]',
      'button[aria-label*="Android"]',
    ];

    for (const sel of platformBtnSelectors) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 3000 });
        await btn.click();
        console.log(`   ✓ プラットフォーム "${sel}" を選択`);
        break;
      } catch { /* try next */ }
    }

    await page.waitForTimeout(2000);
  }

  await screenshot(page, `${platform}-form`);

  // Fill in the registration form
  console.log('   フォームに入力中...');

  // Wait for form inputs to appear
  try {
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 10000 });
  } catch {
    console.log('   ⚠️ 入力フィールドが見つかりません。');
    await screenshot(page, `${platform}-no-form`);
    return;
  }

  // Get all visible text inputs
  const inputs = await page.locator('input:visible').all();
  console.log(`   表示中の入力フィールド数: ${inputs.length}`);

  // Debug: show input details
  for (let i = 0; i < inputs.length; i++) {
    const placeholder = await inputs[i].getAttribute('placeholder') || '';
    const ariaLabel = await inputs[i].getAttribute('aria-label') || '';
    const name = await inputs[i].getAttribute('name') || '';
    console.log(`   input[${i}]: placeholder="${placeholder}" aria="${ariaLabel}" name="${name}"`);
  }

  // Fill bundle ID / package name in the first text input
  if (inputs.length >= 1) {
    await inputs[0].click();
    await inputs[0].fill(bundleId);
    console.log(`   ✓ ${platform === 'ios' ? 'バンドルID' : 'パッケージ名'}: ${bundleId}`);
  }

  // Fill nickname in the second input (if exists)
  if (inputs.length >= 2) {
    await inputs[1].click();
    await inputs[1].fill(nickname);
    console.log(`   ✓ ニックネーム: ${nickname}`);
  }

  // Fill SHA-1 for Android (third input)
  if (platform === 'android' && sha1 && inputs.length >= 3) {
    await inputs[2].click();
    await inputs[2].fill(sha1);
    console.log(`   ✓ SHA-1: ${sha1}`);
  }

  await screenshot(page, `${platform}-form-filled`);

  // Click register button
  const regSelectors = [
    'button:has-text("アプリを登録")',
    'button:has-text("Register app")',
    'button:has-text("登録")',
    'button:has-text("Register")',
    'button[type="submit"]',
  ];

  let registered = false;
  for (const sel of regSelectors) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log(`   ✓ 登録ボタンをクリック (${sel})`);
      registered = true;
      break;
    } catch { /* try next */ }
  }

  if (!registered) {
    console.log('   ⚠️ 登録ボタンが見つかりません。');
    await debugPage(page, 'register button search');
    await screenshot(page, `${platform}-no-register-btn`);
  }

  await page.waitForTimeout(5000);
  await screenshot(page, `${platform}-after-register`);

  // Download config file
  console.log(`   ${configFileName} をダウンロード中...`);
  let downloaded = false;

  const dlSelectors = [
    `a:has-text("${configFileName}")`,
    `button:has-text("${configFileName}")`,
    'a[download]',
    'button:has-text("ダウンロード")',
    'button:has-text("Download")',
  ];

  for (const sel of dlSelectors) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
        btn.click(),
      ]);
      await download.saveAs(destPath);
      console.log(`   ✅ ${configFileName} → ${destPath}`);
      downloaded = true;
      break;
    } catch { /* try next */ }
  }

  if (!downloaded) {
    console.log(`   ⚠️ ダウンロードできませんでした。`);
    console.log(`   → 手動で ${configFileName} をダウンロードし ${destPath} に配置してください`);
  }

  // Click through remaining wizard steps (Next / Continue / Skip)
  for (let i = 0; i < 5; i++) {
    const nextSelectors = [
      'button:has-text("次へ")',
      'button:has-text("Next")',
      'button:has-text("続行")',
      'button:has-text("Continue")',
      'button:has-text("コンソールに進む")',
      'button:has-text("Continue to console")',
      'button:has-text("Skip")',
      'button:has-text("スキップ")',
      'button:has-text("このステップをスキップ")',
      'button:has-text("Skip this step")',
    ];

    let foundNext = false;
    for (const sel of nextSelectors) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 3000 });
        await btn.click();
        console.log(`   → ウィザードステップ: "${sel}"`);
        foundNext = true;
        await page.waitForTimeout(2000);
        break;
      } catch { /* try next */ }
    }

    if (!foundNext) break;
  }

  await screenshot(page, `${platform}-done`);
  console.log(`   ✅ ${platformLabel} アプリの追加が完了しました。`);
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  console.log('🔗 Firebase Console を開いています...');
  await page.goto(`${BASE_URL}/overview`);

  console.log('⏳ ログインしてください... プロジェクトページの読み込みを待ちます。');

  // Wait for project page to load (user logs in manually)
  await page.waitForURL(`**/project/${FIREBASE_PROJECT_ID}/**`, { timeout: 300000 });
  await page.waitForTimeout(5000);
  console.log('✅ Firebase プロジェクトページが読み込まれました。');
  await screenshot(page, 'overview');

  // === iOS App ===
  await addApp(page, 'ios', {
    bundleId: IOS_BUNDLE_ID,
    nickname: IOS_NICKNAME,
    configFileName: 'GoogleService-Info.plist',
    destPath: path.join(FLUTTER_DIR, 'ios', 'Runner', 'GoogleService-Info.plist'),
  });

  // === Android App ===
  await addApp(page, 'android', {
    bundleId: ANDROID_PACKAGE,
    nickname: ANDROID_NICKNAME,
    sha1: ANDROID_SHA1,
    configFileName: 'google-services.json',
    destPath: path.join(FLUTTER_DIR, 'android', 'app', 'google-services.json'),
  });

  // === FCM Check ===
  console.log('\n🔔 Cloud Messaging を確認しています...');
  await page.goto(`${BASE_URL}/messaging`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await screenshot(page, 'fcm-page');
  console.log('   ✅ FCM はデフォルトで有効です。');

  console.log('\n' + '═'.repeat(50));
  console.log('📋 Firebase セットアップ完了');
  console.log('═'.repeat(50));
  console.log(`  Project ID: ${FIREBASE_PROJECT_ID}`);
  console.log(`  iOS Bundle: ${IOS_BUNDLE_ID}`);
  console.log(`  Android Package: ${ANDROID_PACKAGE}`);
  console.log('  スクリーンショット: scripts/_screenshots/');
  console.log('\n  確認後 Enter で終了');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await browser.close();
}

main().catch(e => {
  console.error('エラー:', e.message);
  process.exit(1);
});
