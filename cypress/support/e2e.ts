// cypress/support/e2e.ts
// Import cypress-file-upload
import 'cypress-file-upload';

// Import commands.js using ES2015 syntax:
import './commands';

// This enables intellisense for Cypress commands
/// <reference types="cypress" />

// Declare global Cypress namespace for custom commands
declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      /**
       * Custom command to select DOM element by data-testid attribute.
       * @example cy.dataCy('greeting')
       */
      dataCy(value: string): Chainable<JQuery<HTMLElement>>;
      
      /**
       * Custom command to attach a file to an input element
       * Added by cypress-file-upload plugin
       */
      attachFile(filePath: string): Chainable<JQuery<HTMLElement>>;
      
      /**
       * Intercept network requests in Cypress tests
       */
      intercept(url: string | RegExp, response: any): Chainable<null>;
      intercept(method: string, url: string | RegExp, response?: any): Chainable<null>;
    }
  }
}