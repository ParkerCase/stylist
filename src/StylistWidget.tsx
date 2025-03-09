// The Stylist Widget main component

import React, { useEffect } from 'react';
import ChatWidget from '@components/ChatWidget';
import { useChatStore } from '@store/index';
import './styles/global.scss';

interface StylistWidgetProps {
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  greeting?: string;
}

const StylistWidget: React.FC<StylistWidgetProps> = (props) => {
  const { isOpen } = useChatStore();
  
  // Inject CSS variables for theme colors
  useEffect(() => {
    if (props.primaryColor) {
      document.documentElement.style.setProperty('--stylist-primary-color', props.primaryColor);
      
      // Generate lighter and darker variants
      document.documentElement.style.setProperty(
        '--stylist-primary-color-light',
        lightenColor(props.primaryColor, 0.2)
      );
      
      document.documentElement.style.setProperty(
        '--stylist-primary-color-dark',
        darkenColor(props.primaryColor, 0.2)
      );
    }
  }, [props.primaryColor]);
  
  // Helper function to lighten a color
  const lightenColor = (color: string, amount: number): string => {
    try {
      // Remove the # if present
      color = color.replace('#', '');
      
      // Parse the color
      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);
      
      // Lighten each component
      const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
      const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
      const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
      
      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return color;
    }
  };
  
  // Helper function to darken a color
  const darkenColor = (color: string, amount: number): string => {
    try {
      // Remove the # if present
      color = color.replace('#', '');
      
      // Parse the color
      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);
      
      // Darken each component
      const newR = Math.max(0, Math.floor(r * (1 - amount)));
      const newG = Math.max(0, Math.floor(g * (1 - amount)));
      const newB = Math.max(0, Math.floor(b * (1 - amount)));
      
      // Convert back to hex
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch (error) {
      return color;
    }
  };
  
  // Only render the widget when it's open
  if (!isOpen) {
    return null;
  }
  
  return <ChatWidget {...props} />;
};

export default StylistWidget;
