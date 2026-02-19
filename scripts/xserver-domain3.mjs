// Register 30sec-challenge.com on Xserver Domain (v3)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 720;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${step}-${name}.png`);
}

async function waitForStable(page, ms = 3000) {
  await page.waitForTimeout(ms);
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
}

async function main() {
  const userDataDir = path.join(__dirname, '_xserver-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Go directly to domain search page
  console.log('🔍 ドメイン検索ページを開く...');
  await page.goto('https://www.xdomain.ne.jp/search/domain.php');
  await waitForStable(page, 3000);
  await ss(page, '01-search-page');

  // Fill domain name using Playwright's native fill()
  console.log('📝 ドメイン名を入力: 30sec-challenge');
  const input = page.locator('input[name="domainname"]').first();
  await input.click();
  await input.fill('30sec-challenge');
  await page.waitForTimeout(500);
  await ss(page, '02-filled');

  // Click search button
  console.log('🔎 検索...');
  await page.locator('button:has-text("検索"), input[type="submit"][value*="検索"], a:has-text("検索する")').first().click();
  await waitForStable(page, 5000);
  await ss(page, '03-results');

  // Get search results
  const resultText = await page.locator('body').textContent().catch(() => '');

  // Look for .com specific result
  const comAvailable = !resultText.includes('30sec-challenge.com') ||
    (resultText.includes('30sec-challenge.com') && !resultText.includes('取得できません'));

  // Find prices and availability for .com
  const comInfo = await page.evaluate(() => {
    const body = document.body.innerHTML;
    const text = document.body.textContent || '';

    // Look for elements containing .com
    const allElements = document.querySelectorAll('*');
    const comElements = [];
    for (const el of allElements) {
      const t = el.textContent?.trim() || '';
      if (t.includes('.com') && t.length < 200 && !t.includes('<')) {
        comElements.push({
          tag: el.tagName,
          class: el.className?.substring?.(0, 50),
          text: t.substring(0, 100),
        });
      }
    }

    // Check for available/unavailable indicators near .com
    const hasX = text.includes('.com') && text.includes('×');
    const hasCircle = text.includes('.com') && text.includes('○');
    const hasPrice = text.includes('.com') && text.match(/\d+円/);

    return {
      comElements: comElements.slice(0, 10),
      hasX,
      hasCircle,
      priceMatch: hasPrice ? text.match(/\.com[\s\S]{0,100}?(\d+円)/)?.[1] : null,
    };
  });

  console.log('\n📊 .com 検索結果:');
  console.log(`   要素数: ${comInfo.comElements.length}`);
  comInfo.comElements.forEach(e => console.log(`   ${e.tag}.${e.class}: ${e.text}`));
  console.log(`   ○マーク: ${comInfo.hasCircle}`);
  console.log(`   ×マーク: ${comInfo.hasX}`);
  console.log(`   料金: ${comInfo.priceMatch}`);

  // Take a zoomed screenshot of the top section
  const topArea = page.locator('.result, .search-result, #result, [class*="result"], [class*="domain"]').first();
  try {
    await topArea.screenshot({ path: path.join(SCREENSHOTS_DIR, `${++step}-04-result-zoom.png`) });
    console.log(`   📸 ${step}-04-result-zoom.png`);
  } catch {
    // Fallback: screenshot viewport only
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${++step}-04-viewport.png`) });
    console.log(`   📸 ${step}-04-viewport.png`);
  }

  console.log('\n⏸️  ブラウザで検索結果を確認してください。');
  console.log('   30sec-challenge.com が取得可能な場合:');
  console.log('   1. .com にチェック');
  console.log('   2. 「取得手続きに進む」をクリック');
  console.log('   3. XServerアカウントでログイン');
  console.log('   4. 支払い方法を選択して完了');
  console.log('\n   完了したら Enter を押してください。');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, '05-final');
  const finalUrl = page.url();
  const finalText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   最終URL: ${finalUrl}`);

  if (finalText.includes('取得完了') || finalText.includes('登録完了') || finalText.includes('設定完了')) {
    console.log('   ✅ ドメイン取得完了！');
  }

  console.log(`   ページ内容(先頭300): ${finalText.substring(0, 300).replace(/\s+/g, ' ')}`);

  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
