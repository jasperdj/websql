import { chromium } from 'playwright';

async function takeScreenshot() {
  let browser;
  try {
    console.log('Installing Playwright browsers...');
    // Install browsers if needed
    const { execSync } = await import('child_process');
    try {
      execSync('npx playwright install chromium', { stdio: 'inherit' });
    } catch (e) {
      console.log('Browser installation failed, trying anyway...');
    }

    console.log('Launching browser...');
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'websql-screenshot.png', fullPage: true });
    
    console.log('Screenshot saved as websql-screenshot.png');
    
    await browser.close();
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

takeScreenshot();