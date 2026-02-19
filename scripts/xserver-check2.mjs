// Xserver VPS: login via XServer Account, extract VPS IP and info
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 420;

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

  // Go to XServer Account login (not VPS panel)
  console.log('🔗 XServerアカウントにログイン...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xserver/');
  await waitForStable(page, 3000);
  await ss(page, 'xserver-login');

  console.log('⏸️  ブラウザでXServerアカウントにログインしてください...');

  // Wait for login to complete - detect dashboard
  let loggedIn = false;
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    const text = await page.locator('body').textContent().catch(() => '');

    if (url.includes('xapanel/xserver/index') || url.includes('xapanel/xvps') ||
        text.includes('ログアウト') || text.includes('ご契約') ||
        text.includes('VPS') || text.includes('サーバー管理')) {
      loggedIn = true;
      console.log('   ✓ ログイン検出');
      break;
    }

    if (i % 15 === 0 && i > 0) {
      console.log(`   ... ログイン待ち (${i * 2}秒)`);
    }
  }

  if (!loggedIn) {
    console.log('   ⚠️ ログインタイムアウト');
    await ss(page, 'login-timeout');
    await context.close();
    return;
  }

  await waitForStable(page, 3000);
  await ss(page, 'dashboard');

  // Navigate to VPS management
  const url = page.url();
  console.log(`   URL: ${url}`);

  // Try to find VPS section
  const vpsLinks = [
    'a:has-text("VPS管理")',
    'a:has-text("VPS")',
    'a:has-text("サーバー管理")',
    'a[href*="xvps"]',
  ];

  for (const sel of vpsLinks) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await el.click();
      console.log(`   ✓ ${sel} クリック`);
      await waitForStable(page, 3000);
      break;
    } catch {}
  }

  await ss(page, 'vps-section');

  // Extract all page text and look for IP, server info
  const bodyText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   ページテキスト(先頭500): ${bodyText.substring(0, 500).replace(/\s+/g, ' ')}`);

  // Extract IP addresses
  const ips = bodyText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
  const uniqueIps = [...new Set(ips)].filter(ip =>
    !ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') && !ip.startsWith('192.168.')
  );

  console.log(`\n   検出されたIP: ${uniqueIps.join(', ') || 'なし'}`);

  // Extract OS info
  const osMatch = bodyText.match(/(Ubuntu\s*[\d.]+|CentOS\s*[\d.]+|Debian\s*[\d.]+)/i);
  console.log(`   OS: ${osMatch ? osMatch[1] : '不明'}`);

  // Look for plan info
  const planMatch = bodyText.match(/(2GB|4GB|8GB|16GB|32GB|64GB)/);
  console.log(`   プラン: ${planMatch ? planMatch[1] : '不明'}`);

  // Try to click on VPS details or server info
  const detailLinks = [
    'a:has-text("サーバー情報")',
    'a:has-text("詳細")',
    'a:has-text("VPSパネル")',
    'button:has-text("サーバー情報")',
  ];

  for (const sel of detailLinks) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      console.log(`   ✓ ${sel} クリック`);
      await waitForStable(page, 3000);
      await ss(page, 'vps-detail');

      const detailText = await page.locator('body').textContent().catch(() => '');
      const moreIps = detailText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
      const newIps = [...new Set(moreIps)].filter(ip =>
        !ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
        !ip.startsWith('192.168.') && !uniqueIps.includes(ip)
      );
      for (const ip of newIps) {
        uniqueIps.push(ip);
        console.log(`   ✅ 追加IP: ${ip}`);
      }
      break;
    } catch {}
  }

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('📋 VPS 情報');
  console.log('═══════════════════════════════════════');
  console.log(`   IP: ${uniqueIps.join(', ') || '不明 - ダッシュボードで確認してください'}`);
  console.log(`   OS: ${osMatch ? osMatch[1] : '不明'}`);
  console.log(`   プラン: ${planMatch ? planMatch[1] : '不明'}`);

  // Save
  const result = { ips: uniqueIps, os: osMatch?.[1], plan: planMatch?.[1] };
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'vps-info.json'), JSON.stringify(result, null, 2));

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
