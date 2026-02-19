// Xserver VPS: open panel, extract IP address and server info
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 410;

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
  fs.mkdirSync(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 200,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Go to Xserver VPS panel
  console.log('🔗 Xserver VPS パネルに移動...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/');
  await waitForStable(page, 3000);
  await ss(page, 'login-page');

  // Check if already logged in or need login
  const bodyText = await page.locator('body').textContent().catch(() => '');

  if (bodyText.includes('ログイン') && !bodyText.includes('ログアウト')) {
    console.log('\n⏸️  ログインしてください（ブラウザで操作）');
    // Wait for navigation away from login page
    try {
      await page.waitForURL('**/xvps/**', { timeout: 120000 });
    } catch {
      // Also try waiting for dashboard-like content
      await page.waitForTimeout(5000);
    }
    await waitForStable(page, 3000);
  }

  await ss(page, 'panel-top');
  console.log('   ✓ パネル表示');

  // Try to find server list / VPS info
  const panelText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   ページ概要: ${panelText.substring(0, 300).replace(/\s+/g, ' ')}`);

  // Extract IP addresses from the page
  const ips = panelText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
  const uniqueIps = [...new Set(ips)].filter(ip => !ip.startsWith('0.') && !ip.startsWith('127.'));
  if (uniqueIps.length > 0) {
    console.log(`\n   検出されたIPアドレス:`);
    for (const ip of uniqueIps) {
      console.log(`   ✅ ${ip}`);
    }
  }

  // Try clicking on VPS server details
  const serverLinks = [
    'a:has-text("VPS管理")',
    'a:has-text("サーバー管理")',
    'a:has-text("VPSパネル")',
    'a:has-text("サーバー設定")',
    'a:has-text("サーバー情報")',
    'button:has-text("VPS管理")',
  ];

  for (const sel of serverLinks) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      console.log(`   ✓ ${sel} クリック`);
      await waitForStable(page, 3000);
      break;
    } catch {}
  }

  await ss(page, 'server-detail');

  // Extract more detailed info
  const detailText = await page.locator('body').textContent().catch(() => '');

  // IP addresses
  const detailIps = detailText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
  const allIps = [...new Set([...uniqueIps, ...detailIps])].filter(ip =>
    !ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.')
  );

  // OS info
  const osMatch = detailText.match(/(Ubuntu\s*[\d.]+|CentOS\s*[\d.]+|Debian\s*[\d.]+)/i);

  // Hostname
  const hostMatch = detailText.match(/([\w-]+\.xvps\.ne\.jp)/);

  console.log('\n═══════════════════════════════════════');
  console.log('📋 VPS 情報');
  console.log('═══════════════════════════════════════');
  console.log(`   IP: ${allIps.join(', ') || '不明'}`);
  console.log(`   OS: ${osMatch ? osMatch[1] : '不明'}`);
  console.log(`   ホスト: ${hostMatch ? hostMatch[1] : '不明'}`);

  // Try to navigate to server info page if available
  const infoLinks = [
    'a:has-text("サーバー情報")',
    'a:has-text("IPアドレス")',
    'a:has-text("コンソール")',
  ];

  for (const sel of infoLinks) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      console.log(`   ✓ ${sel} クリック`);
      await waitForStable(page, 3000);
      await ss(page, 'server-info');

      const infoText = await page.locator('body').textContent().catch(() => '');
      const moreIps = infoText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
      for (const ip of moreIps) {
        if (!ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') && !allIps.includes(ip)) {
          allIps.push(ip);
          console.log(`   ✅ 追加IP: ${ip}`);
        }
      }
      break;
    } catch {}
  }

  // Save results
  const result = {
    ips: allIps,
    os: osMatch ? osMatch[1] : null,
    hostname: hostMatch ? hostMatch[1] : null,
  };

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'vps-info.json'), JSON.stringify(result, null, 2));
  console.log('\n結果保存完了');

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
