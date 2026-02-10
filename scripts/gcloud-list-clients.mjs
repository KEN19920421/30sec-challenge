// Get full OAuth client IDs by clicking into each client's detail page

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
const PROJECT_ID = 'sec-challenge-34060';
const GCP = 'https://console.cloud.google.com';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 60;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  console.log('🔗 Google Auth Platform クライアント一覧...');
  await page.goto(`${GCP}/auth/clients?project=${PROJECT_ID}`);

  console.log('⏳ ログインしてください...');
  await page.waitForFunction(
    () => window.location.hostname.includes('console.cloud.google.com'),
    { timeout: 300000 }
  );
  await page.waitForTimeout(8000);

  // Dismiss popups
  try { await page.locator('button:has-text("OK")').first().click({ timeout: 2000 }); } catch {}

  console.log('✅ クライアント一覧ページ');
  await ss(page, 'clients-list');

  const results = {};

  // Click each client name link to get full details
  const clientNames = ['30sec Challenge Web', '30sec Challenge iOS'];

  for (const name of clientNames) {
    console.log(`\n📋 ${name} の詳細を取得中...`);

    // Navigate to the clients list each time
    await page.goto(`${GCP}/auth/clients?project=${PROJECT_ID}`);
    await page.waitForTimeout(3000);

    // Click on the client name link
    const link = page.locator(`a:has-text("${name}")`).first();
    try {
      await link.waitFor({ state: 'visible', timeout: 5000 });
      await link.click();
      await page.waitForTimeout(4000);
      await ss(page, `detail-${name.includes('Web') ? 'web' : 'ios'}`);

      // Extract Client ID from the detail page
      // Look for elements that contain the client ID
      const bodyText = await page.locator('body').textContent();

      // Find the full client ID (starts with project number)
      const idMatches = [...bodyText.matchAll(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/g)];
      const ids = [...new Set(idMatches.map(m => m[1]))];

      if (ids.length > 0) {
        console.log(`   Client ID: ${ids[0]}`);
        const type = name.includes('Web') ? 'web' : 'ios';
        results[type] = { name, clientId: ids[0] };

        // For web, also try to find the secret
        if (type === 'web') {
          const secretMatch = bodyText.match(/GOCSPX-[a-zA-Z0-9_-]+/);
          if (secretMatch) {
            results[type].clientSecret = secretMatch[0];
            console.log(`   Client Secret: ${secretMatch[0]}`);
          }
        }
      } else {
        console.log('   Client ID が見つかりません');
        // Try with broader regex
        const broadMatch = [...bodyText.matchAll(/(\d{12}-[a-z0-9]+\.apps\.googleusercontent\.com)/g)];
        for (const m of broadMatch) {
          console.log(`   (broader match): ${m[1]}`);
        }
      }
    } catch (e) {
      console.log(`   エラー: ${e.message}`);
    }
  }

  // Also check the old credentials page for any Android client
  console.log('\n📋 旧 Credentials ページでの Android クライアント確認...');
  await page.goto(`${GCP}/apis/credentials?project=${PROJECT_ID}`);
  await page.waitForTimeout(5000);
  await ss(page, 'old-credentials');

  const credText = await page.locator('body').textContent();
  const androidMatches = [...credText.matchAll(/(312153915766-[a-z0-9]+\.apps\.googleusercontent\.com)/g)];
  const allIds = [...new Set(androidMatches.map(m => m[1]))];
  console.log(`   Credentials ページの Client ID (${allIds.length}個):`);
  for (const id of allIds) {
    console.log(`   ${id}`);
  }

  // Save results
  const outPath = path.join(SCREENSHOTS_DIR, 'oauth-clients-final.json');
  fs.writeFileSync(outPath, JSON.stringify({ projectId: PROJECT_ID, ...results, allFoundIds: allIds }, null, 2));
  console.log(`\n📁 結果保存: ${outPath}`);

  console.log('\n═══════════════════════════════════════');
  console.log('📋 OAuth クライアント情報');
  console.log('═══════════════════════════════════════');
  for (const [type, info] of Object.entries(results)) {
    console.log(`  ${type}: ${info.clientId}`);
    if (info.clientSecret) console.log(`  ${type} secret: ${info.clientSecret}`);
  }
  console.log('═══════════════════════════════════════');

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await browser.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
