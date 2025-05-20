import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorMessage.scss';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnChange?: any[];
  errorClassName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * A robust error boundary component to gracefully handle errors in child components
 * Prevents the entire application from crashing when a component fails
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  // Reset error state when specified props change
  componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && this.props.resetOnChange) {
      const didResetDependenciesChange = 
        this.props.resetOnChange.some(
          (dep, i) => dep !== (prevProps.resetOnChange || [])[i]
        );
      
      if (didResetDependenciesChange) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Either use the provided fallback or render a default error UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className={`stylist-error-container ${this.props.errorClassName || ''}`}>
          <div className="stylist-error-message">
            <h3>Something went wrong</h3>
            <p>The widget had trouble loading this component.</p>
            <button
              onClick={this.resetErrorBoundary}
              className="stylist-error-retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;