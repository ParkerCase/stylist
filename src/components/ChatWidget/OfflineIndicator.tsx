import React, { useState, useEffect } from 'react';

// Add missing type if not present
interface OfflineIndicatorProps {
  isOffline: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOffline
}) => {
  // All hooks must be called before any return
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [isOffline]);

  // Only render if offline
  const shouldRender = isOffline;
  if (!shouldRender) return null;

  // Render the actual indicator (replace with real JSX if needed)
  return (
    <div className="offline-indicator">You are offline</div>
  );
};

export default OfflineIndicator; 