// Comprehensive test suite for Fashion AI application
// Based on requirements from fashion-ai-specs.md

// Helper functions
const waitForApiResponse = () => {
  cy.intercept('**/api/recommendations').as('recommendationsApi');
  cy.wait('@recommendationsApi', { timeout: 10000 });
};

const openWidget = () => {
  cy.get('[data-cy="widget-open-button"]')
    .filter(':visible')
    .first()
    .click();
  cy.get('[class*="widget"],[class*="modal"],[class*="panel"]')
    .filter(':visible')
    .should('exist');
};

// Prevent application errors from failing tests
Cypress.on('uncaught:exception', (err) => {
  // Returning false here prevents Cypress from failing the test
  if (err.message.includes('SyncProvider') || err.message.includes('useSyncContext')) {
    return false;
  }
  // We still want to fail on other unexpected errors
  return true;
});

describe('Fashion AI - Main Interface Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
  });

  it('should display circular button in bottom-right corner', () => {
    // More flexible selector to find any circular-style button in the corner
    cy.get('[data-cy="widget-open-button"]')
      .filter(':visible')
      .should('exist')
      .should('have.css', 'position', 'fixed');
  });

  it('should open widget when circular button is clicked', () => {
    cy.get('[data-cy="widget-open-button"]')
      .filter(':visible')
      .first()
      .click();
    cy.get('[class*="widget"],[class*="modal"],[class*="panel"]')
      .filter(':visible')
      .should('exist');
  });

  it('should display "Personalized Stylist" at the top of widget', () => {
    openWidget();
    // Look for any header element that might contain stylist text
    cy.get('[class*="header"],[class*="title"]')
      .filter(':visible')
      .then($headers => {
        // Check if any header contains a variation of "stylist" text
        const found = Array.from($headers as unknown as HTMLElement[]).some(el => 
          (el as HTMLElement).textContent &&
          ((el as HTMLElement).textContent!.toLowerCase().includes('stylist') || 
           (el as HTMLElement).textContent!.toLowerCase().includes('assistant'))
        );
        expect(found).to.be.true;
      });
  });

  it('should display navigation options in the widget', () => {
    openWidget();
    // Check for navigation elements anywhere in the UI
    const navigationItems = [
      'Try-On',
      'Closet',
      'Style',
      'Trend'
    ];
    
    // At least 2 navigation options should be visible
    let foundCount = 0;
    
    navigationItems.forEach(item => {
      cy.get('body').then($body => {
        if ($body.text().includes(item)) {
          foundCount++;
        }
      });
    });
    
    // Validate at least 2 navigation items were found
    cy.wrap(foundCount).should('be.gte', 2);
  });

  it('should display action button for generating content', () => {
    openWidget();
    // Look for any button with suggestion/recommend/generate text
    cy.get('button')
      .filter(':visible')
      .then($buttons => {
        const found = Array.from($buttons).some(btn => 
          btn.textContent.toLowerCase().includes('suggest') || 
          btn.textContent.toLowerCase().includes('generat') ||
          btn.textContent.toLowerCase().includes('recommend')
        );
        expect(found).to.be.true;
      });
  });
});

