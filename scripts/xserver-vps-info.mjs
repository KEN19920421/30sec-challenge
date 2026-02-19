// Xserver VPS: extract IP address from VPS management panel
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 440;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
}

async function waitForStable(page, ms = 3000) {
  await page.waitForTimeout(ms);
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
}

async function main() {
  const userDataDir = path.join(__dirname, '_xserver-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Step 1: Login if needed
  console.log('🔗 XServerアカウントにアクセス...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/');
  await waitForStable(page, 3000);

  let text = await page.locator('body').textContent().catch(() => '');
  if (!text.includes('サービス管理') && !text.includes('ログアウト')) {
    console.log('⏸️  ブラウザでログインしてください...');
    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(2000);
      text = await page.locator('body').textContent().catch(() => '');
      if (text.includes('サービス管理') || text.includes('ログアウト')) break;
      if (i % 15 === 0 && i > 0) console.log(`   ... 待ち (${i * 2}秒)`);
    }
  }
  console.log('   ✓ ログイン済み');

  // Step 2: Click "サービス管理" then "XServer VPS"
  console.log('\n📋 VPS管理画面に移動...');

  // Click service menu
  try {
    await page.locator('text="サービス管理"').first().click();
    await page.waitForTimeout(1500);
    await ss(page, 'service-menu');

    // Now click "XServer VPS" in the dropdown - get the href first
    const vpsLink = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        const text = link.textContent?.trim() || '';
        const href = link.getAttribute('href') || '';
        if ((text.includes('XServer VPS') || text.includes('Xserver VPS')) &&
            href && !href.includes('game')) {
          return { href, text: text.substring(0, 50) };
        }
      }
      return null;
    });

    if (vpsLink) {
      console.log(`   VPSリンク: ${vpsLink.text} → ${vpsLink.href}`);
      await page.goto(vpsLink.href.startsWith('http') ? vpsLink.href : `https://secure.xserver.ne.jp${vpsLink.href}`);
    } else {
      // Try clicking directly
      await page.locator('a:has-text("XServer VPS")').first().click();
    }
  } catch (e) {
    console.log(`   メニューエラー: ${e.message.substring(0, 80)}`);
    // Fallback: try direct URL
    await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/index');
  }

  await waitForStable(page, 4000);
  await ss(page, 'vps-dashboard');

  // Step 3: Extract VPS info from the page
  const vpsText = await page.locator('body').textContent().catch(() => '');
  const currentUrl = page.url();
  console.log(`   URL: ${currentUrl}`);
  console.log(`\n   テキスト(先頭1000): ${vpsText.substring(0, 1000).replace(/\s+/g, ' ')}`);

  // Extract IPs
  const allIps = vpsText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
  const validIps = [...new Set(allIps)].filter(ip =>
    !ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
    !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')
  );

  const osMatch = vpsText.match(/(Ubuntu\s*[\d.]+|CentOS\s*[\d.]+|Debian\s*[\d.]+|Docker)/i);
  const planMatch = vpsText.match(/(2GB|4GB|8GB|16GB|32GB|64GB)/);

  // Try to find and click on VPS server entry for more details
  const serverEntries = await page.locator('a:has-text("VPS管理"), a:has-text("選択する"), tr a, .server-list a').all();
  console.log(`\n   サーバーリンク数: ${serverEntries.length}`);

  for (const entry of serverEntries) {
    try {
      const entryText = (await entry.textContent()).trim();
      const href = await entry.getAttribute('href');
      console.log(`   [link] ${entryText.substring(0, 50)} → ${href || '(no href)'}`);
    } catch {}
  }

  // Try clicking VPS管理 button
  try {
    const vpsManage = page.locator('a:has-text("VPS管理")').first();
    await vpsManage.waitFor({ state: 'visible', timeout: 5000 });
    await vpsManage.click();
    console.log('   ✓ VPS管理クリック');
    await waitForStable(page, 3000);
    await ss(page, 'vps-manage');

    const manageText = await page.locator('body').textContent().catch(() => '');
    console.log(`\n   管理ページ(先頭500): ${manageText.substring(0, 500).replace(/\s+/g, ' ')}`);

    // Extract more IPs
    const moreIps = manageText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
    for (const ip of [...new Set(moreIps)]) {
      if (!ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
          !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.') &&
          !validIps.includes(ip)) {
        validIps.push(ip);
      }
    }
  } catch {}

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('📋 VPS 情報');
  console.log('═══════════════════════════════════════');
  console.log(`   IP: ${validIps.join(', ') || '確認できず'}`);
  console.log(`   OS: ${osMatch ? osMatch[1] : '不明'}`);
  console.log(`   プラン: ${planMatch ? planMatch[1] : '不明'}`);

  const result = { ips: validIps, os: osMatch?.[1] || null, plan: planMatch?.[1] || null };
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'vps-info.json'), JSON.stringify(result, null, 2));

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
