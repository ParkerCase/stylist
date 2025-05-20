// src/components/common/OfflineIndicator.tsx

import React, { useState } from 'react';
import './OfflineIndicator.scss';
import useOfflineMode from '../../hooks/useOfflineMode';
import { processPendingRequests } from '../../services/offlineService';

interface OfflineIndicatorProps {
  hasOfflineData?: boolean;
  position?: 'top' | 'bottom';
  showControls?: boolean;
}

/**
 * OfflineIndicator Component
 * 
 * Displays the current network and offline mode status, with controls
 * to toggle offline mode and sync data when reconnected.
 */
const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  hasOfflineData = false,
  position = 'top',
  showControls = true
}) => {
  const { isOnline, isOfflineMode, setOfflineMode } = useOfflineMode(hasOfflineData);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Determine the status text and style
  const isOffline = !isOnline || isOfflineMode;
  const statusText = isOffline
    ? isOfflineMode
      ? 'Offline Mode'
      : 'You are offline'
    : 'Online';

  // Handle manual sync
  const handleSync = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    try {
      await processPendingRequests();
    } catch (error) {
      console.error('Failed to sync data:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle offline mode
  const toggleOfflineMode = () => {
    setOfflineMode(!isOfflineMode);
  };

  // Position class
  const positionClass = `stylist-offline-indicator--${position}`;

  return (
    <div className={`stylist-offline-indicator ${positionClass} ${isOffline ? 'stylist-offline-indicator--offline' : ''}`}>
      <div 
        className="stylist-offline-indicator__status"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="stylist-offline-indicator__status-icon">
          {isOffline ? (
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path 
                fill="currentColor" 
                d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95A5.469 5.469 0 0 1 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11A2.98 2.98 0 0 1 22 15c0 1.65-1.35 3-3 3zm-9-3.82l-2.09-2.09L6.5 13.5 10 17l6.01-6.01-1.41-1.41-4.6 4.6z" 
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path 
                fill="currentColor" 
                d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95A5.469 5.469 0 0 1 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11A2.98 2.98 0 0 1 22 15c0 1.65-1.35 3-3 3z" 
              />
            </svg>
          )}
        </div>
        <span className="stylist-offline-indicator__status-text">
          {statusText}
        </span>
        {isExpanded ? (
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path 
              fill="currentColor" 
              d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" 
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path 
              fill="currentColor" 
              d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" 
            />
          </svg>
        )}
      </div>

      {isExpanded && showControls && (
        <div className="stylist-offline-indicator__controls">
          <div className="stylist-offline-indicator__toggle">
            <span>Offline Mode</span>
            <label className="stylist-offline-indicator__toggle-switch">
              <input 
                type="checkbox"
                checked={isOfflineMode}
                onChange={toggleOfflineMode}
                disabled={!isOnline}
              />
              <span className="stylist-offline-indicator__toggle-slider"></span>
            </label>
          </div>

          {isOffline && hasOfflineData && (
            <div className="stylist-offline-indicator__info">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path 
                  fill="currentColor" 
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" 
                />
              </svg>
              <span>Showing cached data</span>
            </div>
          )}

          {isOnline && (
            <button
              className="stylist-offline-indicator__sync-btn"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
              <svg viewBox="0 0 24 24" width="16" height="16" className={isSyncing ? 'rotating' : ''}>
                <path 
                  fill="currentColor" 
                  d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" 
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;