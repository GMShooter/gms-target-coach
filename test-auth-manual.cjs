const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('Navigating to app...');
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if login button is present
    const loginButton = await page.$('[data-testid="login-button"]');
    if (loginButton) {
      console.log('✓ Login button found');
    } else {
      console.log('✗ Login button not found');
    }
    
    // Check if we're already logged in (mock mode)
    const userMenu = await page.$('[data-testid="user-menu"]');
    if (userMenu) {
      console.log('✓ User is already logged in (mock mode)');
    } else {
      console.log('✗ User not logged in');
    }
    
    // Try to navigate to login page
    await page.goto('http://localhost:3000/login');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fill in login form
    await page.type('[data-testid="email-input"]', 'test@example.com');
    await page.type('[data-testid="password-input"]', 'password123');
    
    // Click login button
    await page.click('[data-testid="login-button"]');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if login was successful
    const userMenuAfterLogin = await page.$('[data-testid="user-menu"]');
    if (userMenuAfterLogin) {
      console.log('✓ Login successful');
    } else {
      console.log('✗ Login failed');
    }
    
    await browser.close();
    console.log('Test completed');
  } catch (error) {
    console.error('Test failed:', error);
  }
})();