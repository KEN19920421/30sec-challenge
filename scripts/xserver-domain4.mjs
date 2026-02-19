// Register 30sec-challenge.com on Xserver Domain (v4 - evaluate-based)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 730;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${step}-${name}.png`);
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
  page.setDefaultTimeout(30000);

  // Go directly to domain search page
  console.log('🔍 ドメイン検索ページを開く...');
  await page.goto('https://www.xdomain.ne.jp/search/domain.php');
  await page.waitForTimeout(3000);
  await ss(page, '01-page');

  // Fill and submit using evaluate
  console.log('📝 ドメイン名入力 + 検索...');
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[name="domainname"]');
    // Fill ALL matching inputs (page may have multiple search forms)
    inputs.forEach(inp => {
      inp.value = '30sec-challenge';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await page.waitForTimeout(500);
  await ss(page, '02-filled');

  // Submit the first form
  await page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const inp = form.querySelector('input[name="domainname"]');
      if (inp && inp.value === '30sec-challenge') {
        form.submit();
        return;
      }
    }
  });

  await page.waitForTimeout(5000);
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
  await ss(page, '03-results');

  // Analyze results
  const pageText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n📊 結果ページ (先頭800):`);
  console.log(pageText.substring(0, 800).replace(/\s+/g, ' '));

  // Check .com availability specifically
  const comStatus = await page.evaluate(() => {
    const rows = document.querySelectorAll('tr, li, div, label');
    const results = [];
    for (const row of rows) {
      const text = row.textContent?.trim() || '';
      if (text.includes('.com') && text.length < 300) {
        const hasCheck = row.querySelector('input[type="checkbox"]');
        const isDisabled = hasCheck?.disabled;
        const hasUnavail = text.includes('取得できません') || text.includes('×');
        results.push({
          text: text.substring(0, 150),
          hasCheckbox: !!hasCheck,
          disabled: isDisabled,
          unavailable: hasUnavail,
        });
      }
    }
    return results;
  });

  console.log('\n🔎 .com 関連要素:');
  comStatus.forEach(s => {
    console.log(`   text: ${s.text}`);
    console.log(`   checkbox: ${s.hasCheckbox}, disabled: ${s.disabled}, unavail: ${s.unavailable}`);
  });

  // If .com is available, try to check it
  if (comStatus.some(s => s.hasCheckbox && !s.disabled && !s.unavailable)) {
    console.log('\n✅ .com 取得可能！チェックします...');
    await page.evaluate(() => {
      const rows = document.querySelectorAll('tr, li, div, label');
      for (const row of rows) {
        const text = row.textContent?.trim() || '';
        if (text.includes('.com') && !text.includes('取得できません')) {
          const cb = row.querySelector('input[type="checkbox"]');
          if (cb && !cb.disabled) {
            cb.checked = true;
            cb.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }
    });
    await page.waitForTimeout(1000);
    await ss(page, '04-com-checked');
  } else {
    console.log('\n⚠️ .com の状態が不明です。ブラウザで確認してください。');
  }

  console.log('\n⏸️  ブラウザで確認してください。');
  console.log('   30sec-challenge.com が取得可能であれば:');
  console.log('   1. .com にチェックを入れる');
  console.log('   2. 「取得手続きに進む」をクリック');
  console.log('   3. ログイン → 支払い → 完了');
  console.log('\n   完了したら Enter を押してください。');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, '05-final');
  const finalText = await page.locator('body').textContent().catch(() => '');
  if (finalText.includes('取得完了') || finalText.includes('ドメイン一覧')) {
    console.log('\n✅ ドメイン取得完了！');
  }
  console.log(`最終ページ: ${finalText.substring(0, 300).replace(/\s+/g, ' ')}`);

  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
