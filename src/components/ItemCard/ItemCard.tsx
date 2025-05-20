// Enhanced item card component for displaying product recommendations and closet items
import React, { useState, useMemo } from 'react';
import './ItemCard.scss';
import { Recommendation } from '@/types/index';
import { formatPrice } from '@/utils/formatters';
import FeedbackControls from '../FeedbackControls';
import TryOnButton from '../TryOnButton/TryOnButton';
import { mapProductTypeToGarmentType } from '@/utils/productMappings';
import { GarmentType } from '@/types/tryOn';
import ItemHoverMenu from './ItemHoverMenu';
import ItemFeedbackOverlay from './ItemFeedbackOverlay';
import SizeAvailability from './SizeAvailability';
import CompleteLookModal from '../CompleteLookModal';
import AdaptiveImage from '../common/AdaptiveImage';
import { getDeviceCapabilities, DeviceCapabilities } from '@/utils/deviceCapabilities';
import { getAnimationComplexity } from '@/utils/animationUtils';

// Define a simpler item type for closet items
interface ClosetItemCardData {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
}

interface ItemCardProps {
  item: Recommendation.RecommendationItem | ClosetItemCardData;
  onFeedback?: (itemId: string, liked: boolean) => void;
  onAddToWishlist?: (itemId: string) => void;
  onAddToCart?: (itemId: string) => void;
  onTryOn?: (item: Recommendation.RecommendationItem | ClosetItemCardData) => void;
  onFavorite?: (isFavorite: boolean) => void;
  onRemove?: () => void;
  showDetails?: boolean;
  primaryColor?: string;
  onClick?: (item: Recommendation.RecommendationItem | ClosetItemCardData) => void;
  isClosetItem?: boolean;
  isFavorite?: boolean;
  onAddToDressingRoom?: (itemId: string) => void;
  onOutfitSuggestions?: (itemId: string) => void;
  complementaryItems?: Recommendation.RecommendationItem[];
  userSizes?: string[];
  onSizeSelect?: (itemId: string, size: string) => void;
  onNotifyAvailability?: (itemId: string, size: string) => void;
  onAddAllToCart?: (itemIds: string[]) => void;
  className?: string; // Added to support external styling
}

