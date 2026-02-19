// AdMob: create ad units for already-registered apps (v5)
// Apps are already registered - just need App IDs + ad units
// AdMob uses Angular <material-button>, not <button>
// Ad type cards have "選択" links at bottom of each card
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '_screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
let step = 320;

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

async function clickEl(page, selectors, desc, timeout = 5000) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.click();
      console.log(`   ✓ ${desc}`);
      return true;
    } catch {}
  }
  return false;
}

async function getAppIds(page) {
  console.log('\n═══ App ID 取得 ═══');

  await page.goto('https://apps.admob.com/v2/apps/list');
  await waitForStable(page, 4000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await ss(page, 'app-list');

  // Extract app info from the list page
  const apps = await page.evaluate(() => {
    const results = [];
    // Find all app rows/cards on the page
    const rows = document.querySelectorAll('tr, [role="row"], .app-row, a[href*="/apps/"]');
    for (const row of rows) {
      const text = row.textContent || '';
      const href = row.getAttribute('href') || '';
      if (text.includes('30sec Challenge') || href.includes('/apps/')) {
        results.push({
          text: text.substring(0, 200).replace(/\s+/g, ' ').trim(),
          href: href,
          tag: row.tagName.toLowerCase(),
        });
      }
    }

    // Also look for app IDs in all links
    const links = document.querySelectorAll('a[href*="/apps/"]');
    for (const link of links) {
      results.push({
        text: (link.textContent || '').substring(0, 100).replace(/\s+/g, ' ').trim(),
        href: link.getAttribute('href') || '',
        tag: 'a',
      });
    }

    return results;
  });

  console.log(`   アプリ数: ${apps.length}`);
  for (const app of apps) {
    console.log(`   [${app.tag}] ${app.text} → ${app.href}`);
  }

  // Click on each app to get its App ID from the settings page
  const result = { android: null, ios: null };

  // Find app links
  const appLinks = await page.locator('a[href*="/apps/"]').all();
  console.log(`   リンク数: ${appLinks.length}`);

  for (const link of appLinks) {
    try {
      const text = (await link.textContent()).trim();
      const href = await link.getAttribute('href');
      if (!text.includes('30sec Challenge') && !href?.includes('/apps/')) continue;

      console.log(`\n   アプリ確認: ${text.substring(0, 50)} (${href})`);
      await link.click();
      await waitForStable(page, 3000);

      // Check the page for App ID and platform
      const bodyText = await page.locator('body').textContent();
      const appIdMatch = bodyText.match(/(ca-app-pub-\d+~\d+)/);
      const isAndroid = bodyText.includes('Android') || bodyText.includes('android');
      const isIOS = bodyText.includes('iOS') || bodyText.includes('ios');

      if (appIdMatch) {
        const appId = appIdMatch[1];
        if (isAndroid && !result.android) {
          result.android = appId;
          console.log(`   ✅ Android App ID: ${appId}`);
        } else if (isIOS && !result.ios) {
          result.ios = appId;
          console.log(`   ✅ iOS App ID: ${appId}`);
        } else {
          console.log(`   📋 App ID: ${appId} (platform unclear)`);
          if (!result.android) result.android = appId;
          else if (!result.ios) result.ios = appId;
        }
      }

      await ss(page, `app-detail-${isAndroid ? 'android' : 'ios'}`);

      // Go back to list
      await page.goto('https://apps.admob.com/v2/apps/list');
      await waitForStable(page, 3000);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {
      console.log(`   ⚠️ エラー: ${e.message.substring(0, 100)}`);
    }
  }

  // If no App IDs found from links, try getting from URL pattern on the list page
  if (!result.android && !result.ios) {
    // Try clicking on app names directly
    const appNames = await page.locator('text="30sec Challenge"').all();
    console.log(`   アプリ名要素数: ${appNames.length}`);
    for (let i = 0; i < appNames.length; i++) {
      try {
        await page.goto('https://apps.admob.com/v2/apps/list');
        await waitForStable(page, 3000);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        const appName = page.locator('text="30sec Challenge"').nth(i);
        await appName.click();
        await waitForStable(page, 3000);

        const url = page.url();
        console.log(`   URL: ${url}`);
        const bodyText = await page.locator('body').textContent();
        const appIdMatch = bodyText.match(/(ca-app-pub-\d+~\d+)/);

        if (appIdMatch) {
          const appId = appIdMatch[1];
          const isAndroid = bodyText.includes('Android');
          if (i === 0) {
            result.android = appId;
            console.log(`   ✅ App[0] ID: ${appId}`);
          } else {
            result.ios = appId;
            console.log(`   ✅ App[1] ID: ${appId}`);
          }
        }

        await ss(page, `app-${i}`);
      } catch (e) {
        console.log(`   ⚠️ エラー: ${e.message.substring(0, 100)}`);
      }
    }
  }

  return result;
}

async function createAdUnit(page, adType, unitName) {
  console.log(`\n   --- ${unitName} ---`);

  // Click "広告ユニットを追加" button
  const addClicked = await clickEl(page, [
    'material-button:has-text("広告ユニットを追加")',
    '[role="button"]:has-text("広告ユニットを追加")',
    'material-button:has-text("Add ad unit")',
  ], '広告ユニット追加');

  if (!addClicked) {
    // Maybe we're already on the type selection page
    const bodyText = await page.locator('body').textContent();
    if (!bodyText.includes('広告フォーマットを選択') && !bodyText.includes('Select ad format')) {
      console.log('   ⚠️ 追加ボタンなし');
      return null;
    }
  }

  await waitForStable(page, 2000);

  // Select ad type by clicking "選択" link within the correct card
  // Each card structure: card > [type name] + [description] + [選択 link]
  // We need to find the card containing the type name, then click its 選択 link
  const typeNames = {
    'Banner': 'バナー',
    'Interstitial': 'インタースティシャル',
    'Rewarded': 'リワード',
    'Native': 'ネイティブ アドバンス',
  };
  const jpName = typeNames[adType] || adType;

  // Strategy: use page.evaluate to find the "選択" link in the card containing the type name
  let typeSelected = false;

  try {
    typeSelected = await page.evaluate((targetName) => {
      // Find all cards that contain "選択" links
      const selectLinks = document.querySelectorAll('a, [role="link"], material-button');
      for (const link of selectLinks) {
        const linkText = link.textContent?.trim();
        if (linkText !== '選択' && linkText !== 'Select') continue;

        // Check if this link's parent card contains the target type name
        let parent = link.parentElement;
        for (let i = 0; i < 5; i++) {
          if (!parent) break;
          const parentText = parent.textContent || '';
          if (parentText.includes(targetName)) {
            link.click();
            return true;
          }
          parent = parent.parentElement;
        }
      }
      return false;
    }, jpName);
  } catch {}

  if (typeSelected) {
    console.log(`   ✓ タイプ選択: ${jpName}`);
  } else {
    // Fallback: try Playwright locator approach
    // Find cards containing the type name and click their 選択 link
    const cards = await page.locator(`div:has(>> text="${jpName}") >> text="選択"`).all();
    if (cards.length > 0) {
      await cards[0].click();
      typeSelected = true;
      console.log(`   ✓ タイプ選択(locator): ${jpName}`);
    }
  }

  if (!typeSelected) {
    // Last resort: try English names
    const enNames = { 'Banner': 'Banner', 'Interstitial': 'Interstitial', 'Rewarded': 'Rewarded', 'Native': 'Native advanced' };
    const enName = enNames[adType] || adType;
    try {
      typeSelected = await page.evaluate((targetName) => {
        const selectLinks = document.querySelectorAll('a, [role="link"], material-button');
        for (const link of selectLinks) {
          if (link.textContent?.trim() !== 'Select') continue;
          let parent = link.parentElement;
          for (let i = 0; i < 5; i++) {
            if (!parent) break;
            if (parent.textContent?.includes(targetName)) {
              link.click();
              return true;
            }
            parent = parent.parentElement;
          }
        }
        return false;
      }, enName);
    } catch {}
  }

  if (!typeSelected) {
    console.log(`   ⚠️ ${adType} タイプ選択失敗`);
    await ss(page, `type-fail-${adType.toLowerCase()}`);
    // Try to go back
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    return null;
  }

  await waitForStable(page, 2000);
  await ss(page, `unit-form-${adType.toLowerCase()}`);

  // Fill unit name - skip search bar inputs
  const nameInputs = await page.locator('input:visible').all();
  let nameFilled = false;
  for (const ni of nameInputs) {
    try {
      const placeholder = (await ni.getAttribute('placeholder')) || '';
      const ariaLabel = (await ni.getAttribute('aria-label')) || '';
      const type = (await ni.getAttribute('type')) || 'text';
      if (type !== 'text' && type !== '') continue;
      if (placeholder.includes('検索') || ariaLabel.includes('検索') ||
          placeholder.includes('アプリ、広告ユニット')) continue;
      await ni.click();
      await ni.fill(unitName);
      nameFilled = true;
      console.log(`   ✓ 名前: ${unitName}`);
      break;
    } catch {}
  }

  if (!nameFilled) {
    // Try material-input
    try {
      const matInput = page.locator('material-input input:visible').first();
      await matInput.click();
      await matInput.fill(unitName);
      nameFilled = true;
      console.log(`   ✓ 名前(mat): ${unitName}`);
    } catch {}
  }

  await page.waitForTimeout(500);

  // Click "広告ユニットを作成" (Create ad unit)
  await clickEl(page, [
    'material-button:has-text("広告ユニットを作成")',
    '[role="button"]:has-text("広告ユニットを作成")',
    'material-button:has-text("Create ad unit")',
    'button:has-text("広告ユニットを作成")',
  ], '作成');

  await waitForStable(page, 4000);
  await ss(page, `unit-created-${adType.toLowerCase()}`);

  // Extract unit ID (ca-app-pub-XXXX/YYYY)
  const text = await page.locator('body').textContent();
  const idMatch = text.match(/(ca-app-pub-\d+\/\d+)/);
  let unitId = null;
  if (idMatch) {
    unitId = idMatch[1];
    console.log(`   ✅ ${adType}: ${unitId}`);
  } else {
    console.log('   ⚠️ Unit ID 取得失敗');
    // Debug: check page title/header
    const header = text.substring(0, 200).replace(/\s+/g, ' ');
    console.log(`   page: ${header}`);
  }

  // Click 完了 (Done) to go back to ad units list
  await clickEl(page, [
    'material-button:has-text("完了")',
    '[role="button"]:has-text("完了")',
    'material-button:has-text("Done")',
    'button:has-text("完了")',
  ], '完了', 5000);

  await waitForStable(page, 2000);
  return unitId;
}

async function createAdUnitsForApp(page, appName, platform) {
  console.log(`\n═══ ${platform} 広告ユニット作成 ═══`);

  // Navigate to app list and click the correct app
  await page.goto('https://apps.admob.com/v2/apps/list');
  await waitForStable(page, 3000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Find and click the app (need to match both name AND platform)
  const appClicked = await page.evaluate((plat) => {
    const links = document.querySelectorAll('a');
    for (const link of links) {
      const text = link.textContent || '';
      if (text.includes('30sec Challenge') && text.includes(plat)) {
        link.click();
        return true;
      }
    }
    // Fallback: click any app link containing "30sec Challenge"
    // If there are two, click the first for Android, second for iOS
    const appLinks = [];
    for (const link of links) {
      if (link.textContent?.includes('30sec Challenge') && link.href?.includes('/apps/')) {
        appLinks.push(link);
      }
    }
    const idx = plat === 'Android' ? 0 : 1;
    if (appLinks[idx]) {
      appLinks[idx].click();
      return true;
    }
    if (appLinks[0]) {
      appLinks[0].click();
      return true;
    }
    return false;
  }, platform);

  if (!appClicked) {
    // Try clicking using text
    const apps = await page.locator(`text="30sec Challenge"`).all();
    const idx = platform === 'Android' ? 0 : (apps.length > 1 ? 1 : 0);
    if (apps[idx]) {
      await apps[idx].click();
      console.log(`   ✓ アプリ選択: ${platform} (index ${idx})`);
    } else {
      console.log('   ⚠️ アプリが見つかりません');
      return {};
    }
  } else {
    console.log(`   ✓ アプリ選択: ${platform}`);
  }

  await waitForStable(page, 3000);

  // Navigate to 広告ユニット tab
  await clickEl(page, [
    'material-tab:has-text("広告ユニット")',
    '[role="tab"]:has-text("広告ユニット")',
    'a:has-text("広告ユニット")',
    '[role="tab"]:has-text("Ad units")',
  ], '広告ユニットタブ', 5000);

  await waitForStable(page, 2000);
  await ss(page, `${platform.toLowerCase()}-adunits-tab`);

  const units = {};
  for (const type of ['Banner', 'Interstitial', 'Rewarded', 'Native']) {
    const id = await createAdUnit(page, type, `${type}_${platform}`);
    if (id) units[type.toLowerCase()] = id;
  }

  return units;
}

async function main() {
  const userDataDir = path.join(__dirname, '_gcp-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    slowMo: 400,
    viewport: { width: 1400, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled', '--disable-popup-blocking'],
  });

  const page = context.pages()[0] || await context.newPage();
  page.setDefaultTimeout(120000);

  const results = { android: { appId: null, units: {} }, ios: { appId: null, units: {} } };

  // Step 1: Get App IDs for both already-registered apps
  const appIds = await getAppIds(page);
  results.android.appId = appIds.android;
  results.ios.appId = appIds.ios;

  // Step 2: Create ad units for Android
  results.android.units = await createAdUnitsForApp(page, '30sec Challenge', 'Android');

  // Step 3: Create ad units for iOS
  results.ios.units = await createAdUnitsForApp(page, '30sec Challenge', 'iOS');

  // Print results
  console.log('\n═══════════════════════════════════════');
  console.log('📋 AdMob 設定結果');
  console.log('═══════════════════════════════════════');
  console.log(JSON.stringify(results, null, 2));
  console.log('═══════════════════════════════════════');

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'admob-results.json'), JSON.stringify(results, null, 2));
  console.log('結果保存完了');

  console.log('\n確認後 Enter で終了');
  process.stdin.resume();
  await new Promise(r => process.stdin.once('data', r));
  await context.close();
}

main().catch(e => { console.error('エラー:', e.message); process.exit(1); });
