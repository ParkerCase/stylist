// cypress/e2e/chat-widget.spec.ts
/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
describe('Chat Widget', () => {
    beforeEach(() => {
      cy.visit('/');
      
      // Open the widget
      cy.get('#open-stylist').click();
      
      // Widget should be visible
      cy.get('[data-testid="stylist-chat-widget"]').should('be.visible');
    });
    
    it('should allow sending messages', () => {
      // Type a message
      cy.get('.stylist-chat-input__textarea').type('Hello{enter}');
      
      // Check if message appears in the chat
      cy.get('.stylist-message-bubble--user').should('contain', 'Hello');
      
      // Wait for assistant response
      cy.get('.stylist-message-bubble--assistant', { timeout: 10000 }).should('exist');
    });
    
    it('should minimize and maximize the widget', () => {
      // Click minimize button
      cy.get('.stylist-chat-header__button--minimize').click();
      
      // Widget content should not be visible
      cy.get('.stylist-chat-widget__content').should('not.be.visible');
      
      // Click minimize button again to maximize
      cy.get('.stylist-chat-header__button--minimize').click();
      
      // Widget content should be visible again
      cy.get('.stylist-chat-widget__content').should('be.visible');
    });
    
    it('should close the widget', () => {
      // Click close button
      cy.get('.stylist-chat-header__button--close').click();
      
      // Widget should not be visible
      cy.get('[data-testid="stylist-chat-widget"]').should('not.exist');
    });
  });