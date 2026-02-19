// Check/Add DNS A record for 30sec-challenge.com
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 760;

const DOMAIN = '30sec-challenge.com';
const VPS_IP = '210.131.218.20';

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

  // Login to VPS panel
  console.log('🔗 XServer VPSにログイン...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/');
  await page.waitForTimeout(2000);
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes('ログインする') && !bodyText.includes('ログアウト')) {
    console.log('⏸️  ブラウザでログインしてください...');
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(2000);
      const t = await page.locator('body').textContent().catch(() => '');
      if (t.includes('ログアウト') || t.includes('VPS管理') || t.includes('サービス管理')) break;
    }
  }
  console.log('✅ ログイン済み');

  // Navigate to DNS settings
  console.log('\n📋 DNS設定ページへ...');
  try { await page.locator('a:has-text("VPS管理")').first().click(); await waitForStable(page, 3000); } catch {}
  try { await page.locator('a:has-text("選択する")').first().click(); await waitForStable(page, 5000); } catch {}

  // Click DNS設定 in sidebar
  await page.evaluate(() => {
    for (const a of document.querySelectorAll('a')) {
      if (a.textContent?.trim() === 'DNS設定') { a.click(); return; }
    }
  });
  await waitForStable(page, 3000);
  await ss(page, '01-dns-list');

  // Check if domain is already added
  const pageText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n📊 現在のDNS設定:`);
  console.log(`   ${pageText.substring(0, 500).replace(/\s+/g, ' ')}`);

  if (pageText.includes(DOMAIN)) {
    console.log(`\n✅ ${DOMAIN} は追加済み`);

    // Click on the domain to see records
    const clicked = await page.evaluate((domain) => {
      for (const a of document.querySelectorAll('a')) {
        if (a.textContent?.trim().includes('選択する') || a.textContent?.trim().includes(domain)) {
          a.click();
          return a.textContent?.trim();
        }
      }
      return null;
    }, DOMAIN);
    console.log(`   クリック: ${clicked}`);
    await waitForStable(page, 3000);
    await ss(page, '02-domain-records');

    const recordsText = await page.locator('body').textContent().catch(() => '');
    console.log(`\n   レコード一覧:`);
    console.log(`   ${recordsText.substring(0, 800).replace(/\s+/g, ' ')}`);

    // Check if A record exists
    if (recordsText.includes(VPS_IP)) {
      console.log(`\n✅ Aレコード (${VPS_IP}) は設定済み！`);
    } else {
      console.log(`\n⚠️ Aレコードが未設定。追加します...`);
      // Look for add record link/button
      const addClicked = await page.evaluate(() => {
        for (const el of document.querySelectorAll('a, button')) {
          const t = el.textContent?.trim() || '';
          if (t.includes('追加') && (t.includes('レコード') || t.includes('DNS'))) {
            el.click();
            return t;
          }
        }
        return null;
      });
      if (addClicked) {
        console.log(`   ✓ ${addClicked}`);
        await waitForStable(page, 2000);
        await ss(page, '03-add-record-form');
      }
    }
  } else {
    console.log(`\n⚠️ ${DOMAIN} が未追加。追加します...`);

    // Click "ドメインの追加"
    const addClicked = await page.evaluate(() => {
      for (const a of document.querySelectorAll('a')) {
        const t = a.textContent?.trim() || '';
        if (t.includes('ドメインの追加') || t.includes('ドメイン追加')) {
          a.click();
          return t;
        }
      }
      return null;
    });
    console.log(`   クリック: ${addClicked}`);
    await waitForStable(page, 3000);
    await ss(page, '03-add-domain-form');

    // Fill domain name
    const filled = await page.evaluate((domain) => {
      const inputs = document.querySelectorAll('input[type="text"], input[name*="domain"]');
      for (const inp of inputs) {
        if (inp.offsetParent !== null) {
          inp.value = domain;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, DOMAIN);
    console.log(`   ドメイン入力: ${filled}`);

    // Submit
    const submitted = await page.evaluate(() => {
      for (const el of document.querySelectorAll('button, input[type="submit"]')) {
        const t = el.textContent?.trim() || el.value || '';
        if (t.includes('追加') || t.includes('確認') || t.includes('設定')) {
          el.click();
          return t;
        }
      }
      return null;
    });
    console.log(`   送信: ${submitted}`);
    await waitForStable(page, 3000);

    // Handle confirmation
    const confirmed = await page.evaluate(() => {
      for (const el of document.querySelectorAll('button, input[type="submit"]')) {
        const t = el.textContent?.trim() || el.value || '';
        if (t.includes('追加') || t.includes('確定') || t.includes('OK')) {
          el.click();
          return t;
        }
      }
      return null;
    });
    if (confirmed) console.log(`   確認: ${confirmed}`);
    await waitForStable(page, 3000);
    await ss(page, '04-domain-added');
  }

  console.log('\n⏸️  ブラウザでDNS設定を確認してください。');
  console.log(`   必要な設定:`);
  console.log(`   1. ドメイン ${DOMAIN} が追加されていること`);
  console.log(`   2. Aレコード: (空) → ${VPS_IP}`);
  console.log('   完了したら Enter を押してください。');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, '05-final');
  console.log('\n✅ 完了');
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
