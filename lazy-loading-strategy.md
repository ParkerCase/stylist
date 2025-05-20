# Stylist Widget Lazy Loading Strategy

This document outlines the implementation of lazy loading in the Stylist Widget to improve initial load time and overall performance.

## Overview

The StylistWidget suffered from slow initial loading due to all components being loaded upfront (~1MB+), even if most features weren't immediately used. The optimization introduces code splitting and lazy loading to ensure only essential components are loaded at startup, while other components are loaded on demand.

## Implementation Details

### Feature Flag

A global feature flag has been added to easily toggle lazy loading on or off:

```typescript
// In src/index.tsx
export const USE_LAZY_LOADING = true; // Set to false to disable lazy loading
```

### Components Structure

The code has been organized into:

1. **Essential Components** (Loaded Immediately):
   - ChatWidget (core functionality)
   - FloatingButton
   - SyncStatusIndicator

2. **Non-Essential Components** (Loaded On-Demand):
   - Lookbook
   - TryOnModal / VirtualTryOn
   - StyleQuizModal
   - Other advanced features

### Webpack Configuration

The webpack configuration has been updated to support efficient code splitting:

```javascript
// In webpack.config.js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // ... existing groups
      features: {
        test: /[\\/]src[\\/]components[\\/](VirtualTryOn|StyleQuiz|Lookbook|SocialProofModal)[\\/]/,
        name: "features",
        chunks: "async",
        minChunks: 1,
        priority: 5
      }
    }
  },
  runtimeChunk: "single"
}
```

### Utility Component

A new `AsyncComponentLoader` utility has been created to handle lazy loading consistently:

```typescript
// In src/components/common/AsyncComponentLoader.tsx
import React, { Suspense } from 'react';
import LoadingIndicator from './LoadingIndicator';
import { USE_LAZY_LOADING } from '../../index';

interface AsyncComponentLoaderProps {
  children: React.ReactNode;
  loadingMessage?: string;
  fallback?: React.ReactNode;
}

const AsyncComponentLoader: React.FC<AsyncComponentLoaderProps> = ({ 
  children, 
  loadingMessage = 'Loading...', 
  fallback 
}) => {
  // If lazy loading is disabled, render children directly
  if (!USE_LAZY_LOADING) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={fallback || <LoadingIndicator message={loadingMessage} />}>
      {children}
    </Suspense>
  );
};
```

## Modified Files

1. **/src/index.tsx**
   - Added `USE_LAZY_LOADING` feature flag
   
2. **/src/components/common/AsyncComponentLoader.tsx**
   - Created new utility component
   
3. **/src/StylistWidget.tsx**
   - Implemented lazy loading for main widget
   - Added feature flag conditional rendering

4. **/src/components/ChatWidget/ChatWidget.tsx**
   - Implemented lazy loading for feature components
   - Used conditional rendering based on feature flag

5. **/src/components/VirtualTryOn/VirtualTryOn.tsx**
   - Optimized model loading to occur only when component is visible
   - Added visibility detection

6. **/webpack.config.js**
   - Updated with improved code splitting configuration

## How to Use

### Toggling Lazy Loading

To disable lazy loading and revert to the original eager loading behavior:

1. Set the feature flag to `false`:
```typescript
// In src/index.tsx
export const USE_LAZY_LOADING = false;
```

2. Rebuild the application:
```bash
npm run build
```

### Rollback Strategy

If issues arise with the lazy loading implementation:

1. Revert to the backup branch:
```bash
git checkout pre-optimization-backup
```

2. Or simply disable the feature flag as described above.

## Performance Impact

With lazy loading enabled:

1. **Initial Load**: Only essential components are loaded (~300KB instead of ~1MB+)
2. **Feature Loading**: Features are loaded on demand when:
   - User switches to lookbook view
   - User opens style quiz
   - User starts virtual try-on

3. **Visual Feedback**: Loading indicators are shown during feature loading

## Testing Checklist

- [x] Verify that the widget initializes correctly with lazy loading enabled
- [x] Verify all features work properly when accessed for the first time
- [x] Verify subsequent accesses to the same feature don't trigger reloading
- [x] Verify lazy loading can be disabled with the feature flag
- [x] Measure and compare initial load time with and without lazy loading

## Additional Optimizations

1. **VirtualTryOn Component**:
   - Model loading is deferred until the component is visible
   - Background removal tools are loaded on demand

2. **Webpack Splitting**:
   - Feature modules are separated for better caching
   - Vendors bundle is optimized for shared dependencies