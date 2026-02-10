// Create R2 API token - navigate directly to R2 API token management page
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const ACCOUNT_ID = '0a18db13d69c9c267de70129b19d239b';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 130;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function waitForPage(page, maxSec = 60) {
  for (let i = 0; i < maxSec; i++) {
    await page.waitForTimeout(1000);
    const text = await page.locator('body').textContent().catch(() => '');
    if (text.length > 200 && !text.includes('Just a moment') && !text.includes('Checking')) {
      return true;
    }
    if (i % 15 === 0 && i > 0) console.log(`   ... 待機中 (${i}秒)`);
  }
  return false;
}

async function main() {
  const userDataDir = path.join(__dirname, '_cf-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(120000);

  // Go directly to R2 overview and click the Manage button for API Tokens
  console.log('🔗 R2 Overview に移動...');
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/r2/overview`);
  await waitForPage(page);
  await ss(page, 'r2-overview');

  // Click the "Manage" button next to API Tokens
  console.log('📋 API Tokens の Manage ボタンをクリック...');
  let manageClicked = false;

  // Try clicking "Manage" button that's near "API Tokens" text
  try {
    // The Manage button is inside the Account Details section
    const manageBtn = page.locator('text=API Tokens >> .. >> a:has-text("Manage"), text=API Tokens >> .. >> button:has-text("Manage")').first();
    await manageBtn.waitFor({ state: 'visible', timeout: 5000 });
    await manageBtn.click();
    manageClicked = true;
    console.log('   ✓ Manage ボタンクリック');
  } catch {
    // Fallback: click any element with "Manage" near API Tokens
    try {
      const section = page.locator(':has(> :text("API Tokens")) :text("Manage")').first();
      await section.click({ timeout: 3000 });
      manageClicked = true;
      console.log('   ✓ Manage クリック (fallback)');
    } catch {}
  }

  if (!manageClicked) {
    // Last resort: find the Manage link/button
    const allLinks = await page.locator('a, button').all();
    for (const el of allLinks) {
      try {
        const text = (await el.textContent()).trim();
        if (text.includes('Manage') && await el.isVisible()) {
          // Check if near API Tokens
          const parent = await el.evaluate(e => e.closest('div')?.textContent || '');
          if (parent.includes('API Token')) {
            await el.click();
            manageClicked = true;
            console.log(`   ✓ Manage クリック (scan): "${text}"`);
            break;
          }
        }
      } catch {}
    }
  }

  if (!manageClicked) {
    console.log('   ⚠️ Manage ボタンが見つかりません。直接URLに移動します...');
    await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/r2/overview/api-tokens`);
  }

  await page.waitForTimeout(3000);
  await waitForPage(page);
  await ss(page, 'token-page');

  // Check current URL and page content
  const currentUrl = page.url();
  console.log(`   URL: ${currentUrl}`);
  const bodyText = await page.locator('body').textContent();
  console.log(`   Page contains 'Create': ${bodyText.includes('Create')}`);
  console.log(`   Page contains 'token': ${bodyText.toLowerCase().includes('token')}`);

  // If we ended up on the account-level API tokens page, we need the R2 specific one
  if (currentUrl.includes('/profile/api-tokens') || currentUrl.includes('/api-tokens')) {
    console.log('   アカウントレベルのトークンページです。R2用トークンを作成します。');
  }

  // Click "Create API Token" or "Create Token"
  console.log('📋 Create API Token ボタンを探しています...');
  let createClicked = false;
  for (const sel of [
    'button:has-text("Create API token")',
    'button:has-text("Create API Token")',
    'a:has-text("Create API token")',
    'a:has-text("Create API Token")',
    'button:has-text("Create Token")',
    'a:has-text("Create Token")',
    'button:has-text("作成")',
  ]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      createClicked = true;
      console.log(`   ✓ ${sel}`);
      break;
    } catch { /* next */ }
  }

  if (!createClicked) {
    console.log('   ⚠️ Create ボタンが見つかりません');
    // List all visible buttons
    const btns = await page.locator('button:visible, a:visible').all();
    for (let i = 0; i < Math.min(btns.length, 20); i++) {
      try {
        const text = (await btns[i].textContent()).trim().replace(/\s+/g, ' ').substring(0, 80);
        if (text.length > 1) console.log(`   [${i}] "${text}"`);
      } catch {}
    }
  }

  await page.waitForTimeout(3000);
  await waitForPage(page);
  await ss(page, 'token-create-form');

  // Check if we're on a token creation form or template selection page
  const formText = await page.locator('body').textContent();

  // If there's a template selection (e.g., "R2 Token" template)
  if (formText.includes('template') || formText.includes('テンプレート') || formText.includes('Get started')) {
    console.log('   テンプレート選択ページ...');
    // Look for R2 or custom token template
    for (const sel of [
      'button:has-text("R2")',
      'a:has-text("R2")',
      'button:has-text("Custom token")',
      'button:has-text("カスタム")',
      'button:has-text("Get started")',
      'a:has-text("Get started")',
    ]) {
      try {
        await page.locator(sel).first().click({ timeout: 3000 });
        console.log(`   ✓ テンプレート: ${sel}`);
        break;
      } catch {}
    }
    await page.waitForTimeout(3000);
    await ss(page, 'token-template');
  }

  // Fill token name
  console.log('📝 トークン名を入力...');
  const inputs = await page.locator('input[type="text"]:visible').all();
  let nameFilled = false;
  for (const input of inputs) {
    try {
      const val = await input.inputValue();
      if (!val || val.length < 3) {
        await input.fill('30sec-challenge-backend');
        nameFilled = true;
        console.log('   ✓ トークン名入力');
        break;
      }
    } catch {}
  }

  // Select R2 permissions
  console.log('📝 権限を設定...');

  // Look for R2 / Object Read & Write permission options
  for (const sel of [
    'select:visible',
    '[role="listbox"]:visible',
    'label:has-text("Object Read & Write")',
    'label:has-text("Admin Read & Write")',
    'label:has-text("Read")',
  ]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 2000 });

      if (sel.includes('select')) {
        // Try selecting from a dropdown
        await el.selectOption({ label: 'Object Read & Write' }).catch(() => {});
        await el.selectOption({ label: 'Admin Read & Write' }).catch(() => {});
        console.log(`   ✓ 権限ドロップダウン`);
      } else {
        await el.click();
        console.log(`   ✓ 権限: ${sel}`);
      }
      break;
    } catch {}
  }

  await page.waitForTimeout(1000);
  await ss(page, 'token-filled');

  // Submit: Create Token / Continue / Save
  console.log('📋 トークン作成を確定...');
  for (const sel of [
    'button:has-text("Create API Token")',
    'button:has-text("Create Token")',
    'button:has-text("Continue to summary")',
    'button:has-text("Save")',
    'button:has-text("Continue")',
    'button[type="submit"]',
    'button:has-text("作成")',
    'button:has-text("保存")',
  ]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      console.log(`   ✓ ${sel}`);
      await page.waitForTimeout(3000);

      // Check if there's a summary/confirm page
      const text = await page.locator('body').textContent();
      if (text.includes('summary') || text.includes('confirm') || text.includes('サマリー')) {
        console.log('   確認ページ...');
        await ss(page, 'token-summary');
        // Click final create/confirm
        for (const confirmSel of [
          'button:has-text("Create Token")',
          'button:has-text("Create API Token")',
          'button:has-text("Confirm")',
          'button:has-text("作成")',
        ]) {
          try {
            await page.locator(confirmSel).first().click({ timeout: 3000 });
            console.log(`   ✓ 確定: ${confirmSel}`);
            break;
          } catch {}
        }
      }
      break;
    } catch { /* next */ }
  }

  await page.waitForTimeout(5000);
  await ss(page, 'token-result');

  // Extract credentials
  console.log('\n📋 認証情報を取得中...');

  const results = {
    accountId: ACCOUNT_ID,
    s3Endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    bucket: 'video-challenge',
    accessKeyId: null,
    secretAccessKey: null,
    tokenValue: null,
  };

  // Get all text content and try to find credentials
  const resultText = await page.locator('body').textContent();

  // Try to find values in code/readonly/value elements
  const valueEls = await page.locator('code, input[readonly], input[type="password"], [class*="value"], pre, td, dd, [data-testid]').all();
  const foundValues = [];
  for (const el of valueEls) {
    try {
      const text = ((await el.textContent().catch(() => '')) || (await el.inputValue().catch(() => ''))).trim();
      if (text && text.length >= 10 && !text.includes(' ') && /^[a-zA-Z0-9_\-]+$/.test(text)) {
        foundValues.push(text);
      }
    } catch {}
  }

  console.log(`   検出された値: ${foundValues.length}個`);
  for (const v of foundValues) {
    console.log(`   → ${v}`);
  }

  // Try to identify Access Key ID and Secret
  for (const v of foundValues) {
    if (v.length >= 20 && v.length <= 40 && !results.accessKeyId) {
      results.accessKeyId = v;
    } else if (v.length > 40 && !results.secretAccessKey) {
      results.secretAccessKey = v;
    } else if (!results.tokenValue) {
      results.tokenValue = v;
    }
  }

  // Also try label-based extraction
  const labels = ['Access Key ID', 'Secret Access Key', 'Token', 'Value', 'アクセスキー', 'シークレット'];
  for (const label of labels) {
    try {
      const row = page.locator(`text=${label} >> ..`).first();
      const val = row.locator('code, input, span, td').last();
      const text = ((await val.textContent().catch(() => '')) || (await val.inputValue().catch(() => ''))).trim();
      if (text && text.length >= 10) {
        console.log(`   ${label}: ${text}`);
        if (label.includes('Access Key') && !label.includes('Secret')) results.accessKeyId = text;
        if (label.includes('Secret')) results.secretAccessKey = text;
        if (label.includes('Token') || label.includes('Value')) results.tokenValue = text;
      }
    } catch {}
  }

  // Print results
  console.log('\n═══════════════════════════════════════');
  console.log('📋 R2 設定情報');
  console.log('═══════════════════════════════════════');
  console.log(`S3_ENDPOINT=${results.s3Endpoint}`);
  console.log(`S3_REGION=auto`);
  console.log(`S3_BUCKET=video-challenge`);
  console.log(`S3_ACCESS_KEY=${results.accessKeyId || '<スクリーンショットを確認>'}`);
  console.log(`S3_SECRET_KEY=${results.secretAccessKey || '<スクリーンショットを確認>'}`);
  if (results.tokenValue) console.log(`TOKEN_VALUE=${results.tokenValue}`);
  console.log('═══════════════════════════════════════');

  const outPath = path.join(SCREENSHOTS_DIR, 'r2-credentials.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n結果保存: ${outPath}`);

  console.log('\n⚠️ Secret Access Key は一度しか表示されません。スクリーンショットを確認してください。');
  console.log('確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
