// Xserver VPS: login first, then navigate to VPS panel to get IP
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 460;

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${fp}`);
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

  // Step 1: Go to XServer Account login
  console.log('🔗 XServerアカウントにログイン...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xserver/');
  await page.waitForTimeout(2000);

  // Wait for login
  console.log('⏸️  ブラウザでログインしてください...');
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    const text = await page.locator('body').textContent().catch(() => '');
    if (text.includes('ログアウト') || text.includes('サービス管理') || url.includes('/index')) {
      console.log('   ✓ ログイン完了');
      break;
    }
    if (i % 15 === 0 && i > 0) console.log(`   ... 待ち (${i * 2}秒)`);
  }

  await page.waitForTimeout(2000);

  // Step 2: Navigate to VPS dashboard
  console.log('\n📋 VPSダッシュボードに移動...');

  // Use service menu
  try {
    await page.locator('text="サービス管理"').first().click();
    await page.waitForTimeout(1500);

    // Get the VPS link href
    const href = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const l of links) {
        const t = l.textContent?.trim() || '';
        const h = l.getAttribute('href') || '';
        if (t.startsWith('XServer VPS') && !h.includes('game')) return h;
        if (t.startsWith('Xserver VPS') && !h.includes('game')) return h;
      }
      return null;
    });

    if (href) {
      const fullUrl = href.startsWith('http') ? href : `https://secure.xserver.ne.jp${href}`;
      console.log(`   VPSリンク: ${fullUrl}`);
      await page.goto(fullUrl);
    }
  } catch {
    await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/index');
  }

  await page.waitForTimeout(3000);
  await ss(page, 'vps-dashboard');

  // Step 3: Click "VPS管理" button on server row to enter VPS panel
  console.log('\n📋 VPS管理パネルに入る...');

  // Try clicking the VPS管理 button (blue button on the right of server row)
  try {
    // Direct navigation to VPS panel via jumpvps
    await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/jumpvps/?id_vps=40148227');
    await page.waitForTimeout(5000);
    try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch {}
    await ss(page, 'vps-panel');

    const panelUrl = page.url();
    console.log(`   URL: ${panelUrl}`);

    // This should redirect to the actual VPS panel (different domain possibly)
    const text = await page.locator('body').textContent().catch(() => '');
    console.log(`\n   テキスト(先頭2000):\n${text.substring(0, 2000).replace(/\s+/g, ' ')}`);

    // Extract IPs
    const allIps = text.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
    const validIps = [...new Set(allIps)].filter(ip =>
      !ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
      !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')
    );

    if (validIps.length > 0) {
      console.log(`\n   ✅ IP: ${validIps.join(', ')}`);
    } else {
      // Try contract detail page
      console.log('\n   IPなし。契約詳細ページを確認...');
      await page.goto('https://secure.xserver.ne.jp/xapanel/xvps/server/detail?id=40148227');
      await page.waitForTimeout(3000);
      await ss(page, 'contract-detail');

      const detailText = await page.locator('body').textContent().catch(() => '');
      console.log(`\n   詳細テキスト(先頭2000):\n${detailText.substring(0, 2000).replace(/\s+/g, ' ')}`);

      const detailIps = detailText.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g) || [];
      for (const ip of [...new Set(detailIps)]) {
        if (!ip.startsWith('0.') && !ip.startsWith('127.') && !ip.startsWith('255.') &&
            !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')) {
          validIps.push(ip);
        }
      }

      if (validIps.length > 0) {
        console.log(`\n   ✅ IP: ${validIps.join(', ')}`);
      }
    }

    // Save results
    console.log('\n═══════════════════════════════════════');
    console.log('📋 VPS 情報');
    console.log('═══════════════════════════════════════');
    console.log(`   IP: ${validIps.join(', ') || '確認できず - VPSパネルで直接確認してください'}`);

    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'vps-info.json'), JSON.stringify({ ips: validIps }, null, 2));
  } catch (e) {
    console.log(`   エラー: ${e.message.substring(0, 200)}`);
  }

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
