// E-commerce platform detector script
(function() {
  // Detect if we're on a supported e-commerce platform
  function detectEcommercePlatform() {
    // Check for common e-commerce platforms
    let platformDetected = false;
    
    // Check meta tags for platform indicators
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(tag => {
      const content = tag.getAttribute('content') || '';
      if (content.includes('Shopify') || content.includes('WooCommerce')) {
        platformDetected = true;
      }
    });
    
    // Check for platform-specific DOM elements
    if (document.querySelector('.shopify-section')) {
      platformDetected = true;
    }
    
    if (document.querySelector('.woocommerce')) {
      platformDetected = true;
    }
    
    // Check for product pages
    const isProductPage = document.querySelector('[data-product-id]') || 
                          document.querySelector('.product') ||
                          document.querySelector('.product-single') ||
                          document.querySelector('[data-product]') ||
                          document.querySelector('[itemprop="offers"]') ||
                          document.getElementById('product-details');
    
    // Check if we have product image and price indicators
    const hasProductImages = document.querySelector('.product-image') || 
                            document.querySelector('.product-gallery') ||
                            document.querySelector('[data-product-image]') ||
                            document.querySelector('[data-image-zoom]');
    
    const hasPriceElement = document.querySelector('.price') ||
                           document.querySelector('[data-price]') ||
                           document.querySelector('[itemprop="price"]');
    
    // Check for known shopping sites by URL patterns
    const knownShoppingSites = [
      'amazon', 'shopify', 'etsy', 'ebay', 'walmart', 'target', 
      'nordstrom', 'macys', 'asos', 'zara', 'hm', 'forever21',
      'adidas', 'nike', 'shop', 'store', 'buy', 'product'
    ];
    
    const isKnownShoppingSite = knownShoppingSites.some(site => {
      return window.location.hostname.includes(site) || window.location.pathname.includes(site);
    });
    
    // Consider this a shopping page if multiple indicators are found
    return platformDetected || 
           (isProductPage && (hasProductImages || hasPriceElement)) || 
           isKnownShoppingSite;
  }
  
  // Check if we should inject the widget
  function shouldInjectWidget() {
    // Don't inject on the widget itself
    if (window.location.hostname === 'thestylist.ai') {
      return false;
    }
    
    // Always inject on localhost for development
    if (window.location.hostname === 'localhost') {
      return true;
    }
    
    // On other sites, only inject if it's a shopping site
    return detectEcommercePlatform();
  }
  
  // This function injects the Stylist Widget
  function injectStylistWidget() {
    // Create the script element to inject the widget
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.async = true;
    script.onload = function() {
      // Script has loaded, it will self-initialize
      script.remove(); // Remove script tag after execution (optional)
    };
    
    // Add to document
    (document.head || document.documentElement).appendChild(script);
    
    // Also notify the background script that we've injected
    chrome.runtime.sendMessage({ action: 'widgetInjected', url: window.location.href });
  }
  
  // Main execution
  if (shouldInjectWidget()) {
    // Wait for the page to be fully loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      injectStylistWidget();
    } else {
      window.addEventListener('DOMContentLoaded', injectStylistWidget);
    }
  }
})();