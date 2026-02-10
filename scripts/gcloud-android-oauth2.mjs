// Create Android OAuth client - click the "アプリケーションの種類" dropdown directly
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const PROJECT_ID = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';
const ANDROID_PACKAGE = 'com.thirtysecchallenge.thirty_sec_challenge';
const ANDROID_SHA1 = '8E:59:D2:C2:09:4E:46:1B:15:0F:14:81:B8:6A:A0:08:BC:B9:FA:A0';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 160;

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
    const url = page.url();
    if (url.includes('console.cloud.google.com') && !url.includes('accounts.google.com')) {
      const text = await page.locator('body').textContent().catch(() => '');
      if (text.includes('アプリケーションの種類') || text.includes('Application type')) {
        console.log('✅ フォームが表示されました');
        break;
      }
    }
    if (i % 15 === 0 && i > 0) console.log(`   ... 待機中 (${i * 2}秒)`);
  }

  await page.waitForTimeout(2000);
  // Close Gemini search if open
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await ss(page, 'create-page');

  // Debug: list all interactive elements on the page
  console.log('\n🔍 ページ内の要素を調査...');
  const allElements = await page.locator('mat-select, mat-form-field, select, [role="combobox"], [role="listbox"], .mat-select, .mat-mdc-select, [class*="select"], [class*="dropdown"]').all();
  console.log(`   検出要素数: ${allElements.length}`);
  for (let i = 0; i < allElements.length; i++) {
    try {
      const tag = await allElements[i].evaluate(e => e.tagName.toLowerCase());
      const cls = await allElements[i].evaluate(e => e.className.substring(0, 100));
      const role = await allElements[i].getAttribute('role') || '';
      const text = (await allElements[i].textContent()).trim().substring(0, 60);
      const isVis = await allElements[i].isVisible();
      console.log(`   [${i}] <${tag}> role="${role}" vis=${isVis} class="${cls.substring(0, 50)}" text="${text}"`);
    } catch {}
  }

  // Try clicking the dropdown that contains "アプリケーションの種類"
  console.log('\n📋 ドロップダウンをクリック...');

  // Approach 1: Click text "アプリケーションの種類"
  let dropdownClicked = false;
  try {
    const dropdown = page.locator('text=アプリケーションの種類').first();
    await dropdown.click({ timeout: 5000 });
    dropdownClicked = true;
    console.log('   ✓ テキスト「アプリケーションの種類」クリック');
  } catch {
    console.log('   テキストクリック失敗');
  }

  // Approach 2: Click the dropdown arrow/container near that text
  if (!dropdownClicked) {
    try {
      // Find the parent element that acts as a dropdown
      const el = page.locator(':has-text("アプリケーションの種類")').filter({ has: page.locator('[role="combobox"], .mat-select, select, [class*="select"]') }).first();
      await el.click({ timeout: 3000 });
      dropdownClicked = true;
      console.log('   ✓ 親要素クリック');
    } catch {}
  }

  // Approach 3: Click any dropdown-like element that's not the search bar
  if (!dropdownClicked) {
    const dropdowns = await page.locator('[role="combobox"]:visible').all();
    for (let i = 0; i < dropdowns.length; i++) {
      try {
        const text = (await dropdowns[i].textContent()).trim();
        // Skip the Gemini search combobox
        if (text.includes('スラッシュ') || text.includes('検索') || text.includes('search') || text.includes('Gemini')) {
          console.log(`   combobox[${i}]: 検索バー (skip)`);
          continue;
        }
        console.log(`   combobox[${i}]: "${text.substring(0, 50)}" → クリック`);
        await dropdowns[i].click();
        dropdownClicked = true;
        break;
      } catch {}
    }
  }

  // Approach 4: Use JavaScript to find and click the mat-select
  if (!dropdownClicked) {
    try {
      await page.evaluate(() => {
        const els = document.querySelectorAll('mat-select, mat-form-field, [role="listbox"]');
        for (const el of els) {
          if (el.offsetParent !== null) { // visible
            el.click();
            return;
          }
        }
      });
      dropdownClicked = true;
      console.log('   ✓ JS evaluate でクリック');
    } catch {}
  }

  // Approach 5: Click by coordinates (the dropdown is roughly in the form area)
  if (!dropdownClicked) {
    try {
      // The dropdown appears to be at roughly x=490, y=249 based on the screenshot
      await page.click('text=アプリケーションの種類 *', { timeout: 3000 });
      dropdownClicked = true;
      console.log('   ✓ ワイルドカードテキストクリック');
    } catch {}
  }

  await page.waitForTimeout(2000);
  await ss(page, 'dropdown-clicked');

  // Check if dropdown options appeared
  const options = await page.locator('mat-option, [role="option"], [role="menuitem"]').all();
  console.log(`   オプション数: ${options.length}`);
  for (let i = 0; i < options.length; i++) {
    try {
      const text = (await options[i].textContent()).trim();
      console.log(`   option[${i}]: "${text}"`);
    } catch {}
  }

  // If no options visible, the dropdown might need a different click target
  if (options.length === 0 || options.every(async o => !(await o.isVisible().catch(() => false)))) {
    console.log('   オプションが表示されていません。SVG矢印をクリック...');
    try {
      // Try clicking the arrow icon within the dropdown
      const arrow = page.locator('.mat-select-arrow, .mat-mdc-select-arrow, svg[class*="arrow"]').first();
      await arrow.click({ timeout: 3000 });
      await page.waitForTimeout(1500);
    } catch {}

    // Re-check
    const opts2 = await page.locator('mat-option:visible, [role="option"]:visible').all();
    console.log(`   再チェック オプション数: ${opts2.length}`);
  }

  // Select Android
  let androidSelected = false;
  const visibleOptions = await page.locator('mat-option:visible, [role="option"]:visible, li[role="option"]:visible').all();
  for (const opt of visibleOptions) {
    try {
      const text = (await opt.textContent()).trim();
      if (text === 'Android' || text.includes('Android')) {
        await opt.click();
        androidSelected = true;
        console.log(`   ✓ Android 選択: "${text}"`);
        break;
      }
    } catch {}
  }

  if (!androidSelected) {
    console.log('   ❌ Android 選択失敗');
    await ss(page, 'android-select-fail');
    console.log('\n確認後 Enter で終了');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    await context.close();
    return;
  }

  await page.waitForTimeout(3000);
  await ss(page, 'android-selected');

  // Fill form fields
  console.log('\n📝 フォーム入力...');
  await page.waitForTimeout(1000);
  const inputs = await page.locator('input:visible:not([type="search"]):not([type="hidden"]):not([aria-label*="検索"]):not([aria-label*="search"]):not([aria-label*="Search"]):not([aria-label*="スラッシュ"])').all();
  console.log(`   入力フィールド数: ${inputs.length}`);

  if (inputs.length >= 1) {
    await inputs[0].fill('30sec Challenge Android');
    console.log('   ✓ 名前');
  }
  if (inputs.length >= 2) {
    await inputs[1].fill(ANDROID_PACKAGE);
    console.log(`   ✓ パッケージ名`);
  }
  if (inputs.length >= 3) {
    await inputs[2].fill(ANDROID_SHA1);
    console.log(`   ✓ SHA-1`);
  }

  await page.waitForTimeout(1000);
  await ss(page, 'form-filled');

  // Click Create
  console.log('\n📋 作成...');
  for (const sel of ['button:has-text("作成")', 'button:has-text("Create")', 'button[type="submit"]']) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible()) {
        await btn.click();
        console.log(`   ✓ ${sel}`);
        break;
      }
    } catch {}
  }

  await page.waitForTimeout(8000);
  await ss(page, 'result');

  // Check result
  const bodyText = await page.locator('body').textContent();
  const idMatch = bodyText.match(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/);

  if (idMatch) {
    console.log(`\n✅ Android Client ID: ${idMatch[1]}`);
    saveResult(idMatch[1]);
  } else if (bodyText.includes('失敗') || bodyText.includes('すでに使用') || bodyText.includes('already') || bodyText.includes('Error')) {
    console.log('\n⚠️ エラーが発生しました');
    // Extract error message
    const errorMatch = bodyText.match(/(失敗.{0,100}|Error.{0,100}|すでに使用.{0,100})/);
    if (errorMatch) console.log(`   ${errorMatch[1]}`);
    await ss(page, 'error');
  } else {
    console.log('\n⚠️ 結果が不明です。スクリーンショットを確認してください。');
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
