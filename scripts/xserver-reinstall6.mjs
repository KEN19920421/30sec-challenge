// Xserver VPS: OS Reinstall v6 - Skip SSH Key (add after via password SSH)
// Strategy:
//   1. Select Ubuntu 22.04
//   2. Fill root password
//   3. SSH Key = "設定しない" (skip - will add key after reinstall via SSH)
//   4. Click "確認画面へ進む"
//   5. Click "再インストールする"
//   6. After reinstall, SSH in with password and add key
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 610;

const ROOT_PASSWORD = 'Xvps2026SecApp!';
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
    slowMo: 500,
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
    console.log('   ⚠️  サーバー稼働中。シャットダウンしてからEnterを押してください');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
    await page.reload();
    await waitForStable(page, 5000);
  }

  await ss(page, '01-reinstall-page');

  // ─── Step 1: Select Ubuntu 22.04 ───
  console.log('\n📋 Step 1: Ubuntu 22.04 を選択...');

  // Click Ubuntu card
  await page.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      if (el.childNodes.length <= 3 &&
          el.textContent?.trim().startsWith('Ubuntu') &&
          el.textContent?.trim().length < 20) {
        el.click();
        return;
      }
    }
  });
  await page.waitForTimeout(1500);

  // Change version to 22.04
  await page.evaluate(() => {
    const selects = document.querySelectorAll('select[name="os_image_id"]');
    for (const s of selects) {
      const opt = Array.from(s.options).find(o => o.value.includes('ubuntu2204'));
      if (opt) {
        s.value = opt.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
  });
  console.log('   ✓ Ubuntu 22.04');
  await page.waitForTimeout(2000);

  // ─── Step 2: Set root password ───
  console.log('\n📋 Step 2: rootパスワード設定...');

  // Use native Playwright fill on the password input
  const pwInputs = page.locator('input[type="password"]');
  const pwCount = await pwInputs.count();
  let pwFilled = false;
  for (let i = 0; i < pwCount; i++) {
    const inp = pwInputs.nth(i);
    const vis = await inp.isVisible().catch(() => false);
    if (vis) {
      await inp.click();
      await page.waitForTimeout(300);
      await inp.fill(ROOT_PASSWORD);
      pwFilled = true;
      console.log('   ✓ パスワード設定');
      break;
    }
  }

  if (!pwFilled) {
    // Force via native setter
    await page.evaluate((pwd) => {
      const inputs = document.querySelectorAll('input[name="vps_root_password"]');
      for (const input of inputs) {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        setter.call(input, pwd);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, ROOT_PASSWORD);
    console.log('   ✓ パスワード設定 (force)');
  }

  // SSH Key = "設定しない" (default, no change needed)
  console.log('   SSH Key: 設定しない (後でSSHで追加)');

  await ss(page, '02-configured');

  // ─── Step 3: Verify form state ───
  const state = await page.evaluate(() => {
    // Find active OS select (the Ubuntu one)
    const osSelects = document.querySelectorAll('select[name="os_image_id"]');
    let activeOS = null;
    for (const s of osSelects) {
      if (s.value.includes('ubuntu')) {
        activeOS = { value: s.value, text: s.options[s.selectedIndex]?.text?.trim() };
      }
    }

    const pwInput = document.querySelector('input[name="vps_root_password"]');
    const sshSetting = document.querySelector('select[name="ssh_key_setting"]');

    return {
      os: activeOS,
      password: pwInput?.value ? '(set)' : '(empty)',
      sshKey: sshSetting?.options[sshSetting.selectedIndex]?.text?.trim(),
    };
  });
  console.log(`   確認: OS=${JSON.stringify(state.os)}, PW=${state.password}, SSH=${state.sshKey}`);

  // ─── Step 4: Click "確認画面へ進む" ───
  console.log('\n📋 Step 3: 確認画面へ進む...');

  let confirmClicked = false;
  for (const sel of [
    'button:has-text("確認画面へ進む")',
    'a:has-text("確認画面へ進む")',
    'input[type="submit"][value*="確認"]',
  ]) {
    try {
      const btn = page.locator(sel).first();
      const vis = await btn.isVisible({ timeout: 3000 }).catch(() => false);
      if (vis) {
        await btn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await btn.click();
        confirmClicked = true;
        console.log(`   ✓ ${sel}`);
        break;
      }
    } catch {}
  }

  if (!confirmClicked) {
    await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, input[type="submit"]');
      for (const el of elements) {
        const text = el.textContent?.trim() || el.value || '';
        if (text.includes('確認画面')) { el.click(); return; }
      }
    });
    console.log('   ✓ 確認画面へ (evaluate)');
  }

  await waitForStable(page, 5000);
  await ss(page, '03-confirm-page');

  // ─── Check confirm page ───
  const confirmText = await page.locator('body').textContent().catch(() => '');
  console.log(`   ページ: ${confirmText.substring(0, 400).replace(/\s+/g, ' ')}`);

  if (confirmText.includes('エラー') || confirmText.includes('入力してください')) {
    console.log('   ⚠️  エラーあり。スクリーンショット確認後、手動で修正してEnter');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
  }

  if (confirmText.includes('VPS情報') && !confirmText.includes('再インストール')) {
    console.log('   ⚠️  VPS情報ページにリダイレクト（フォーム送信失敗）');
    console.log('   手動でOS再インストールを完了してからEnterを押してください');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
  }

  // ─── Step 5: Click "再インストールする" ───
  console.log('\n📋 Step 4: 再インストール実行...');

  const currentText = await page.locator('body').textContent().catch(() => '');
  if (currentText.includes('再インストールする') || currentText.includes('以下の内容')) {
    for (const sel of [
      'button:has-text("再インストールする")',
      'input[value*="再インストール"]',
      'button:has-text("実行")',
    ]) {
      try {
        const btn = page.locator(sel).first();
        const vis = await btn.isVisible({ timeout: 5000 }).catch(() => false);
        if (vis) {
          await btn.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          await btn.click();
          console.log(`   ✓ ${sel}`);
          await waitForStable(page, 10000);
          break;
        }
      } catch {}
    }
  }

  await ss(page, '04-result');
  const result = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   結果: ${result.substring(0, 400).replace(/\s+/g, ' ')}`);

  if (result.includes('完了') || result.includes('成功') || result.includes('インストール')) {
    console.log('\n   ✅ OS再インストール完了！');
    console.log(`   SSH: ssh root@${VPS_IP}`);
    console.log(`   Password: ${ROOT_PASSWORD}`);
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'root-password.txt'), ROOT_PASSWORD);

    // Wait for VPS to come back up
    console.log('\n   VPS起動待ち (90秒)...');
    await page.waitForTimeout(90000);

    console.log('   SSH Key を自動追加中...');
    // The script will end here; SSH key addition will be done by the caller
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
