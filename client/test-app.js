const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable request interception to check for failed API calls
  await page.setRequestInterception(true);
  page.on('request', request => {
    request.continue();
  });
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('Failed request:', response.url(), 'Status:', response.status());
    }
  });
  
  // Check for JavaScript errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });
  
  try {
    // 1. Test landing page
    console.log('Testing landing page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for animations
    
    // Check if landing page elements are present
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for logo
    const logo = await page.$('img[src="/GMShoot_logo.png"]');
    console.log('Logo found:', !!logo);
    
    // Check for animated text elements
    const animatedWords = await page.$$('.word-animate');
    console.log('Animated words found:', animatedWords.length);
    
    // Check for the "Get Started" button
    const getStartedButton = await page.$('a[href="/login"]');
    console.log('Get Started button found:', !!getStartedButton);
    
    // Take a screenshot of the landing page
    await page.screenshot({ path: 'landing-page-screenshot.png' });
    console.log('Landing page screenshot saved');
    
    // 2. Test login/signup
    console.log('Testing login/signup...');
    if (getStartedButton) {
      console.log('Clicking Get Started button...');
      
      // Try different approaches to click the button
      try {
        // First try to wait for the button to be visible and clickable
        await page.waitForSelector('a[href="/login"]', { visible: true, timeout: 5000 });
        
        // Try clicking with JavaScript
        await page.evaluate(() => {
          const button = document.querySelector('a[href="/login"]');
          if (button) button.click();
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we're on the login page
        const currentUrl = page.url();
        console.log('Current URL after navigation:', currentUrl);
        
        // Check for login form elements
        const loginForm = await page.$('form');
        console.log('Login form found:', !!loginForm);
        
        const emailInput = await page.$('input[type="email"]');
        console.log('Email input found:', !!emailInput);
        
        const passwordInput = await page.$('input[type="password"]');
        console.log('Password input found:', !!passwordInput);
        
        // Take a screenshot of the login page
        await page.screenshot({ path: 'login-page-screenshot.png' });
        console.log('Login page screenshot saved');
      } catch (error) {
        console.log('Error clicking button:', error.message);
        
        // Try direct navigation as fallback
        console.log('Trying direct navigation to login page...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check for login form elements
        const loginForm = await page.$('form');
        console.log('Login form found:', !!loginForm);
        
        const emailInput = await page.$('input[type="email"]');
        console.log('Email input found:', !!emailInput);
        
        const passwordInput = await page.$('input[type="password"]');
        console.log('Password input found:', !!passwordInput);
        
        // Take a screenshot of the login page
        await page.screenshot({ path: 'login-page-screenshot.png' });
        console.log('Login page screenshot saved');
      }
    } else {
      console.log('Get Started button not found');
      
      // Try direct navigation as fallback
      console.log('Trying direct navigation to login page...');
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check for login form elements
      const emailInput = await page.$('input[type="email"]');
      console.log('Email input found:', !!emailInput);
      
      const passwordInput = await page.$('input[type="password"]');
      console.log('Password input found:', !!passwordInput);
      
      // Take a screenshot of the login page
      await page.screenshot({ path: 'login-page-screenshot.png' });
      console.log('Login page screenshot saved');
    }
    
    // Test login form submission (with test credentials)
    console.log('Testing login form...');
    
    // Re-get the email and password inputs to ensure they're in scope
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      // Fill in test credentials
      await emailInput.type('test@example.com');
      await passwordInput.type('testpassword');
      
      // Find and click the submit button
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        console.log('Clicking submit button...');
        await submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if we're redirected after login
        const currentUrl = page.url();
        console.log('URL after login attempt:', currentUrl);
        
        // Look for navigation elements that should appear after login
        const navElements = await page.$$('nav a');
        console.log('Navigation elements after login:', navElements.length);
        
        // Take a screenshot after login attempt
        await page.screenshot({ path: 'after-login-screenshot.png' });
        console.log('After login screenshot saved');
      } else {
        console.log('Submit button not found');
      }
    }
    
    // 3. Test direct navigation to video analysis
    console.log('Testing video analysis page...');
    await page.goto('http://localhost:3000/analysis', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for video analysis elements
    const videoUpload = await page.$('input[type="file"]');
    console.log('Video upload input found:', !!videoUpload);
    
    const testFrames = await page.$$('img[src*="test_videos_frames"]');
    console.log('Test frames found:', testFrames.length);
    
    await page.screenshot({ path: 'video-analysis-screenshot.png' });
    console.log('Video analysis screenshot saved');
    
    // 4. Test direct navigation to camera analysis
    console.log('Testing camera analysis page...');
    await page.goto('http://localhost:3000/camera', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for camera elements
    const videoElement = await page.$('video');
    console.log('Video element found:', !!videoElement);
    
    // Try different selectors for the camera button
    const cameraButton1 = await page.$('button');
    const cameraButtons = await page.$$('button');
    console.log('Total buttons found:', cameraButtons.length);
    
    // Look for any button with camera-related text
    let cameraButtonFound = false;
    for (const button of cameraButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.toLowerCase().includes('camera')) {
        console.log('Camera button found with text:', text);
        cameraButtonFound = true;
        break;
      }
    }
    if (!cameraButtonFound) {
      console.log('No camera button found');
    }
    
    await page.screenshot({ path: 'camera-analysis-screenshot.png' });
    console.log('Camera analysis screenshot saved');
    
    // 5. Test direct navigation to reports
    console.log('Testing reports page...');
    await page.goto('http://localhost:3000/reports', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for reports elements
    const reportTable = await page.$('table');
    console.log('Report table found:', !!reportTable);
    
    const reportCards = await page.$$('.card, [data-testid="report-card"]');
    console.log('Report cards found:', reportCards.length);
    
    await page.screenshot({ path: 'reports-screenshot.png' });
    console.log('Reports screenshot saved');
    
    console.log('All tests completed successfully');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
  
  await browser.close();
})();