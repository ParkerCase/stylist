// Main entry point for the widget

import React from 'react';
import { createRoot } from 'react-dom/client';
import StylistWidget from './StylistWidget';

// Create a container for the widget if it doesn't exist
const stylistContainer = document.getElementById('stylist-widget-container') || createWidgetContainer();

// Create root for React rendering
const root = createRoot(stylistContainer);

// Get configuration from the global object
const config = window.__StylistWidgetConfig || {
  apiKey: 'demo_key',
  retailerId: 'demo_retailer'
};

// Render the widget
root.render(
  <React.StrictMode>
    <StylistWidget {...config} />
  </React.StrictMode>
);

// Helper function to create the widget container
function createWidgetContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'stylist-widget-container';
  document.body.appendChild(container);
  return container;
}

// Export the StylistWidget component for direct use
export default StylistWidget;
