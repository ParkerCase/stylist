// Try-on button component for integration with item cards
import React from 'react';
import './TryOnButton.scss';
import { GarmentType } from '@/types/tryOn';
import { startTryOn, openTryOnModal } from '@/integration/integrateTryOn';

interface TryOnButtonProps {
  imageUrl: string;
  productType: GarmentType;
  small?: boolean;
  primaryColor?: string;
}

const TryOnButton: React.FC<TryOnButtonProps> = ({
  imageUrl,
  productType,
  small = false,
  primaryColor
}) => {
  // Handle try-on click
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Start try-on with the product
    startTryOn(imageUrl, productType);
    openTryOnModal();
  };
  
  // Get button styling
  const buttonStyle = primaryColor ? { backgroundColor: primaryColor } : undefined;
  
  return (
    <button
      className={`stylist-try-on-button ${small ? 'stylist-try-on-button--small' : ''}`}
      onClick={handleClick}
      style={buttonStyle}
    >
      <span className="stylist-try-on-button__icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      </span>
      <span className="stylist-try-on-button__text">
        {small ? 'Try On' : 'Virtual Try-On'}
      </span>
    </button>
  );
};

export default TryOnButton;