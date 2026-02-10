// Create Android OAuth client WITHOUT SHA-1 (to avoid conflict with old project)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const PROJECT_ID = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 170;

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

  // Click application type dropdown
  console.log('\n📋 Android を選択...');
  await page.locator('text=アプリケーションの種類').first().click({ timeout: 5000 });
  await page.waitForTimeout(1500);

  // Select Android
  await page.locator('[role="option"]:has-text("Android"), mat-option:has-text("Android")').first().click({ timeout: 5000 });
  console.log('   ✓ Android 選択');
  await page.waitForTimeout(2000);

  // Fill form - only name and package name, NO SHA-1
  console.log('\n📝 フォーム入力 (SHA-1 なし)...');
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
  // Deliberately skip SHA-1 (inputs[2])

  await ss(page, 'form-nosha');

  // Click Create
  console.log('\n📋 作成...');
  await page.locator('button:has-text("作成")').first().click({ timeout: 5000 });
  console.log('   ✓ 作成クリック');

  await page.waitForTimeout(8000);
  await ss(page, 'result-nosha');

  // Check result
  const bodyText = await page.locator('body').textContent();
  const idMatch = bodyText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);

  if (idMatch) {
    console.log(`\n✅ Android Client ID: ${idMatch[1]}`);
    console.log('   ⚠️ SHA-1 は後で Google Cloud Console から追加してください。');
    saveResult(idMatch[1]);
  } else if (bodyText.includes('失敗') || bodyText.includes('Error')) {
    console.log('\n⚠️ SHA-1 なしでも失敗しました。');
    await ss(page, 'error-nosha');

    // Extract error
    const errorEl = await page.locator('[class*="error"], [class*="dialog"], [role="alertdialog"], [role="dialog"]').first().textContent().catch(() => '');
    console.log(`   エラー: ${errorEl.substring(0, 200)}`);
  } else {
    console.log('\n⚠️ 結果不明。スクリーンショットを確認してください。');

    // Try to navigate to client list to find the newly created client
    console.log('\n📋 クライアント一覧で確認...');
    await page.goto(`${GCP}/auth/clients?project=${PROJECT_ID}`);
    await page.waitForTimeout(5000);
    await ss(page, 'clients-list');

    const listText = await page.locator('body').textContent();
    const allIds = [...listText.matchAll(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/g)];
    console.log(`   Client IDs found: ${allIds.length}`);
    for (const m of allIds) {
      console.log(`   → ${m[1]}`);
    }
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
    results.android = { name: '30sec Challenge Android', clientId };
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log('   結果ファイル更新完了');
  } catch (e) {
    const standalone = { android: { name: '30sec Challenge Android', clientId } };
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'android-oauth.json'), JSON.stringify(standalone, null, 2));
    console.log(`   android-oauth.json に保存`);
  }
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
