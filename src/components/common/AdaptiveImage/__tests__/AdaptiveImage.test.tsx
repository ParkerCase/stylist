import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AdaptiveImage from '../AdaptiveImage';
import { getDeviceCapabilities } from '../../../../utils/deviceCapabilities';

// Mock device capabilities
jest.mock('../../../../utils/deviceCapabilities', () => ({
  getDeviceCapabilities: jest.fn().mockReturnValue({
    getAdaptiveQuality: jest.fn().mockReturnValue('medium'),
    isHighEndDevice: jest.fn().mockReturnValue(false),
    hasGoodNetwork: jest.fn().mockReturnValue(true)
  })
}));

// Mock performance monitor
jest.mock('../../../../utils/performanceMonitoring', () => ({
  performanceMonitor: {
    recordImageLoad: jest.fn(),
    recordImageError: jest.fn()
  }
}));

describe('AdaptiveImage', () => {
  const originalSrc = 'https://example.com/image.jpg';
  const altText = 'Test image';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders with placeholder while loading', () => {
    render(<AdaptiveImage src={originalSrc} alt={altText} />);
    
    // Should have a placeholder element
    const placeholder = document.querySelector('.adaptive-image__placeholder');
    expect(placeholder).toBeInTheDocument();
    
    // Image should exist but not be visible yet
    const img = screen.getByAltText(altText);
    expect(img).toBeInTheDocument();
    expect(img).not.toHaveClass('visible');
  });
  
  it('shows image and removes placeholder when loaded', async () => {
    render(<AdaptiveImage src={originalSrc} alt={altText} />);
    
    const img = screen.getByAltText(altText);
    
    // Simulate image load
    img.dispatchEvent(new Event('load'));
    
    await waitFor(() => {
      expect(img).toHaveClass('visible');
      
      // Container should have loaded class
      const container = document.querySelector('.adaptive-image');
      expect(container).toHaveClass('loaded');
    });
  });
  
  it('applies correct loading attribute based on priority', () => {
    // Test with high priority (eager loading)
    const { rerender } = render(
      <AdaptiveImage src={originalSrc} alt={altText} loadingPriority="high" />
    );
    
    let img = screen.getByAltText(altText);
    expect(img).toHaveAttribute('loading', 'eager');
    
    // Test with low priority (lazy loading)
    rerender(
      <AdaptiveImage src={originalSrc} alt={altText} loadingPriority="low" />
    );
    
    img = screen.getByAltText(altText);
    expect(img).toHaveAttribute('loading', 'lazy');
  });
  
  it('calls onLoad callback when image loads', () => {
    const onLoadMock = jest.fn();
    
    render(<AdaptiveImage src={originalSrc} alt={altText} onLoad={onLoadMock} />);
    
    const img = screen.getByAltText(altText);
    img.dispatchEvent(new Event('load'));
    
    expect(onLoadMock).toHaveBeenCalledTimes(1);
  });
  
  it('calls onError callback and shows fallback when image fails to load', () => {
    const onErrorMock = jest.fn();
    const placeholderSrc = 'data:image/png;base64,placeholder';
    
    render(
      <AdaptiveImage 
        src={originalSrc} 
        alt={altText} 
        onError={onErrorMock} 
        placeholderSrc={placeholderSrc}
      />
    );
    
    const img = screen.getByAltText(altText);
    img.dispatchEvent(new Event('error'));
    
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    
    // The image source should be changed to placeholder
    expect(img).toHaveAttribute('src', placeholderSrc);
    
    // Container should have error class
    const container = document.querySelector('.adaptive-image');
    expect(container).toHaveClass('error');
  });
  
  it('applies custom width, height and class name', () => {
    const className = 'custom-class';
    const width = '200px';
    const height = '150px';
    
    render(
      <AdaptiveImage 
        src={originalSrc} 
        alt={altText} 
        className={className}
        width={width}
        height={height}
      />
    );
    
    const container = document.querySelector('.adaptive-image');
    expect(container).toHaveClass(className);
    expect(container).toHaveStyle(`width: ${width}`);
    expect(container).toHaveStyle(`height: ${height}`);
  });
});