import React from 'react';
import './TryOnModal.scss';

interface TryOnFallbackProps {
  errorReason?: string;
  onClose: () => void;
  primaryColor?: string;
}

/**
 * Fallback component for when the TryOnModal cannot be loaded
 * or when WebGL is not supported by the browser
 */
const TryOnFallback: React.FC<TryOnFallbackProps> = ({
  errorReason = 'WebGL is not supported by your browser or device.',
  onClose,
  primaryColor = '#4361ee'
}) => {
  return (
    <div className="stylist-try-on-fallback">
      <div className="stylist-try-on-fallback__content">
        <h3 className="stylist-try-on-fallback__title">
          Virtual Try-On Unavailable
        </h3>
        
        <div className="stylist-try-on-fallback__message">
          <p>Sorry, the virtual try-on feature is currently unavailable.</p>
          <p className="stylist-try-on-fallback__reason">{errorReason}</p>
          <p>You can still view item details and add them to your cart or wishlist.</p>
        </div>
        
        <div className="stylist-try-on-fallback__alternatives">
          <h4>Alternatives:</h4>
          <ul>
            <li>View the item in your lookbook</li>
            <li>Check size guides for accurate measurements</li>
            <li>See how others have styled this item</li>
          </ul>
        </div>
        
        <div className="stylist-try-on-fallback__actions">
          <button 
            className="stylist-try-on-fallback__close-button"
            onClick={onClose}
            style={{ backgroundColor: primaryColor }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TryOnFallback;