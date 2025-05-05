// WishlistTab component for displaying and managing wishlisted items
import React, { useState, useEffect } from 'react';
import { useRecommendationStore, useUserStore } from '@/store/index';
import { Recommendation } from '@/types';
import ItemCard from '@/components/ItemCard';
import LoadingIndicator from '@/components/common/LoadingIndicator';
import './WishlistTab.scss';

interface WishlistTabProps {
  onAddToCart?: (item: Recommendation.RecommendationItem) => void;
  onRemoveFromWishlist?: (itemId: string) => void;
  onMoveToCloset?: (item: Recommendation.RecommendationItem) => void;
  onItemClick?: (item: Recommendation.RecommendationItem) => void;
  primaryColor?: string;
}

const WishlistTab: React.FC<WishlistTabProps> = ({
  onAddToCart,
  onRemoveFromWishlist,
  onMoveToCloset,
  onItemClick,
  primaryColor
}) => {
  const { wishlistItems } = useRecommendationStore();
  const { user } = useUserStore();
  const [wishlistProducts, setWishlistProducts] = useState<Recommendation.RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get full product details for wishlist items
  useEffect(() => {
    const getWishlistDetails = async () => {
      setIsLoading(true);
      
      try {
        // In a real application, you would fetch product details from the API
        // For this demo, we'll simulate by creating dummy product details
        
        // Create objects with product details for each wishlist item
        const products = wishlistItems.map(item => {
          return {
            id: item.itemId,
            retailerId: item.retailerId,
            name: item.name || `Product ${item.itemId.substring(0, 6)}`,
            brand: item.brand || 'Brand Name',
            category: item.category || 'Clothing',
            price: item.price || 99.99,
            salePrice: item.salePrice,
            colors: [],
            sizes: [],
            imageUrls: [item.imageUrl || ''],
            url: item.url || '#',
            matchScore: 0,
            matchReasons: [],
            inStock: true,
            addedToWishlistAt: item.addedAt
          };
        });
        
        setWishlistProducts(products);
      } catch (error) {
        console.error('Error fetching wishlist details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    getWishlistDetails();
  }, [wishlistItems]);
  
  // Handle add to cart
  const handleAddToCart = (item: Recommendation.RecommendationItem) => {
    if (onAddToCart) {
      onAddToCart(item);
    }
  };
  
  // Handle remove from wishlist
  const handleRemoveFromWishlist = (itemId: string) => {
    if (onRemoveFromWishlist) {
      onRemoveFromWishlist(itemId);
    }
  };
  
  // Handle move to closet
  const handleMoveToCloset = (item: Recommendation.RecommendationItem) => {
    if (onMoveToCloset) {
      onMoveToCloset(item);
      // After moving to closet, remove from wishlist
      handleRemoveFromWishlist(item.id);
    }
  };
  
  // Handle item click
  const handleItemClick = (item: Recommendation.RecommendationItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };
  
  return (
    <div className="stylist-wishlist-tab">
      <div className="stylist-wishlist-tab__header">
        <h2 className="stylist-wishlist-tab__title">My Wishlist</h2>
      </div>
      
      {isLoading ? (
        <div className="stylist-wishlist-tab__loading">
          <LoadingIndicator />
          <p>Loading your wishlist...</p>
        </div>
      ) : wishlistProducts.length === 0 ? (
        <div className="stylist-wishlist-tab__empty">
          <p>Your wishlist is empty.</p>
          <p>Items you like will be saved here for later.</p>
        </div>
      ) : (
        <div className="stylist-wishlist-tab__grid">
          {wishlistProducts.map(item => (
            <div key={item.id} className="stylist-wishlist-tab__item">
              <ItemCard
                item={{
                  id: item.id,
                  name: item.name || '',
                  brand: item.brand || '',
                  price: item.price || 0,
                  salePrice: item.salePrice,
                  image: item.imageUrls[0] || ''
                }}
                onFavorite={() => {}} // Already in wishlist
                isFavorite={true}
                onRemove={() => handleRemoveFromWishlist(item.id)}
                onClick={() => handleItemClick(item)}
                primaryColor={primaryColor}
              />
              <div className="stylist-wishlist-tab__item-actions">
                <button
                  className="stylist-wishlist-tab__action-btn stylist-wishlist-tab__action-btn--cart"
                  onClick={() => handleAddToCart(item)}
                >
                  Add to Cart
                </button>
                <button
                  className="stylist-wishlist-tab__action-btn stylist-wishlist-tab__action-btn--closet"
                  onClick={() => handleMoveToCloset(item)}
                >
                  Move to Closet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WishlistTab;