const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onFeedback,
  onAddToWishlist,
  onAddToCart,
  onTryOn,
  onFavorite,
  onRemove,
  showDetails = false,
  primaryColor,
  onClick,
  isClosetItem = false,
  isFavorite = false,
  onAddToDressingRoom,
  onOutfitSuggestions,
  complementaryItems = [],
  userSizes = [],
  onSizeSelect,
  onNotifyAvailability,
  onAddAllToCart,
  className
}) => {
  const id = item.id;
  const name = item.name;
  const brand = item.brand;
  const price = item.price;
  
  // These properties only exist on recommendation items
  const salePrice = 'salePrice' in item ? item.salePrice : undefined;
  const matchScore = 'matchScore' in item ? item.matchScore : undefined;
  const matchReasons = 'matchReasons' in item ? item.matchReasons : [];
  const category = 'category' in item ? item.category : undefined;
  const sizes = 'sizes' in item ? item.sizes : [];
  const inStock = 'inStock' in item ? item.inStock : true;
  
  const [showFeedbackText, setShowFeedbackText] = useState<string | null>(null);
  const [animateItem, setAnimateItem] = useState(false);
  const [isFavoriteState, setIsFavoriteState] = useState(isFavorite);
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [showCompleteLookModal, setShowCompleteLookModal] = useState(false);
  
  // Use the appropriate image URL based on item type
  const imageUrl = isClosetItem 
    ? ('image' in item ? item.image : '') 
    : ('imageUrls' in item && item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : '');

  const handleItemClick = () => {
    if (onClick) {
      onClick(item);
    } else if (!isClosetItem && 'url' in item) {
      // Open product details or navigate to product page
      window.open(item.url, '_blank');
    }
  };

  const handleFeedback = (liked: boolean) => {
    if (onFeedback) {
      onFeedback(id, liked);
      
      // Show feedback text briefly with appropriate message
      const feedbackMessage = liked 
        ? 'Added to your liked items' 
        : 'Noted - not your style';
      
      setShowFeedbackText(feedbackMessage);
      
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
    if (!showSizeSelector && sizes && sizes.length > 0) {
      setShowSizeSelector(true);
      return;
    }
    
    if (onAddToCart) {
      onAddToCart(id);
      
      // Show feedback text briefly
      setShowFeedbackText('Added to cart');
      setTimeout(() => {
        setShowFeedbackText(null);
      }, 1800);
      
      // Show complete the look modal if we have complementary items
      if (complementaryItems && complementaryItems.length > 0 && onAddAllToCart) {
        setShowCompleteLookModal(true);
      }
    }
  };
  
  const handleTryOn = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item click
    if (onTryOn) {
      onTryOn(item);
    }
  };
  
  const handleAddToDressingRoom = () => {
    if (onAddToDressingRoom) {
      onAddToDressingRoom(id);
      
      // Show feedback text briefly
      setShowFeedbackText('Added to dressing room');
      setTimeout(() => {
        setShowFeedbackText(null);
      }, 1800);
    }
  };
  
  const handleOutfitSuggestions = () => {
    if (onOutfitSuggestions) {
      onOutfitSuggestions(id);
    }
  };
  
  const handleSizeSelect = (size: string) => {
    if (onSizeSelect) {
      onSizeSelect(id, size);
      setShowSizeSelector(false);
      
      // Add to cart after size is selected
      if (onAddToCart) {
        onAddToCart(id);
        
        // Show feedback text briefly
        setShowFeedbackText('Added to cart');
        setTimeout(() => {
          setShowFeedbackText(null);
        }, 1800);
        
        // Show complete the look modal if we have complementary items
        if (complementaryItems && complementaryItems.length > 0 && onAddAllToCart) {
          setShowCompleteLookModal(true);
        }
      }
    }
  };
  
  const handleNotifyAvailability = (size: string) => {
    if (onNotifyAvailability) {
      onNotifyAvailability(id, size);
      setShowSizeSelector(false);
      
      // Show feedback text briefly
      setShowFeedbackText(`We'll notify you when size ${size} is available`);
      setTimeout(() => {
        setShowFeedbackText(null);
      }, 2500);
    }
  };
  
  const handleAddAllToCart = (itemIds: string[]) => {
    if (onAddAllToCart) {
      onAddAllToCart(itemIds);
    }
  };

  // Show discount percentage if on sale
  const discountPercentage = salePrice && price > 0
    ? Math.round(((price - salePrice) / price) * 100)
    : null;

  // Check if product is try-on compatible
  const isTryOnCompatible = category ? 
    ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'].includes(category.toLowerCase())
    : false;
    
  // Get garment type for try-on
  const garmentType = category ? mapProductTypeToGarmentType(category) : GarmentType.TOP;
  
  // Determine available sizes
  const availableSizes = inStock ? sizes : [];

  // Determine animation complexity based on device capabilities
  const animationClass = useMemo(() => {
    const level = getAnimationComplexity({
      high: 'animation--high',
      medium: 'animation--medium', 
      low: 'animation--low',
      none: 'animation--none'
    });
    return level;
  }, []);
  
  return (
    <div className={`stylist-item-card ${animateItem ? 'stylist-item-card--animate' : ''} ${animationClass} ${className || ''}`}>
      <div className="stylist-item-card__image-container" onClick={handleItemClick}>
        {imageUrl ? (
          <AdaptiveImage
            src={imageUrl}
            alt={name}
            className="stylist-item-card__image"
            loadingPriority={isClosetItem ? 'high' : 'medium'}
            quality={category === 'featured' ? 'high' : 'medium'}
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
        {isTryOnCompatible && imageUrl && onTryOn && (
          <div className="stylist-item-card__try-on-overlay">
            <button 
              className="stylist-item-card__try-on-button"
              onClick={handleTryOn}
              style={{ backgroundColor: primaryColor }}
            >
              <span className="stylist-item-card__try-on-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
              </span>
              <span className="stylist-item-card__try-on-text">Try On</span>
            </button>
          </div>
        )}
        
        {/* Hover/tap menu */}
        {!isClosetItem && (
          <ItemHoverMenu
            onAddToDressingRoom={handleAddToDressingRoom}
            onAddToWishlist={handleAddToWishlist}
            onAddToCart={handleAddToCart}
            onOutfitSuggestions={handleOutfitSuggestions}
            primaryColor={primaryColor}
          />
        )}
        
        {/* Like/Dislike overlay buttons */}
        {!isClosetItem && onFeedback && (
          <ItemFeedbackOverlay
            onLike={() => handleFeedback(true)}
            onDislike={() => handleFeedback(false)}
            primaryColor={primaryColor}
          />
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
      
      {/* Size availability selector */}
      {showSizeSelector && sizes && sizes.length > 0 && (
        <SizeAvailability
          sizes={sizes}
          availableSizes={availableSizes}
          userSizes={userSizes}
          onSizeSelect={handleSizeSelect}
          onNotifyAvailability={handleNotifyAvailability}
          primaryColor={primaryColor}
        />
      )}

      {showDetails && matchReasons && matchReasons.length > 0 && (
        <div className="stylist-item-card__match-reasons">
          <div className="stylist-item-card__match-score" style={{ color: primaryColor }}>
            {typeof matchScore === 'number' ? `${Math.round(matchScore * 100)}% Match` : 'Good Match'}
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
        {isClosetItem ? (
          <>
            {/* Favorite toggle for closet items */}
            {onFavorite && (
              <button
                className={`stylist-item-card__favorite-btn ${isFavoriteState ? 'stylist-item-card__favorite-btn--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const newFavoriteState = !isFavoriteState;
                  setIsFavoriteState(newFavoriteState);
                  onFavorite(newFavoriteState);
                }}
                aria-label={isFavoriteState ? "Remove from favorites" : "Add to favorites"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>
            )}
            
            {/* Remove button for closet items */}
            {onRemove && (
              <button
                className="stylist-item-card__remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                aria-label="Remove from closet"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            )}
          </>
        ) : (
          <>
            <FeedbackControls
              itemId={id}
              onLike={() => handleFeedback(true)}
              onDislike={() => handleFeedback(false)}
              primaryColor={primaryColor}
            />
            
            {/* Try-on button for larger screens */}
            {isTryOnCompatible && imageUrl && onTryOn && (
              <button
                className="stylist-item-card__try-on-btn"
                onClick={handleTryOn}
                aria-label="Try on this item"
                style={{ backgroundColor: primaryColor }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                Try On
              </button>
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
          </>
        )}
      </div>
      
      {/* Complete the Look Modal */}
      {showCompleteLookModal && 'category' in item && complementaryItems && complementaryItems.length > 0 && (
        <CompleteLookModal
          isOpen={showCompleteLookModal}
          onClose={() => setShowCompleteLookModal(false)}
          selectedItem={item as Recommendation.RecommendationItem}
          complementaryItems={complementaryItems}
          onAddToCart={onAddToCart!}
          onAddAllToCart={handleAddAllToCart}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
};

export default ItemCard;