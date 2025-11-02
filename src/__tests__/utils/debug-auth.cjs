const puppeteer = require('puppeteer');

async function debugAuthentication() {
  console.log('🔍 Starting Authentication Debug Analysis...');
  
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
  
  // Enable request/response logging
  page.on('request', request => {
    if (request.url().includes('supabase') || request.url().includes('auth')) {
      console.log('🌐 REQUEST:', request.method(), request.url());
      console.log('📤 HEADERS:', request.headers());
    }
  });
  
  page.on('response', async response => {
    if (response.url().includes('supabase') || response.url().includes('auth')) {
      console.log('📥 RESPONSE:', response.status(), response.url());
      console.log('📥 HEADERS:', response.headers());
      
      // Try to get response body for non-200 responses
      if (response.status() !== 200) {
        try {
          const text = await response.text();
          console.log('❌ RESPONSE BODY:', text);
        } catch (e) {
          console.log('❌ Could not read response body:', e.message);
        }
      }
    }
  });
  
  try {
    // Navigate to login page
    console.log('📡 Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Wait for page to load
    await page.waitForSelector('img[alt="GMShoot"]', { timeout: 5000 });
    console.log('✅ Login page loaded');
    
    // Fill in test credentials
    console.log('📝 Filling in test credentials...');
    await page.type('#email', 'test@example.com');
    await page.type('#password', 'testpassword123');
    
    // Click submit button
    console.log('🖱️ Clicking submit button...');
    await page.click('button[type="submit"]');
    
    // Wait for network activity
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check current URL
    const currentUrl = page.url();
    console.log('🔍 Current URL after login attempt:', currentUrl);
    
    // Check if redirected to demo
    if (currentUrl.includes('/demo')) {
      console.log('✅ Successfully redirected to demo page');
      
      // Wait for demo page to load
      await page.waitForTimeout(3000);
      
      // Check demo page elements
      const demoTitle = await page.$('h1');
      const targetImage = await page.$('img[alt*="target"]');
      const metricsContainer = await page.$('.metrics');
      
      console.log('📊 Demo Page Analysis:');
      console.log('  Demo Title:', demoTitle ? '✅ Found' : '❌ Missing');
      console.log('  Target Image:', targetImage ? '✅ Found' : '❌ Missing');
      console.log('  Metrics Container:', metricsContainer ? '✅ Found' : '❌ Missing');
      
    } else {
      console.log('❌ Login failed - still on login page');
      
      // Check for error message
      const errorElement = await page.$('.text-red-600');
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        console.log('🚨 Error message found:', errorText);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await browser.close();
  }
}

debugAuthentication().catch(console.error);