import React, { useEffect, useState } from 'react';
import { DATA_MODE, isMockDataEnabled, setDataMode } from './mockData';

// Function to toggle demo mode
export const toggleDemoMode = (): boolean => {
  const newMode = isMockDataEnabled() ? DATA_MODE.PRODUCTION : DATA_MODE.DEMO;
  const success = setDataMode(newMode);
  
  // Notify about the change
  if (success) {
    // Set global flag to indicate demo mode
    (window as any).__STYLIST_DEMO_MODE = newMode === DATA_MODE.DEMO;

    // Trigger a custom event that components can listen for
    const event = new CustomEvent('stylist-data-mode-change', { 
      detail: { mode: newMode }
    });
    window.dispatchEvent(event);
  }
  
  return success;
};

// Hook to subscribe to demo mode changes
export const useDemoMode = (): [boolean, () => void] => {
  const [isDemoMode, setIsDemoMode] = useState(isMockDataEnabled());
  
  // Listen for demo mode changes
  useEffect(() => {
    const handleModeChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsDemoMode(customEvent.detail.mode === DATA_MODE.DEMO);
    };
    
    window.addEventListener('stylist-data-mode-change', handleModeChange);
    
    return () => {
      window.removeEventListener('stylist-data-mode-change', handleModeChange);
    };
  }, []);
  
  const toggle = () => {
    toggleDemoMode();
    setIsDemoMode(!isDemoMode);
  };
  
  return [isDemoMode, toggle];
};

// UI Component for demo mode toggle
export const DemoModeToggle: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = '', style = {} }) => {
  const [isDemoMode, toggle] = useDemoMode();
  
  return (
    <div className={`stylist-demo-mode-toggle ${className}`} style={style}>
      <label className="stylist-demo-toggle-switch">
        <input 
          type="checkbox" 
          checked={isDemoMode} 
          onChange={toggle}
          aria-label="Toggle demo mode"
        />
        <span className="stylist-demo-toggle-slider"></span>
      </label>
      <span className="stylist-demo-toggle-label">
        {isDemoMode ? 'Demo Mode' : 'Production Mode'}
      </span>
      <style>{`
        .stylist-demo-mode-toggle {
          display: flex;
          align-items: center;
          font-family: sans-serif;
          font-size: 14px;
        }
        
        .stylist-demo-toggle-switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
          margin-right: 10px;
        }
        
        .stylist-demo-toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .stylist-demo-toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }
        
        .stylist-demo-toggle-slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .stylist-demo-toggle-slider {
          background-color: var(--stylist-primary-color, #4361ee);
        }
        
        input:checked + .stylist-demo-toggle-slider:before {
          transform: translateX(26px);
        }
        
        .stylist-demo-toggle-label {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

// Button variant with text only
export const DemoModeButton: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = '', style = {} }) => {
  const [isDemoMode, toggle] = useDemoMode();
  
  return (
    <button
      className={`stylist-demo-mode-button ${className}`}
      onClick={toggle}
      style={{
        padding: '8px 12px',
        backgroundColor: isDemoMode ? 'var(--stylist-primary-color, #4361ee)' : '#f0f0f0',
        color: isDemoMode ? 'white' : '#333',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: '14px',
        transition: 'all 0.3s ease',
        ...style
      }}
    >
      {isDemoMode ? 'Switch to Production Data' : 'Switch to Demo Data'}
    </button>
  );
};

export default {
  toggleDemoMode,
  useDemoMode,
  DemoModeToggle,
  DemoModeButton
};