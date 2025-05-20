# Stylist Widget Troubleshooting Guide

This document provides solutions for common issues you might encounter when setting up, configuring, or using the Stylist Widget.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Widget Not Appearing](#widget-not-appearing)
3. [Authentication Problems](#authentication-problems)
4. [Performance Issues](#performance-issues)
5. [Styling and UI Problems](#styling-and-ui-problems)
6. [API Connection Issues](#api-connection-issues)
7. [Feature-Specific Troubleshooting](#feature-specific-troubleshooting)
8. [Browser Compatibility](#browser-compatibility)
9. [Mobile Device Issues](#mobile-device-issues)
10. [Debug Mode and Tools](#debug-mode-and-tools)

## Installation Issues

### Missing Dependencies

**Problem:** The widget fails to install due to missing dependencies.

**Solution:**
1. Ensure you have Node.js v16+ and npm v7+ installed:
   ```bash
   node -v
   npm -v
   ```
2. If using yarn, verify your yarn version:
   ```bash
   yarn -v
   ```
3. Try clearing your npm or yarn cache:
   ```bash
   npm cache clean --force
   # or
   yarn cache clean
   ```
4. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   # or
   yarn install
   ```

### Build Errors

**Problem:** The build process fails with errors.

**Solution:**
1. Check your Node.js version to ensure compatibility.
2. Verify that all required dependencies are installed.
3. Check for TypeScript errors:
   ```bash
   npm run typecheck
   # or
   yarn typecheck
   ```
4. Clear the build cache and retry:
   ```bash
   npm run clean
   npm run build
   # or
   yarn clean
   yarn build
   ```

## Widget Not Appearing

### Initialization Issues

**Problem:** The widget script loads but doesn't appear on the page.

**Solution:**
1. Check the browser console for errors.
2. Verify that your API key and retailer ID are correct.
3. Make sure the initialization code runs after the DOM is loaded:
   ```javascript
   document.addEventListener('DOMContentLoaded', function() {
     Stylist.init({
       apiKey: 'YOUR_API_KEY',
       retailerId: 'YOUR_RETAILER_ID'
     });
   });
   ```
4. Check if there are any CSS conflicts preventing the widget from displaying:
   ```javascript
   // Add this to see if the widget container exists
   console.log(document.querySelector('.stylist-chat-widget'));
   ```

### Content Security Policy (CSP) Issues

**Problem:** The widget doesn't load due to Content Security Policy restrictions.

**Solution:**
1. Update your website's CSP to allow loading scripts from the Stylist CDN:
   ```
   script-src 'self' https://cdn.stylist.ai;
   style-src 'self' 'unsafe-inline' https://cdn.stylist.ai;
   img-src 'self' data: https://*.stylist.ai;
   connect-src 'self' https://api.stylist.ai;
   ```
2. If you're self-hosting, ensure your CSP allows loading from your domain.

## Authentication Problems

### Invalid API Key

**Problem:** You receive an "Invalid API Key" error.

**Solution:**
1. Double-check your API key in the Stylist dashboard.
2. Ensure there are no extra spaces or characters in the key.
3. Verify that the API key has the correct permissions.
4. Try regenerating the API key in the dashboard.

### Retailer ID Issues

**Problem:** The widget fails to initialize due to an invalid retailer ID.

**Solution:**
1. Verify your retailer ID in the Stylist dashboard.
2. Ensure the retailer account is active and in good standing.
3. Check if the retailer has the necessary subscriptions for the widget.

## Performance Issues

### Slow Loading

**Problem:** The widget takes too long to load.

**Solution:**
1. Enable lazy loading in your configuration:
   ```javascript
   Stylist.init({
     // Other config
     lazyLoad: true
   });
   ```
2. Use the production build for smaller file size:
   ```html
   <script src="https://cdn.stylist.ai/widget/latest/stylist-widget.min.js"></script>
   ```
3. Preload the widget script for better performance:
   ```html
   <link rel="preload" href="https://cdn.stylist.ai/widget/latest/stylist-widget.js" as="script">
   ```
4. Consider using a faster CDN or self-hosting the widget files on your own CDN.

### Memory Usage

**Problem:** The widget uses too much memory, especially on mobile devices.

**Solution:**
1. Disable features that are not essential for your use case:
   ```javascript
   Stylist.init({
     // Other config
     enableVirtualTryOn: false, // If not needed
     enableHeavyFeatures: false
   });
   ```
2. Set lower quality settings for image processing:
   ```javascript
   Stylist.init({
     // Other config
     imageQuality: 'medium' // Options: low, medium, high
   });
   ```

## Styling and UI Problems

### Widget Style Conflicts

**Problem:** The widget styling conflicts with your website's CSS.

**Solution:**
1. Use the isolation mode to prevent CSS leakage:
   ```javascript
   Stylist.init({
     // Other config
     cssIsolation: true
   });
   ```
2. Add a custom class prefix to avoid selector conflicts:
   ```javascript
   Stylist.init({
     // Other config
     classPrefix: 'my-store-stylist'
   });
   ```
3. Check your website's CSS for any `!important` rules that might override the widget styles.

### Responsive Design Issues

**Problem:** The widget doesn't display correctly on different screen sizes.

**Solution:**
1. Ensure you're using the latest version of the widget.
2. Try different position settings:
   ```javascript
   Stylist.init({
     // Other config
     position: 'bottom-left' // Try different positions
   });
   ```
3. Check if your website has any CSS that affects fixed positioning.
4. Manually set the widget size for problematic screen sizes:
   ```javascript
   Stylist.init({
     // Other config
     responsive: {
       mobile: {
         width: '90%',
         height: '70%'
       },
       tablet: {
         width: '400px',
         height: '600px'
       }
     }
   });
   ```

## API Connection Issues

### Network Errors

**Problem:** The widget can't connect to the Stylist API.

**Solution:**
1. Check your internet connection.
2. Verify that the API endpoint is correct:
   ```javascript
   Stylist.init({
     // Other config
     apiUrl: 'https://api.stylist.ai' // Default API endpoint
   });
   ```
3. Check if your network blocks the API endpoints.
4. Enable offline mode to provide basic functionality when offline:
   ```javascript
   Stylist.init({
     // Other config
     enableOfflineMode: true
   });
   ```

### CORS Issues

**Problem:** You see Cross-Origin Resource Sharing (CORS) errors in the console.

**Solution:**
1. Ensure your domain is whitelisted in the Stylist dashboard.
2. Check that you're using the correct API endpoint for your region.
3. If self-hosting, verify that your server includes the appropriate CORS headers.

## Feature-Specific Troubleshooting

### Virtual Try-On Issues

**Problem:** The virtual try-on feature doesn't work properly.

**Solution:**
1. Check if WebGL is supported in the browser:
   ```javascript
   Stylist.checkWebGLSupport().then(supported => {
     if (!supported) {
       console.warn('WebGL not supported for virtual try-on');
     }
   });
   ```
2. Verify that the user has granted camera permissions.
3. Try with different image formats and sizes.
4. If all else fails, disable the feature:
   ```javascript
   Stylist.init({
     // Other config
     enableVirtualTryOn: false
   });
   ```

### Style Quiz Issues

**Problem:** The style quiz doesn't save user preferences.

**Solution:**
1. Check if cookies or localStorage are enabled in the browser.
2. Verify that the user is logged in (if your implementation requires authentication).
3. Try clearing the quiz data and starting fresh:
   ```javascript
   Stylist.clearQuizData();
   ```

## Browser Compatibility

### Unsupported Browsers

**Problem:** The widget doesn't work in older browsers.

**Solution:**
1. The widget officially supports:
   - Chrome (latest 2 versions)
   - Firefox (latest 2 versions)
   - Safari (latest 2 versions)
   - Edge (latest 2 versions)
2. For IE11 support, add polyfills:
   ```html
   <script src="https://cdn.stylist.ai/polyfills/ie11.js"></script>
   ```
3. Use the compatibility mode for broader browser support:
   ```javascript
   Stylist.init({
     // Other config
     compatibilityMode: true // Adds extra polyfills and fallbacks
   });
   ```

### Safari-Specific Issues

**Problem:** Features like image upload don't work in Safari.

**Solution:**
1. Check if Intelligent Tracking Prevention is blocking storage access.
2. Ensure that your Safari version is supported (Safari 13+).
3. Use the Safari-specific optimization:
   ```javascript
   Stylist.init({
     // Other config
     safariOptimization: true
   });
   ```

## Mobile Device Issues

### Touch Interaction Problems

**Problem:** Touch interactions don't work properly on mobile devices.

**Solution:**
1. Ensure your viewport meta tag is correctly set:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
   ```
2. Enable mobile optimization:
   ```javascript
   Stylist.init({
     // Other config
     mobileOptimized: true
   });
   ```

### Keyboard Issues on Mobile

**Problem:** The keyboard covers the input field on mobile devices.

**Solution:**
1. Enable the auto-scroll feature:
   ```javascript
   Stylist.init({
     // Other config
     autoScrollOnKeyboard: true
   });
   ```
2. Set a custom position for mobile:
   ```javascript
   Stylist.init({
     // Other config
     mobilePosition: 'top' // Options: top, bottom
   });
   ```

## Debug Mode and Tools

### Enabling Debug Mode

To troubleshoot issues more effectively, enable debug mode:

```javascript
Stylist.init({
  // Other config
  showDebugToggle: true
});
```

or add a URL parameter:

```
https://your-website.com/?stylist_debug=true
```

### Using the Debug Console

Once debug mode is enabled:

1. Click the debug icon in the bottom-left corner of the widget.
2. The debug panel will show:
   - Network status
   - API connection status
   - Widget component rendering status
   - Error messages
   - Performance metrics

### Logging Error Data

For advanced troubleshooting, enable detailed logging:

```javascript
Stylist.init({
  // Other config
  debugging: {
    logLevel: 'verbose', // Options: error, warn, info, verbose
    sendLogs: true // Send logs to your support team
  },
  onError: function(error) {
    console.error('Stylist Widget Error:', error);
    // Send to your error tracking system
    if (window.errorTracker) {
      window.errorTracker.captureException(error);
    }
  }
});
```

### Getting Support

If you're still experiencing issues after trying these solutions:

1. Generate a diagnostic report:
   ```javascript
   Stylist.generateDiagnosticReport().then(report => {
     console.log('Diagnostic Report:', report);
     // Copy this report when contacting support
   });
   ```

2. Contact Stylist support with:
   - Your diagnostic report
   - Browser and device information
   - Steps to reproduce the issue
   - Error messages from the console