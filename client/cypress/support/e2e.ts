// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands for GMShoot testing
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with Google
       * @example cy.loginWithGoogle()
       */
      loginWithGoogle(): Chainable<Element>
      
      /**
       * Custom command to login with email and password
       * @param email - user email
       * @param password - user password
       * @example cy.loginWithEmail('test@example.com', 'password123')
       */
      loginWithEmail(email: string, password: string): Chainable<Element>
      
      /**
       * Custom command to logout
       * @example cy.logout()
       */
      logout(): Chainable<Element>
      
      /**
       * Custom command to upload a test video file
       * @param fileName - name of the test file
       * @example cy.uploadTestVideo('test-video.mp4')
       */
      uploadTestVideo(fileName: string): Chainable<Element>
      
      /**
       * Custom command to wait for analysis to complete
       * @param timeout - maximum time to wait in ms
       * @example cy.waitForAnalysis(30000)
       */
      waitForAnalysis(timeout?: number): Chainable<Element>
      
      /**
       * Custom command to check if camera is accessible
       * @example cy.checkCameraAccess()
       */
      checkCameraAccess(): Chainable<Element>
    }
  }
}

// Global beforeEach hook to clear localStorage and cookies
beforeEach(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Global afterEach hook for cleanup
afterEach(() => {
  // Clean up any test data if needed
});