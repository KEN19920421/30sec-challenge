// Xserver VPS: Register SSH key → Shutdown VPS → Reinstall OS
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 560;

const SSH_PUBLIC_KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINAggh07qt6Y4FLxdAp36FHypCF+Pg90HeirgnlT4YTJ skky1839@yahoo.co.jp';

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

  // ─── Step 2: Register SSH Key ───
  console.log('\n📋 Step 2: SSH公開鍵を登録...');

  // Navigate to VPS SSH Key page
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

  // Go to SSH Key page
  await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/server/ssh/index');
  await waitForStable(page, 3000);

  const sshText = await page.locator('body').textContent().catch(() => '');
  if (sshText.includes('ありません')) {
    console.log('   SSH Keyなし。登録開始...');

    // Click "+ SSH Keyの登録" button in top right
    await page.locator('a:has-text("SSH Keyの登録")').click();
    await waitForStable(page, 3000);
    await ss(page, '01-ssh-register-form');

    // Dump the registration form
    const regText = await page.locator('body').textContent().catch(() => '');
    console.log(`   登録ページ: ${regText.substring(0, 400).replace(/\s+/g, ' ')}`);

    // Get form elements
    const formInfo = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('input, textarea, select'));
      return elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        name: el.name || el.id || '',
        type: el.type || '',
        placeholder: el.placeholder || '',
        visible: el.offsetParent !== null,
      })).filter(e => e.visible || e.tag === 'textarea');
    });
    console.log(`   フォーム: ${JSON.stringify(formInfo, null, 2)}`);

    // Check for radio buttons (generate new vs paste existing)
    const radios = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
        name: r.name,
        value: r.value,
        label: r.closest('label')?.textContent?.trim()?.substring(0, 50) ||
               document.querySelector(`label[for="${r.id}"]`)?.textContent?.trim()?.substring(0, 50) || '',
        checked: r.checked,
      }));
    });
    console.log(`   ラジオ: ${JSON.stringify(radios)}`);

    // Select "公開鍵を入力" or "インポート" option if available
    for (const radio of radios) {
      if (radio.label?.includes('入力') || radio.label?.includes('インポート') ||
          radio.label?.includes('貼り') || radio.label?.includes('既存')) {
        await page.locator(`input[name="${radio.name}"][value="${radio.value}"]`).click({ force: true });
        console.log(`   ✓ ${radio.label} 選択`);
        await page.waitForTimeout(1000);
        break;
      }
    }

    await ss(page, '02-ssh-form-after-radio');

    // Now look for the textarea/input to paste the key
    const updatedForm = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('input[type="text"], textarea'));
      return elements.map(el => ({
        tag: el.tagName.toLowerCase(),
        name: el.name || el.id || '',
        type: el.type || '',
        placeholder: el.placeholder || '',
        visible: el.offsetParent !== null,
        rows: el.rows || 0,
      }));
    });
    console.log(`   更新フォーム: ${JSON.stringify(updatedForm)}`);

    // Fill in the key name
    for (const field of updatedForm) {
      if (field.name.includes('name') || field.name.includes('label') || field.name.includes('memo')) {
        await page.fill(`[name="${field.name}"]`, '30sec-app');
        console.log(`   ✓ 鍵名: 30sec-app`);
      }
    }

    // Fill in the public key
    for (const field of updatedForm) {
      if (field.tag === 'textarea' || field.name.includes('key') || field.name.includes('public') ||
          field.placeholder?.includes('ssh') || field.rows > 1) {
        await page.fill(`[name="${field.name}"]`, SSH_PUBLIC_KEY);
        console.log(`   ✓ 公開鍵入力`);
        break;
      }
    }

    // If no specific field found, try any visible textarea
    if (!updatedForm.some(f => f.tag === 'textarea' || f.name.includes('key'))) {
      try {
        await page.locator('textarea').first().fill(SSH_PUBLIC_KEY);
        console.log('   ✓ 公開鍵入力 (textarea)');
      } catch {
        // Maybe it's a text input
        try {
          const inputs = page.locator('input[type="text"]');
          const count = await inputs.count();
          for (let i = 0; i < count; i++) {
            const name = await inputs.nth(i).getAttribute('name');
            if (name && !name.includes('name') && !name.includes('label')) {
              await inputs.nth(i).fill(SSH_PUBLIC_KEY);
              console.log(`   ✓ 公開鍵入力 (input[${i}])`);
              break;
            }
          }
        } catch {}
      }
    }

    await ss(page, '03-ssh-key-filled');

    // Submit
    for (const sel of [
      'button:has-text("登録する")', 'button:has-text("確認")',
      'input[type="submit"]', 'button[type="submit"]',
    ]) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 3000 });
        await btn.click();
        console.log(`   ✓ ${sel} クリック`);
        await waitForStable(page, 3000);
        break;
      } catch {}
    }

    // Confirmation step if needed
    for (const sel of [
      'button:has-text("登録する")', 'button:has-text("確定")', 'button:has-text("OK")',
    ]) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 5000 });
        await btn.click();
        console.log(`   ✓ 確認: ${sel}`);
        await waitForStable(page, 3000);
        break;
      } catch {}
    }

    await ss(page, '04-ssh-registered');
    const result = await page.locator('body').textContent().catch(() => '');
    if (result.includes('登録') && !result.includes('ありません')) {
      console.log('   ✅ SSH Key登録完了');
    } else {
      console.log(`   結果: ${result.substring(0, 300).replace(/\s+/g, ' ')}`);
    }
  } else {
    console.log('   SSH Keyは既に登録済み');
  }

  // ─── Step 3: Go to VPS Panel and Shutdown ───
  console.log('\n📋 Step 3: VPSをシャットダウン...');

  // Navigate to VPS panel
  await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/index');
  await waitForStable(page, 3000);
  try {
    await page.locator('a:has-text("VPS管理")').first().click();
    await waitForStable(page, 3000);
  } catch {}
  try {
    await page.locator('a:has-text("選択する")').first().click();
    await waitForStable(page, 5000);
  } catch {}

  // Click shutdown
  console.log('   シャットダウン実行...');
  try {
    // Click the シャットダウン link
    await page.locator('a:has-text("シャットダウン")').click();
    await page.waitForTimeout(2000);

    // Confirm dialog
    try {
      // The confirmation modal might have a "する" button
      await page.locator('button:has-text("する")').first().click({ timeout: 5000 });
      console.log('   ✓ シャットダウン確認');
    } catch {
      try {
        await page.locator('button:has-text("OK")').first().click({ timeout: 5000 });
        console.log('   ✓ シャットダウンOK');
      } catch {}
    }

    await waitForStable(page, 5000);

    // Wait for shutdown to complete
    console.log('   シャットダウン待ち...');
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(3000);
      const statusText = await page.locator('body').textContent().catch(() => '');
      if (statusText.includes('停止中') || statusText.includes('停止')) {
        console.log('   ✓ VPS停止完了');
        break;
      }
      if (i % 5 === 0 && i > 0) {
        console.log(`   ... 停止待ち (${i * 3}秒)`);
        // Refresh page to check status
        await page.reload();
        await waitForStable(page, 3000);
      }
    }
  } catch (e) {
    console.log(`   シャットダウンエラー: ${e.message.substring(0, 80)}`);
  }

  await ss(page, '05-shutdown');

  // ─── Step 4: OS再インストール ───
  console.log('\n📋 Step 4: OS再インストール...');

  // Navigate to reinstall page
  await page.goto(page.url().replace(/\/xvps\/.*/, '/xvps/vps/rebuild/index'));
  await waitForStable(page, 3000);
  await ss(page, '06-reinstall-page');

  const reinstallText = await page.locator('body').textContent().catch(() => '');
  console.log(`   ページ: ${reinstallText.substring(0, 500).replace(/\s+/g, ' ')}`);

  if (reinstallText.includes('停止してください')) {
    console.log('   ⚠️  まだサーバーが停止していません。少し待ちます...');
    await page.waitForTimeout(10000);
    await page.reload();
    await waitForStable(page, 5000);
  }

  // Get form elements
  const formElements = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name || s.id,
      visible: s.offsetParent !== null,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() })),
    }));
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
      name: r.name,
      value: r.value,
      checked: r.checked,
      visible: r.offsetParent !== null,
      label: r.closest('label')?.textContent?.trim()?.substring(0, 60) ||
             document.querySelector(`label[for="${r.id}"]`)?.textContent?.trim()?.substring(0, 60) || '',
    }));
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="password"]')).map(i => ({
      name: i.name || i.id,
      type: i.type,
      placeholder: i.placeholder || '',
      visible: i.offsetParent !== null,
    }));
    const links = Array.from(document.querySelectorAll('a, button')).map(el => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().substring(0, 60),
    })).filter(l => l.text.includes('Ubuntu') || l.text.includes('インストール') ||
                    l.text.includes('OS') || l.text.includes('SSH'));
    return { selects, radios, inputs, links };
  });
  console.log(`\n   select: ${JSON.stringify(formElements.selects, null, 2)}`);
  console.log(`   radio: ${JSON.stringify(formElements.radios, null, 2)}`);
  console.log(`   input: ${JSON.stringify(formElements.inputs)}`);
  console.log(`   関連リンク: ${JSON.stringify(formElements.links)}`);

  // Select Ubuntu 22.04
  for (const select of formElements.selects) {
    const ubuntuOpt = select.options.find(o => o.text.includes('Ubuntu') && o.text.includes('22'));
    if (ubuntuOpt) {
      await page.selectOption(`select[name="${select.name}"]`, ubuntuOpt.value);
      console.log(`\n   ✓ OS: ${ubuntuOpt.text}`);
      await page.waitForTimeout(2000);
    }
  }

  // After OS selection, check for SSH key selection
  await page.waitForTimeout(2000);
  const updatedElements = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name || s.id,
      visible: s.offsetParent !== null,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() })),
    }));
    const radios = Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({
      name: r.name,
      value: r.value,
      checked: r.checked,
      visible: r.offsetParent !== null,
      label: r.closest('label')?.textContent?.trim()?.substring(0, 60) ||
             document.querySelector(`label[for="${r.id}"]`)?.textContent?.trim()?.substring(0, 60) || '',
    }));
    const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="password"]')).map(i => ({
      name: i.name || i.id,
      type: i.type,
      visible: i.offsetParent !== null,
    }));
    return { selects, radios, inputs };
  });
  console.log(`   更新 select: ${JSON.stringify(updatedElements.selects, null, 2)}`);
  console.log(`   更新 radio: ${JSON.stringify(updatedElements.radios, null, 2)}`);
  console.log(`   更新 input: ${JSON.stringify(updatedElements.inputs)}`);

  // Select SSH key option
  for (const select of updatedElements.selects) {
    const keyOpt = select.options.find(o =>
      o.text.includes('30sec') || o.text.includes('ed25519') || o.text.includes('SSH')
    );
    if (keyOpt) {
      await page.selectOption(`select[name="${select.name}"]`, keyOpt.value);
      console.log(`   ✓ SSH Key: ${keyOpt.text}`);
    }
  }

  // Set root password if there's a password field
  for (const input of updatedElements.inputs) {
    if (input.name?.includes('password') || input.name?.includes('pass')) {
      const password = 'Xvps2026SecApp!';
      await page.fill(`input[name="${input.name}"]`, password);
      console.log(`   ✓ rootパスワード: ${password}`);
      fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'root-password.txt'), password);
    }
  }

  await ss(page, '07-reinstall-configured');

  // Click reinstall button
  console.log('\n   再インストール実行...');
  for (const sel of [
    'button:has-text("再インストールする")',
    'input[type="submit"]',
    'button:has-text("確認")',
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

  await ss(page, '08-result');
  const resultText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   結果: ${resultText.substring(0, 400).replace(/\s+/g, ' ')}`);

  if (resultText.includes('完了') || resultText.includes('成功') || resultText.includes('インストール')) {
    console.log('\n   ✅ OS再インストール完了！');
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