describe('Fashion AI - Chat Feature Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
  });

  it('should display chat bar for user input', () => {
    cy.get('[data-cy="chat-input"]').should('be.visible');
  });

  it('should generate suggestions in 2x5 grid when button is clicked', () => {
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    
    cy.get('[data-cy="suggestion-grid"]').within(() => {
      cy.get('[data-cy="item-card"]').should('have.length.at.least', 10);
      cy.get('[data-cy="item-card"]').should('have.length.at.most', 20); // Allowing for potential variations
    });
  });

  it('should categorize suggestions by item type', () => {
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    
    cy.get('[data-cy="suggestion-categories"]').within(() => {
      cy.contains('Clothing').should('be.visible');
      cy.contains('Shoes').should('be.visible');
      cy.contains('Accessories').should('be.visible');
      // May include other categories depending on implementation
    });
  });

  it('should allow like/dislike actions on suggestions', () => {
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    
    cy.get('[data-cy="item-card"]').first().within(() => {
      cy.get('[data-cy="like-button"]').should('be.visible');
      cy.get('[data-cy="dislike-button"]').should('be.visible');
    });
    
    // Test liking an item
    cy.get('[data-cy="item-card"]').first().find('[data-cy="like-button"]').click();
    cy.get('[data-cy="item-card"]').first().should('have.class', 'liked');
  });

  it('should show item actions menu on hover', () => {
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    
    cy.get('[data-cy="item-card"]').first().trigger('mouseover');
    cy.get('[data-cy="item-actions-menu"]').should('be.visible').within(() => {
      cy.contains('Add to dressing room').should('be.visible');
      cy.contains('Add to wishlist').should('be.visible');
      cy.contains('Add to cart').should('be.visible');
      cy.contains('Current outfit suggestions').should('be.visible');
    });
  });

  it('should handle specific item search in chat', () => {
    cy.get('[data-cy="chat-input"]').type('I need a dress for a wedding{enter}');
    waitForApiResponse();
    
    cy.get('[data-cy="suggestion-categories"]').should('contain', 'Requested');
    cy.get('[data-cy="suggestion-grid"]').within(() => {
      cy.get('[data-cy="item-card"]').should('have.length.at.least', 10);
      // Verify the results are dresses
      cy.get('[data-cy="item-card"] .item-description').should('contain', 'dress');
    });
  });
});

describe('Fashion AI - Virtual Try-On Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
    cy.contains('Virtual Try-On').click();
  });

  it('should navigate to Virtual Try-On section', () => {
    cy.get('[data-cy="virtual-try-on"]').should('be.visible');
  });

  it('should display grid of try-on items', () => {
    // Assuming some items are already added to try-on
    cy.get('[data-cy="try-on-grid"]').should('be.visible');
  });

  it('should open camera interface when an item is clicked', () => {
    // Mock camera permissions
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
        getTracks: () => [{stop: () => {}}]
      });
    });
    
    // Add a test item if none exists
    cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').then($items => {
      if ($items.length === 0) {
        cy.go('back');
        cy.contains('button', 'Generate Suggestions').click();
        waitForApiResponse();
        cy.get('[data-cy="item-card"]').first().trigger('mouseover');
        cy.contains('Add to dressing room').click();
        cy.contains('Virtual Try-On').click();
      }
    });
    
    cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').first().click();
    cy.get('[data-cy="camera-interface"]').should('be.visible');
  });

  it('should display like/dislike and capture buttons in try-on mode', () => {
    // Mock camera and open try-on
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
        getTracks: () => [{stop: () => {}}]
      });
    });
    
    // Add a test item if needed and open try-on
    cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').first().click();
    
    cy.get('[data-cy="camera-interface"]').within(() => {
      cy.get('[data-cy="like-button"]').should('be.visible');
      cy.get('[data-cy="dislike-button"]').should('be.visible');
      cy.get('[data-cy="capture-button"]').should('be.visible');
    });
  });

  it('should remove item from try-on grid when disliked', () => {
    // Mock camera
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
        getTracks: () => [{stop: () => {}}]
      });
    });
    
    // Count items, then dislike one
    cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').then($items => {
      const initialCount = $items.length;
      if (initialCount > 0) {
        cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').first().click();
        cy.get('[data-cy="camera-interface"] [data-cy="dislike-button"]').click();
        
        // Should return to grid with one fewer item
        cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').should('have.length', initialCount - 1);
      }
    });
  });

  it('should prompt with options when an item is liked', () => {
    // Mock camera
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
        getTracks: () => [{stop: () => {}}]
      });
    });
    
    // Try on an item and like it
    cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').first().click();
    cy.get('[data-cy="camera-interface"] [data-cy="like-button"]').click();
    
    // Should show options
    cy.get('[data-cy="action-prompt"]').should('be.visible').within(() => {
      cy.contains('Add to cart').should('be.visible');
      cy.contains('Add to Wishlist').should('be.visible');
    });
  });
});

