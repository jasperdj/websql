import puppeteer from 'puppeteer';

async function takeScreenshot() {
  let browser;
  try {
    // Try different launch options for ARM64 compatibility
    const launchOptions = [
      // Option 1: Use system Chrome if available
      {
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      },
      // Option 2: Use Firefox
      {
        product: 'firefox',
        headless: true
      },
      // Option 3: Default with no-sandbox
      {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      }
    ];

    for (const options of launchOptions) {
      try {
        console.log('Trying launch options:', JSON.stringify(options));
        browser = await puppeteer.launch(options);
        console.log('Browser launched successfully!');
        break;
      } catch (err) {
        console.log('Failed with error:', err.message);
        continue;
      }
    }

    if (!browser) {
      throw new Error('Failed to launch browser with any configuration');
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'websql-screenshot.png', fullPage: true });
    
    console.log('Screenshot saved as websql-screenshot.png');
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

takeScreenshot();