// Popup script for the AI Stylist browser extension
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const statusElement = document.getElementById('status');
  const openWidgetBtn = document.getElementById('openWidgetBtn');
  const injectWidgetBtn = document.getElementById('injectWidgetBtn');
  const switchViewBtn = document.getElementById('switchViewBtn');
  const positionSelect = document.getElementById('positionSelect');
  const colorInput = document.getElementById('colorInput');
  const autoInjectCheckbox = document.getElementById('autoInjectCheckbox');
  
  let currentView = 'chat';
  
  // Get widget state from background script
  chrome.runtime.sendMessage({ action: 'getWidgetState' }, (state) => {
    if (state.injected) {
      statusElement.textContent = `Widget is ${state.isOpen ? 'open' : 'injected but closed'} on this page.`;
      openWidgetBtn.textContent = state.isOpen ? 'Close Widget' : 'Open Widget';
      injectWidgetBtn.disabled = true;
      injectWidgetBtn.textContent = 'Widget Already Injected';
      
      // Update view state
      currentView = state.currentView || 'chat';
      switchViewBtn.textContent = `Switch to ${currentView === 'chat' ? 'Lookbook' : 'Chat'}`;
    } else {
      statusElement.textContent = 'Widget is not injected on this page.';
      openWidgetBtn.disabled = true;
      injectWidgetBtn.disabled = false;
    }
  });
  
  // Get saved settings
  chrome.storage.sync.get(null, (settings) => {
    if (settings) {
      positionSelect.value = settings.position || 'bottom-right';
      colorInput.value = settings.primaryColor || '#4361ee';
      autoInjectCheckbox.checked = settings.autoInject !== false;
    }
  });
  
  // Open/close widget button
  openWidgetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'getWidgetState' }, (state) => {
      if (state.isOpen) {
        chrome.runtime.sendMessage({ action: 'closeWidget' });
        openWidgetBtn.textContent = 'Open Widget';
        statusElement.textContent = 'Widget is injected but closed on this page.';
      } else {
        chrome.runtime.sendMessage({ action: 'openWidget' });
        openWidgetBtn.textContent = 'Close Widget';
        statusElement.textContent = 'Widget is open on this page.';
      }
    });
  });
  
  // Force inject widget button
  injectWidgetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'forceInject' }, () => {
      statusElement.textContent = 'Injecting widget on this page...';
      
      // Check injection status after a delay
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'getWidgetState' }, (state) => {
          if (state.injected) {
            statusElement.textContent = `Widget is ${state.isOpen ? 'open' : 'injected but closed'} on this page.`;
            openWidgetBtn.disabled = false;
            openWidgetBtn.textContent = state.isOpen ? 'Close Widget' : 'Open Widget';
            injectWidgetBtn.disabled = true;
            injectWidgetBtn.textContent = 'Widget Already Injected';
          } else {
            statusElement.textContent = 'Failed to inject widget. This may not be a compatible page.';
          }
        });
      }, 1000);
    });
  });
  
  // Switch view button
  switchViewBtn.addEventListener('click', () => {
    const newView = currentView === 'chat' ? 'lookbook' : 'chat';
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'switchView', 
          view: newView 
        });
        
        currentView = newView;
        switchViewBtn.textContent = `Switch to ${newView === 'chat' ? 'Lookbook' : 'Chat'}`;
        statusElement.textContent = `Switched to ${newView} view.`;
      }
    });
  });
  
  // Position select change
  positionSelect.addEventListener('change', () => {
    updateSettings();
  });
  
  // Color input change
  colorInput.addEventListener('change', () => {
    updateSettings();
  });
  
  // Auto-inject checkbox change
  autoInjectCheckbox.addEventListener('change', () => {
    updateSettings();
  });
  
  // Update settings function
  function updateSettings() {
    const newSettings = {
      position: positionSelect.value,
      primaryColor: colorInput.value,
      autoInject: autoInjectCheckbox.checked
    };
    
    chrome.runtime.sendMessage({ 
      action: 'updateSettings', 
      settings: newSettings 
    }, () => {
      statusElement.textContent = 'Settings updated. They will apply on page refresh.';
    });
  }
});