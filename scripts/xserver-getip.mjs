// Xserver VPS: get IP by navigating to server detail page
// Known: VPS ID 40148227, need to click "選択する" then find IP
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 450;

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

  // Go to VPS server detail directly
  console.log('🔗 VPSサーバー詳細に移動...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/server/detail?id=40148227');
  await waitForStable(page, 3000);

  let text = await page.locator('body').textContent().catch(() => '');
  // Check if need login
  if (text.includes('ログイン') && !text.includes('サーバー')) {
    console.log('⏸️  ログインしてください...');
    for (let i = 0; i < 90; i++) {
      await page.waitForTimeout(2000);
      text = await page.locator('body').textContent().catch(() => '');
      if (text.includes('サーバー') || text.includes('IPアドレス') || text.includes('VPS')) break;
      if (i % 15 === 0 && i > 0) console.log(`   ... 待ち (${i * 2}秒)`);
    }
  }

  await ss(page, 'server-detail');

  // Extract info
  text = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   テキスト(先頭1500):\n${text.substring(0, 1500).replace(/\s+/g, ' ')}`);

  // IPs
  const allIps = text.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
  const validIps = [...new Set(allIps)].filter(ip =>
    !ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
    !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')
  );

  if (validIps.length === 0) {
    // Try VPS management page (the actual VPS panel with IP)
    console.log('\n   詳細ページにIPなし。VPSパネルに移動...');
    await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/jumpvps/?id_vps=40148227');
    await waitForStable(page, 5000);
    await ss(page, 'vps-panel');

    const panelUrl = page.url();
    console.log(`   VPSパネルURL: ${panelUrl}`);

    const panelText = await page.locator('body').textContent().catch(() => '');
    console.log(`\n   パネルテキスト(先頭1500):\n${panelText.substring(0, 1500).replace(/\s+/g, ' ')}`);

    const panelIps = panelText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
    for (const ip of [...new Set(panelIps)]) {
      if (!ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
          !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.') &&
          !validIps.includes(ip)) {
        validIps.push(ip);
      }
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('📋 VPS 情報');
  console.log('═══════════════════════════════════════');
  console.log(`   IP: ${validIps.join(', ') || '確認できず'}`);

  const result = { ips: validIps };
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'vps-info.json'), JSON.stringify(result, null, 2));

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
