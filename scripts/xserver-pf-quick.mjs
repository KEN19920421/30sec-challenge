// Quick packet filter: add SSH + Web rules and save
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 640;

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

  // Login
  console.log('🔗 ログイン...');
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

  // Navigate to VPS
  try {
    await page.locator('text="サービス管理"').first().click();
    await page.waitForTimeout(1500);
    const href = await page.evaluate(() => {
      for (const l of document.querySelectorAll('a')) {
        const t = l.textContent?.trim() || '';
        const h = l.getAttribute('href') || '';
        if ((t.startsWith('XServer VPS') || t.startsWith('Xserver VPS')) && !h.includes('game')) return h;
      }
      return null;
    });
    if (href) await page.goto(href.startsWith('http') ? href : `https://secure.xserver.ne.jp${href}`);
  } catch {
    await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/index');
  }
  await waitForStable(page, 3000);
  try { await page.locator('a:has-text("VPS管理")').first().click(); await waitForStable(page, 3000); } catch {}
  try { await page.locator('a:has-text("選択する")').first().click(); await waitForStable(page, 5000); } catch {}

  // Go to packet filter page
  console.log('\n📋 パケットフィルター設定...');
  await page.goto(page.url().replace(/\/xvps\/.*/, '/xvps/vps/setting/port/input'));
  await waitForStable(page, 3000);
  await ss(page, '01-filter-page');

  // Check current rules
  const currentText = await page.locator('body').textContent().catch(() => '');
  const hasSSH = currentText.includes('SSH') || currentText.includes('22');
  const hasWeb = currentText.includes('80') || currentText.includes('443');
  console.log(`   現在のルール: SSH=${hasSSH}, Web=${hasWeb}`);

  // Add rules using evaluate to avoid visibility issues
  const addRules = ['ssh', 'web'];
  for (const rule of addRules) {
    console.log(`\n   ルール追加: ${rule}...`);

    // Click the add link
    const addLinkClicked = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const l of links) {
        if (l.textContent?.includes('パケットフィルター設定を追加する')) {
          l.click();
          return true;
        }
      }
      return false;
    });

    if (!addLinkClicked) {
      console.log(`   ⚠️  追加リンクが見つかりません（既に最大数？）`);
      continue;
    }

    await page.waitForTimeout(2000);

    // Select filter type
    await page.evaluate((filterType) => {
      const select = document.querySelector('select[name="filter_type"]');
      if (select) {
        select.value = filterType;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, rule);
    console.log(`   ✓ フィルター: ${rule}`);
    await page.waitForTimeout(1000);

    // Click the BUTTON "追加する" (not the link)
    const buttonClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const b of buttons) {
        if (b.textContent?.trim() === '追加する') {
          b.click();
          return true;
        }
      }
      return false;
    });
    console.log(`   ✓ 追加ボタン: ${buttonClicked}`);
    await page.waitForTimeout(2000);
  }

  await ss(page, '02-rules-added');

  // Click "変更する" to apply
  console.log('\n📋 変更を適用...');
  const applyClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      if (b.textContent?.trim().includes('変更する')) {
        b.click();
        return true;
      }
    }
    return false;
  });
  console.log(`   ✓ 変更する: ${applyClicked}`);
  await waitForStable(page, 5000);

  // Handle confirmation dialog
  try {
    await page.locator('button:has-text("OK")').first().click({ timeout: 5000 });
    console.log('   ✓ 確認OK');
    await waitForStable(page, 3000);
  } catch {}

  await ss(page, '03-result');
  const result = await page.locator('body').textContent().catch(() => '');
  if (result.includes('完了')) {
    console.log('\n   ✅ パケットフィルター設定完了！');
  }
  console.log(`   結果: ${result.substring(0, 300).replace(/\s+/g, ' ')}`);

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
