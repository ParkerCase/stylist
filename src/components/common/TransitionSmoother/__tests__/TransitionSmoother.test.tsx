import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransitionSmoother from '../TransitionSmoother';
import { getAnimationComplexity } from '../../../../utils/animationUtils';

// Mock the animationUtils
jest.mock('../../../../utils/animationUtils', () => ({
  getAnimationComplexity: jest.fn().mockImplementation((options) => options.medium)
}));

// Mock device capabilities
jest.mock('../../../../utils/deviceCapabilities', () => ({
  getDeviceCapabilities: jest.fn().mockReturnValue({
    shouldEnableFeature: jest.fn().mockReturnValue(true),
    isHighEndDevice: jest.fn().mockReturnValue(true)
  })
}));

describe('TransitionSmoother', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders children when show is true', () => {
    render(
      <TransitionSmoother show={true}>
        <div data-testid="content">Test Content</div>
      </TransitionSmoother>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('does not render children when show is false and animation is complete', async () => {
    const { rerender } = render(
      <TransitionSmoother show={false}>
        <div data-testid="content">Test Content</div>
      </TransitionSmoother>
    );

    // Initially the content is not rendered
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();

    // Show the component
    rerender(
      <TransitionSmoother show={true}>
        <div data-testid="content">Test Content</div>
      </TransitionSmoother>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();

    // Hide the component
    rerender(
      <TransitionSmoother show={false}>
        <div data-testid="content">Test Content</div>
      </TransitionSmoother>
    );

    // Content is still in the document during the exit animation
    expect(screen.getByTestId('content')).toBeInTheDocument();

    // Wait for the animation to complete
    jest.advanceTimersByTime(500);

    // Content should be removed after the animation
    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });
  });

  it('applies the correct CSS classes based on type and animation state', () => {
    const { container, rerender } = render(
      <TransitionSmoother show={true} type="fade">
        <div>Test Content</div>
      </TransitionSmoother>
    );

    // Check that it has the correct classes when visible
    expect(container.firstChild).toHaveClass('transition-smoother--fade');
    expect(container.firstChild).toHaveClass('transition-smoother--enter');

    // Change to slide type
    rerender(
      <TransitionSmoother show={true} type="slide-up">
        <div>Test Content</div>
      </TransitionSmoother>
    );

    expect(container.firstChild).toHaveClass('transition-smoother--slide-up');
    expect(container.firstChild).toHaveClass('transition-smoother--enter');

    // Hide the component
    rerender(
      <TransitionSmoother show={false} type="slide-up">
        <div>Test Content</div>
      </TransitionSmoother>
    );

    expect(container.firstChild).toHaveClass('transition-smoother--slide-up');
    expect(container.firstChild).toHaveClass('transition-smoother--exit');
  });

  it('calls onEnter and onExit callbacks', () => {
    const onEnter = jest.fn();
    const onExit = jest.fn();

    const { rerender } = render(
      <TransitionSmoother show={false} onEnter={onEnter} onExit={onExit}>
        <div>Test Content</div>
      </TransitionSmoother>
    );

    // Initially not rendered, so no callbacks
    expect(onEnter).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();

    // Show the component
    rerender(
      <TransitionSmoother show={true} onEnter={onEnter} onExit={onExit}>
        <div>Test Content</div>
      </TransitionSmoother>
    );

    // Should call onEnter
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();

    // Hide the component
    rerender(
      <TransitionSmoother show={false} onEnter={onEnter} onExit={onExit}>
        <div>Test Content</div>
      </TransitionSmoother>
    );

    // Should call onExit
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('adjusts duration based on animation complexity', () => {
    // Mock for high-end devices
    (getAnimationComplexity as jest.Mock).mockReturnValueOnce('animation--high');
    
    const { container, rerender } = render(
      <TransitionSmoother show={true} duration={300}>
        <div>Test Content</div>
      </TransitionSmoother>
    );
    
    expect(container.firstChild).toHaveAttribute('style', expect.stringContaining('--transition-duration: 300ms'));
    
    // Mock for low-end devices
    (getAnimationComplexity as jest.Mock).mockReturnValueOnce('animation--low');
    
    rerender(
      <TransitionSmoother show={true} duration={300}>
        <div>Test Content</div>
      </TransitionSmoother>
    );
    
    // Should be 70% of original duration
    expect(container.firstChild).toHaveAttribute('style', expect.stringContaining('--transition-duration: 210ms'));
  });
});