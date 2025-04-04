// Enhanced item card component for displaying product recommendations
import React, { useState } from 'react';
import './ItemCard.scss';
import { Recommendation } from '@/types/index';
import { formatPrice } from '@/utils/formatters';
import FeedbackControls from '../FeedbackControls';
import TryOnButton from '../TryOnButton/TryOnButton';
import { mapProductTypeToGarmentType } from '@/utils/productMappings';

interface ItemCardProps {
  item: Recommendation.RecommendationItem;
  onFeedback?: (itemId: string, liked: boolean) => void;
  onAddToWishlist?: (itemId: string) => void;
  onAddToCart?: (itemId: string) => void;
  showDetails?: boolean;
  primaryColor?: string;
  onClick?: (item: Recommendation.RecommendationItem) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onFeedback,
  onAddToWishlist,
  onAddToCart,
  showDetails = false,
  primaryColor,
  onClick
}) => {
  const {
    id,
    name,
    brand,
    price,
    salePrice,
    matchScore,
    matchReasons,
    category
  } = item;
  
  const [showFeedbackText, setShowFeedbackText] = useState<string | null>(null);
  const [animateItem, setAnimateItem] = useState(false);
  
  // Use the first image URL from the imageUrls array
  const imageUrl = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : '';

  const handleItemClick = () => {
    if (onClick) {
      onClick(item);
    } else {
      // Open product details or navigate to product page
      window.open(item.url, '_blank');
    }
  };

  const handleFeedback = (liked: boolean) => {
    if (onFeedback) {
      onFeedback(id, liked);
      
      // Show feedback text briefly
      setShowFeedbackText(liked ? 'Added to your liked items' : 'Noted - not your style');
      
      // Trigger animation
      setAnimateItem(true);
      setTimeout(() => {
        setAnimateItem(false);
        setTimeout(() => {
          setShowFeedbackText(null);
        }, 300);
      }, 1500);
    }
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item click
    if (onAddToWishlist) {
      onAddToWishlist(id);
      
      // Show feedback text briefly
      setShowFeedbackText('Added to wishlist');
      setTimeout(() => {
        setShowFeedbackText(null);
      }, 1800);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item click
    if (onAddToCart) {
      onAddToCart(id);
      
      // Show feedback text briefly
      setShowFeedbackText('Added to cart');
      setTimeout(() => {
        setShowFeedbackText(null);
      }, 1800);
    }
  };

  // Show discount percentage if on sale
  const discountPercentage = salePrice && price > 0
    ? Math.round(((price - salePrice) / price) * 100)
    : null;

  // Check if product is try-on compatible
  const isTryOnCompatible = category && 
    ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'].includes(category.toLowerCase());

  return (
    <div className={`stylist-item-card ${animateItem ? 'stylist-item-card--animate' : ''}`}>
      <div className="stylist-item-card__image-container" onClick={handleItemClick}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="stylist-item-card__image"
            loading="lazy"
          />
        ) : (
          <div className="stylist-item-card__image-placeholder">
            No Image
          </div>
        )}
        {discountPercentage && (
          <div className="stylist-item-card__discount">
            {discountPercentage}% OFF
          </div>
        )}
        
        {/* Feedback text overlay */}
        {showFeedbackText && (
          <div className="stylist-item-card__feedback-text" 
               style={{ backgroundColor: `${primaryColor}ee` }}>
            {showFeedbackText}
          </div>
        )}
        
        {/* Add try-on button overlay if compatible */}
        {isTryOnCompatible && imageUrl && (
          <div className="stylist-item-card__try-on-overlay">
            <TryOnButton 
              imageUrl={imageUrl} 
              productType={mapProductTypeToGarmentType(category)} 
              small={true}
              primaryColor={primaryColor}
            />
          </div>
        )}
      </div>

      <div className="stylist-item-card__content" onClick={handleItemClick}>
        <div className="stylist-item-card__brand">{brand}</div>
        <div className="stylist-item-card__name">{name}</div>
        <div className="stylist-item-card__price">
          {salePrice ? (
            <>
              <span className="stylist-item-card__price--sale">
                {formatPrice(salePrice)}
              </span>
              <span className="stylist-item-card__price--original">
                {formatPrice(price)}
              </span>
            </>
          ) : (
            <span>{formatPrice(price)}</span>
          )}
        </div>
      </div>

      {showDetails && matchReasons.length > 0 && (
        <div className="stylist-item-card__match-reasons">
          <div className="stylist-item-card__match-score" style={{ color: primaryColor }}>
            {Math.round(matchScore * 100)}% Match
          </div>
          <ul className="stylist-item-card__reason-list">
            {matchReasons.map((reason: string, index: number) => (
              <li key={index} className="stylist-item-card__reason-item">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="stylist-item-card__actions">
        <FeedbackControls
          onLike={() => handleFeedback(true)}
          onDislike={() => handleFeedback(false)}
          primaryColor={primaryColor}
        />
        
        {/* Try-on button for larger screens */}
        {isTryOnCompatible && imageUrl && (
          <TryOnButton 
            imageUrl={imageUrl} 
            productType={mapProductTypeToGarmentType(category)} 
            small={true}
            primaryColor={primaryColor}
          />
        )}
        
        {onAddToWishlist && (
          <button
            className="stylist-item-card__wishlist-btn"
            onClick={handleAddToWishlist}
            aria-label="Add to wishlist"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        )}
        {onAddToCart && (
          <button
            className="stylist-item-card__cart-btn"
            onClick={handleAddToCart}
            aria-label="Add to cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ItemCard;