// Register domain on Xserver Domain (v2 - correct URL)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 710;

const DOMAIN_NAME = '30sec-challenge.com';

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
    slowMo: 400,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Step 1: Login to Xserver Domain panel
  console.log('🔗 Xserver Domain にログイン...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xdomain/');
  await page.waitForTimeout(2000);

  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes('ログインする') && !bodyText.includes('ログアウト')) {
    console.log('⏸️  ブラウザでログインしてください...');
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(2000);
      const t = await page.locator('body').textContent().catch(() => '');
      if (t.includes('ログアウト') || t.includes('ドメイン') && !t.includes('ログインする')) break;
    }
  }
  console.log('✅ ログイン済み');
  await waitForStable(page, 2000);
  await ss(page, 'domain-panel');

  // Step 2: Dump page info
  const pageUrl = page.url();
  console.log(`   現在のURL: ${pageUrl}`);
  const pageContent = await page.locator('body').textContent().catch(() => '');
  console.log(`   ページ内容(先頭500): ${pageContent.substring(0, 500).replace(/\s+/g, ' ')}`);

  // List all links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim().substring(0, 50),
      href: a.getAttribute('href'),
    })).filter(l => l.text && l.href);
  });
  console.log('\n   リンク一覧:');
  links.forEach(l => console.log(`     ${l.text} → ${l.href}`));

  // Step 3: Click "ドメイン新規取得" or "ドメイン取得"
  console.log('\n📋 ドメイン新規取得ページへ...');
  const regClicked = await page.evaluate(() => {
    for (const l of document.querySelectorAll('a')) {
      const t = l.textContent?.trim() || '';
      if (t.includes('ドメイン') && (t.includes('新規取得') || t.includes('取得'))) {
        l.click();
        return t;
      }
    }
    return null;
  });

  if (regClicked) {
    console.log(`   ✓ クリック: ${regClicked}`);
  } else {
    console.log('   ⚠️ 取得リンクが見つかりません');
    // Try direct URL
    console.log('   直接URLで移動...');
    await page.goto('https://www.xdomain.ne.jp/search/domain.php');
  }
  await waitForStable(page, 3000);
  await ss(page, 'domain-new');

  // Step 4: Search for domain
  console.log(`\n🔍 ドメイン検索: ${DOMAIN_NAME}`);
  const domainBase = DOMAIN_NAME.replace('.com', '');

  // Dump form elements
  const formInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    return inputs.map(el => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.getAttribute('id'),
      placeholder: el.getAttribute('placeholder'),
      value: el.value,
    }));
  });
  console.log('   フォーム要素:');
  formInfo.forEach(f => console.log(`     ${f.tag} type=${f.type} name=${f.name} id=${f.id} placeholder=${f.placeholder}`));

  // Try to fill domain name
  const filled = await page.evaluate((base) => {
    const selectors = [
      'input[name="domain"]',
      'input[name="domain_name"]',
      'input[name="search"]',
      'input[name="keyword"]',
      'input[id*="domain"]',
      'input[placeholder*="ドメイン"]',
      'input[placeholder*="希望"]',
      'input[type="text"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        el.value = base;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { selector: sel, value: base };
      }
    }
    return null;
  }, domainBase);

  if (filled) {
    console.log(`   ✓ 入力: ${filled.selector} = ${filled.value}`);
  } else {
    console.log('   ⚠️ 入力フィールドが見つかりません');
  }
  await page.waitForTimeout(1000);

  // Ensure .com is selected
  await page.evaluate(() => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      const label = cb.closest('label')?.textContent || '';
      const val = cb.value || '';
      const name = cb.name || '';
      if (label.includes('.com') || val === 'com' || val === '.com') {
        if (!cb.checked) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });

  await ss(page, 'domain-search-filled');

  // Click search button
  const searchBtn = await page.evaluate(() => {
    // Check buttons first
    for (const b of document.querySelectorAll('button, input[type="submit"]')) {
      const t = b.textContent?.trim() || b.value || '';
      if (t.includes('検索') || t.includes('チェック') || t.includes('確認')) {
        b.click();
        return t;
      }
    }
    // Check links that look like buttons
    for (const a of document.querySelectorAll('a')) {
      const t = a.textContent?.trim() || '';
      if (t.includes('検索') || t.includes('チェック')) {
        a.click();
        return t;
      }
    }
    // Try submitting the form
    const form = document.querySelector('form');
    if (form) {
      form.submit();
      return 'form.submit()';
    }
    return null;
  });

  if (searchBtn) {
    console.log(`   ✓ 検索: ${searchBtn}`);
  } else {
    console.log('   ⚠️ 検索ボタンが見つかりません');
  }

  await waitForStable(page, 5000);
  await ss(page, 'domain-search-result');

  const resultText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   結果(先頭500): ${resultText.substring(0, 500).replace(/\s+/g, ' ')}`);

  // Check availability
  if (resultText.includes('取得できません') || resultText.includes('取得不可')) {
    console.log('\n   ❌ ドメインは取得できません');
  } else if (resultText.includes('取得可能') || resultText.includes('○')) {
    console.log('\n   ✅ ドメイン取得可能！');
  }

  console.log('\n⏸️  画面を確認してください。');
  console.log('   ドメイン取得を進める場合はブラウザで操作してください。');
  console.log('   完了したら Enter を押してください。');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, 'domain-final');
  console.log('\n✅ 完了！');
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
