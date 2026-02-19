// Xserver VPS signup + domain acquisition assistant
// Semi-automated: navigates and selects options, pauses for manual input (personal info, payment)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 400;

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

function waitForEnter(prompt) {
  console.log(`\n⏸️  ${prompt}`);
  console.log('   完了したら Enter を押してください...');
  process.stdin.resume();
  return new Promise(r => process.stdin.once('data', r));
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
  page.setDefaultTimeout(300000); // 5 min timeout for manual steps

  // ============================================
  // Phase 1: Xserver VPS 申し込み
  // ============================================
  console.log('\n═══════════════════════════════════════');
  console.log('📋 Phase 1: Xserver VPS 申し込み');
  console.log('═══════════════════════════════════════');

  await page.goto('https://vps.xserver.ne.jp/');
  await waitForStable(page, 3000);
  await ss(page, 'xserver-top');

  console.log('\n📋 VPS プラン推奨:');
  console.log('   2GB (月額830円~) — 小規模で十分、後でスケールアップ可能');
  console.log('   4GB (月額1,700円~) — 余裕あり');
  console.log('   OS: Ubuntu 22.04 (Docker対応)');

  // Try to find and click "お申し込み" button
  const applyBtns = [
    'a:has-text("お申し込み")',
    'button:has-text("お申し込み")',
    'a:has-text("申し込む")',
    'a:has-text("今すぐ申し込む")',
    'a:has-text("まずはお試し")',
  ];

  let applied = false;
  for (const sel of applyBtns) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await el.click();
      applied = true;
      console.log('   ✓ 申し込みページへ移動');
      break;
    } catch {}
  }

  await waitForStable(page, 3000);
  await ss(page, 'xserver-apply');

  // Check if we need to create an Xserver account first
  const bodyText = await page.locator('body').textContent().catch(() => '');

  if (bodyText.includes('Xserverアカウント') || bodyText.includes('新規お申込み') || bodyText.includes('初めてご利用')) {
    console.log('\n📋 Xserverアカウント作成が必要です。');
    await waitForEnter('Xserverアカウントを作成してください（メール認証まで完了）');
    await ss(page, 'after-account');
  }

  await waitForStable(page, 3000);
  await ss(page, 'xserver-plan-select');

  // Try to find plan selection
  const currentText = await page.locator('body').textContent().catch(() => '');
  console.log(`\n   ページ状態: ${currentText.substring(0, 200).replace(/\s+/g, ' ')}`);

  // Wait for user to select plan and OS
  await waitForEnter('VPSプラン（2GBまたは4GB推奨）とOS（Ubuntu 22.04）を選択してください');
  await ss(page, 'plan-selected');

  // Wait for user to enter personal info
  await waitForEnter('個人情報と支払い方法を入力してください');
  await ss(page, 'info-entered');

  // Wait for user to confirm and complete
  await waitForEnter('申し込みを確定してください');
  await ss(page, 'vps-confirmed');

  // Get VPS info
  console.log('\n📋 VPS情報を確認中...');
  await waitForStable(page, 3000);
  const vpsText = await page.locator('body').textContent().catch(() => '');

  // Try to extract IP address
  const ipMatch = vpsText.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  if (ipMatch) {
    console.log(`   ✅ IPアドレス: ${ipMatch[1]}`);
  }

  await ss(page, 'vps-info');

  // ============================================
  // Phase 2: ドメイン取得
  // ============================================
  console.log('\n═══════════════════════════════════════');
  console.log('📋 Phase 2: ドメイン取得');
  console.log('═══════════════════════════════════════');
  console.log('   推奨: .com or .app ドメイン');
  console.log('   例: 30sec-challenge.com, 30sec.app');

  // Navigate to Xserver Domain or check if domain is included with VPS
  await page.goto('https://www.xdomain.ne.jp/');
  await waitForStable(page, 3000);
  await ss(page, 'domain-top');

  await waitForEnter('ドメインを検索・選択して取得してください');
  await ss(page, 'domain-selected');

  await waitForEnter('ドメイン取得完了');
  await ss(page, 'domain-confirmed');

  // ============================================
  // Phase 3: DNS設定
  // ============================================
  console.log('\n═══════════════════════════════════════');
  console.log('📋 Phase 3: DNS設定');
  console.log('═══════════════════════════════════════');
  console.log('   取得したドメインのAレコードをVPSのIPアドレスに向けてください');
  console.log('   サブドメインも設定する場合:');
  console.log('   - api.yourdomain.com → VPS IP (バックエンド用)');
  console.log('   - cdn.yourdomain.com → R2カスタムドメイン or VPS IP (CDN用)');

  await waitForEnter('DNS設定完了（反映には最大48時間かかる場合があります）');
  await ss(page, 'dns-done');

  // ============================================
  // Summary
  // ============================================
  console.log('\n═══════════════════════════════════════');
  console.log('📋 設定情報を入力してください');
  console.log('═══════════════════════════════════════');

  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(r => rl.question(q, r));

  const vpsIp = await ask('VPS IPアドレス: ');
  const domain = await ask('取得したドメイン: ');
  const sshUser = await ask('SSHユーザー名 (default: root): ') || 'root';
  const sshPort = await ask('SSHポート (default: 22): ') || '22';

  const config = {
    vps: { ip: vpsIp, sshUser, sshPort },
    domain: domain,
    apiUrl: `https://api.${domain}`,
    cdnUrl: `https://cdn.${domain}`,
    appUrl: `https://${domain}`,
  };

  console.log('\n═══════════════════════════════════════');
  console.log('📋 設定結果');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(config, null, 2));

  const configPath = path.join(SCREENSHOTS_DIR, 'vps-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n保存先: ${configPath}`);

  console.log('\n次のステップ:');
  console.log('1. VPSにSSH接続してDockerをインストール');
  console.log('2. Let\'s EncryptでSSL証明書を取得');
  console.log('3. docker-compose.prod.ymlでデプロイ');
  console.log('4. .env.productionのドメイン関連値を更新');

  rl.close();
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
