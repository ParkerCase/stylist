import React from 'react';
import './HomeButton.scss';

interface HomeButtonProps {
  onClick: () => void;
  primaryColor?: string;
}

const HomeButton: React.FC<HomeButtonProps> = ({ onClick, primaryColor }) => {
  // Custom style for primary color
  const buttonStyle = primaryColor ? { backgroundColor: primaryColor } : undefined;
  
  return (
    <div 
      className="stylist-home-button"
      onClick={onClick}
      style={buttonStyle}
      data-testid="stylist-home-button"
      aria-label="Return to home view"
    >
      <div className="stylist-home-button__icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </div>
      <span className="stylist-home-button__text">Home</span>
    </div>
  );
};

export default HomeButton;