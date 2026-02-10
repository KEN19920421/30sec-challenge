// AdMob signup with popups allowed and verification handling
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 240;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function clickFirst(page, selectors, desc, timeout = 5000) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.click();
      console.log(`   ✓ ${desc}`);
      return true;
    } catch {}
  }
  return false;
}

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-popup-blocking',
      '--disable-extensions',
    ],
    // Allow all popups
    permissions: [],
    bypassCSP: true,
  });

  // Listen for new pages (popups)
  context.on('page', async (newPage) => {
    console.log(`   🔔 新しいポップアップ検出: ${newPage.url()}`);
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Grant all permissions
  await context.grantPermissions(['notifications']);

  console.log('🔗 AdMob に移動...');
  await page.goto('https://apps.admob.com/v2/home');

  console.log('⏳ ページ読み込み待ち...');
  await page.waitForTimeout(5000);
  await ss(page, 'admob-initial');

  // Check current state
  const text = await page.locator('body').textContent().catch(() => '');
  console.log(`   ページ状態: ${text.substring(0, 200).replace(/\s+/g, ' ')}`);

  // If on signup page, complete it
  if (text.includes('さあ始めましょう') || text.includes('Get started')) {
    console.log('\n📋 サインアップを完了...');

    // Select "いいえ" for marketing emails
    const radios = await page.locator('input[type="radio"]').all();
    if (radios.length >= 2) {
      try { await radios[1].click({ force: true }); console.log('   ✓ メール配信: いいえ'); } catch {}
    }

    await page.waitForTimeout(500);

    // Check terms checkbox
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (const cb of checkboxes) {
      try {
        const checked = await cb.isChecked();
        if (!checked) await cb.click({ force: true });
      } catch {}
    }
    console.log('   ✓ 利用規約同意');

    await page.waitForTimeout(500);
    await ss(page, 'signup-filled');

    // Click "AdMob のご利用開始"
    await clickFirst(page, [
      'button:has-text("AdMob のご利用開始")',
      'button:has-text("GET STARTED")',
      'button:has-text("Start using AdMob")',
    ], 'AdMob 利用開始', 5000);

    console.log('   ⏳ 処理中...');
    await page.waitForTimeout(10000);
    await ss(page, 'after-signup');
  }

  // Handle verification page
  const currentText = await page.locator('body').textContent().catch(() => '');
  if (currentText.includes('情報確認') || currentText.includes('verify') || currentText.includes('ポップアップ')) {
    console.log('\n📋 確認ページ検出。処理中...');
    await ss(page, 'verification');

    // Click continue/verify button
    await clickFirst(page, [
      'button:has-text("続行")',
      'button:has-text("Continue")',
      'button:has-text("確認")',
      'button:has-text("Verify")',
      'a:has-text("続行")',
      'a:has-text("Continue")',
    ], '続行', 5000);

    await page.waitForTimeout(5000);

    // Check if a popup opened
    const pages = context.pages();
    console.log(`   開いているページ数: ${pages.length}`);
    for (let i = 0; i < pages.length; i++) {
      console.log(`   page[${i}]: ${pages[i].url().substring(0, 80)}`);
    }

    // If verification popup opened, handle it
    if (pages.length > 1) {
      const popup = pages[pages.length - 1];
      console.log('   ポップアップでの認証を処理中...');
      await popup.waitForTimeout(3000);
      const popupFp = path.join(SCREENSHOTS_DIR, `${++step}-verification-popup.png`);
      await popup.screenshot({ path: popupFp, fullPage: true });
      console.log(`   📸 ${popupFp}`);
    }

    await ss(page, 'after-verification');
  }

  // Wait for dashboard
  console.log('\n⏳ ダッシュボード待ち (手動操作が必要な場合は画面で行ってください)...');
  let ready = false;
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(3000);
    const url = page.url();
    const t = await page.locator('body').textContent().catch(() => '');

    // Check all pages for verification popups
    const allPages = context.pages();
    if (allPages.length > 1) {
      for (let p = 1; p < allPages.length; p++) {
        const pu = allPages[p].url();
        if (i % 10 === 0) console.log(`   popup[${p}]: ${pu.substring(0, 80)}`);
      }
    }

    if (t.includes('Add your first app') || t.includes('最初のアプリ') ||
        (url.includes('apps.admob.com') && (t.includes('Apps') || t.includes('Home')))) {
      ready = true;
      console.log('✅ AdMob ダッシュボード表示!');
      break;
    }

    if (i % 20 === 0) {
      console.log(`   ... 待機中 (${i * 3}秒) URL: ${url.substring(0, 60)}`);
      await ss(page, `wait-${i}`);
    }
  }

  if (ready) {
    await ss(page, 'dashboard');
    console.log('\n✅ AdMob アカウント作成完了！');
    console.log('   アプリと広告ユニットの作成に進めます。');
  } else {
    console.log('\n⚠️ ダッシュボード表示タイムアウト');
    await ss(page, 'timeout');
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
