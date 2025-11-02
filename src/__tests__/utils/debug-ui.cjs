const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Starting UI Debug Analysis...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.type(), msg.text());
  });
  
  // Enable error logging
  page.on('pageerror', error => {
    console.log('BROWSER ERROR:', error.message);
  });
  
  try {
    console.log('📡 Navigating to demo page...');
    await page.goto('http://localhost:3000/demo', { waitUntil: 'networkidle2' });
    
    // Wait a bit for any redirects
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Current URL:', page.url());
    
    // Check if we're on login page
    if (page.url().includes('/login') || page.url() === 'http://localhost:3000/') {
      console.log('🔐 Redirected to login, attempting authentication...');
      
      // Fill and submit login form
      await page.type('#email', 'test@example.com');
      await page.type('#password', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for login
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Navigate to demo again
      await page.goto('http://localhost:3000/demo', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('🔍 Final URL:', page.url());
    
    // Check page content
    const pageContent = await page.content();
    console.log('📄 Page title:', await page.title());
    
    // Look for specific elements
    const elements = {
      'GMShoot Logo': await page.$('img[alt="GMShoot"]'),
      'Demo Title': await page.$('h1'),
      'Target Image': await page.$('img[alt="Target"]'),
      'Metrics Container': await page.$('.space-y-4'),
      'Start Button': await page.$('button'),
      'Analysis Status': await page.$('.text-white\\/80'),
    };
    
    console.log('🔍 Element Analysis:');
    Object.entries(elements).forEach(([name, element]) => {
      console.log(`  ${name}: ${element ? '✅ Found' : '❌ Missing'}`);
    });
    
    // Get page text content for debugging
    const bodyText = await page.$eval('body', el => el.innerText);
    console.log('📝 Page text preview:', bodyText.substring(0, 200) + '...');
    
    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'debug-screenshot.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved to debug-screenshot.png');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
})();