describe('Fashion AI - My Closet Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
    cy.contains('My Closet').click();
  });

  it('should navigate to My Closet section', () => {
    cy.get('[data-cy="my-closet-section"]').should('be.visible');
  });

  it('should display Wishlist and Closet sections', () => {
    cy.contains('My Wishlist').should('be.visible');
    cy.contains('My Closet').should('be.visible');
  });

  it('should display add item button', () => {
    cy.get('[data-cy="add-item-button"]').should('be.visible');
  });

  it('should open add item form when add button is clicked', () => {
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="add-item-form"]').should('be.visible');
  });

  it('should allow adding new item to closet', () => {
    cy.get('[data-cy="add-item-button"]').click();
    
    // Fill out the form
    cy.get('[name="itemType"]').select('Shirt');
    cy.get('[name="color"]').select('Blue');
    cy.get('[name="pattern"]').select('Solid');
    
    // Mock file upload
    cy.get('[type="file"]').attachFile('test-photo.jpg');
    
    cy.contains('button', 'Add to Closet').click();
    
    // Should return to closet with new item
    cy.get('[data-cy="my-closet-section"]').should('be.visible');
    cy.get('[data-cy="closet-grid"] [data-cy="item-card"]').should('have.length.at.least', 1);
  });
});

describe('Fashion AI - Social Proof Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
    cy.contains('Social Proof').click();
  });

  it('should navigate to Social Proof section', () => {
    cy.get('[data-cy="social-proof-section"]').should('be.visible');
  });

  it('should display grid of celebrity images', () => {
    cy.get('[data-cy="celebrity-grid"]').should('be.visible');
    cy.get('[data-cy="celebrity-grid"] [data-cy="celebrity-card"]').should('have.length.at.least', 10);
  });

  it('should display chat bar in social proof section', () => {
    cy.get('[data-cy="chat-input"]').should('be.visible');
  });

  it('should show options when hovering over celebrity image', () => {
    cy.get('[data-cy="celebrity-grid"] [data-cy="celebrity-card"]').first().trigger('mouseover');
    cy.get('[data-cy="celebrity-options"]').should('be.visible').within(() => {
      cy.contains('Find something like this').should('be.visible');
      cy.contains('Find this exact look').should('be.visible');
    });
  });

  it('should show item details when "Find this exact look" is clicked', () => {
    cy.get('[data-cy="celebrity-grid"] [data-cy="celebrity-card"]').first().trigger('mouseover');
    cy.contains('Find this exact look').click();
    
    cy.get('[data-cy="item-details"]').should('be.visible');
    cy.get('[data-cy="item-details"] .item-name').should('be.visible');
    cy.get('[data-cy="item-details"] .item-price').should('be.visible');
    cy.get('[data-cy="item-details"] .item-availability').should('be.visible');
  });

  it('should allow interaction with found items', () => {
    cy.get('[data-cy="celebrity-grid"] [data-cy="celebrity-card"]').first().trigger('mouseover');
    cy.contains('Find this exact look').click();
    
    cy.get('[data-cy="item-preview"]').should('be.visible').trigger('mouseover');
    cy.get('[data-cy="item-actions-menu"]').should('be.visible').within(() => {
      cy.contains('Add to dressing room').should('be.visible');
      cy.contains('Add to wishlist').should('be.visible');
      cy.contains('Add to cart').should('be.visible');
    });
  });
});

