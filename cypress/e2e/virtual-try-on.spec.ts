// cypress/e2e/virtual-try-on.spec.ts
describe('Virtual Try-On', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.intercept('POST', '**/api/v1/recommendations', { fixture: 'recommendations.json' }).as('getRecommendations');
      
      // Open the widget
      cy.get('#open-stylist').click();
      
      // Type "recommend shirts" to get recommendations
      cy.get('.stylist-chat-input__textarea').type('recommend shirts{enter}');
      
      // Wait for recommendations to load
      cy.wait('@getRecommendations');
    });
    
    it('should open try-on modal when clicking try-on button', () => {
      // Click try-on button on first recommendation
      cy.get('.stylist-item-card').first().find('.stylist-try-on-button').click();
      
      // Try-on modal should be visible
      cy.get('.stylist-try-on-modal').should('be.visible');
      cy.get('.stylist-virtual-try-on__title').should('contain', 'Virtual Try-On');
    });
    
    it('should allow uploading a photo', () => {
      // Click try-on button
      cy.get('.stylist-item-card').first().find('.stylist-try-on-button').click();
      
      // Upload a photo
      cy.get('input[type="file"]').attachFile('test-photo.jpg');
      
      // Click continue button
      cy.get('.stylist-image-uploader__upload-btn').click();
      
      // Canvas should be visible
      cy.get('.stylist-try-on-canvas__canvas').should('be.visible');
    });
    
    it('should allow adjusting garments', () => {
      // Click try-on button
      cy.get('.stylist-item-card').first().find('.stylist-try-on-button').click();
      
      // Upload a photo
      cy.get('input[type="file"]').attachFile('test-photo.jpg');
      cy.get('.stylist-image-uploader__upload-btn').click();
      
      // Click on the garment in canvas
      cy.get('.stylist-try-on-canvas__canvas').click();
      
      // Adjust scale
      cy.get('input[type="range"]').first().invoke('val', 1.5).trigger('change');
      
      // Save the look
      cy.get('.stylist-virtual-try-on__primary-btn').click();
      
      // Should close the modal or show success message
      cy.get('.stylist-virtual-try-on__success-message').should('exist');
    });
  });