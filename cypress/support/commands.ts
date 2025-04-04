// cypress/support/commands.ts
// This enables intellisense for Cypress commands
/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />

// For more comprehensive examples of custom commands, visit:
// https://on.cypress.io/custom-commands

// Add a custom command to select by data-cy attribute
// @ts-ignore
Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy=${value}]`);
});