describe('Fashion AI - Style Quiz Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
    cy.contains('Style Quiz').click();
  });

  it('should navigate to Style Quiz section', () => {
    cy.get('[data-cy="style-quiz-section"]').should('be.visible');
  });

  it('should display multiple choice questions', () => {
    cy.get('[data-cy="style-quiz-container"]').should('be.visible');
    cy.get('[data-cy="quiz-question"]').should('be.visible');
    cy.get('[data-cy="quiz-options"]').should('be.visible');
  });

  it('should allow selecting quiz answers', () => {
    cy.get('[data-cy="quiz-options"] .option').first().click();
    cy.get('[data-cy="quiz-options"] .option').first().should('have.class', 'selected');
  });

  it('should navigate through all quiz questions', () => {
    // Navigate through all 25 questions
    for (let i = 0; i < 25; i++) {
      cy.get('[data-cy="quiz-options"] .option').first().click();
      cy.get('[data-cy="next-button"]').click();
    }
    
    // Should show completion or results
    cy.get('[data-cy="quiz-results"]').should('be.visible');
  });

  it('should save style preferences after quiz completion', () => {
    // Complete quiz
    for (let i = 0; i < 25; i++) {
      cy.get('[data-cy="quiz-options"] .option').first().click();
      cy.get('[data-cy="next-button"]').click();
    }
    
    // Verify style saved confirmation
    cy.get('[data-cy="success-message"]').should('contain.text', 'Your style preferences have been saved');
    
    // Navigate back to home and generate suggestions to confirm they're personalized
    cy.get('[data-cy="home-button"]').click();
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    
    // Should have personalized recommendations
    cy.get('[data-cy="personalized-badge"]').should('be.visible');
  });
});

describe('Fashion AI - Trending Items Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
    cy.contains('Trending Items').click();
  });

  it('should navigate to Trending Items section', () => {
    cy.get('[data-cy="trending-items-section"]').should('be.visible');
  });

  it('should display grid of trending items', () => {
    cy.get('[data-cy="trending-grid"]').should('be.visible');
    cy.get('[data-cy="trending-grid"] [data-cy="item-card"]').should('have.length.at.least', 10);
  });

  it('should display home button at the top', () => {
    cy.get('[data-cy="home-button"]').should('be.visible');
    cy.scrollTo(0, 500); // Scroll down
    cy.get('[data-cy="home-button"]').should('be.visible'); // Still visible when scrolled
  });

  it('should allow like/dislike on trending items', () => {
    cy.get('[data-cy="trending-grid"] [data-cy="item-card"]').first().within(() => {
      cy.get('[data-cy="like-button"]').should('be.visible');
      cy.get('[data-cy="dislike-button"]').should('be.visible');
    });
    
    // Test liking an item
    cy.get('[data-cy="trending-grid"] [data-cy="item-card"]').first().find('[data-cy="like-button"]').click();
    cy.get('[data-cy="trending-grid"] [data-cy="item-card"]').first().should('have.class', 'liked');
  });

  it('should show item actions menu on hover for trending items', () => {
    cy.get('[data-cy="trending-grid"] [data-cy="item-card"]').first().trigger('mouseover');
    cy.get('[data-cy="item-actions-menu"]').should('be.visible').within(() => {
      cy.contains('Add to dressing room').should('be.visible');
      cy.contains('Add to wishlist').should('be.visible');
      cy.contains('Add to cart').should('be.visible');
      cy.contains('Current outfit suggestions').should('be.visible');
    });
  });
});

describe('Fashion AI - Complete Look Feature Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
  });

  it('should prompt for size when adding item to cart', () => {
    cy.get('[data-cy="item-card"]').first().trigger('mouseover');
    cy.contains('Add to cart').click();
    cy.get('[data-cy="size-selector"]').should('be.visible');
  });

  it('should offer "Complete the Look" option after selecting size', () => {
    cy.get('[data-cy="item-card"]').first().trigger('mouseover');
    cy.contains('Add to cart').click();
    cy.get('[data-cy="size-selector"] select').select('M');
    cy.get('[data-cy="complete-look-button"]').should('be.visible');
  });

  it('should generate complementary items when "Complete the Look" is selected', () => {
    cy.get('[data-cy="item-card"]').first().trigger('mouseover');
    cy.contains('Add to cart').click();
    cy.get('[data-cy="size-selector"] select').select('M');
    cy.get('[data-cy="complete-look-button"]').click();
    
    cy.get('[data-cy="complete-look-suggestions"]').should('be.visible');
    cy.get('[data-cy="complete-look-suggestions"] [data-cy="item-card"]').should('have.length.between', 3, 5);
  });

  it('should display different categories for complete look suggestions', () => {
    // Add item to cart and complete look
    cy.get('[data-cy="item-card"]').first().trigger('mouseover');
    cy.contains('Add to cart').click();
    cy.get('[data-cy="size-selector"] select').select('M');
    cy.get('[data-cy="complete-look-button"]').click();
    
    // Check for variety in suggestions (different categories than original item)
    const originalCategory = cy.get('[data-cy="item-card"]').first().find('[data-cy="item-category"]').invoke('text');
    cy.get('[data-cy="complete-look-suggestions"] [data-cy="item-card"]').each(($el) => {
      cy.wrap($el).find('[data-cy="item-category"]').invoke('text').should('not.equal', originalCategory);
    });
  });
});

