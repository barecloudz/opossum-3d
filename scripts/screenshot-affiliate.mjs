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
    await new Promise(r => setTimeout(r, 2000));
    const path = `${SCREENSHOTS_DIR}/${filename}.png`;
    await page.screenshot({ path, fullPage });
    console.log('OK:', filename, url);
    // Also log the final URL (in case of redirect)
    console.log('  Final URL:', page.url());
    return path;
  } catch (e) {
    console.error('FAIL:', filename, url, e.message);
    return null;
  }
}

// Desktop viewport
const desktop = await browser.newPage();
await desktop.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

await screenshot(desktop, '/', 'new_desktop_home');
await screenshot(desktop, '/affiliate/dashboard', 'new_desktop_affiliate_dashboard');

// Mobile viewport
const mobile = await browser.newPage();
await mobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

await screenshot(mobile, '/', 'new_mobile_home');
await screenshot(mobile, '/affiliate/dashboard', 'new_mobile_affiliate_dashboard');

await desktop.close();
await mobile.close();
await browser.close();

console.log('Done. Saved to:', SCREENSHOTS_DIR);
