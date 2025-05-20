import React from 'react';
import './CircularSymbol.scss';

interface CircularSymbolProps {
  onClick: () => void;
  className?: string;
}

const CircularSymbol: React.FC<CircularSymbolProps> = ({ onClick, className }) => {
  return (
    <button
      className={`circular-symbol${className ? ' ' + className : ''}`}
      aria-label="Open Personalized Stylist Widget"
      onClick={onClick}
      tabIndex={0}
      type="button"
    >
      {/* Replace with branded SVG/icon as needed */}
      <span className="circular-symbol__icon" aria-hidden="true">
        {/* Example: a simple door icon SVG */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="4" width="16" height="24" rx="3" fill="#fff" stroke="#222" strokeWidth="2"/>
          <circle cx="21" cy="16" r="1.5" fill="#222"/>
        </svg>
      </span>
    </button>
  );
};

export default CircularSymbol;