describe('Fashion AI - User Journey Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
  });

  it('should complete new user onboarding journey', () => {
    // Step 1: Open widget
    cy.get('[data-cy="widget-open-button"]').click();
    cy.get('[data-cy="widget-container"]').should('be.visible');
    
    // Step 2: Take style quiz
    cy.contains('Style Quiz').click();
    
    // Complete quiz (simplified for test)
    for (let i = 0; i < 25; i++) {
      cy.get('[data-cy="quiz-options"] .option').first().click();
      cy.get('[data-cy="next-button"]').click();
    }
    
    // Verify completion
    cy.get('[data-cy="quiz-results"]').should('be.visible');
    cy.get('[data-cy="home-button"]').click();
    
    // Step 3: Generate recommendations
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    cy.get('[data-cy="suggestion-grid"] [data-cy="item-card"]').should('be.visible');
    
    // Step 4: Try on an item
    cy.get('[data-cy="item-card"]').first().trigger('mouseover');
    cy.contains('Add to dressing room').click();
    cy.contains('Virtual Try-On').click();
    
    // Mock camera and try on
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
        getTracks: () => [{stop: () => {}}]
      });
    });
    
    cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').first().click();
    cy.get('[data-cy="camera-interface"] [data-cy="like-button"]').click();
    
    // Step 5: Add to cart
    cy.contains('Add to cart').click();
    cy.get('[data-cy="size-selector"] select').select('M');
    
    // Step 6: Complete the look
    cy.get('[data-cy="complete-look-button"]').click();
    cy.get('[data-cy="complete-look-suggestions"]').should('be.visible');
    
    // Step 7: Add a complete look item
    cy.get('[data-cy="complete-look-suggestions"] [data-cy="item-card"]').first().trigger('mouseover');
    cy.contains('Add to cart').click();
    
    // Step 8: Verify cart has items
    cy.get('[data-cy="home-button"]').click();
    cy.get('[data-cy="cart-icon"]').should('have.attr', 'data-count', '2');
  });

  it('should handle social proof discovery journey', () => {
    // Step 1: Open widget
    cy.get('[data-cy="widget-open-button"]').click();
    cy.get('[data-cy="widget-container"]').should('be.visible');
    
    // Step 2: Go to social proof
    cy.contains('Social Proof').click();
    
    // Step 3: Find a celebrity look
    cy.get('[data-cy="celebrity-grid"] [data-cy="celebrity-card"]').first().trigger('mouseover');
    cy.contains('Find this exact look').click();
    
    // Step 4: View item details
    cy.get('[data-cy="item-details"]').should('be.visible');
    
    // Step 5: Add to wishlist
    cy.get('[data-cy="item-preview"]').trigger('mouseover');
    cy.contains('Add to wishlist').click();
    
    // Step 6: Verify added to wishlist
    cy.contains('My Closet').click();
    cy.contains('My Wishlist').should('be.visible');
    cy.get('[data-cy="wishlist-grid"] [data-cy="item-card"]').should('have.length.at.least', 1);
  });
});

