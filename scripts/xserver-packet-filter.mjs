// Xserver VPS: configure packet filter - add SSH(22), Web(80,443) rules
// Correct flow:
//   1. Click link "パケットフィルター設定を追加する" to open form
//   2. Select preset from filter_type dropdown
//   3. Click BUTTON "追加する" to add the rule (NOT the link!)
//   4. Repeat for each rule
//   5. Click "変更する" to apply all changes
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 540;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function waitForStable(page, ms = 3000) {
  await page.waitForTimeout(ms);
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
}

async function main() {
  const userDataDir = path.join(__dirname, '_xserver-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // ─── Step 1: Login ───
  console.log('🔗 Step 1: XServerアカウントにログイン...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xserver/');
  await page.waitForTimeout(2000);

  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes('ログイン') && !bodyText.includes('ログアウト')) {
    console.log('⏸️  ブラウザでXServerアカウントにログインしてください...');
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(2000);
      const t = await page.locator('body').textContent().catch(() => '');
      if (t.includes('ログアウト') || t.includes('サービス管理')) break;
      if (i % 15 === 0 && i > 0) console.log(`   ... 待ち (${i * 2}秒)`);
    }
  }
  console.log('   ✓ ログイン完了');

  // ─── Step 2: Navigate to VPS Panel ───
  console.log('\n📋 Step 2: VPSパネルに移動...');
  try {
    await page.locator('text="サービス管理"').first().click();
    await page.waitForTimeout(1500);
    const href = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const l of links) {
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

  try {
    await page.locator('a:has-text("VPS管理")').first().click();
    await waitForStable(page, 3000);
  } catch {}
  try {
    await page.locator('a:has-text("選択する")').first().click();
    await waitForStable(page, 5000);
  } catch {}
  console.log(`   URL: ${page.url()}`);

  // ─── Step 3: Go to packet filter page ───
  console.log('\n📋 Step 3: パケットフィルター設定ページへ...');
  await page.goto(page.url().replace(/\/xvps\/.*/, '/xvps/vps/setting/port/input'));
  await waitForStable(page, 3000);
  await ss(page, '01-filter-page');

  // ─── Step 4: Add SSH rule ───
  console.log('\n📋 Step 4: SSHルール追加...');

  // 4a. Click the LINK "パケットフィルター設定を追加する" to open add form
  console.log('   フォームを開く...');
  await page.locator('a:has-text("パケットフィルター設定を追加する")').click();
  await page.waitForTimeout(1500);
  await ss(page, '02-form-opened');

  // 4b. Select SSH from filter_type dropdown
  await page.selectOption('select[name="filter_type"]', 'ssh');
  console.log('   ✓ フィルター: SSH');
  await page.waitForTimeout(500);

  // 4c. Click the BUTTON "追加する" (not the link!)
  await page.locator('button:has-text("追加する")').click();
  console.log('   ✓ SSHルール追加');
  await page.waitForTimeout(2000);
  await ss(page, '03-ssh-added');

  // ─── Step 5: Add Web/FTP rule ───
  console.log('\n📋 Step 5: Web/FTPルール追加...');

  // 5a. Click the LINK again to open add form
  console.log('   フォームを開く...');
  await page.locator('a:has-text("パケットフィルター設定を追加する")').click();
  await page.waitForTimeout(1500);

  // 5b. Select Web/FTP (ports 20/21/80/443)
  await page.selectOption('select[name="filter_type"]', 'web');
  console.log('   ✓ フィルター: Web / FTP (ポート 20/21/80/443)');
  await page.waitForTimeout(500);

  // 5c. Click the BUTTON "追加する"
  await page.locator('button:has-text("追加する")').click();
  console.log('   ✓ Web/FTPルール追加');
  await page.waitForTimeout(2000);
  await ss(page, '04-web-added');

  // ─── Step 6: Verify rules in list ───
  console.log('\n📋 Step 6: ルール一覧確認...');
  const listText = await page.locator('body').textContent().catch(() => '');
  const hasSSH = listText.includes('22');
  const hasWeb = listText.includes('80') || listText.includes('443');
  console.log(`   SSH(22): ${hasSSH ? '✓' : '✗'}`);
  console.log(`   Web(80/443): ${hasWeb ? '✓' : '✗'}`);

  // ─── Step 7: Apply - click 変更する ───
  console.log('\n📋 Step 7: 変更を適用...');
  await page.locator('button:has-text("変更する")').click();
  console.log('   ✓ 「変更する」クリック');
  await waitForStable(page, 5000);

  // Handle confirmation dialog
  try {
    await page.locator('button:has-text("OK")').first().click({ timeout: 5000 });
    console.log('   ✓ 確認OK');
    await waitForStable(page, 3000);
  } catch {}

  await ss(page, '05-result');

  const resultText = await page.locator('body').textContent().catch(() => '');
  if (resultText.includes('完了')) {
    console.log('\n   ✅ パケットフィルター設定完了！');
  }
  console.log(`   結果: ${resultText.substring(0, 300).replace(/\s+/g, ' ')}`);

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
