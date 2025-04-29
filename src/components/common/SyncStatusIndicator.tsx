// Component for displaying sync status
import React from 'react';
import { useSyncContext } from '../../services/SyncProvider';
import './SyncStatusIndicator.scss';

export const SyncStatusIndicator: React.FC = () => {
  const { syncState, isOnline, isSlowConnection } = useSyncContext();
  
  // Don't show anything if there are no pending operations
  if (syncState.pendingOperations === 0 && !syncState.isSyncing) {
    return null;
  }
  
  // Determine the indicator state
  let status: 'syncing' | 'pending' | 'offline' = 'syncing';
  let message = 'Syncing...';
  
  if (!isOnline) {
    status = 'offline';
    message = `${syncState.pendingOperations} change${syncState.pendingOperations !== 1 ? 's' : ''} pending`;
  } else if (syncState.isSyncing) {
    status = 'syncing';
    message = 'Syncing...';
  } else if (syncState.pendingOperations > 0) {
    status = 'pending';
    message = `${syncState.pendingOperations} change${syncState.pendingOperations !== 1 ? 's' : ''} pending`;
  }
  
  return (
    <div className={`sync-status-indicator sync-status-${status}`}>
      <div className="sync-status-icon">
        {status === 'syncing' && (
          <svg className="sync-spinner" viewBox="0 0 24 24">
            <circle className="sync-spinner-path" cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4"></circle>
          </svg>
        )}
        {status === 'pending' && <span>⏱️</span>}
        {status === 'offline' && <span>📴</span>}
      </div>
      <span className="sync-status-message">{message}</span>
    </div>
  );
};

export default SyncStatusIndicator;