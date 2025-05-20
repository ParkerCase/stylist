import React, { useState } from 'react';
import './SizeAvailability.scss';

interface SizeAvailabilityProps {
  sizes: string[];
  availableSizes: string[];
  userSizes?: string[];
  onSizeSelect: (size: string) => void;
  onNotifyAvailability: (size: string) => void;
  primaryColor?: string;
}

const SizeAvailability: React.FC<SizeAvailabilityProps> = ({
  sizes,
  availableSizes,
  userSizes = [],
  onSizeSelect,
  onNotifyAvailability,
  primaryColor
}) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showNotifyForm, setShowNotifyForm] = useState<string | null>(null);
  
  const handleSizeSelect = (size: string) => {
    if (availableSizes.includes(size)) {
      setSelectedSize(size);
      onSizeSelect(size);
    } else {
      setShowNotifyForm(size);
    }
  };
  
  const handleNotifySubmit = (e: React.FormEvent, size: string) => {
    e.preventDefault();
    onNotifyAvailability(size);
    setShowNotifyForm(null);
  };
  
  const isSizeAvailable = (size: string) => availableSizes.includes(size);
  const isUserSize = (size: string) => userSizes.includes(size);
  
  return (
    <div className="stylist-size-availability">
      <div className="stylist-size-availability__header">
        <h4 className="stylist-size-availability__title">Select Size</h4>
        {userSizes.length > 0 && (
          <span className="stylist-size-availability__user-sizes">
            Your sizes: {userSizes.join(', ')}
          </span>
        )}
      </div>
      
      <div className="stylist-size-availability__sizes">
        {sizes.map(size => (
          <button
            key={size}
            className={`
              stylist-size-availability__size-btn
              ${!isSizeAvailable(size) ? 'stylist-size-availability__size-btn--unavailable' : ''}
              ${isUserSize(size) ? 'stylist-size-availability__size-btn--user-size' : ''}
              ${selectedSize === size ? 'stylist-size-availability__size-btn--selected' : ''}
            `}
            onClick={() => handleSizeSelect(size)}
            disabled={!isSizeAvailable(size) && showNotifyForm !== size}
            style={selectedSize === size ? { borderColor: primaryColor, color: primaryColor } : undefined}
          >
            {size}
            {isUserSize(size) && (
              <span className="stylist-size-availability__your-size-indicator" style={{ backgroundColor: primaryColor }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
      
      {showNotifyForm && (
        <div className="stylist-size-availability__notify-form">
          <form onSubmit={(e) => handleNotifySubmit(e, showNotifyForm)}>
            <p className="stylist-size-availability__notify-text">
              Get notified when size {showNotifyForm} becomes available
            </p>
            <div className="stylist-size-availability__notify-actions">
              <button 
                type="button" 
                className="stylist-size-availability__cancel-btn"
                onClick={() => setShowNotifyForm(null)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="stylist-size-availability__notify-btn"
                style={{ backgroundColor: primaryColor }}
              >
                Notify Me
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SizeAvailability;