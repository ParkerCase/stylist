import React, { useState } from 'react';
import { getDebugMode } from '@/utils/debug';

const DebugModeToggle: React.FC = () => {
  // All hooks must be called before any return
  const [enabled] = useState(getDebugMode());

  // Only render if debug mode is enabled
  const shouldRender = getDebugMode();
  if (!shouldRender) return null;

  // Render the actual toggle (replace with real JSX if needed)
  return (
    <div className="debug-mode-toggle">Debug Mode: {enabled ? 'On' : 'Off'}</div>
  );
};

export default DebugModeToggle; 