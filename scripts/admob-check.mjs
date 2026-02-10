// Quick check: is AdMob account ready?
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  await page.goto('https://apps.admob.com/v2/home');
  console.log('⏳ AdMob ページ読み込み中...');

  // Wait up to 60 seconds
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    const text = await page.locator('body').textContent().catch(() => '');
    console.log(`   [${i}] URL: ${url.substring(0, 80)} text_len: ${text.length}`);

    if (text.length > 500) {
      const fp = path.join(SCREENSHOTS_DIR, `230-admob-check.png`);
      await page.screenshot({ path: fp, fullPage: true });
      console.log(`   📸 ${fp}`);
      console.log(`   ページテキスト (先頭500文字): ${text.substring(0, 500).replace(/\s+/g, ' ')}`);
      break;
    }
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
