// This script registers a service worker for offline capability and caching
// It's separated from the main bundle to avoid impacting initial load time

// Only register in production and if service workers are supported
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  // Wait until page load to register service worker to avoid impact on TTI
  window.addEventListener('load', function() {
    // Register the service worker from the root of the site
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
        
        // Optional: Set up a listener for service worker updates
        registration.addEventListener('updatefound', function() {
          // A new service worker is installing
          const newWorker = registration.installing;
          
          // Track state changes
          newWorker.addEventListener('statechange', function() {
            // When the service worker is installed, notify the user about the update
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // At this point, the old content will have been purged and the 
              // fresh content will have been added to the cache.
              console.log('New content is available; please refresh.');
              
              // Optional: Show a notification to the user
              if (window.__STYLIST_WIDGET_INITIALIZED && typeof window.StylistWidget === 'object') {
                // You could trigger an update notification within the widget UI here
              }
            }
          });
        });
      })
      .catch(function(error) {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// Preload key resources
// The browser will fetch these resources before they're needed
document.addEventListener('DOMContentLoaded', function() {
  // Don't preload if the user has data saver enabled
  if (navigator.connection && navigator.connection.saveData) {
    console.log('Data saver enabled, skipping preloading');
    return;
  }
  
  // Preload critical assets with low priority
  const preloadURLs = [
    // Main app chunks that will likely be needed but not immediately
    '/stylist-feature-social.js',
    '/stylist-feature-quiz.js', 
    '/stylist-feature-lookbook.js'
  ];
  
  // Perform preloading with a small delay to not impact initial page load
  setTimeout(() => {
    preloadURLs.forEach(url => {
      try {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = url.endsWith('.js') ? 'script' : 
                 url.endsWith('.css') ? 'style' : 
                 'fetch';
        document.head.appendChild(link);
      } catch (e) {
        // Silently fail if preload fails
      }
    });
  }, 3000); // 3 second delay
});