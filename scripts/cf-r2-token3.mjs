// Create R2 API token - go to R2 token page and click "Create Account API token"
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const ACCOUNT_ID = '0a18db13d69c9c267de70129b19d239b';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 140;

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

  // Go directly to R2 API tokens page
  console.log('🔗 R2 API Tokens ページに移動...');
  await page.goto(`https://dash.cloudflare.com/${ACCOUNT_ID}/r2/api-tokens`);
  await waitForPage(page);
  await ss(page, 'r2-tokens');

  // Click "Create Account API token" (recommended)
  console.log('📋 Create Account API token をクリック...');
  const createBtn = page.locator('button:has-text("Create Account API token")').first();
  await createBtn.waitFor({ state: 'visible', timeout: 10000 });
  await createBtn.click();
  console.log('   ✓ Create Account API token');

  await page.waitForTimeout(3000);
  await waitForPage(page);
  await ss(page, 'token-form');

  // Fill token name
  console.log('📝 トークン名を入力...');
  const nameInput = page.locator('input[type="text"]:visible').first();
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill('30sec-challenge-backend');
  console.log('   ✓ トークン名: 30sec-challenge-backend');

  // Select "Object Read & Write" permission
  console.log('📝 権限を設定...');
  // The permission dropdown might be a select or radio buttons
  const selects = await page.locator('select:visible').all();
  console.log(`   select 要素数: ${selects.length}`);
  for (const sel of selects) {
    try {
      const options = await sel.locator('option').all();
      for (const opt of options) {
        const text = await opt.textContent();
        console.log(`   option: "${text.trim()}"`);
      }
      // Select "Object Read & Write" or similar
      await sel.selectOption({ label: 'Object Read & Write' }).catch(async () => {
        await sel.selectOption({ label: 'Admin Read & Write' }).catch(() => {});
      });
      console.log('   ✓ 権限選択');
    } catch {}
  }

  // Also check for radio buttons or other permission UI
  for (const sel of [
    'label:has-text("Object Read & Write")',
    'label:has-text("Admin Read & Write")',
    '[role="radio"]:has-text("Object Read & Write")',
    '[role="radio"]:has-text("Admin Read & Write")',
  ]) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible()) {
        await el.click();
        console.log(`   ✓ ${sel}`);
        break;
      }
    } catch {}
  }

  await page.waitForTimeout(1000);
  await ss(page, 'token-configured');

  // Click Create / Save / Submit
  console.log('📋 トークン作成を確定...');
  for (const btnText of [
    'Create Account API token',
    'Create API Token',
    'Create Token',
    'Create',
    'Save',
    'Submit',
  ]) {
    try {
      // Find submit buttons (not the one in the header)
      const btns = await page.locator(`button:has-text("${btnText}")`).all();
      for (const btn of btns) {
        if (await btn.isVisible()) {
          await btn.click();
          console.log(`   ✓ "${btnText}" クリック`);
          break;
        }
      }
      break;
    } catch {}
  }

  await page.waitForTimeout(5000);
  await ss(page, 'token-result');

  // Extract credentials from the result page
  console.log('\n📋 認証情報を取得中...');

  const results = {
    accountId: ACCOUNT_ID,
    s3Endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    bucket: 'video-challenge',
    accessKeyId: null,
    secretAccessKey: null,
  };

  // Try multiple approaches to find credential values

  // 1. Look for labeled values using dt/dd or th/td patterns
  const dtElements = await page.locator('dt, th, label').all();
  for (const dt of dtElements) {
    try {
      const labelText = (await dt.textContent()).trim();
      if (labelText.includes('Access Key') || labelText.includes('Secret') || labelText.includes('Token') || labelText.includes('Value')) {
        // Get the next sibling or corresponding dd/td
        const parent = dt.locator('..');
        const valueEl = parent.locator('dd, td, code, input, span').first();
        const val = ((await valueEl.textContent().catch(() => '')) || (await valueEl.inputValue().catch(() => ''))).trim();
        if (val && val.length >= 10) {
          console.log(`   ${labelText}: ${val}`);
          if (labelText.includes('Secret')) {
            results.secretAccessKey = val;
          } else if (labelText.includes('Access Key ID') || labelText.includes('Key ID')) {
            results.accessKeyId = val;
          }
        }
      }
    } catch {}
  }

  // 2. Look for code elements or input[readonly]
  const codeEls = await page.locator('code, input[readonly], [class*="credential"], [class*="secret"], [class*="key"]').all();
  const foundVals = [];
  for (const el of codeEls) {
    try {
      const text = ((await el.textContent().catch(() => '')) || (await el.inputValue().catch(() => ''))).trim();
      if (text && text.length >= 16 && /^[a-zA-Z0-9_\-\/+=]+$/.test(text)) {
        foundVals.push(text);
      }
    } catch {}
  }

  console.log(`   コード要素の値: ${foundVals.length}個`);
  for (const v of foundVals) {
    console.log(`   → ${v.substring(0, 20)}... (${v.length}文字)`);
    if (!results.accessKeyId && v.length >= 16 && v.length <= 40) {
      results.accessKeyId = v;
    } else if (!results.secretAccessKey && v.length > 40) {
      results.secretAccessKey = v;
    }
  }

  // 3. Try clicking "Click to reveal" or show buttons
  for (const sel of [
    'button:has-text("Click to reveal")',
    'button:has-text("Reveal")',
    'button:has-text("Show")',
    'button:has-text("表示")',
  ]) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible()) {
        await btn.click();
        console.log(`   ✓ ${sel}`);
        await page.waitForTimeout(1000);
        // Re-scan for values after reveal
        const newCodeEls = await page.locator('code, input[readonly]').all();
        for (const el of newCodeEls) {
          try {
            const text = ((await el.textContent().catch(() => '')) || (await el.inputValue().catch(() => ''))).trim();
            if (text && text.length > 40 && /^[a-zA-Z0-9_\-\/+=]+$/.test(text)) {
              results.secretAccessKey = text;
              console.log(`   Secret: ${text.substring(0, 20)}...`);
            }
          } catch {}
        }
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
  console.log('═══════════════════════════════════════');

  const outPath = path.join(SCREENSHOTS_DIR, 'r2-credentials.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n結果保存: ${outPath}`);

  console.log('\n⚠️ Secret は一度しか表示されません！スクリーンショットを確認してください。');
  console.log('確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