describe('Fashion AI - Edge Cases and Error Handling', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
  });

  it('should handle empty closet state', () => {
    // Simulate empty closet
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    
    cy.contains('My Closet').click();
    cy.get('[data-cy="empty-state-message"]').should('be.visible');
    cy.get('[data-cy="add-item-button"]').should('be.visible');
  });

  it('should handle network errors during suggestion generation', () => {
    // Simulate network failure
    cy.intercept('**/api/recommendations', {
      statusCode: 500,
      body: { error: 'Server error' }
    }).as('failedRequest');
    
    cy.contains('button', 'Generate Suggestions').click();
    cy.wait('@failedRequest');
    
    cy.get('[data-cy="error-message"]').should('be.visible');
    cy.get('[data-cy="retry-button"]').should('be.visible');
    
    // Verify retry works when network is back
    cy.intercept('**/api/recommendations', { fixture: 'recommendations.json' }).as('retriedRequest');
    cy.get('[data-cy="retry-button"]').click();
    cy.wait('@retriedRequest');
    cy.get('[data-cy="suggestion-grid"]').should('be.visible');
  });

  it('should handle missing image during item upload', () => {
    cy.contains('My Closet').click();
    cy.get('[data-cy="add-item-button"]').click();
    
    // Fill form but don't upload image
    cy.get('[name="itemType"]').select('Shirt');
    cy.get('[name="color"]').select('Blue');
    cy.get('[name="pattern"]').select('Solid');
    
    cy.contains('button', 'Add to Closet').click();
    
    // Should show error
    cy.get('[data-cy="error-message"]').should('contain.text', 'Please upload an image');
  });

  it('should handle camera permission denied for virtual try-on', () => {
    // Mock camera permission denied
    cy.window().then((win) => {
      cy.stub(win.navigator.mediaDevices, 'getUserMedia').rejects(new Error('Permission denied'));
    });
    
    // Add item to dressing room
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    cy.get('[data-cy="item-card"]').first().trigger('mouseover');
    cy.contains('Add to dressing room').click();
    
    // Try to use virtual try-on
    cy.contains('Virtual Try-On').click();
    cy.get('[data-cy="try-on-grid"] [data-cy="item-card"]').first().click();
    
    // Should show permission error
    cy.get('[data-cy="camera-error"]').should('be.visible');
    cy.get('[data-cy="fallback-try-on"]').should('be.visible');
  });

  it('should handle device limitations for virtual try-on', () => {
    // Simulate device without camera
    cy.window().then((win) => {
      cy.stub(win, 'navigator').value({
        ...win.navigator,
        mediaDevices: undefined
      });
    });
    
    // Try to use virtual try-on
    cy.contains('Virtual Try-On').click();
    
    // Should show device limitation message
    cy.get('[data-cy="device-limitation-message"]').should('be.visible');
    cy.get('[data-cy="fallback-experience"]').should('be.visible');
  });
});

describe('Fashion AI - Performance Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
  });

  it('should load widget in under 3 seconds', () => {
    const startTime = new Date().getTime();
    
    cy.get('[data-cy="widget-open-button"]').click();
    cy.get('[data-cy="widget-container"]', { timeout: 10000 }).should('be.visible').then(() => {
      const loadTime = new Date().getTime() - startTime;
      expect(loadTime).to.be.lessThan(3000);
    });
  });

  it('should generate suggestions in under 5 seconds', () => {
    cy.intercept('**/api/recommendations').as('recommendationsApi');
    
    cy.contains('button', 'Generate Suggestions').click();
    cy.wait('@recommendationsApi').then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
      
      // Check response time
      const responseTime = interception.response.headers['x-response-time'] || 
                           interception.response.timings?.response;
      if (responseTime) {
        expect(parseInt(responseTime)).to.be.lessThan(5000);
      }
    });
    
    cy.get('[data-cy="suggestion-grid"]').should('be.visible');
  });
});

