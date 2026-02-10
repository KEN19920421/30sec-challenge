// Cloudflare R2 activation + bucket setup
// Uses persistent browser context to handle Turnstile manually

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const ACCOUNT_ID = '0a18db13d69c9c267de70129b19d239b';
const BUCKET_NAME = 'video-challenge';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 110;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function main() {
  // Use persistent context with stealth flags
  const userDataDir = path.join(__dirname, '_cf-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1400, height: 1000 },
    args: [
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000); // 5 minutes for manual Turnstile

  // Navigate to R2 page
  console.log('🔗 Cloudflare R2 ページに移動...');
  console.log('   ⚠️ Turnstile チャレンジが表示されたら手動で通過してください');
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/r2/overview`);

  // Wait for the page to load past Turnstile
  // Poll until we see R2 content or dashboard content
  console.log('⏳ ページ読み込み待ち (Turnstile が出たら手動で通過してください)...');

  let loaded = false;
  for (let i = 0; i < 60; i++) { // 5 minutes max
    await page.waitForTimeout(5000);
    const url = page.url();
    const text = await page.locator('body').textContent().catch(() => '');

    if (text.includes('R2') && (text.includes('bucket') || text.includes('バケット') || text.includes('Get started') || text.includes('Create bucket') || text.includes('Overview'))) {
      loaded = true;
      break;
    }

    // Check if on login page
    if (url.includes('/login') || url.includes('/sign-up')) {
      console.log('   ログインページが表示されています。ログインしてください...');
    }

    if (i % 6 === 0) {
      console.log(`   ... 待機中 (${i * 5}秒経過)`);
    }
  }

  if (!loaded) {
    console.log('   ⚠️ R2 ページの読み込みがタイムアウト');
    await ss(page, 'r2-timeout');
    await context.close();
    return;
  }

  console.log('✅ R2 ページ読み込み完了');
  await ss(page, 'r2-page');

  // Check if R2 needs activation
  const bodyText = await page.locator('body').textContent();

  if (bodyText.includes('Get started') || bodyText.includes('Subscribe') || bodyText.includes('有効') || bodyText.includes('始める')) {
    console.log('\n📋 R2 の有効化が必要です...');

    // Try clicking activation button
    const activateSelectors = [
      'button:has-text("Get started")',
      'button:has-text("Subscribe to R2")',
      'a:has-text("Get started")',
      'a:has-text("Subscribe")',
      'button:has-text("始める")',
      'button:has-text("有効")',
    ];

    for (const sel of activateSelectors) {
      try {
        const btn = page.locator(sel).first();
        await btn.waitFor({ state: 'visible', timeout: 3000 });
        await btn.click();
        console.log(`   ✓ ${sel} をクリック`);
        await page.waitForTimeout(5000);
        break;
      } catch { /* next */ }
    }

    await ss(page, 'r2-activation');

    // Wait for activation to complete (might need payment method)
    console.log('   支払い方法の入力が必要な場合は手動で入力してください...');
    console.log('   R2 が有効になるまで待機します (最大3分)...');

    for (let i = 0; i < 36; i++) {
      await page.waitForTimeout(5000);
      const text = await page.locator('body').textContent().catch(() => '');
      if (text.includes('Create bucket') || text.includes('バケットを作成')) {
        console.log('   ✅ R2 が有効化されました！');
        break;
      }
      if (i % 6 === 0 && i > 0) {
        console.log(`   ... 待機中 (${i * 5}秒経過)`);
        await ss(page, `r2-waiting-${i}`);
      }
    }
  }

  // Now try to create bucket
  const currentText = await page.locator('body').textContent();

  if (currentText.includes('Create bucket') || currentText.includes('バケットを作成') || currentText.includes(BUCKET_NAME)) {
    if (currentText.includes(BUCKET_NAME)) {
      console.log(`\n✅ バケット "${BUCKET_NAME}" は既に存在します`);
    } else {
      console.log(`\n📋 バケット "${BUCKET_NAME}" を作成中...`);

      // Click Create bucket
      for (const sel of ['button:has-text("Create bucket")', 'button:has-text("バケットを作成")', 'a:has-text("Create bucket")']) {
        try {
          await page.locator(sel).first().click({ timeout: 5000 });
          console.log(`   ✓ ${sel}`);
          break;
        } catch { /* next */ }
      }

      await page.waitForTimeout(3000);
      await ss(page, 'r2-create-bucket');

      // Fill bucket name
      const nameInput = page.locator('input').first();
      try {
        await nameInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameInput.fill(BUCKET_NAME);
        console.log(`   ✓ バケット名: ${BUCKET_NAME}`);
      } catch {}

      await ss(page, 'r2-bucket-name');

      // Click create
      for (const sel of ['button:has-text("Create bucket")', 'button:has-text("バケットを作成")', 'button[type="submit"]']) {
        try {
          await page.locator(sel).first().click({ timeout: 5000 });
          console.log(`   ✓ 作成確定`);
          break;
        } catch { /* next */ }
      }

      await page.waitForTimeout(5000);
      await ss(page, 'r2-bucket-created');
      console.log(`   ✅ バケット作成完了`);
    }
  }

  // Navigate to bucket settings for public access
  console.log('\n📋 パブリックアクセス設定...');
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/r2/default/buckets/${BUCKET_NAME}/settings`);
  await page.waitForTimeout(5000);
  await ss(page, 'r2-settings');

  // Look for r2.dev public access toggle
  const settingsText = await page.locator('body').textContent();
  if (settingsText.includes('r2.dev') || settingsText.includes('Public access') || settingsText.includes('パブリック')) {
    for (const sel of [
      'button:has-text("Allow Access")',
      'button:has-text("アクセスを許可")',
      'button:has-text("Enable")',
      'button:has-text("Connect domain")',
    ]) {
      try {
        await page.locator(sel).first().click({ timeout: 3000 });
        console.log(`   ✓ ${sel}`);
        await page.waitForTimeout(2000);
        // Confirm
        for (const confirmSel of ['button:has-text("Allow")', 'button:has-text("Confirm")', 'button:has-text("Enable")', 'input[type="text"]']) {
          try {
            const el = page.locator(confirmSel).first();
            if (confirmSel.includes('input')) {
              // Might need to type "allow" to confirm
              await el.fill('allow');
              await page.waitForTimeout(500);
            } else {
              await el.click({ timeout: 3000 });
            }
          } catch { /* next */ }
        }
        break;
      } catch { /* next */ }
    }

    await page.waitForTimeout(3000);
    await ss(page, 'r2-public');

    // Extract r2.dev URL
    const updatedText = await page.locator('body').textContent();
    const r2DevMatch = updatedText.match(/(pub-[a-f0-9]+\.r2\.dev)/);
    if (r2DevMatch) {
      console.log(`   ✅ Public URL: https://${r2DevMatch[1]}`);
    }
  }

  // Navigate to R2 API tokens
  console.log('\n📋 API トークン作成...');
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/r2/overview`);
  await page.waitForTimeout(3000);

  // Click "Manage R2 API Tokens"
  for (const sel of [
    'a:has-text("Manage R2 API Tokens")',
    'a:has-text("R2 API トークン")',
    'button:has-text("Manage R2 API Tokens")',
  ]) {
    try {
      await page.locator(sel).first().click({ timeout: 5000 });
      console.log(`   ✓ ${sel}`);
      break;
    } catch { /* next */ }
  }

  await page.waitForTimeout(3000);
  await ss(page, 'r2-tokens');

  // Create token
  for (const sel of [
    'button:has-text("Create API token")',
    'button:has-text("API トークンを作成")',
    'a:has-text("Create API token")',
  ]) {
    try {
      await page.locator(sel).first().click({ timeout: 5000 });
      console.log(`   ✓ ${sel}`);
      break;
    } catch { /* next */ }
  }

  await page.waitForTimeout(3000);
  await ss(page, 'r2-token-form');

  // Fill token name
  try {
    const input = page.locator('input[type="text"]').first();
    await input.fill('30sec-challenge-backend');
    console.log('   ✓ トークン名: 30sec-challenge-backend');
  } catch {}

  // Select permissions
  for (const sel of [
    'label:has-text("Object Read & Write")',
    'label:has-text("Admin Read & Write")',
    'input[value="object-read-write"]',
  ]) {
    try {
      await page.locator(sel).first().click({ timeout: 3000 });
      console.log(`   ✓ 権限: ${sel}`);
      break;
    } catch { /* next */ }
  }

  await ss(page, 'r2-token-config');

  // Create
  for (const sel of [
    'button:has-text("Create API Token")',
    'button:has-text("API トークンを作成")',
    'button[type="submit"]',
  ]) {
    try {
      await page.locator(sel).first().click({ timeout: 5000 });
      console.log(`   ✓ トークン作成`);
      break;
    } catch { /* next */ }
  }

  await page.waitForTimeout(5000);
  await ss(page, 'r2-token-result');

  // Extract credentials
  const tokenText = await page.locator('body').textContent();
  const results = {
    accountId: ACCOUNT_ID,
    s3Endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    bucket: BUCKET_NAME,
  };

  // Try to get values from visible elements
  const allInputs = await page.locator('input[readonly], code, [data-testid], .value').all();
  for (const el of allInputs) {
    const text = (await el.textContent().catch(() => '')) || (await el.inputValue().catch(() => ''));
    if (text && text.length > 10) {
      console.log(`   value: ${text}`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📋 R2 設定結果');
  console.log('═══════════════════════════════════════');
  console.log(`  S3_ENDPOINT=${results.s3Endpoint}`);
  console.log(`  S3_REGION=auto`);
  console.log(`  S3_BUCKET=${BUCKET_NAME}`);
  console.log('  S3_ACCESS_KEY=<画面から取得してください>');
  console.log('  S3_SECRET_KEY=<画面から取得してください>');
  console.log('═══════════════════════════════════════');

  const outPath = path.join(SCREENSHOTS_DIR, 'r2-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
