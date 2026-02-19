// Xserver VPS: Shutdown → OS Reinstall (from VPS Panel at /xvps/)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 570;

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

  // ─── Step 1: Login + Navigate to VPS Panel ───
  console.log('🔗 Step 1: VPSパネルに移動...');
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
  console.log('   ✓ ログイン完了');

  // Navigate to VPS panel via service menu → VPS → VPS管理 → 選択する
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

  try {
    await page.locator('a:has-text("VPS管理")').first().click();
    await waitForStable(page, 3000);
  } catch {}
  try {
    await page.locator('a:has-text("選択する")').first().click();
    await waitForStable(page, 5000);
  } catch {}

  const panelUrl = page.url();
  console.log(`   VPSパネルURL: ${panelUrl}`);
  await ss(page, '01-vps-panel');

  // ─── Step 2: Shutdown VPS ───
  console.log('\n📋 Step 2: VPSシャットダウン...');

  // The shutdown button is at /xvps/vps/detail page
  // Click 電源操作 dropdown then シャットダウン
  // Or click シャットダウン link directly

  // Try the 電源操作 dropdown first
  try {
    const powerSelect = page.locator('select').filter({ hasText: '電源操作' }).first();
    await powerSelect.waitFor({ state: 'visible', timeout: 3000 });
    await powerSelect.selectOption({ label: 'シャットダウン' });
    console.log('   ✓ 電源操作 → シャットダウン');
    await page.waitForTimeout(2000);
  } catch {
    // Try clicking the link directly
    try {
      await page.locator('a:has-text("シャットダウン")').click({ timeout: 5000 });
      console.log('   ✓ シャットダウンリンクをクリック');
      await page.waitForTimeout(2000);
    } catch {
      // Try using evaluate to find and click
      const clicked = await page.evaluate(() => {
        const links = document.querySelectorAll('a, button, [role="button"]');
        for (const l of links) {
          if (l.textContent?.trim() === 'シャットダウン') {
            l.click();
            return true;
          }
        }
        // Also check select options
        const selects = document.querySelectorAll('select');
        for (const s of selects) {
          for (const o of s.options) {
            if (o.text.includes('シャットダウン')) {
              s.value = o.value;
              s.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }
        return false;
      });
      if (clicked) {
        console.log('   ✓ シャットダウン (evaluate)');
        await page.waitForTimeout(2000);
      } else {
        console.log('   シャットダウンボタンが見つかりません');
        // Dump page elements
        const elements = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('select')).map(s => ({
            name: s.name,
            options: Array.from(s.options).map(o => o.text.trim()),
          }));
        });
        console.log(`   select: ${JSON.stringify(elements)}`);
      }
    }
  }

  // Confirm shutdown dialog
  await page.waitForTimeout(1000);
  await ss(page, '02-shutdown-dialog');

  // Click confirm button
  for (const sel of [
    'button:has-text("シャットダウンする")',
    'button:has-text("する")',
    'button:has-text("OK")',
    'button:has-text("はい")',
    'button:has-text("実行")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log(`   ✓ 確認: ${sel}`);
      break;
    } catch {}
  }

  await waitForStable(page, 5000);

  // Wait for shutdown to complete
  console.log('   シャットダウン完了を待機...');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(3000);
    const text = await page.locator('body').textContent().catch(() => '');
    if (text.includes('停止中') || text.includes('停止')) {
      console.log('   ✓ VPS停止完了');
      break;
    }
    if (i % 5 === 0 && i > 0) {
      console.log(`   ... 停止待ち (${i * 3}秒)`);
      await page.reload();
      await waitForStable(page, 3000);
    }
  }
  await ss(page, '03-stopped');

  // ─── Step 3: OS Reinstall ───
  console.log('\n📋 Step 3: OS再インストール...');

  // Navigate to reinstall page
  await page.goto(panelUrl.replace(/\/xvps\/.*/, '/xvps/vps/rebuild/index'));
  await waitForStable(page, 3000);
  await ss(page, '04-reinstall-page');

  const reinstallText = await page.locator('body').textContent().catch(() => '');

  if (reinstallText.includes('停止してください')) {
    console.log('   ⚠️  サーバーがまだ稼働中です。手動でシャットダウンしてください');
    console.log('   VPSパネル → 電源操作 → シャットダウン');
    console.log('\n   シャットダウン後にEnterを押してください...');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
    await page.reload();
    await waitForStable(page, 5000);
  }

  // Get and display form
  const formInfo = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name || s.id,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() })),
    }));
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
      name: r.name,
      value: r.value,
      label: r.closest('label')?.textContent?.trim()?.substring(0, 60) ||
             document.querySelector(`label[for="${r.id}"]`)?.textContent?.trim()?.substring(0, 60) || '',
    }));
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).map(c => ({
      name: c.name,
      label: c.closest('label')?.textContent?.trim()?.substring(0, 60) || '',
      checked: c.checked,
    }));
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="password"]')).map(i => ({
      name: i.name || i.id,
      type: i.type,
      visible: i.offsetParent !== null,
    }));
    return { selects, radios, checkboxes, inputs };
  });
  console.log(`   form: ${JSON.stringify(formInfo, null, 2)}`);

  // Select OS (Ubuntu 22.04)
  for (const select of formInfo.selects) {
    const ubuntu = select.options.find(o => o.text.includes('Ubuntu') && o.text.includes('22'));
    if (ubuntu) {
      await page.selectOption(`select[name="${select.name}"]`, ubuntu.value);
      console.log(`   ✓ OS: ${ubuntu.text}`);
      await page.waitForTimeout(2000);
    }
  }

  // After OS selection, re-evaluate for SSH key options
  await page.waitForTimeout(2000);
  const form2 = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name || s.id,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() })),
    }));
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
      name: r.name,
      value: r.value,
      label: r.closest('label')?.textContent?.trim()?.substring(0, 60) ||
             document.querySelector(`label[for="${r.id}"]`)?.textContent?.trim()?.substring(0, 60) || '',
    }));
    const inputs = Array.from(document.querySelectorAll('input[type="password"]')).map(i => ({
      name: i.name,
      visible: i.offsetParent !== null,
    }));
    return { selects, radios, inputs };
  });
  console.log(`   更新form: ${JSON.stringify(form2, null, 2)}`);

  // Select SSH key
  for (const select of form2.selects) {
    const key = select.options.find(o =>
      o.text.includes('30sec') || o.text.includes('ed25519')
    );
    if (key) {
      await page.selectOption(`select[name="${select.name}"]`, key.value);
      console.log(`   ✓ SSH Key: ${key.text}`);
    }
  }

  // Set password
  for (const input of form2.inputs) {
    if (input.name?.includes('pass') && input.visible) {
      await page.fill(`input[name="${input.name}"]`, 'Xvps2026SecApp!');
      console.log('   ✓ パスワード設定');
      fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'root-password.txt'), 'Xvps2026SecApp!');
    }
  }

  await ss(page, '05-reinstall-ready');

  // Submit
  for (const sel of [
    'button:has-text("再インストールする")',
    'input[type="submit"]',
    'button:has-text("確認")',
    'button:has-text("実行")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      console.log(`   ✓ ${sel}`);
      await waitForStable(page, 3000);
      break;
    } catch {}
  }

  // Confirmation
  for (const sel of [
    'button:has-text("再インストールする")',
    'button:has-text("OK")', 'button:has-text("確定")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      console.log(`   ✓ 確認: ${sel}`);
      await waitForStable(page, 5000);
      break;
    } catch {}
  }

  await ss(page, '06-result');
  const result = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   結果: ${result.substring(0, 400).replace(/\s+/g, ' ')}`);

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
