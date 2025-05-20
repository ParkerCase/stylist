import React, { useState, useEffect } from 'react';
import { setMockDataMode } from '../../mock-data';
import { FORCE_DEMO_MODE } from '../../utils/environment';
import './MockDataToggle.scss';

/**
 * A toggle switch component to enable/disable mock data mode
 * Only visible in development mode or when forced demo mode is enabled
 */
const MockDataToggle: React.FC = () => {
  // Initialize state based on localStorage
  const [isMockEnabled, setIsMockEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('STYLIST_DATA_MODE') === 'demo';
    } catch (e) {
      return false;
    }
  });

  // Update state when localStorage changes (for sync across tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'STYLIST_DATA_MODE') {
        setIsMockEnabled(e.newValue === 'demo');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Toggle the mock data mode
  const toggleMockData = () => {
    const newValue = !isMockEnabled;
    setIsMockEnabled(newValue);
    setMockDataMode(newValue);
  };

  // Only show in development or when forced demo mode is enabled
  if (process.env.NODE_ENV !== 'development' && !FORCE_DEMO_MODE) {
    return null;
  }

  return (
    <div className="stylist-mock-data-toggle">
      <div className="toggle-container">
        <span className="toggle-label">Mock Data</span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isMockEnabled}
            onChange={toggleMockData}
            aria-label="Toggle mock data"
          />
          <span className="toggle-slider"></span>
        </label>
        <div className={`toggle-status ${isMockEnabled ? 'enabled' : 'disabled'}`}>
          {isMockEnabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>
      {isMockEnabled && (
        <div className="mock-data-message">
          Using mock data for API requests
        </div>
      )}
    </div>
  );
};

export default MockDataToggle;