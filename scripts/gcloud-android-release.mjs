// Create Android OAuth client with RELEASE keystore SHA-1
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const PROJECT_ID = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const RELEASE_SHA1 = '99:26:5E:16:3B:09:DD:9D:BF:ED:76:E1:F4:9E:6F:B0:8A:6D:FF:30';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 180;

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

  console.log('🔗 OAuth クライアント作成ページに移動...');
  await page.goto(`${GCP}/auth/clients/create?project=${PROJECT_ID}`);

  console.log('⏳ ページ読み込み待ち...');
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(2000);
    const text = await page.locator('body').textContent().catch(() => '');
    if (text.includes('アプリケーションの種類') || text.includes('Application type')) {
      console.log('✅ フォーム表示完了');
      break;
    }
    if (i % 15 === 0 && i > 0) console.log(`   ... 待機中 (${i * 2}秒)`);
  }

  await page.waitForTimeout(2000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Select Android
  console.log('\n📋 Android を選択...');
  await page.locator('text=アプリケーションの種類').first().click({ timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.locator('[role="option"]:has-text("Android"), mat-option:has-text("Android")').first().click({ timeout: 5000 });
  console.log('   ✓ Android');
  await page.waitForTimeout(2000);

  // Fill form with release SHA-1
  console.log('\n📝 フォーム入力 (リリース SHA-1)...');
  const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"]):not([aria-label*="search"]):not([aria-label*="Search"]):not([aria-label*="スラッシュ"])').all();
  console.log(`   入力フィールド数: ${inputs.length}`);

  if (inputs.length >= 1) {
    await inputs[0].fill('30sec Challenge Android');
    console.log('   ✓ 名前: 30sec Challenge Android');
  }
  if (inputs.length >= 2) {
    await inputs[1].fill(ANDROID_PACKAGE);
    console.log(`   ✓ パッケージ名: ${ANDROID_PACKAGE}`);
  }
  if (inputs.length >= 3) {
    await inputs[2].fill(RELEASE_SHA1);
    console.log(`   ✓ SHA-1: ${RELEASE_SHA1}`);
  }

  await page.waitForTimeout(1000);
  await ss(page, 'form-release');

  // Click Create
  console.log('\n📋 作成...');
  const createBtn = page.locator('button:has-text("作成")').first();

  // Wait for button to become enabled
  for (let i = 0; i < 10; i++) {
    const disabled = await createBtn.getAttribute('aria-disabled');
    if (disabled !== 'true') break;
    console.log(`   ボタン無効... (${i})`);
    await page.waitForTimeout(1000);
  }

  await createBtn.click({ force: true, timeout: 10000 });
  console.log('   ✓ 作成クリック');

  await page.waitForTimeout(8000);
  await ss(page, 'result-release');

  // Check result
  const bodyText = await page.locator('body').textContent();
  const idMatch = bodyText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);

  if (idMatch) {
    console.log(`\n✅ Android Client ID: ${idMatch[1]}`);
    saveResult(idMatch[1]);
  } else if (bodyText.includes('失敗') || bodyText.includes('Error') || bodyText.includes('すでに')) {
    console.log('\n⚠️ 作成失敗');

    // Get error text
    try {
      const dialog = await page.locator('[role="dialog"], [role="alertdialog"]').first().textContent();
      console.log(`   エラー: ${dialog.substring(0, 200)}`);
    } catch {}
    await ss(page, 'error-release');
  } else {
    // Navigate to clients list to check
    console.log('\n📋 クライアント一覧を確認...');
    await page.goto(`${GCP}/auth/clients?project=${PROJECT_ID}`);
    await page.waitForTimeout(5000);
    await ss(page, 'clients-check');

    const listText = await page.locator('body').textContent();
    const ids = [...listText.matchAll(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/g)];
    console.log(`   見つかった Client ID: ${ids.length}`);
    for (const m of ids) console.log(`   → ${m[1]}`);
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
    results.android = { name: '30sec Challenge Android', clientId, sha1: '99:26:5E:16:3B:09:DD:9D:BF:ED:76:E1:F4:9E:6F:B0:8A:6D:FF:30' };
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log('   結果ファイル更新');
  } catch (e) {
    const data = { android: { name: '30sec Challenge Android', clientId } };
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'android-oauth.json'), JSON.stringify(data, null, 2));
    console.log('   android-oauth.json に保存');
  }
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
