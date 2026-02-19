// Xserver VPS: OS Reinstall (VPS already stopped, SSH key registered)
// Known form: os_image_id=vps_ubuntu2204, ssh_key_setting=registered, vps_root_password
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 580;

const ROOT_PASSWORD = 'Xvps2026SecApp!';

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
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // ─── Login + Navigate to VPS Panel ───
  console.log('🔗 VPSパネルに移動...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xserver/');
  await page.waitForTimeout(2000);

  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes('ログイン') && !bodyText.includes('ログアウト')) {
    console.log('⏸️  ブラウザでログインしてください...');
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(2000);
      const t = await page.locator('body').textContent().catch(() => '');
      if (t.includes('ログアウト') || t.includes('サービス管理')) break;
      if (i % 15 === 0 && i > 0) console.log(`   ... 待ち (${i * 2}秒)`);
    }
  }

  // Navigate to VPS panel
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
  console.log('   ✓ VPSパネル');

  // ─── Navigate to OS再インストール ───
  console.log('\n📋 OS再インストールページへ...');
  await page.goto(page.url().replace(/\/xvps\/.*/, '/xvps/vps/rebuild/index'));
  await waitForStable(page, 3000);

  // Check if server is stopped
  const text = await page.locator('body').textContent().catch(() => '');
  if (text.includes('停止してください')) {
    console.log('   サーバーが稼働中。シャットダウン中...');
    // Go back to panel and shutdown
    await page.goto(page.url().replace(/\/xvps\/.*/, '/xvps/vps/detail'));
    await waitForStable(page, 3000);

    await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const l of links) {
        if (l.textContent?.trim() === 'シャットダウン') { l.click(); return; }
      }
    });
    await page.waitForTimeout(2000);
    try {
      await page.locator('button:has-text("シャットダウンする")').first().click({ timeout: 5000 });
    } catch {
      try { await page.locator('button:has-text("する")').first().click({ timeout: 5000 }); } catch {}
    }
    console.log('   シャットダウン実行。待機中...');
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(5000);
      const t = await page.locator('body').textContent().catch(() => '');
      if (t.includes('停止中') || t.includes('停止')) { console.log('   ✓ 停止完了'); break; }
      if (i % 4 === 0 && i > 0) { await page.reload(); await waitForStable(page, 3000); }
    }
    // Go back to reinstall page
    await page.goto(page.url().replace(/\/xvps\/.*/, '/xvps/vps/rebuild/index'));
    await waitForStable(page, 3000);
  }

  await ss(page, '01-reinstall');

  // ─── Configure: Click Ubuntu card, select 22.04, set SSH key, set password ───
  console.log('\n📋 OS再インストール設定...');

  // The page has OS cards - need to click Ubuntu card first to show its versions
  // Then select 22.04 from the dropdown
  // Use evaluate to click the Ubuntu card/tab
  await page.evaluate(() => {
    // Find and click the Ubuntu section
    const headings = document.querySelectorAll('h3, h4, dt, label, span, div, a');
    for (const h of headings) {
      if (h.textContent?.trim().includes('Ubuntu')) {
        h.click();
        return;
      }
    }
  });
  await page.waitForTimeout(1500);

  // Select Ubuntu 22.04 from the now-visible dropdown
  await page.evaluate(() => {
    const selects = document.querySelectorAll('select[name="os_image_id"]');
    for (const s of selects) {
      for (const o of s.options) {
        if (o.value === 'vps_ubuntu2204') {
          s.value = 'vps_ubuntu2204';
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }
  });
  console.log('   ✓ Ubuntu 22.04 選択');
  await page.waitForTimeout(2000);

  // Select SSH key setting: "登録済みのキーを選択する"
  await page.evaluate(() => {
    const select = document.querySelector('select[name="ssh_key_setting"]');
    if (select) {
      select.value = 'registered';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  console.log('   ✓ SSH Key: 登録済みのキーを選択する');
  await page.waitForTimeout(2000);

  // Select the registered key
  await page.evaluate(() => {
    const select = document.querySelector('select[name="registered_ssh_key_name"]');
    if (select && select.options.length > 0) {
      // Select first non-empty option
      for (const o of select.options) {
        if (o.value && o.value !== '') {
          select.value = o.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      }
    }
  });
  const keyInfo = await page.evaluate(() => {
    const s = document.querySelector('select[name="registered_ssh_key_name"]');
    return s ? Array.from(s.options).map(o => ({ value: o.value, text: o.text })) : [];
  });
  console.log(`   SSH Key options: ${JSON.stringify(keyInfo)}`);

  // Set root password using evaluate (avoid hidden element issue)
  await page.evaluate((password) => {
    const inputs = document.querySelectorAll('input[name="vps_root_password"]');
    for (const input of inputs) {
      if (input.type !== 'hidden') {
        input.value = password;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
    // If all are hidden, set the first one
    if (inputs.length > 0) {
      inputs[0].value = password;
    }
  }, ROOT_PASSWORD);
  console.log(`   ✓ rootパスワード: ${ROOT_PASSWORD}`);
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'root-password.txt'), ROOT_PASSWORD);

  await ss(page, '02-configured');

  // ─── Submit ───
  console.log('\n📋 再インストール実行...');

  // Click submit button
  let submitted = false;
  for (const sel of [
    'button:has-text("再インストールする")',
    'input[type="submit"][value*="再インストール"]',
    'button[type="submit"]',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      submitted = true;
      console.log(`   ✓ ${sel}`);
      await waitForStable(page, 3000);
      break;
    } catch {}
  }

  if (!submitted) {
    // Try evaluate click
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, input[type="submit"]');
      for (const b of buttons) {
        if (b.textContent?.includes('再インストール') || b.value?.includes('再インストール')) {
          b.click();
          return;
        }
      }
    });
    console.log('   ✓ 再インストール (evaluate)');
    await waitForStable(page, 3000);
  }

  await ss(page, '03-confirm');

  // Confirmation
  for (const sel of [
    'button:has-text("再インストールする")',
    'button:has-text("確定")',
    'button:has-text("OK")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      console.log(`   ✓ 確認: ${sel}`);
      await waitForStable(page, 10000);
      break;
    } catch {}
  }

  await ss(page, '04-result');
  const result = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   結果: ${result.substring(0, 400).replace(/\s+/g, ' ')}`);

  if (result.includes('完了') || result.includes('インストール')) {
    console.log('\n   ✅ OS再インストール完了！');
    console.log(`   SSH: ssh root@210.131.218.20`);
    console.log(`   Password: ${ROOT_PASSWORD}`);
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
