import React, { useState, useEffect } from 'react';
import { getDebugMode, toggleDebugMode, addDebugModeListener } from '../../utils/debugMode';
import './DebugModeToggle.scss';

/**
 * DebugModeToggle component
 * 
 * A small floating button that allows toggling debug mode.
 * When debug mode is enabled, additional debugging information is shown throughout the app.
 */
const DebugModeToggle: React.FC = () => {
  const [isDebugMode, setIsDebugMode] = useState<boolean>(getDebugMode());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    // Listen for debug mode changes from other components
    const cleanupListener = addDebugModeListener((debugModeState) => {
      setIsDebugMode(debugModeState);
    });

    return cleanupListener;
  }, []);

  const handleToggle = () => {
    const newDebugMode = toggleDebugMode();
    setIsDebugMode(newDebugMode);
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="stylist-debug-toggle-container">
      {isExpanded && (
        <div className="stylist-debug-panel">
          <h4>Debug Panel</h4>
          <div className="stylist-debug-toggle">
            <label className="stylist-debug-toggle-label">
              <span>Debug Mode</span>
              <div 
                className={`stylist-debug-toggle-switch ${isDebugMode ? 'active' : ''}`} 
                onClick={handleToggle}
              >
                <div className="stylist-debug-toggle-slider"></div>
              </div>
            </label>
          </div>
          <div className="stylist-debug-info">
            <div className="stylist-debug-info-item">
              <span>Screen Size:</span>
              <span>{window.innerWidth}x{window.innerHeight}</span>
            </div>
            <div className="stylist-debug-info-item">
              <span>User Agent:</span>
              <span className="stylist-debug-user-agent">{navigator.userAgent}</span>
            </div>
            <div className="stylist-debug-info-item">
              <span>WebGL:</span>
              <span>{(() => {
                try {
                  const canvas = document.createElement('canvas');
                  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                  return gl ? 'Supported' : 'Not Supported';
                } catch (e) {
                  return 'Error Checking';
                }
              })()}</span>
            </div>
          </div>
        </div>
      )}
      <button 
        className={`stylist-debug-button ${isDebugMode ? 'active' : ''}`}
        onClick={handleExpand}
        title="Debug Tools"
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path 
            fill="currentColor" 
            d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-4.987-3.744A7.966 7.966 0 0 0 12 20c1.97 0 3.773-.712 5.167-1.892A6.979 6.979 0 0 1 12.16 16a6.981 6.981 0 0 1-5.147 2.256zM5.616 16.82A8.975 8.975 0 0 1 12.16 14a8.972 8.972 0 0 1 6.362 2.634 8 8 0 1 0-12.906.187zM12 13a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
          />
        </svg>
      </button>
    </div>
  );
};

export default DebugModeToggle;