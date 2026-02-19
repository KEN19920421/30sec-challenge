// Open Xserver Domain search page for 30sec-challenge.com (v5 - just open browser)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 740;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${step}-${name}.png`);
}

async function main() {
  const userDataDir = path.join(__dirname, '_xserver-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 300,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(30000);

  console.log('🔍 Xserver Domain 検索ページを開きます...');
  await page.goto('https://www.xdomain.ne.jp/search/domain.php');
  await page.waitForTimeout(3000);

  // Fill domain name and submit
  console.log('📝 30sec-challenge を入力して検索...');
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[name="domainname"]');
    inputs.forEach(inp => {
      inp.value = '30sec-challenge';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
      const inp = form.querySelector('input[name="domainname"]');
      if (inp && inp.value === '30sec-challenge') {
        form.submit();
        return;
      }
    }
  });

  await page.waitForTimeout(5000);
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
  await ss(page, '01-results');
  console.log('✅ 検索結果が表示されました。ブラウザで操作してください。');

  console.log('\n⏸️  完了したら Enter を押してください。');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, '02-final');
  const finalText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n最終ページ(先頭500): ${finalText.substring(0, 500).replace(/\s+/g, ' ')}`);

  await context.close();
  console.log('✅ 完了');
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
