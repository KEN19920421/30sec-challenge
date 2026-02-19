// Configure DNS A record for 30sec-challenge.com → 210.131.218.20
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 750;

const DOMAIN = '30sec-challenge.com';
const VPS_IP = '210.131.218.20';

async function ss(page, name) {
  step++;
  const fp = path.join(SCREENSHOTS_DIR, `${step}-${name}.png`);
  await page.screenshot({ path: fp, fullPage: true });
  console.log(`   📸 ${step}-${name}.png`);
}

async function waitForStable(page, ms = 3000) {
  await page.waitForTimeout(ms);
  try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
}

async function main() {
  const userDataDir = path.join(__dirname, '_xserver-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 400,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(300000);

  // Login to Xserver Account
  console.log('🔗 XServerにログイン...');
  await page.goto('https://secure.xserver.ne.jp/xapanel/login/xvps/');
  await page.waitForTimeout(2000);
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes('ログインする') && !bodyText.includes('ログアウト')) {
    console.log('⏸️  ブラウザでログインしてください...');
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(2000);
      const t = await page.locator('body').textContent().catch(() => '');
      if (t.includes('ログアウト') || t.includes('VPS管理') || t.includes('サービス管理')) break;
    }
  }
  console.log('✅ ログイン済み');
  await waitForStable(page, 2000);

  // Navigate to VPS panel
  console.log('\n📋 VPSパネルへ移動...');
  try {
    await page.locator('a:has-text("VPS管理")').first().click();
    await waitForStable(page, 3000);
  } catch {}
  try {
    await page.locator('a:has-text("選択する")').first().click();
    await waitForStable(page, 5000);
  } catch {}

  await ss(page, '01-vps-panel');
  const vpsPanelUrl = page.url();
  console.log(`   URL: ${vpsPanelUrl}`);

  // Look for DNS settings
  console.log('\n🔍 DNS設定を探す...');
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim().substring(0, 60),
      href: a.getAttribute('href'),
    })).filter(l => l.text && l.href);
  });

  const dnsLink = links.find(l =>
    l.text.includes('DNS') || l.text.includes('dns') || l.text.includes('ネームサーバー')
  );

  if (dnsLink) {
    console.log(`   DNS設定リンク: ${dnsLink.text} → ${dnsLink.href}`);
    const href = dnsLink.href.startsWith('http') ? dnsLink.href : new URL(dnsLink.href, vpsPanelUrl).href;
    await page.goto(href);
  } else {
    console.log('   DNS設定リンクが見つかりません。リンク一覧:');
    links.forEach(l => console.log(`     ${l.text} → ${l.href}`));

    // Try navigating to DNS settings directly
    const baseUrl = vpsPanelUrl.replace(/\/xvps\/.*/, '/xvps/');
    const dnsUrls = [
      `${baseUrl}dns/`,
      `${baseUrl}dns/setting/`,
      `${baseUrl}vps/dns/`,
      `${baseUrl}vps/setting/dns/`,
    ];
    console.log('\n   直接URLを試行...');
    for (const url of dnsUrls) {
      console.log(`   → ${url}`);
      await page.goto(url);
      await page.waitForTimeout(2000);
      const t = await page.locator('body').textContent().catch(() => '');
      if (t.includes('DNS') && !t.includes('ログイン')) {
        console.log('   ✓ DNS設定ページ発見！');
        break;
      }
    }
  }

  await waitForStable(page, 3000);
  await ss(page, '02-dns-page');

  const pageText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   ページ内容(先頭500): ${pageText.substring(0, 500).replace(/\s+/g, ' ')}`);

  // Look for "ドメイン追加" or domain input
  console.log('\n📝 ドメイン追加...');
  const addDomainLink = await page.evaluate(() => {
    for (const el of document.querySelectorAll('a, button')) {
      const t = el.textContent?.trim() || '';
      if (t.includes('ドメイン追加') || t.includes('ドメインを追加') || t.includes('追加する')) {
        el.click();
        return t;
      }
    }
    return null;
  });

  if (addDomainLink) {
    console.log(`   ✓ クリック: ${addDomainLink}`);
    await waitForStable(page, 3000);
    await ss(page, '03-add-domain');
  }

  console.log('\n⏸️  ブラウザでDNS設定を行ってください。');
  console.log(`   ドメイン: ${DOMAIN}`);
  console.log(`   レコードタイプ: A`);
  console.log(`   ホスト名: @ (空欄)`);
  console.log(`   IP: ${VPS_IP}`);
  console.log('   完了したら Enter を押してください。');

  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));

  await ss(page, '04-final');
  console.log('\n✅ 完了');
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