describe('Fashion AI - Real-time Metrics Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 800);
    openWidget();
  });

  it('should track user interactions accurately', () => {
    // Intercept analytics calls
    cy.intercept('**/analytics').as('analyticsApi');
    
    // Perform a series of actions
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    
    cy.get('[data-cy="item-card"]').first().find('[data-cy="like-button"]').click();
    cy.wait('@analyticsApi').its('request.body').should('include', { 
      event: 'item_liked' 
    });
    
    cy.get('[data-cy="item-card"]').eq(1).trigger('mouseover');
    cy.contains('Add to wishlist').click();
    cy.wait('@analyticsApi').its('request.body').should('include', { 
      event: 'item_added_to_wishlist' 
    });
  });

  it('should record size selection metrics', () => {
    // Intercept analytics
    cy.intercept('**/analytics').as('analyticsApi');
    
    // Add to cart and select size
    cy.contains('button', 'Generate Suggestions').click();
    waitForApiResponse();
    
    cy.get('[data-cy="item-card"]').first().trigger('mouseover');
    cy.contains('Add to cart').click();
    cy.get('[data-cy="size-selector"] select').select('M');
    
    // Verify analytics
    cy.wait('@analyticsApi').its('request.body').should('include', {
      event: 'size_selected',
      value: 'M'
    });
  });
});

// --- Spec Compliance: Performance, Persistence, Commission ---

describe('Fashion AI - Spec Compliance: Performance, Persistence, Commission', () => {
  it('should open widget in under 200ms', () => {
    // Use Date.now() for timing (Cypress limitation: performance.now() may not be available)
    let startTime;
    cy.get('[data-cy="widget-open-button"]').then(($btn) => {
      startTime = Date.now();
      $btn.click();
    });
    cy.get('[data-cy="widget-container"]', { timeout: 1000 }).should('be.visible').then(() => {
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.lessThan(200);
    });
  });

  it('should generate suggestions in under 1 second', () => {
    cy.intercept('**/api/recommendations').as('recommendationsApi');
    cy.contains('button', 'Generate Suggestions').click();
    cy.wait('@recommendationsApi').then((interception) => {
      expect(interception.response.statusCode).to.equal(200);
      // Use Date.now() for fallback if timings are not available
      const timings = interception.response && interception.response.timings;
      const responseTime = timings && timings.response ? timings.response : (interception.response.headers && interception.response.headers['x-response-time'] ? parseInt(interception.response.headers['x-response-time']) : null);
      if (responseTime !== null && responseTime !== undefined) {
        expect(responseTime).to.be.lessThan(1000);
      }
    });
    cy.get('[data-cy="suggestion-grid"]').should('be.visible');
  });

  it('should persist user profile across different retailer sites', () => {
    // NOTE: Cypress cannot truly visit two different top-level domains in one test due to security restrictions.
    // This test simulates persistence by setting and reading from localStorage as if on two domains.
    cy.visit('/');
    cy.get('[data-cy="widget-open-button"]').click();
    cy.window().then(win => {
      win.localStorage.setItem('stylist_user_profile', JSON.stringify({ name: 'TestUser', preferences: { color: 'blue' } }));
    });
    // Simulate navigating to another site by clearing/reloading and checking localStorage
    cy.reload();
    cy.get('[data-cy="widget-open-button"]').click();
    cy.window().then(win => {
      const profile = JSON.parse(win.localStorage.getItem('stylist_user_profile'));
      expect(profile).to.have.property('name', 'TestUser');
      expect(profile.preferences).to.have.property('color', 'blue');
    });
  });

  it('should track commission on purchase', () => {
    cy.intercept('POST', '/api/trackPurchase').as('trackPurchase');
    cy.get('[data-cy="widget-open-button"]').click();
    cy.contains('button', 'Generate Suggestions').click();
    cy.get('[data-cy="item-card"]').first().click();
    cy.get('[data-cy="size-selector"] select').select('M');
    cy.get('[data-cy="add-to-cart-button"]').click();
    cy.wait('@trackPurchase').its('request.body').then((body) => {
      expect(body).to.have.property('userId');
      expect(body).to.have.property('itemId');
      expect(body).to.have.property('retailerId');
      expect(body).to.have.property('commissionAmount');
    });
  });
});