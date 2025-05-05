// SocialProofModal component for displaying celebrity outfit inspiration
import React, { useState, useEffect } from 'react';
import './SocialProofModal.scss';
import { createStylistApi } from '@/api/index';
import { Recommendation } from '@/types';
import ItemCard from '@/components/ItemCard';
import LoadingIndicator from '@/components/common/LoadingIndicator';

interface SocialProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfitData: {
    id: string;
    celebrityName: string;
    imageUrl: string;
    description: string;
  };
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onAddToWishlist?: (item: Recommendation.RecommendationItem) => void;
  onAddToCart?: (item: Recommendation.RecommendationItem) => void;
  primaryColor?: string;
}

const SocialProofModal: React.FC<SocialProofModalProps> = ({
  isOpen,
  onClose,
  outfitData,
  apiKey,
  retailerId,
  apiUrl,
  onItemFeedback,
  onAddToWishlist,
  onAddToCart,
  primaryColor
}) => {
  const [matchingItems, setMatchingItems] = useState<Recommendation.RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch matching items when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMatchingItems();
    }
  }, [isOpen, outfitData?.id]);
  
  // Fetch items that match the celebrity outfit
  const fetchMatchingItems = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const api = createStylistApi({ apiKey, retailerId, apiUrl });
      
      // Fetch matching items
      // Note: In a real app, this would be an API call to get similar items
      // For this demo, we'll simulate with a timeout
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate API response with matching items
      const mockItems: Recommendation.RecommendationItem[] = Array.from({ length: 6 }, (_, i) => ({
        id: `similar-${outfitData.id}-${i}`,
        retailerId: retailerId,
        name: `Similar Item ${i + 1}`,
        brand: ['Fashion Brand', 'Luxury Designer', 'Style Co.'][i % 3],
        category: ['tops', 'bottoms', 'dresses', 'shoes', 'accessories'][i % 5],
        price: 59.99 + (i * 20),
        salePrice: i % 3 === 0 ? 59.99 + (i * 20) * 0.8 : undefined,
        colors: ['black', 'white', 'blue'],
        sizes: ['S', 'M', 'L', 'XL'],
        imageUrls: [
          `https://via.placeholder.com/300x400?text=Similar+Item+${i + 1}`
        ],
        url: '#',
        matchScore: 90 - (i * 5),
        matchReasons: ['Similar style', 'Matches color palette', 'As seen on celebrity'],
        inStock: true
      }));
      
      setMatchingItems(mockItems);
    } catch (error) {
      console.error('Error fetching matching items:', error);
      setError('Failed to load matching items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle closing the modal
  const handleClose = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);
  
  // Prevent scrolling of the body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) {
    return null;
  }
  
  return (
    <div className="stylist-social-proof-modal" onClick={handleClose}>
      <div className="stylist-social-proof-modal__content">
        <button 
          className="stylist-social-proof-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        
        <div className="stylist-social-proof-modal__header">
          <h2 className="stylist-social-proof-modal__title">
            Get the Look: {outfitData.celebrityName}
          </h2>
        </div>
        
        <div className="stylist-social-proof-modal__celebrity-outfit">
          <img 
            src={outfitData.imageUrl} 
            alt={`${outfitData.celebrityName} outfit`} 
            className="stylist-social-proof-modal__celebrity-image"
          />
          <p className="stylist-social-proof-modal__description">
            {outfitData.description}
          </p>
        </div>
        
        <div className="stylist-social-proof-modal__similar-items-section">
          <h3>Shop Similar Items</h3>
          
          {isLoading ? (
            <div className="stylist-social-proof-modal__loading">
              <LoadingIndicator />
              <p>Finding similar items...</p>
            </div>
          ) : error ? (
            <div className="stylist-social-proof-modal__error">
              <p>{error}</p>
              <button 
                className="stylist-social-proof-modal__retry-btn"
                onClick={fetchMatchingItems}
                style={{ backgroundColor: primaryColor }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="stylist-social-proof-modal__similar-items">
              {matchingItems.map((item) => (
                <div key={item.id} className="stylist-social-proof-modal__item">
                  <ItemCard
                    item={{
                      id: item.id,
                      name: item.name,
                      brand: item.brand,
                      price: item.price,
                      salePrice: item.salePrice,
                      image: item.imageUrls[0] || ''
                    }}
                    onFavorite={(liked) => onItemFeedback && onItemFeedback(item.id, liked)}
                    onAddToWishlist={() => onAddToWishlist && onAddToWishlist(item)}
                    onAddToCart={() => onAddToCart && onAddToCart(item)}
                    primaryColor={primaryColor}
                  />
                  <div className="stylist-social-proof-modal__match-score">
                    {item.matchScore}% match
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialProofModal;