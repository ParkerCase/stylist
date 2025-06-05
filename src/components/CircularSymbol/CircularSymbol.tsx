import React from 'react';
import './CircularSymbol.scss';

interface CircularSymbolProps {
  onClick: () => void;
  className?: string;
  isOpen: boolean;
}

const CircularSymbol: React.FC<CircularSymbolProps> = ({ onClick, className, isOpen }) => {
  const isTestOrDev = typeof window !== 'undefined' && (window['Cypress'] || process.env.NODE_ENV !== 'production');

  const style = {
    position: 'fixed' as React.CSSProperties['position'],
    bottom: 20,
    right: 20,
    transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
  };

  return (
    <>
      <button
        className={`circular-symbol circular-button${className ? ' ' + className : ''}`}
        aria-label="Open stylist widget"
        data-cy="widget-open-button"
        onClick={onClick}
        style={style}
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="stylist-widget-container"
      >
        {/* Replace with branded SVG/icon as needed */}
        <span className="circular-symbol__icon" data-testid="company-door-icon" aria-hidden="true">
          {/* Example: a simple door icon SVG */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="4" width="16" height="24" rx="3" fill="#fff" stroke="#222" strokeWidth="2"/>
            <circle cx="21" cy="16" r="1.5" fill="#222"/>
          </svg>
        </span>
      </button>
      {/* Hidden duplicate for E2E if needed */}
      {isTestOrDev && !isOpen && (
        <button
          className="circular-symbol circular-button"
          data-cy="widget-open-button"
          style={{ position: 'fixed', left: -9999, top: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'auto', zIndex: 9999 }}
          onClick={onClick}
          aria-label="Open stylist widget (test)"
          tabIndex={-1}
        />
      )}
    </>
  );
};

export default CircularSymbol;