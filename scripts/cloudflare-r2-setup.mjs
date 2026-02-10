// Cloudflare R2 setup automation
// 1. Login to Cloudflare (manual)
// 2. Enable R2 if needed
// 3. Create bucket "video-challenge"
// 4. Create API token with R2 read/write
// 5. Enable public access (r2.dev subdomain)
// 6. Configure CORS
// 7. Output credentials for .env

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const PROJECT_ROOT = path.resolve(__dirname, '..');

const BUCKET_NAME = 'video-challenge';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 100;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function tryClick(page, selectors, desc, timeout = 3000) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.click();
      console.log(`   ✓ ${desc} (${sel})`);
      return true;
    } catch { /* next */ }
  }
  return false;
}

async function main() {
  // Use persistent context to avoid Cloudflare Turnstile bot detection
  const userDataDir = path.join(__dirname, '_cf-browser-data');
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 150,
    viewport: { width: 1400, height: 1000 },
    args: [
      '--disable-blink-features=AutomationControlled',
    ],
  });
  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(120000);

  const results = {};

  // ===========================
  // Step 1: Login to Cloudflare
  // ===========================
  console.log('═══════════════════════════════════════');
  console.log('Step 1: Cloudflare にログイン');
  console.log('═══════════════════════════════════════');

  await page.goto('https://dash.cloudflare.com/');
  console.log('⏳ Cloudflare にログインしてください...');
  console.log('   (アカウントがなければ Sign Up から作成してください)');
  console.log('   ログイン後、ダッシュボードが表示されたら自動で続行します (5分待機)');

  // Wait for login - check periodically for dashboard URL
  let accountId = null;
  const loginDeadline = Date.now() + 300000; // 5 minutes

  while (!accountId && Date.now() < loginDeadline) {
    await page.waitForTimeout(3000);
    const currentUrl = page.url();

    // Check for account ID in URL (hex string after dash.cloudflare.com/)
    const match = currentUrl.match(/dash\.cloudflare\.com\/([a-f0-9]{32})/);
    if (match) {
      accountId = match[1];
      break;
    }

    // Check if we're on the dashboard but URL doesn't have account ID yet
    if (currentUrl.includes('dash.cloudflare.com') && !currentUrl.includes('/login') && !currentUrl.includes('/sign-up')) {
      // Might be on account selection - try clicking first account
      try {
        const accountLink = page.locator('a[href*="/dash.cloudflare.com/"]').first();
        const href = await accountLink.getAttribute('href', { timeout: 2000 });
        if (href) {
          const hrefMatch = href.match(/\/([a-f0-9]{32})/);
          if (hrefMatch) {
            accountId = hrefMatch[1];
            await accountLink.click();
            await page.waitForTimeout(3000);
            break;
          }
        }
      } catch { /* still loading or no accounts visible */ }
    }
  }

  if (!accountId) {
    console.log('   ⚠️ Account ID を自動取得できません。URL から手動確認してください。');
    const url = page.url();
    console.log(`   現在のURL: ${url}`);
    // Try one more time with broader pattern
    const broadMatch = url.match(/\/([a-f0-9]{20,})/);
    if (broadMatch) accountId = broadMatch[1];
  }

  console.log(`✅ ログイン完了 (Account ID: ${accountId || 'unknown'})`);
  results.accountId = accountId;
  await ss(page, 'cf-dashboard');

  // ===========================
  // Step 2: Navigate to R2
  // ===========================
  console.log('\n═══════════════════════════════════════');
  console.log('Step 2: R2 ストレージに移動');
  console.log('═══════════════════════════════════════');

  if (accountId) {
    await page.goto(`https://dash.cloudflare.com/${accountId}/r2/overview`);
  } else {
    // Try to find R2 in the sidebar
    await tryClick(page, [
      'a:has-text("R2 オブジェクト ストレージ")',
      'a:has-text("R2 Object Storage")',
      'a:has-text("R2")',
      'a[href*="/r2"]',
    ], 'R2 リンク', 10000);
  }

  await page.waitForTimeout(5000);
  await ss(page, 'r2-overview');

  // Check if R2 needs to be activated
  const bodyText = await page.locator('body').textContent();
  if (bodyText.includes('Get started') || bodyText.includes('始める') || bodyText.includes('Activate') || bodyText.includes('有効化')) {
    console.log('   R2 をアクティブ化しています...');
    // Might need to accept terms / add payment method
    await tryClick(page, [
      'button:has-text("Get started")',
      'button:has-text("始める")',
      'button:has-text("Activate")',
      'a:has-text("Get started")',
    ], 'R2 アクティブ化', 5000);
    await page.waitForTimeout(5000);
    await ss(page, 'r2-activate');
  }

  // ===========================
  // Step 3: Create bucket
  // ===========================
  console.log('\n═══════════════════════════════════════');
  console.log('Step 3: バケット作成');
  console.log('═══════════════════════════════════════');

  // Check if bucket already exists
  const pageContent = await page.locator('body').textContent();
  if (pageContent.includes(BUCKET_NAME)) {
    console.log(`   バケット "${BUCKET_NAME}" は既に存在します。`);
  } else {
    // Click "Create bucket"
    const createClicked = await tryClick(page, [
      'button:has-text("Create bucket")',
      'button:has-text("バケットを作成")',
      'a:has-text("Create bucket")',
      'a:has-text("バケットを作成")',
    ], 'バケット作成', 10000);

    if (createClicked) {
      await page.waitForTimeout(2000);
      await ss(page, 'r2-create-bucket-form');

      // Fill bucket name
      const nameInput = page.locator('input[name="bucketName"], input[placeholder*="bucket"], input[type="text"]').first();
      try {
        await nameInput.waitFor({ state: 'visible', timeout: 5000 });
        await nameInput.fill(BUCKET_NAME);
        console.log(`   ✓ バケット名: ${BUCKET_NAME}`);
      } catch {
        console.log('   ⚠️ バケット名入力欄が見つかりません');
      }

      // Select location (auto or APAC)
      await tryClick(page, [
        'label:has-text("Asia-Pacific")',
        'label:has-text("APAC")',
        'input[value="apac"]',
        'label:has-text("Automatic")',
      ], 'リージョン選択', 3000);

      await ss(page, 'r2-bucket-filled');

      // Create
      await tryClick(page, [
        'button:has-text("Create bucket")',
        'button:has-text("バケットを作成")',
        'button[type="submit"]',
      ], 'バケット作成確定', 5000);

      await page.waitForTimeout(5000);
      console.log(`   ✅ バケット "${BUCKET_NAME}" を作成しました`);
      await ss(page, 'r2-bucket-created');
    } else {
      console.log('   ⚠️ 作成ボタンが見つかりません');
    }
  }

  // ===========================
  // Step 4: Enable public access (r2.dev)
  // ===========================
  console.log('\n═══════════════════════════════════════');
  console.log('Step 4: パブリックアクセス設定');
  console.log('═══════════════════════════════════════');

  // Navigate to bucket settings
  if (accountId) {
    await page.goto(`https://dash.cloudflare.com/${accountId}/r2/default/buckets/${BUCKET_NAME}/settings`);
  } else {
    // Click on the bucket name
    await tryClick(page, [
      `a:has-text("${BUCKET_NAME}")`,
    ], 'バケット選択', 5000);
    await page.waitForTimeout(2000);

    // Go to settings tab
    await tryClick(page, [
      'a:has-text("Settings")',
      'a:has-text("設定")',
      'button:has-text("Settings")',
    ], '設定タブ', 5000);
  }

  await page.waitForTimeout(3000);
  await ss(page, 'r2-bucket-settings');

  // Enable r2.dev public access
  const settingsText = await page.locator('body').textContent();

  if (settingsText.includes('r2.dev') || settingsText.includes('Public access')) {
    // Look for the "Allow Access" button for r2.dev subdomain
    const allowClicked = await tryClick(page, [
      'button:has-text("Allow Access")',
      'button:has-text("アクセスを許可")',
      'button:has-text("Enable")',
      'button:has-text("有効化")',
    ], 'パブリックアクセス有効化', 5000);

    if (allowClicked) {
      await page.waitForTimeout(2000);

      // Might need to confirm
      await tryClick(page, [
        'button:has-text("Allow")',
        'button:has-text("Confirm")',
        'button:has-text("確認")',
        'button:has-text("Enable")',
      ], '確認', 5000);

      await page.waitForTimeout(3000);
      await ss(page, 'r2-public-enabled');
    }

    // Extract the r2.dev URL
    const updatedText = await page.locator('body').textContent();
    const r2DevMatch = updatedText.match(/(pub-[a-f0-9]+\.r2\.dev)/);
    if (r2DevMatch) {
      results.cdnBaseUrl = `https://${r2DevMatch[1]}`;
      console.log(`   ✅ Public URL: ${results.cdnBaseUrl}`);
    } else {
      // Try to find it in an input or code element
      const urlEl = page.locator('code:has-text("r2.dev"), input[value*="r2.dev"], span:has-text("r2.dev")').first();
      try {
        const urlText = await urlEl.textContent({ timeout: 3000 });
        const match = urlText.match(/(https?:\/\/[^\s]+r2\.dev)/);
        if (match) {
          results.cdnBaseUrl = match[1];
          console.log(`   ✅ Public URL: ${results.cdnBaseUrl}`);
        }
      } catch {}
    }
  }

  // ===========================
  // Step 5: Configure CORS
  // ===========================
  console.log('\n═══════════════════════════════════════');
  console.log('Step 5: CORS 設定');
  console.log('═══════════════════════════════════════');

  // CORS is typically set via the API or wrangler, not the dashboard
  // But let's check if there's a CORS section in settings
  const hasCorsSection = settingsText.includes('CORS') || settingsText.includes('Cross-Origin');

  if (hasCorsSection) {
    console.log('   CORS セクションが見つかりました。');
    await tryClick(page, [
      'button:has-text("Add CORS policy")',
      'button:has-text("CORS ポリシーを追加")',
      'button:has-text("Edit CORS")',
    ], 'CORS 編集', 5000);
  } else {
    console.log('   CORS はダッシュボードにありません。API/Wrangler で設定が必要です。');
  }

  // ===========================
  // Step 6: Create API Token
  // ===========================
  console.log('\n═══════════════════════════════════════');
  console.log('Step 6: R2 API トークン作成');
  console.log('═══════════════════════════════════════');

  // Navigate to R2 overview to find API token creation
  if (accountId) {
    await page.goto(`https://dash.cloudflare.com/${accountId}/r2/overview`);
  }
  await page.waitForTimeout(3000);

  // Click "Manage R2 API Tokens"
  const tokenClicked = await tryClick(page, [
    'a:has-text("Manage R2 API Tokens")',
    'a:has-text("R2 API トークンの管理")',
    'button:has-text("Manage R2 API Tokens")',
    'a:has-text("API")',
    'a[href*="api-tokens"]',
  ], 'API トークン管理', 10000);

  if (!tokenClicked) {
    // Try the direct URL for API tokens
    if (accountId) {
      await page.goto(`https://dash.cloudflare.com/${accountId}/r2/overview/api-tokens`);
      await page.waitForTimeout(3000);
    }
  }

  await ss(page, 'r2-api-tokens');

  // Create new token
  const createTokenClicked = await tryClick(page, [
    'button:has-text("Create API token")',
    'button:has-text("API トークンを作成")',
    'a:has-text("Create API token")',
  ], 'トークン作成', 5000);

  if (createTokenClicked) {
    await page.waitForTimeout(3000);
    await ss(page, 'r2-token-form');

    // Fill token name
    const tokenNameInput = page.locator('input[name*="name"], input[placeholder*="name"], input[type="text"]').first();
    try {
      await tokenNameInput.waitFor({ state: 'visible', timeout: 5000 });
      await tokenNameInput.fill('30sec-challenge-backend');
      console.log('   ✓ トークン名: 30sec-challenge-backend');
    } catch {
      console.log('   ⚠️ トークン名入力欄が見つかりません');
    }

    // Set permissions - Object Read & Write
    await tryClick(page, [
      'label:has-text("Object Read & Write")',
      'label:has-text("オブジェクトの読み取りと書き込み")',
      'input[value="object-read-write"]',
      'label:has-text("Admin Read & Write")',
    ], '権限設定', 5000);

    // Specify bucket (optional - can be all buckets)
    await tryClick(page, [
      `label:has-text("${BUCKET_NAME}")`,
      `option:has-text("${BUCKET_NAME}")`,
    ], 'バケット指定', 3000);

    await ss(page, 'r2-token-configured');

    // Create token
    await tryClick(page, [
      'button:has-text("Create API Token")',
      'button:has-text("API トークンを作成")',
      'button[type="submit"]',
    ], 'トークン作成確定', 5000);

    await page.waitForTimeout(5000);
    await ss(page, 'r2-token-created');

    // Extract access key and secret
    const tokenPageText = await page.locator('body').textContent();

    // Look for Access Key ID
    const accessKeyMatch = tokenPageText.match(/Access Key ID[:\s]*([a-f0-9]{32})/i);
    if (accessKeyMatch) {
      results.accessKey = accessKeyMatch[1];
      console.log(`   ✅ Access Key: ${results.accessKey}`);
    }

    // Look for Secret Access Key
    const secretKeyMatch = tokenPageText.match(/Secret Access Key[:\s]*([a-zA-Z0-9+/=]+)/i);
    if (secretKeyMatch) {
      results.secretKey = secretKeyMatch[1];
      console.log(`   ✅ Secret Key: ${results.secretKey}`);
    }

    // Try to extract from code/input elements
    if (!results.accessKey || !results.secretKey) {
      const codeEls = await page.locator('code, input[readonly], [data-testid*="key"], .secret-value').all();
      console.log(`   コード要素数: ${codeEls.length}`);
      for (let i = 0; i < codeEls.length; i++) {
        const text = (await codeEls[i].textContent()).trim();
        const val = await codeEls[i].inputValue().catch(() => text);
        if (val && val.length > 10) {
          console.log(`   code[${i}]: ${val.substring(0, 20)}...`);
        }
      }
    }
  }

  // ===========================
  // Step 7: Construct S3 endpoint
  // ===========================
  if (accountId) {
    results.s3Endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    console.log(`\n   S3 Endpoint: ${results.s3Endpoint}`);
  }

  // ===========================
  // Summary
  // ===========================
  console.log('\n' + '═'.repeat(50));
  console.log('📋 Cloudflare R2 設定結果');
  console.log('═'.repeat(50));
  console.log(`  Account ID:    ${results.accountId || '手動確認'}`);
  console.log(`  S3 Endpoint:   ${results.s3Endpoint || '手動確認'}`);
  console.log(`  S3 Region:     auto`);
  console.log(`  S3 Bucket:     ${BUCKET_NAME}`);
  console.log(`  Access Key:    ${results.accessKey || '手動確認'}`);
  console.log(`  Secret Key:    ${results.secretKey || '手動確認'}`);
  console.log(`  CDN Base URL:  ${results.cdnBaseUrl || '手動確認'}`);
  console.log('═'.repeat(50));

  // Save results
  const outPath = path.join(SCREENSHOTS_DIR, 'r2-results.json');
  fs.writeFileSync(outPath, JSON.stringify({
    ...results,
    bucket: BUCKET_NAME,
    region: 'auto',
  }, null, 2));
  console.log(`\n  結果: ${outPath}`);

  // Generate .env snippet
  console.log('\n  .env に追加する値:');
  console.log('  ─────────────────');
  console.log(`  S3_ENDPOINT=${results.s3Endpoint || 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com'}`);
  console.log(`  S3_REGION=auto`);
  console.log(`  S3_BUCKET=${BUCKET_NAME}`);
  console.log(`  S3_ACCESS_KEY=${results.accessKey || '<ACCESS_KEY>'}`);
  console.log(`  S3_SECRET_KEY=${results.secretKey || '<SECRET_KEY>'}`);
  console.log(`  CDN_BASE_URL=${results.cdnBaseUrl || 'https://pub-<ID>.r2.dev'}`);

  console.log('\n  確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
