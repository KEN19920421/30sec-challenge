// Create R2 API token via Cloudflare dashboard (persistent browser context)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const ACCOUNT_ID = '0a18db13d69c9c267de70129b19d239b';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 120;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function waitForDashboard(page, maxWait = 120) {
  console.log('⏳ ページ読み込み待ち (Turnstile が出たら手動で通過してください)...');
  for (let i = 0; i < maxWait; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('/login') || url.includes('/sign-up')) {
      if (i % 10 === 0) console.log('   ログインしてください...');
      continue;
    }
    const text = await page.locator('body').textContent().catch(() => '');
    if (text.length > 200 && !text.includes('Just a moment') && !text.includes('Checking')) {
      return true;
    }
    if (i % 10 === 0 && i > 0) console.log(`   ... 待機中 (${i * 2}秒)`);
  }
  return false;
}

async function main() {
  const userDataDir = path.join(__dirname, '_cf-profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Navigate to R2 overview to find API tokens link
  console.log('🔗 R2 API Tokens ページに移動...');
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/r2/overview`);

  if (!await waitForDashboard(page)) {
    console.log('⚠️ タイムアウト');
    await ss(page, 'token-timeout');
    await context.close();
    return;
  }

  await ss(page, 'r2-overview');

  // Click "Manage R2 API Tokens"
  console.log('📋 API Tokens リンクを探しています...');
  let clicked = false;
  for (const sel of [
    'a:has-text("Manage R2 API Tokens")',
    'a:has-text("R2 API トークンを管理")',
    'a:has-text("API Tokens")',
    'a:has-text("Manage API tokens")',
    'button:has-text("Manage R2 API Tokens")',
  ]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      console.log(`   ✓ ${sel}`);
      clicked = true;
      break;
    } catch { /* next */ }
  }

  if (!clicked) {
    // Try finding any link with "token" text
    const links = await page.locator('a').all();
    for (const link of links) {
      try {
        const text = (await link.textContent()).toLowerCase();
        if (text.includes('token') || text.includes('api')) {
          const isVis = await link.isVisible();
          if (isVis) {
            console.log(`   Found link: "${text.trim()}"`);
            await link.click();
            clicked = true;
            break;
          }
        }
      } catch {}
    }
  }

  await page.waitForTimeout(3000);
  if (!await waitForDashboard(page)) {
    console.log('⚠️ トークンページ読み込みタイムアウト');
  }
  await ss(page, 'token-page');

  // Click "Create API token"
  console.log('📋 API トークンを作成...');
  for (const sel of [
    'button:has-text("Create API token")',
    'button:has-text("API トークンを作成")',
    'a:has-text("Create API token")',
    'a:has-text("API トークンを作成")',
  ]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await el.click();
      console.log(`   ✓ ${sel}`);
      break;
    } catch { /* next */ }
  }

  await page.waitForTimeout(3000);
  await ss(page, 'token-form');

  // Fill token name
  console.log('📝 トークン名を入力...');
  const nameInputs = await page.locator('input[type="text"]:visible').all();
  for (const input of nameInputs) {
    try {
      const placeholder = await input.getAttribute('placeholder') || '';
      const val = await input.inputValue();
      console.log(`   input: placeholder="${placeholder}" value="${val}"`);
      if (!val || val.length < 3) {
        await input.fill('30sec-challenge-backend');
        console.log('   ✓ トークン名: 30sec-challenge-backend');
        break;
      }
    } catch {}
  }

  // Select permissions: Object Read & Write
  console.log('📝 権限を選択...');
  for (const sel of [
    'label:has-text("Object Read & Write")',
    'label:has-text("オブジェクトの読み取りと書き込み")',
    'input[value="object-read-write"]',
    'label:has-text("Admin Read & Write")',
  ]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      console.log(`   ✓ 権限: ${sel}`);
      break;
    } catch { /* next */ }
  }

  await page.waitForTimeout(1000);
  await ss(page, 'token-configured');

  // Click Create
  console.log('📋 トークン作成を確定...');
  for (const sel of [
    'button:has-text("Create API Token")',
    'button:has-text("Create API token")',
    'button:has-text("API トークンを作成")',
    'button[type="submit"]',
  ]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await el.click();
      console.log(`   ✓ 作成確定`);
      break;
    } catch { /* next */ }
  }

  await page.waitForTimeout(5000);
  await ss(page, 'token-result');

  // Extract credentials from the page
  console.log('\n📋 認証情報を取得中...');

  const results = {
    accountId: ACCOUNT_ID,
    s3Endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    bucket: 'video-challenge',
    accessKeyId: null,
    secretAccessKey: null,
  };

  // Try to get values from code elements, readonly inputs, etc.
  const valueSelectors = [
    'code',
    'input[readonly]',
    'input[type="text"][readonly]',
    '[data-testid]',
    '.value',
    'pre',
    'td code',
    'dd',
    'span.copy-value',
  ];

  const foundValues = [];
  for (const sel of valueSelectors) {
    const els = await page.locator(sel).all();
    for (const el of els) {
      try {
        const text = ((await el.textContent().catch(() => '')) || (await el.inputValue().catch(() => ''))).trim();
        if (text && text.length > 8 && !text.includes(' ') && !text.includes('\n')) {
          foundValues.push(text);
          console.log(`   [${sel}] value: ${text}`);
        }
      } catch {}
    }
  }

  // Also try to get from the page body with patterns
  const bodyText = await page.locator('body').textContent();

  // Look for Access Key ID pattern (typically 20+ chars alphanumeric)
  const accessKeyMatch = bodyText.match(/Access Key ID[:\s]*([a-f0-9]{20,})/i) ||
                          bodyText.match(/アクセスキー ID[:\s]*([a-f0-9]{20,})/i);
  if (accessKeyMatch) {
    results.accessKeyId = accessKeyMatch[1];
    console.log(`   ✅ Access Key ID: ${results.accessKeyId}`);
  }

  // Look for Secret Access Key
  const secretKeyMatch = bodyText.match(/Secret Access Key[:\s]*([a-f0-9]{30,})/i) ||
                          bodyText.match(/シークレットアクセスキー[:\s]*([a-f0-9]{30,})/i);
  if (secretKeyMatch) {
    results.secretAccessKey = secretKeyMatch[1];
    console.log(`   ✅ Secret Access Key: ${results.secretAccessKey}`);
  }

  // If not found by regex, try using copy buttons or label-value pairs
  if (!results.accessKeyId || !results.secretAccessKey) {
    console.log('\n   ラベル付き値を探しています...');
    const rows = await page.locator('tr, dl, .form-row, [class*="row"], [class*="field"]').all();
    for (const row of rows) {
      try {
        const text = (await row.textContent()).trim();
        if (text.includes('Access Key') || text.includes('アクセスキー')) {
          // Find value element within this row
          const valueEl = row.locator('code, input, span:not(:first-child), td:last-child, dd').first();
          const val = ((await valueEl.textContent().catch(() => '')) || (await valueEl.inputValue().catch(() => ''))).trim();
          if (val && val.length > 8) {
            if (text.includes('Secret') || text.includes('シークレット')) {
              results.secretAccessKey = val;
              console.log(`   ✅ Secret Access Key: ${val}`);
            } else {
              results.accessKeyId = val;
              console.log(`   ✅ Access Key ID: ${val}`);
            }
          }
        }
      } catch {}
    }
  }

  // Try clicking "Click to copy" or copy buttons
  if (!results.accessKeyId || !results.secretAccessKey) {
    console.log('\n   コピーボタンを探しています...');
    const copyBtns = await page.locator('button[aria-label*="copy"], button[aria-label*="コピー"], button:has-text("Copy"), button:has-text("コピー"), [class*="copy"]').all();
    console.log(`   コピーボタン数: ${copyBtns.length}`);
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
  console.log('═══════════════════════════════════════');

  // Save results
  const outPath = path.join(SCREENSHOTS_DIR, 'r2-credentials.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n結果保存: ${outPath}`);

  console.log('\n⚠️ スクリーンショットを確認して、認証情報をコピーしてください。');
  console.log('確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
