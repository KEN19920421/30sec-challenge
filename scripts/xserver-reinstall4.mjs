// Xserver VPS: OS Reinstall - correct flow
// Page 1: Configure → "確認画面へ進む"
// Page 2: Confirm → "再インストールする"
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 590;

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
    slowMo: 400,
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

  const pageText = await page.locator('body').textContent().catch(() => '');
  if (pageText.includes('停止してください')) {
    console.log('   ⚠️  サーバー稼働中。手動でシャットダウンしてからEnterを押してください');
    console.log('   VPSパネル右上 → 電源操作 → シャットダウン');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
    await page.reload();
    await waitForStable(page, 5000);
  }

  await ss(page, '01-reinstall-page');

  // ─── Step 1: Click Ubuntu card ───
  console.log('\n📋 Ubuntu 22.04 を選択...');

  // Click the Ubuntu card (it has a radio-like selection)
  // The Ubuntu card text contains "Ubuntu" and has a select inside showing "22.04 (64bit)"
  await page.evaluate(() => {
    // Find the Ubuntu OS card and click it
    const cards = document.querySelectorAll('.os_card, [class*="card"], [class*="image"], label, div');
    for (const card of cards) {
      const text = card.textContent?.trim() || '';
      if (text.includes('Ubuntu') && text.includes('22.04')) {
        // Find clickable element
        const clickable = card.querySelector('input[type="radio"], a, label') || card;
        clickable.click();
        return;
      }
    }
    // Fallback: click any element containing "Ubuntu"
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if (el.childNodes.length <= 3 && el.textContent?.trim() === 'Ubuntu') {
        el.click();
        return;
      }
    }
  });
  await page.waitForTimeout(2000);

  // The Ubuntu select should now be visible/active - select 22.04
  // Find the specific Ubuntu select among multiple os_image_id selects
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
  console.log('   ✓ Ubuntu 22.04');
  await page.waitForTimeout(2000);

  // ─── Step 2: Set root password ───
  console.log('   rootパスワード設定...');

  // Find the visible password input and fill it
  // The password field might need clicking first to make it editable
  const passwordFilled = await page.evaluate((pwd) => {
    const inputs = document.querySelectorAll('input[name="vps_root_password"]');
    for (const input of inputs) {
      if (input.type === 'password' || (input.type === 'text' && input.offsetParent !== null)) {
        input.focus();
        input.value = pwd;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    // Try type="hidden" -> won't work for display, but try anyway
    if (inputs.length > 0) {
      inputs[0].value = pwd;
      return 'hidden';
    }
    return false;
  }, ROOT_PASSWORD);
  console.log(`   ✓ パスワード: ${passwordFilled}`);

  // ─── Step 3: Set SSH key ───
  console.log('   SSH Key設定...');

  // Click the ssh_key_setting dropdown and select "registered"
  // Use Playwright's native selectOption with force for potentially hidden elements
  await page.evaluate(() => {
    const select = document.querySelector('select[name="ssh_key_setting"]');
    if (select) {
      // Make sure it's visible first
      select.style.display = '';
      select.value = 'registered';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  console.log('   ✓ SSH Key設定: 登録済みのキーを選択する');
  await page.waitForTimeout(3000); // Wait for AJAX to load registered keys

  // Check if registered keys loaded
  const keyOptions = await page.evaluate(() => {
    const select = document.querySelector('select[name="registered_ssh_key_name"]');
    if (!select) return [];
    return Array.from(select.options).map(o => ({ value: o.value, text: o.text.trim() }));
  });
  console.log(`   登録済みキー: ${JSON.stringify(keyOptions)}`);

  if (keyOptions.length > 0) {
    const keyToSelect = keyOptions.find(k => k.value && k.value !== '') || keyOptions[0];
    await page.evaluate((keyValue) => {
      const select = document.querySelector('select[name="registered_ssh_key_name"]');
      if (select) {
        select.value = keyValue;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, keyToSelect.value);
    console.log(`   ✓ キー選択: ${keyToSelect.text}`);
  } else {
    console.log('   ⚠️  登録済みキーなし。リロード後にretry...');
    // Try reloading the select
    await page.evaluate(() => {
      const select = document.querySelector('select[name="ssh_key_setting"]');
      if (select) {
        select.value = 'none';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const select = document.querySelector('select[name="ssh_key_setting"]');
      if (select) {
        select.value = 'registered';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(3000);

    const keyOptions2 = await page.evaluate(() => {
      const select = document.querySelector('select[name="registered_ssh_key_name"]');
      if (!select) return [];
      return Array.from(select.options).map(o => ({ value: o.value, text: o.text.trim() }));
    });
    console.log(`   再取得キー: ${JSON.stringify(keyOptions2)}`);

    if (keyOptions2.length > 0) {
      const keyToSelect = keyOptions2.find(k => k.value && k.value !== '') || keyOptions2[0];
      await page.evaluate((keyValue) => {
        const select = document.querySelector('select[name="registered_ssh_key_name"]');
        if (select) {
          select.value = keyValue;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, keyToSelect.value);
      console.log(`   ✓ キー選択: ${keyToSelect.text}`);
    }
  }

  await ss(page, '02-configured');

  // ─── Step 4: Click "確認画面へ進む" ───
  console.log('\n📋 確認画面へ進む...');

  let confirmPageReached = false;
  for (const sel of [
    'button:has-text("確認画面へ進む")',
    'a:has-text("確認画面へ進む")',
    'input[value*="確認画面"]',
    'button:has-text("確認")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      confirmPageReached = true;
      console.log(`   ✓ ${sel}`);
      await waitForStable(page, 5000);
      break;
    } catch {}
  }

  if (!confirmPageReached) {
    // Use evaluate
    await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, input[type="submit"]');
      for (const el of elements) {
        const text = el.textContent?.trim() || el.value || '';
        if (text.includes('確認画面')) {
          el.click();
          return;
        }
      }
    });
    console.log('   ✓ 確認画面へ (evaluate)');
    await waitForStable(page, 5000);
  }

  await ss(page, '03-confirm-page');

  // Check for errors
  const confirmText = await page.locator('body').textContent().catch(() => '');
  console.log(`   確認ページ: ${confirmText.substring(0, 400).replace(/\s+/g, ' ')}`);

  if (confirmText.includes('エラー') || confirmText.includes('入力してください')) {
    console.log('   ⚠️  入力エラーがあります。スクリーンショットを確認してください');
    console.log('\n確認後 Enter で終了');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    await context.close();
    return;
  }

  // ─── Step 5: Click "再インストールする" on confirmation page ───
  console.log('\n📋 再インストール実行...');

  for (const sel of [
    'button:has-text("再インストールする")',
    'input[value*="再インストール"]',
    'button:has-text("実行")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      console.log(`   ✓ ${sel}`);
      await waitForStable(page, 10000);
      break;
    } catch {}
  }

  await ss(page, '04-result');
  const result = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   結果: ${result.substring(0, 400).replace(/\s+/g, ' ')}`);

  if (result.includes('完了') || result.includes('成功')) {
    console.log('\n   ✅ OS再インストール完了！');
    console.log(`   SSH: ssh root@210.131.218.20`);
    console.log(`   Password: ${ROOT_PASSWORD}`);
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'root-password.txt'), ROOT_PASSWORD);
  }

  // Wait for VPS to come back up
  console.log('\n   VPS起動待ち...');
  await page.waitForTimeout(30000); // Wait 30 seconds for reinstall

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
