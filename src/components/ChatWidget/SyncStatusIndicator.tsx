import React, { useState, useEffect } from 'react';

// Add missing type if not present
interface SyncStatusIndicatorProps {
  isSyncing: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  isSyncing
}) => {
  // All hooks must be called before any return
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isSyncing) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [isSyncing]);

  // Only render if syncing
  const shouldRender = isSyncing;
  if (!shouldRender) return null;

  // Render the actual indicator (replace with real JSX if needed)
  return (
    <div className="sync-status-indicator">Syncing...</div>
  );
};

export default SyncStatusIndicator; 