// Register domain on Xserver Domain
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 700;

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

  // Step 1: Login
  console.log('🔗 Xserverにログイン...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xserver/');
  await page.waitForTimeout(2000);
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes('ログイン') && !bodyText.includes('ログアウト')) {
    console.log('⏸️  ブラウザでログインしてください...');
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(2000);
      const t = await page.locator('body').textContent().catch(() => '');
      if (t.includes('ログアウト') || t.includes('サービス管理')) break;
    }
  }
  console.log('✅ ログイン済み');

  // Step 2: Navigate to Xserver Domain
  console.log('\n📋 Xserver Domain に移動...');
  try {
    // Click サービス管理
    await page.locator('text="サービス管理"').first().click();
    await waitForStable(page, 2000);
  } catch {}

  // Look for Xserver Domain link
  const domainLink = await page.evaluate(() => {
    for (const l of document.querySelectorAll('a')) {
      const t = l.textContent?.trim() || '';
      const h = l.getAttribute('href') || '';
      if (t.includes('Xserver Domain') || t.includes('XServerドメイン') || t.includes('Xserverドメイン')) {
        return h;
      }
    }
    return null;
  });

  if (domainLink) {
    console.log(`   ドメインサービスリンク: ${domainLink}`);
    await page.goto(domainLink.startsWith('http') ? domainLink : `https://secure.xserver.ne.jp${domainLink}`);
  } else {
    // Direct navigation
    console.log('   直接URLで移動...');
    await page.goto('https://secure.xserver.ne.jp/xapanel/xdomain/');
  }
  await waitForStable(page, 3000);
  await ss(page, 'domain-top');

  // Step 3: Search for domain availability
  console.log(`\n🔍 ドメイン検索: ${DOMAIN_NAME}`);

  // Look for domain search/registration link
  const pageText = await page.locator('body').textContent().catch(() => '');
  console.log(`   ページ内容(先頭300): ${pageText.substring(0, 300).replace(/\s+/g, ' ')}`);

  // Try to find "ドメイン取得" or similar link
  const regLink = await page.evaluate(() => {
    for (const l of document.querySelectorAll('a')) {
      const t = l.textContent?.trim() || '';
      if (t.includes('ドメイン取得') || t.includes('ドメインを取得') || t.includes('新規取得')) {
        return { href: l.getAttribute('href'), text: t };
      }
    }
    return null;
  });

  if (regLink) {
    console.log(`   取得リンク: ${regLink.text} → ${regLink.href}`);
    if (regLink.href) {
      await page.goto(regLink.href.startsWith('http') ? regLink.href : `https://secure.xserver.ne.jp${regLink.href}`);
      await waitForStable(page, 3000);
    }
  }

  await ss(page, 'domain-search-page');

  // Find search input and enter domain
  const searchInput = await page.evaluate((domain) => {
    // Try various input fields
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[name*="domain"], input[placeholder*="ドメイン"]');
    for (const inp of inputs) {
      const name = inp.getAttribute('name') || '';
      const placeholder = inp.getAttribute('placeholder') || '';
      const id = inp.getAttribute('id') || '';
      console.log(`Input found: name=${name}, placeholder=${placeholder}, id=${id}`);
    }
    return inputs.length;
  }, DOMAIN_NAME);

  console.log(`   入力フィールド数: ${searchInput}`);

  // Try to fill the domain search
  const domainBase = DOMAIN_NAME.replace('.com', '');
  try {
    // Try common selectors for domain search
    const filled = await page.evaluate((base) => {
      const selectors = [
        'input[name="domain"]',
        'input[name="domain_name"]',
        'input[name="search"]',
        'input[type="text"]',
        'input[placeholder*="ドメイン"]',
        'input[placeholder*="domain"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
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
      console.log('   ⚠️ 入力フィールドが見つかりません。手動で入力してください。');
    }
  } catch (e) {
    console.log(`   入力エラー: ${e.message}`);
  }

  await ss(page, 'domain-filled');

  // Try to check .com checkbox if needed
  await page.evaluate(() => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of checkboxes) {
      const label = cb.closest('label')?.textContent || '';
      const value = cb.value || '';
      if (label.includes('.com') || value.includes('com')) {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  // Click search button
  const searchClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button, input[type="submit"]');
    for (const b of buttons) {
      const t = b.textContent?.trim() || b.value || '';
      if (t.includes('検索') || t.includes('チェック') || t.includes('取得')) {
        b.click();
        return t;
      }
    }
    return null;
  });

  if (searchClicked) {
    console.log(`   ✓ 検索ボタン: ${searchClicked}`);
  }

  await waitForStable(page, 5000);
  await ss(page, 'domain-result');

  const resultText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   検索結果(先頭500): ${resultText.substring(0, 500).replace(/\s+/g, ' ')}`);

  // Check availability
  if (resultText.includes('取得できません') || resultText.includes('unavailable') || resultText.includes('既に登録')) {
    console.log('\n   ❌ ドメインは取得できません！');
    console.log('\n確認後 Enter で終了');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    await context.close();
    return;
  }

  console.log('\n⏸️  画面を確認してください。');
  console.log('   ドメイン取得を進める場合はブラウザで操作し、');
  console.log('   完了したら Enter を押してください。');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, 'domain-final');
  console.log('\n✅ 完了！');
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
