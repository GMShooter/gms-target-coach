/// <reference types="cypress" />

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
      
      /**
       * Custom command to create test user
       * @example cy.createTestUser()
       */
      createTestUser(): Chainable<Element>
      
      /**
       * Custom command to delete test user
       * @example cy.deleteTestUser()
       */
      deleteTestUser(): Chainable<Element>
      
      /**
       * Custom command to create test session
       * @param sessionData - session data
       * @example cy.createTestSession({ status: 'completed' })
       */
      createTestSession(sessionData: any): Chainable<Element>
      
      /**
       * Custom command to create test report
       * @param reportData - report data
       * @example cy.createTestReport({ title: 'Test Report' })
       */
      createTestReport(reportData: any): Chainable<Element>
      
      /**
       * Custom command to wait for element to be visible and clickable
       * @param selector - element selector
       * @param timeout - timeout in ms
       * @example cy.waitForElementAndClick('[data-testid="submit-button"]')
       */
      waitForElementAndClick(selector: string, timeout?: number): Chainable<Element>
      
      /**
       * Custom command to take screenshot with custom name
       * @param name - screenshot name
       * @example cy.customScreenshot('login-page')
       */
      customScreenshot(name: string): Chainable<Element>
      
      /**
       * Custom command to mock API responses
       * @param method - HTTP method
       * @param url - API URL
       * @param response - mock response
       * @example cy.mockApiResponse('GET', '/api/user', { name: 'Test User' })
       */
      mockApiResponse(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, response: any): Chainable<Element>
      
      /**
       * Custom command to wait for API call
       * @param alias - request alias
       * @example cy.waitForApiCall('getUser')
       */
      waitForApiCall(alias: string): Chainable<Element>
      
      /**
       * Custom command to check if element exists without failing
       * @param selector - element selector
       * @example cy.checkIfExists('[data-testid="optional-element"]')
       */
      checkIfExists(selector: string): Chainable<Element>
    }
  }
}

export {};