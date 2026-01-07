#!/usr/bin/env node

import puppeteer from 'puppeteer';

// Custom Puppeteer configuration for ARM64
const CHROME_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || 
  '/home/jjasp/.cache/ms-playwright/chromium-1169/chrome-linux/chrome';

// Export a custom launch function
export async function launch(options = {}) {
  // Check if we're in a Docker container or have the libraries
  const hasLibraries = checkLibraries();
  
  if (!hasLibraries) {
    console.warn('Warning: Some Chrome libraries are missing.');
    console.warn('The browser may not launch properly.');
    console.warn('Consider running in a Docker container with the necessary libraries.');
  }
  
  const defaultOptions = {
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials'
    ]
  };
  
  return puppeteer.launch({ ...defaultOptions, ...options });
}

function checkLibraries() {
  try {
    execSync(`ldd "${CHROME_PATH}" 2>&1 | grep "not found"`, { encoding: 'utf-8' });
    return false; // Found missing libraries
  } catch (e) {
    return true; // No missing libraries or ldd failed
  }
}

// Also export puppeteer's default export
export * from 'puppeteer';
export { default } from 'puppeteer';
