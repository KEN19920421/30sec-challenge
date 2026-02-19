// Xserver VPS: OS Reinstall v5
// Key findings from screenshots:
//   - Ubuntu card is already selected (green) by default
//   - Version dropdown shows 25.04, need to change to 22.04
//   - Password field is visible but wasn't filled by evaluate
//   - SSH Key dropdown shows "設定しない"
//   - Flow: Configure → "確認画面へ進む" → Confirm → "再インストールする"
//
// Strategy: Use Playwright native click/fill/selectOption, NOT evaluate
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 600;

const ROOT_PASSWORD = 'Xvps2026SecApp!';

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

async function dumpFormState(page, label) {
  const info = await page.evaluate(() => {
    const result = {};
    // All selects
    result.selects = Array.from(document.querySelectorAll('select')).map(s => ({
      name: s.name || s.id || '(no name)',
      value: s.value,
      visible: s.offsetParent !== null,
      selectedText: s.options[s.selectedIndex]?.text?.trim() || '',
      optionCount: s.options.length,
    }));
    // All password/text inputs
    result.inputs = Array.from(document.querySelectorAll('input')).filter(i =>
      ['text', 'password'].includes(i.type)
    ).map(i => ({
      name: i.name || i.id || '(no name)',
      type: i.type,
      value: i.value ? '(has value)' : '(empty)',
      visible: i.offsetParent !== null,
      placeholder: i.placeholder?.substring(0, 40) || '',
    }));
    return result;
  });
  console.log(`\n   [${label}] Form state:`);
  console.log(`   Selects: ${JSON.stringify(info.selects, null, 2)}`);
  console.log(`   Inputs: ${JSON.stringify(info.inputs, null, 2)}`);
  return info;
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

  // Check if server needs to be stopped
  const pageText = await page.locator('body').textContent().catch(() => '');
  if (pageText.includes('停止してください')) {
    console.log('   ⚠️  サーバー稼働中。手動でシャットダウンしてからEnterを押してください');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
    await page.reload();
    await waitForStable(page, 5000);
  }

  await ss(page, '01-reinstall-page');
  await dumpFormState(page, 'initial');

  // ─── Step 1: Select Ubuntu 22.04 ───
  console.log('\n📋 Step 1: Ubuntu 22.04 を選択...');

  // The Ubuntu card should already be selected (green).
  // We need to find the select dropdown WITHIN the Ubuntu card and change version.
  // From screenshot: the card has a green border and a dropdown showing "25.04 (64bit)"
  // The dropdown is a <select name="os_image_id"> but there are multiple (one per OS)

  // First, let's click the Ubuntu card to ensure it's active
  // The card text shows "Ubuntu" - find and click it
  const ubuntuClicked = await page.evaluate(() => {
    // Look for elements that look like OS cards
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      // Find a card-like element that directly contains "Ubuntu" text
      if (el.children.length < 10 && el.textContent?.includes('Ubuntu') &&
          !el.textContent?.includes('CentOS') && !el.textContent?.includes('Debian')) {
        // Check if it has or is near a radio/checkbox/clickable
        const radio = el.querySelector('input[type="radio"]');
        if (radio) {
          radio.click();
          return `clicked radio in: ${el.tagName}.${el.className}`;
        }
        const label = el.closest('label') || el.querySelector('label');
        if (label) {
          label.click();
          return `clicked label in: ${el.tagName}.${el.className}`;
        }
      }
    }
    // Fallback: try clicking any element with just "Ubuntu" text
    for (const el of allElements) {
      if (el.childNodes.length <= 3 &&
          el.textContent?.trim().startsWith('Ubuntu') &&
          el.textContent?.trim().length < 20) {
        el.click();
        return `clicked: ${el.tagName}.${el.className} = "${el.textContent.trim()}"`;
      }
    }
    return 'not found';
  });
  console.log(`   Ubuntu card: ${ubuntuClicked}`);
  await page.waitForTimeout(1500);

  // Now find and change the Ubuntu version dropdown
  // Strategy: find the select that contains "22.04" as an option
  const selectChanged = await page.evaluate(() => {
    const selects = document.querySelectorAll('select[name="os_image_id"]');
    for (const s of selects) {
      const options = Array.from(s.options);
      const has2204 = options.find(o => o.value.includes('ubuntu2204') || o.text.includes('22.04'));
      if (has2204) {
        // This is the Ubuntu version select
        s.value = has2204.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        s.dispatchEvent(new Event('input', { bubbles: true }));
        return `set ${s.name} to ${has2204.value} (${has2204.text})`;
      }
    }
    // Fallback: try ALL selects
    for (const s of document.querySelectorAll('select')) {
      const options = Array.from(s.options);
      const has2204 = options.find(o => o.text.includes('22.04'));
      if (has2204) {
        s.value = has2204.value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return `fallback: set ${s.name || s.id} to ${has2204.value}`;
      }
    }
    // Dump all selects for debugging
    return 'not found. Selects: ' + JSON.stringify(
      Array.from(document.querySelectorAll('select')).map(s => ({
        name: s.name,
        opts: Array.from(s.options).map(o => `${o.value}=${o.text.trim().substring(0, 30)}`),
      }))
    );
  });
  console.log(`   Version select: ${selectChanged}`);
  await page.waitForTimeout(2000);

  await ss(page, '02-ubuntu-selected');

  // ─── Step 2: Set root password ───
  console.log('\n📋 Step 2: rootパスワード設定...');

  // Try multiple approaches to fill the password
  // Approach 1: Find visible password input using Playwright locator
  let passwordFilled = false;

  // Try clicking the password field area first to make sure it's focused
  try {
    const pwInput = page.locator('input[name="vps_root_password"]').first();
    const isVisible = await pwInput.isVisible().catch(() => false);
    console.log(`   input[name="vps_root_password"] visible: ${isVisible}`);

    if (isVisible) {
      await pwInput.click();
      await page.waitForTimeout(500);
      await pwInput.fill(ROOT_PASSWORD);
      passwordFilled = true;
      console.log('   ✓ パスワード設定 (native fill)');
    }
  } catch (e) {
    console.log(`   native fill failed: ${e.message}`);
  }

  // Approach 2: Try type="password" inputs
  if (!passwordFilled) {
    try {
      const pwInputs = page.locator('input[type="password"]');
      const count = await pwInputs.count();
      console.log(`   password inputs count: ${count}`);
      for (let i = 0; i < count; i++) {
        const inp = pwInputs.nth(i);
        const vis = await inp.isVisible().catch(() => false);
        console.log(`   input[${i}] visible: ${vis}`);
        if (vis) {
          await inp.click();
          await page.waitForTimeout(300);
          await inp.fill(ROOT_PASSWORD);
          passwordFilled = true;
          console.log(`   ✓ パスワード設定 (password input #${i})`);
          break;
        }
      }
    } catch (e) {
      console.log(`   password inputs failed: ${e.message}`);
    }
  }

  // Approach 3: Try type="text" inputs near password label
  if (!passwordFilled) {
    try {
      const result = await page.evaluate((pwd) => {
        // Find the label that says "rootパスワード"
        const labels = document.querySelectorAll('*');
        for (const label of labels) {
          if (label.textContent?.trim().includes('rootパスワード') && label.children.length < 5) {
            // Look for nearby input
            const parent = label.closest('div, tr, li, section') || label.parentElement;
            if (parent) {
              const input = parent.querySelector('input[type="text"], input[type="password"], input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])');
              if (input) {
                input.focus();
                input.value = pwd;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return `found near label: ${input.name || input.type}`;
              }
            }
          }
        }
        return 'not found near label';
      }, ROOT_PASSWORD);
      console.log(`   Approach 3: ${result}`);
      if (!result.includes('not found')) passwordFilled = true;
    } catch (e) {
      console.log(`   Approach 3 failed: ${e.message}`);
    }
  }

  // Approach 4: Force set via evaluate on ALL matching inputs
  if (!passwordFilled) {
    const result = await page.evaluate((pwd) => {
      const inputs = document.querySelectorAll('input[name="vps_root_password"], input[name*="password"]');
      const results = [];
      for (const input of inputs) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        ).set;
        nativeInputValueSetter.call(input, pwd);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        results.push(`${input.name}[${input.type}] visible:${input.offsetParent !== null}`);
      }
      return results.length > 0 ? `set ${results.join(', ')}` : 'no inputs found';
    }, ROOT_PASSWORD);
    console.log(`   Approach 4 (force): ${result}`);
    passwordFilled = !result.includes('no inputs');
  }

  console.log(`   パスワード設定: ${passwordFilled ? '✓' : '✗'}`);
  await page.waitForTimeout(1000);

  await ss(page, '03-password-set');
  await dumpFormState(page, 'after-password');

  // ─── Step 3: Set SSH Key ───
  console.log('\n📋 Step 3: SSH Key設定...');

  // Try native selectOption first
  try {
    const sshSelect = page.locator('select[name="ssh_key_setting"]');
    const isVisible = await sshSelect.isVisible().catch(() => false);
    console.log(`   ssh_key_setting visible: ${isVisible}`);

    if (isVisible) {
      // Get available options
      const options = await sshSelect.locator('option').allTextContents();
      console.log(`   SSH Key options: ${JSON.stringify(options)}`);

      // Select "登録済みのキーを選択する" = value "registered"
      await sshSelect.selectOption('registered');
      console.log('   ✓ SSH Key: 登録済みのキーを選択する (native)');
    } else {
      // Use evaluate
      await page.evaluate(() => {
        const s = document.querySelector('select[name="ssh_key_setting"]');
        if (s) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLSelectElement.prototype, 'value'
          ).set;
          nativeSetter.call(s, 'registered');
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      console.log('   ✓ SSH Key: 登録済みのキーを選択する (evaluate)');
    }
  } catch (e) {
    console.log(`   SSH Key設定 failed: ${e.message}`);
    // Fallback
    await page.evaluate(() => {
      const s = document.querySelector('select[name="ssh_key_setting"]');
      if (s) {
        s.value = 'registered';
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('   ✓ SSH Key: fallback evaluate');
  }

  // Wait for AJAX to load registered keys
  console.log('   登録済みキーの読み込み待ち...');
  await page.waitForTimeout(4000);

  // Check for registered key dropdown
  let keySelected = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const keyOptions = await page.evaluate(() => {
      const s = document.querySelector('select[name="registered_ssh_key_name"]');
      if (!s) return { exists: false, options: [] };
      return {
        exists: true,
        visible: s.offsetParent !== null,
        options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.trim() })),
      };
    });
    console.log(`   Attempt ${attempt + 1} - 登録済みキー: ${JSON.stringify(keyOptions)}`);

    if (keyOptions.exists && keyOptions.options.length > 0) {
      const keyToSelect = keyOptions.options.find(k => k.value && k.value !== '') || keyOptions.options[0];
      if (keyToSelect && keyToSelect.value) {
        try {
          // Try native selectOption
          const keySelect = page.locator('select[name="registered_ssh_key_name"]');
          await keySelect.selectOption(keyToSelect.value);
          console.log(`   ✓ キー選択 (native): ${keyToSelect.text}`);
        } catch {
          // Fallback to evaluate
          await page.evaluate((val) => {
            const s = document.querySelector('select[name="registered_ssh_key_name"]');
            if (s) {
              s.value = val;
              s.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, keyToSelect.value);
          console.log(`   ✓ キー選択 (evaluate): ${keyToSelect.text}`);
        }
        keySelected = true;
        break;
      }
    }

    // If keys not loaded, try toggling the ssh_key_setting dropdown
    if (attempt < 2) {
      console.log('   キーが見つかりません。ssh_key_settingをリセットして再試行...');
      await page.evaluate(() => {
        const s = document.querySelector('select[name="ssh_key_setting"]');
        if (s) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLSelectElement.prototype, 'value'
          ).set;
          nativeSetter.call(s, 'none');
          s.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.waitForTimeout(1000);

      // Try using native selectOption
      try {
        await page.locator('select[name="ssh_key_setting"]').selectOption('registered');
      } catch {
        await page.evaluate(() => {
          const s = document.querySelector('select[name="ssh_key_setting"]');
          if (s) {
            s.value = 'registered';
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
      await page.waitForTimeout(4000);
    }
  }

  if (!keySelected) {
    console.log('   ⚠️  登録済みキーを選択できません。手動で選択してください');
    console.log('   SSH Key → 「登録済みのキーを選択する」 → キーを選択');
    console.log('   選択後にEnterを押してください...');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
  }

  await ss(page, '04-ssh-key-set');
  await dumpFormState(page, 'after-ssh-key');

  // ─── Step 4: Final verification before submit ───
  console.log('\n📋 Step 4: 送信前の最終確認...');

  const finalState = await page.evaluate(() => {
    const getSelectValue = (name) => {
      const s = document.querySelector(`select[name="${name}"]`);
      return s ? { value: s.value, text: s.options[s.selectedIndex]?.text?.trim() } : null;
    };
    const getInputValue = (name) => {
      const inputs = document.querySelectorAll(`input[name="${name}"]`);
      for (const i of inputs) {
        if (i.type !== 'hidden' && i.value) return { value: '(set)', type: i.type };
      }
      // Check hidden ones too
      for (const i of inputs) {
        if (i.value) return { value: '(set-hidden)', type: i.type };
      }
      return { value: '(empty)', type: inputs[0]?.type || 'none' };
    };

    // Find which OS is selected (look for checked radio or active card)
    let selectedOS = 'unknown';
    const radios = document.querySelectorAll('input[type="radio"]');
    for (const r of radios) {
      if (r.checked && r.name?.includes('os')) {
        selectedOS = `${r.name}=${r.value}`;
      }
    }

    // Check all os_image_id selects
    const osSelects = Array.from(document.querySelectorAll('select[name="os_image_id"]')).map(s => ({
      value: s.value,
      text: s.options[s.selectedIndex]?.text?.trim(),
      visible: s.offsetParent !== null,
    }));

    return {
      selectedOS,
      osSelects,
      sshKeySetting: getSelectValue('ssh_key_setting'),
      registeredKey: getSelectValue('registered_ssh_key_name'),
      password: getInputValue('vps_root_password'),
    };
  });

  console.log(`   OS: ${JSON.stringify(finalState.selectedOS)}`);
  console.log(`   OS selects: ${JSON.stringify(finalState.osSelects)}`);
  console.log(`   SSH Key Setting: ${JSON.stringify(finalState.sshKeySetting)}`);
  console.log(`   Registered Key: ${JSON.stringify(finalState.registeredKey)}`);
  console.log(`   Password: ${JSON.stringify(finalState.password)}`);

  // ─── Step 5: Click "確認画面へ進む" ───
  console.log('\n📋 Step 5: 確認画面へ進む...');

  let confirmClicked = false;
  // Try native click on the button
  for (const sel of [
    'button:has-text("確認画面へ進む")',
    'a:has-text("確認画面へ進む")',
    'input[type="submit"][value*="確認"]',
    'button[type="submit"]',
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
    // Evaluate fallback
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
  }

  await waitForStable(page, 5000);
  await ss(page, '05-confirm-page');

  // Check if we're on confirmation page or got errors
  const confirmPageText = await page.locator('body').textContent().catch(() => '');
  const firstChars = confirmPageText.substring(0, 600).replace(/\s+/g, ' ');
  console.log(`   ページ内容: ${firstChars.substring(0, 300)}`);

  if (confirmPageText.includes('エラー') || confirmPageText.includes('入力してください')) {
    console.log('\n   ⚠️  入力エラーがあります。');
    // Get specific error messages
    const errors = await page.evaluate(() => {
      const errorEls = document.querySelectorAll('.error, .alert, [class*="error"], [class*="alert"], [class*="danger"]');
      return Array.from(errorEls).map(e => e.textContent?.trim()).filter(Boolean);
    });
    console.log(`   エラー: ${JSON.stringify(errors)}`);
    console.log('\n   手動で修正してからEnterを押してください...');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();

    // Re-screenshot after manual fix
    await ss(page, '05b-after-fix');
  }

  // If we see VPS情報 instead of confirmation, it means form wasn't properly submitted
  if (confirmPageText.includes('VPS情報') && !confirmPageText.includes('再インストールする')) {
    console.log('\n   ⚠️  VPS情報ページにリダイレクトされました（フォーム送信失敗）');
    console.log('   手動でOS再インストールページに戻り、設定してからEnterを押してください：');
    console.log('   1. 左メニュー → OS再インストール');
    console.log('   2. Ubuntu → 22.04 を選択');
    console.log('   3. rootパスワードを入力');
    console.log('   4. SSH Key → 登録済みのキーを選択する → キーを選択');
    console.log('   5. 「確認画面へ進む」をクリック');
    console.log('   6. 確認画面が表示されたらEnterを押してください');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
    await ss(page, '05c-manual-confirm');
  }

  // ─── Step 6: Click "再インストールする" ───
  console.log('\n📋 Step 6: 再インストール実行...');

  const currentText = await page.locator('body').textContent().catch(() => '');
  if (currentText.includes('再インストールする') || currentText.includes('以下の内容で')) {
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
  } else {
    console.log('   確認ページではないようです。手動で「再インストールする」をクリックしてください');
    console.log('   完了後にEnterを押してください...');
    process.stdin.resume();
    await new Promise(r => process.stdin.once('data', r));
    process.stdin.pause();
  }

  await ss(page, '06-result');
  const result = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   結果: ${result.substring(0, 400).replace(/\s+/g, ' ')}`);

  if (result.includes('完了') || result.includes('成功') || result.includes('インストール')) {
    console.log('\n   ✅ OS再インストール完了！');
    console.log(`   SSH: ssh root@210.131.218.20`);
    console.log(`   Password: ${ROOT_PASSWORD}`);
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'root-password.txt'), ROOT_PASSWORD);
  }

  // Wait for VPS to come back up
  console.log('\n   VPS起動待ち (60秒)...');
  await page.waitForTimeout(60000);

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
