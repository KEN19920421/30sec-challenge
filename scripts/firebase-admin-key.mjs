// Download Firebase Admin SDK service account key
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const PROJECT_ID = 'sec-challenge-34060';
const DEST_DIR = path.join(__dirname, '..', 'backend');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 190;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
    acceptDownloads: true,
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Navigate to Firebase Console - Project Settings - Service Accounts
  console.log('🔗 Firebase Console → サービスアカウントに移動...');
  await page.goto(`https://console.firebase.google.com/project/${PROJECT_ID}/settings/serviceaccounts/adminsdk`);

  console.log('⏳ ページ読み込み待ち...');
  for (let i = 0; i < 150; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    const text = await page.locator('body').textContent().catch(() => '');

    if (text.includes('Admin SDK') || text.includes('サービス アカウント') || text.includes('Service account') || text.includes('Generate new private key') || text.includes('新しい秘密鍵')) {
      console.log('✅ サービスアカウントページ表示');
      break;
    }

    if (url.includes('accounts.google.com')) {
      if (i % 15 === 0) console.log('   ログインしてください...');
    }

    if (i % 15 === 0 && i > 0) console.log(`   ... 待機中 (${i * 2}秒)`);
  }

  await page.waitForTimeout(3000);
  await ss(page, 'service-accounts');

  // Click "Generate new private key" button
  console.log('📋 秘密鍵を生成...');
  let clicked = false;
  for (const sel of [
    'button:has-text("新しい秘密鍵の生成")',
    'button:has-text("Generate new private key")',
    'button:has-text("秘密鍵を生成")',
    'button:has-text("Generate private key")',
    'a:has-text("新しい秘密鍵の生成")',
    'a:has-text("Generate new private key")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 5000 });
      await btn.click();
      clicked = true;
      console.log(`   ✓ ${sel}`);
      break;
    } catch { /* next */ }
  }

  if (!clicked) {
    // Try finding any button with "key" or "鍵" text
    const btns = await page.locator('button:visible').all();
    for (const btn of btns) {
      try {
        const text = (await btn.textContent()).trim();
        if (text.includes('鍵') || text.includes('key') || text.includes('Key')) {
          console.log(`   Found: "${text}"`);
          await btn.click();
          clicked = true;
          break;
        }
      } catch {}
    }
  }

  if (!clicked) {
    console.log('   ⚠️ ボタンが見つかりません');
    const allBtns = await page.locator('button:visible').all();
    for (let i = 0; i < Math.min(allBtns.length, 15); i++) {
      const text = (await allBtns[i].textContent()).trim().replace(/\s+/g, ' ').substring(0, 80);
      if (text.length > 0) console.log(`   button[${i}]: "${text}"`);
    }
    await ss(page, 'no-generate-btn');
    await context.close();
    return;
  }

  await page.waitForTimeout(2000);
  await ss(page, 'confirm-dialog');

  // Confirm the generation (there's usually a confirmation dialog)
  console.log('📋 確認ダイアログ...');

  // Set up download listener before clicking confirm
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);

  for (const sel of [
    'button:has-text("キーを生成")',
    'button:has-text("Generate key")',
    'button:has-text("生成")',
    'button:has-text("Generate")',
    'button:has-text("確認")',
    'button:has-text("Confirm")',
    'button:has-text("OK")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      await btn.waitFor({ state: 'visible', timeout: 3000 });
      await btn.click();
      console.log(`   ✓ ${sel}`);
      break;
    } catch { /* next */ }
  }

  // Wait for download
  console.log('⏳ ダウンロード待ち...');
  const download = await downloadPromise;

  if (download) {
    const suggestedName = download.suggestedFilename();
    console.log(`   ダウンロード: ${suggestedName}`);

    // Save to backend directory
    const destPath = path.join(DEST_DIR, 'firebase-adminsdk.json');
    await download.saveAs(destPath);
    console.log(`   ✅ 保存: ${destPath}`);

    // Read and verify the file
    try {
      const content = JSON.parse(fs.readFileSync(destPath, 'utf8'));
      console.log('\n═══════════════════════════════════════');
      console.log('📋 Firebase Admin SDK Key');
      console.log('═══════════════════════════════════════');
      console.log(`   project_id: ${content.project_id}`);
      console.log(`   client_email: ${content.client_email}`);
      console.log(`   client_id: ${content.client_id}`);
      console.log(`   private_key_id: ${content.private_key_id}`);
      console.log('═══════════════════════════════════════');
    } catch (e) {
      console.log(`   ファイル読み取りエラー: ${e.message}`);
    }
  } else {
    console.log('   ⚠️ ダウンロードが検出されませんでした');

    // Check if file was auto-downloaded to ~/Downloads
    const downloadsDir = path.join(process.env.HOME, 'Downloads');
    const files = fs.readdirSync(downloadsDir).filter(f => f.includes(PROJECT_ID) && f.endsWith('.json'));
    if (files.length > 0) {
      const latest = files.sort().pop();
      const src = path.join(downloadsDir, latest);
      const dest = path.join(DEST_DIR, 'firebase-adminsdk.json');
      fs.copyFileSync(src, dest);
      console.log(`   ✅ ~/Downloads/${latest} → ${dest}`);
    } else {
      console.log('   ~/Downloads にもファイルが見つかりません');
    }

    await ss(page, 'download-fail');
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
