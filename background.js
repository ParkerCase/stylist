// Background script for the AI Stylist browser extension

// Store widget state across tabs
let widgetState = {
  injected: false,
  isOpen: false,
  currentView: 'chat'
};

// Initialize extension settings
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.set({
    apiKey: 'demo_key', // Default API key for demo
    retailerId: 'demo_retailer', // Default retailer ID for demo
    position: 'bottom-right',
    primaryColor: '#4361ee',
    greeting: "Hi there! I'm your AI style assistant. How can I help you today?",
    autoInject: true, // Auto-inject the widget by default
    enabledSites: '*', // Enable on all supported sites by default
  }, () => {
    console.log('AI Stylist extension installed with default settings');
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'widgetInjected') {
    // Update widget state
    widgetState.injected = true;
    widgetState.url = message.url;
    
    // Respond with acknowledgment
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'openWidget') {
    // Send message to content script to open the widget
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'openWidget' });
        widgetState.isOpen = true;
      }
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'closeWidget') {
    // Send message to content script to close the widget
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'closeWidget' });
        widgetState.isOpen = false;
      }
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'getWidgetState') {
    // Return current widget state
    sendResponse(widgetState);
    return true;
  }
  
  if (message.action === 'forceInject') {
    // Force inject the widget on the current page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content_scripts/detector.js']
        });
      }
    });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'updateSettings') {
    // Update extension settings
    chrome.storage.sync.set(message.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'getSettings') {
    // Get extension settings
    chrome.storage.sync.get(null, (settings) => {
      sendResponse(settings);
    });
    return true;
  }
});

// Listen for tab updates to reset widget state when navigating
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Reset widget state for this tab
    widgetState.injected = false;
    widgetState.isOpen = false;
  }
});

// When browser icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (widgetState.injected) {
    // Toggle widget visibility
    if (widgetState.isOpen) {
      chrome.tabs.sendMessage(tab.id, { action: 'closeWidget' });
      widgetState.isOpen = false;
    } else {
      chrome.tabs.sendMessage(tab.id, { action: 'openWidget' });
      widgetState.isOpen = true;
    }
  } else {
    // Inject the widget first
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content_scripts/detector.js']
    });
  }
});