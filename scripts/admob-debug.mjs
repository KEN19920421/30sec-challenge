// Debug: inspect the "アプリを登録して利用を開始" button's HTML structure
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled', '--disable-popup-blocking'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(60000);

  await page.goto('https://apps.admob.com/v2/apps/list');
  await page.waitForTimeout(5000);

  // Find the register button by its text and dump HTML
  const elements = await page.evaluate(() => {
    const results = [];
    // Find all elements containing the target text
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    while (walker.nextNode()) {
      const el = walker.currentNode;
      const text = el.textContent?.trim() || '';
      if (text === 'アプリを登録して利用を開始' || text === 'Add your first app') {
        results.push({
          tag: el.tagName.toLowerCase(),
          className: el.className,
          id: el.id,
          role: el.getAttribute('role'),
          href: el.getAttribute('href'),
          outerHTML: el.outerHTML.substring(0, 500),
          parentTag: el.parentElement?.tagName.toLowerCase(),
          parentClass: el.parentElement?.className,
          isVisible: el.offsetParent !== null,
        });
      }
    }

    // Also check all <a> and <button> tags
    const clickables = document.querySelectorAll('a, button, [role="button"], mat-button, [mat-button], [mat-raised-button], [mat-flat-button]');
    for (const el of clickables) {
      const text = el.textContent?.trim() || '';
      if (text.includes('登録') || text.includes('利用を開始') || text.includes('first app') || text.includes('Add app')) {
        results.push({
          tag: el.tagName.toLowerCase(),
          className: el.className,
          id: el.id,
          role: el.getAttribute('role'),
          href: el.getAttribute('href'),
          type: el.getAttribute('type'),
          outerHTML: el.outerHTML.substring(0, 500),
          textContent: text.substring(0, 100),
          isVisible: el.offsetParent !== null,
          mat: el.getAttribute('mat-button') !== null || el.getAttribute('mat-raised-button') !== null,
        });
      }
    }
    return results;
  });

  console.log('=== Found elements ===');
  for (const el of elements) {
    console.log(JSON.stringify(el, null, 2));
    console.log('---');
  }

  // Try using getByText
  try {
    const byText = page.getByText('アプリを登録して利用を開始');
    const count = await byText.count();
    console.log(`\ngetByText count: ${count}`);
    if (count > 0) {
      const tagName = await byText.first().evaluate(el => el.tagName);
      console.log(`getByText tag: ${tagName}`);
    }
  } catch (e) {
    console.log(`getByText error: ${e.message}`);
  }

  // Try getByRole
  try {
    const byRole = page.getByRole('link', { name: /登録/ });
    const count = await byRole.count();
    console.log(`\ngetByRole('link') count: ${count}`);
  } catch (e) {
    console.log(`getByRole error: ${e.message}`);
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
