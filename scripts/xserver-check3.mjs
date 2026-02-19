// Xserver VPS: navigate to VPS management (not rental server)
// Use "サービス管理" menu to switch to VPS section
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 430;

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

  // Go directly to XServer Account top (should auto-login from previous session)
  console.log('🔗 XServerアカウントのトップページに移動...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/');
  await waitForStable(page, 3000);

  // Check if logged in
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes('ログイン') && !bodyText.includes('ログアウト') && !bodyText.includes('サービス管理')) {
    console.log('⏸️  ログインしてください...');
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(2000);
      const text = await page.locator('body').textContent().catch(() => '');
      if (text.includes('サービス管理') || text.includes('ログアウト')) {
        console.log('   ✓ ログイン完了');
        break;
      }
      if (i % 15 === 0 && i > 0) console.log(`   ... 待ち (${i * 2}秒)`);
    }
    await waitForStable(page, 2000);
  }

  await ss(page, 'account-top');

  // Click "サービス管理" to open the service menu
  console.log('\n📋 サービス管理メニューからVPSに切り替え...');
  try {
    const serviceMenu = page.locator('text="サービス管理"').first();
    await serviceMenu.waitFor({ state: 'visible', timeout: 5000 });
    await serviceMenu.click();
    console.log('   ✓ サービス管理クリック');
    await page.waitForTimeout(1000);
    await ss(page, 'service-menu');
  } catch {
    console.log('   サービス管理メニューなし、直接VPSパネルに移動');
  }

  // Look for VPS option in the dropdown/menu
  const vpsSelectors = [
    'a:has-text("Xserver VPS")',
    'a:has-text("XServer VPS")',
    'a:has-text("VPS")',
    'a[href*="xvps"]',
  ];

  let vpsFound = false;
  for (const sel of vpsSelectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 3000 });
      await el.click();
      vpsFound = true;
      console.log(`   ✓ VPS選択`);
      break;
    } catch {}
  }

  if (!vpsFound) {
    // Try navigating directly to VPS panel URL
    console.log('   直接VPS管理URLに移動...');
    await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/');
    await waitForStable(page, 3000);

    // If still no VPS, try another URL pattern
    const url = page.url();
    if (url.includes('login')) {
      await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/');
      await waitForStable(page, 3000);
    }
  }

  await waitForStable(page, 3000);
  await ss(page, 'vps-page');

  // Extract page info
  const vpsText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   ページテキスト(先頭800): ${vpsText.substring(0, 800).replace(/\s+/g, ' ')}`);

  // Extract all IPs
  const ips = vpsText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
  const validIps = [...new Set(ips)].filter(ip =>
    !ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
    !ip.startsWith('192.168.') && !ip.startsWith('10.')
  );

  // OS info
  const osMatch = vpsText.match(/(Ubuntu\s*[\d.]+|CentOS\s*[\d.]+|Debian\s*[\d.]+|Docker)/i);
  const planMatch = vpsText.match(/(2GB|4GB|8GB|16GB|32GB)/);

  console.log(`\n   IP: ${validIps.join(', ') || 'なし'}`);
  console.log(`   OS: ${osMatch ? osMatch[1] : '不明'}`);
  console.log(`   プラン: ${planMatch ? planMatch[1] : '不明'}`);

  // Look for VPS management / server details links
  const detailLinks = [
    'a:has-text("VPS管理")',
    'a:has-text("サーバー管理")',
    'button:has-text("VPS管理")',
    'a:has-text("選択する")',
    'a:has-text("ダッシュボード")',
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
      console.log(`\n   詳細ページ(先頭500): ${detailText.substring(0, 500).replace(/\s+/g, ' ')}`);

      const moreIps = detailText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
      for (const ip of [...new Set(moreIps)]) {
        if (!ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
            !ip.startsWith('192.168.') && !ip.startsWith('10.') && !validIps.includes(ip)) {
          validIps.push(ip);
        }
      }
      break;
    } catch {}
  }

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('📋 VPS 情報');
  console.log('═══════════════════════════════════════');
  console.log(`   IP: ${validIps.join(', ') || '確認できず'}`);
  console.log(`   OS: ${osMatch ? osMatch[1] : '不明'}`);
  console.log(`   プラン: ${planMatch ? planMatch[1] : '不明'}`);

  const result = { ips: validIps, os: osMatch?.[1], plan: planMatch?.[1] };
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'vps-info.json'), JSON.stringify(result, null, 2));

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
