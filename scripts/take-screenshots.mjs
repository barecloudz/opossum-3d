import puppeteer from 'puppeteer';
import fs from 'fs';

const SCREENSHOTS_DIR = 'C:/Users/Blake/Documents/Nexalon/screenshots';
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

async function screenshot(page, url, filename, fullPage = true) {
  try {
    await page.goto('http://localhost:5173' + url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1500));
    const path = `${SCREENSHOTS_DIR}/${filename}.png`;
    await page.screenshot({ path, fullPage });
    console.log('OK:', filename, url);
    return path;
  } catch (e) {
    console.error('FAIL:', filename, url, e.message);
    return null;
  }
}

// --- Mobile viewport (iPhone) ---
const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

await screenshot(mobile, '/', 'mobile_home');
await screenshot(mobile, '/products', 'mobile_products');
await screenshot(mobile, '/checkout', 'mobile_checkout');
await screenshot(mobile, '/affiliate/apply', 'mobile_affiliate_apply');
await screenshot(mobile, '/affiliate/dashboard', 'mobile_affiliate_dashboard');
await screenshot(mobile, '/login', 'mobile_login');
await screenshot(mobile, '/register', 'mobile_register');
await screenshot(mobile, '/account', 'mobile_account');

await mobile.close();

// --- Desktop viewport ---
const desktop = await browser.newPage();
await desktop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

await screenshot(desktop, '/', 'desktop_home');
await screenshot(desktop, '/products', 'desktop_products');
await screenshot(desktop, '/checkout', 'desktop_checkout');
await screenshot(desktop, '/affiliate/apply', 'desktop_affiliate_apply');
await screenshot(desktop, '/affiliate/dashboard', 'desktop_affiliate_dashboard');
await screenshot(desktop, '/login', 'desktop_login');
await screenshot(desktop, '/register', 'desktop_register');
await screenshot(desktop, '/account', 'desktop_account');

await desktop.close();
await browser.close();

console.log('All screenshots done. Saved to:', SCREENSHOTS_DIR);
