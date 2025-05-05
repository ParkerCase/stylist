// src/components/Wishlist/Wishlist.tsx
import React, { useState } from 'react';
import './Wishlist.scss';
import { WishlistItem, CartItem, ClosetItem } from '@/types/index';
import { formatPrice } from '@utils/formatters';
import { useRecommendationStore } from '@/store/index';
import { useUserStore } from '@/store/userStore';

interface WishlistProps {
  items: WishlistItem[];
  onRemoveItem: (itemId: string) => void;
  onAddToCart: (itemId: string) => void;
  onViewItem: (itemId: string) => void;
  onClose: () => void;
}

const Wishlist: React.FC<WishlistProps> = ({
  items,
  onRemoveItem,
  onAddToCart,
  onViewItem,
  onClose
}) => {
  // Local state for showing action feedback
  const [actionFeedback, setActionFeedback] = useState<{itemId: string, action: string} | null>(null);
  
  // Access stores for direct state updates
  const { removeFromWishlist, addToCart } = useRecommendationStore();
  const { addToCloset } = useUserStore();
  
  // Enhanced remove handler with UI feedback
  const handleRemoveItem = (item: WishlistItem) => {
    // Show feedback immediately
    setActionFeedback({
      itemId: item.itemId,
      action: 'removed'
    });
    
    // Update the store
    removeFromWishlist(item.itemId);
    
    // Call the provided callback
    onRemoveItem(item.itemId);
    
    // Clear feedback after a short delay
    setTimeout(() => {
      setActionFeedback(null);
    }, 1500);
  };
  
  // Add to cart handler with UI feedback
  const handleAddToCart = (item: WishlistItem) => {
    // Create cart item from wishlist item
    const cartItem: CartItem = {
      itemId: item.itemId,
      retailerId: item.retailerId,
      quantity: 1,
      addedAt: new Date(),
      name: item.name,
      brand: item.brand,
      price: item.price,
      imageUrl: item.imageUrl
    };
    
    // Add to cart in store
    addToCart(cartItem);
    
    // Show feedback
    setActionFeedback({
      itemId: item.itemId,
      action: 'cart'
    });
    
    // Call the provided callback
    onAddToCart(item.itemId);
    
    // Clear feedback after a delay
    setTimeout(() => {
      setActionFeedback(null);
    }, 1500);
  };
  
  // Move to closet handler
  const handleMoveToCloset = (item: WishlistItem) => {
    // Create closet item from wishlist item
    const closetItem: ClosetItem = {
      id: item.itemId,
      name: item.name || `Item ${item.itemId.slice(0, 6)}`,
      category: 'clothing', // Default category
      addedAt: new Date(),
      favorite: true,
      imageUrl: item.imageUrl,
      brand: item.brand,
      price: item.price
    };
    
    // Add to closet in user store
    addToCloset(closetItem);
    
    // Show feedback
    setActionFeedback({
      itemId: item.itemId,
      action: 'closet'
    });
    
    // Clear feedback after a delay and remove from wishlist
    setTimeout(() => {
      setActionFeedback(null);
      // Remove from wishlist after moving to closet
      removeFromWishlist(item.itemId);
      onRemoveItem(item.itemId);
    }, 1500);
  };
  
  if (items.length === 0) {
    return (
      <div className="stylist-wishlist">
        <div className="stylist-wishlist__header">
          <h3 className="stylist-wishlist__title">Your Wishlist</h3>
          <button className="stylist-wishlist__close-btn" onClick={onClose}>×</button>
        </div>
        <div className="stylist-wishlist__empty">
          <p>Your wishlist is empty</p>
          <button className="stylist-wishlist__continue-btn" onClick={onClose}>
            Browse Items
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="stylist-wishlist">
      <div className="stylist-wishlist__header">
        <h3 className="stylist-wishlist__title">Your Wishlist</h3>
        <button className="stylist-wishlist__close-btn" onClick={onClose}>×</button>
      </div>
      <div className="stylist-wishlist__items">
        {items.map((item) => (
          <div key={item.itemId} className="stylist-wishlist__item">
            {actionFeedback && actionFeedback.itemId === item.itemId ? (
              <div className="stylist-wishlist__item-feedback">
                {actionFeedback.action === 'removed' && (
                  <span>Item removed from wishlist</span>
                )}
                {actionFeedback.action === 'cart' && (
                  <span>Added to cart!</span>
                )}
                {actionFeedback.action === 'closet' && (
                  <span>Moved to your closet!</span>
                )}
              </div>
            ) : (
              <>
                <div 
                  className="stylist-wishlist__item-image" 
                  onClick={() => onViewItem(item.itemId)}
                >
                  <img src={item.imageUrl} alt={item.name} />
                </div>
                <div className="stylist-wishlist__item-details">
                  <h4 
                    className="stylist-wishlist__item-name"
                    onClick={() => onViewItem(item.itemId)}
                  >
                    {item.name}
                  </h4>
                  <p className="stylist-wishlist__item-brand">{item.brand}</p>
                  <p className="stylist-wishlist__item-price">
                    {formatPrice(item.price || 0)}
                  </p>
                </div>
                <div className="stylist-wishlist__item-actions">
                  <button 
                    className="stylist-wishlist__cart-btn"
                    onClick={() => handleAddToCart(item)}
                  >
                    Add to Cart
                  </button>
                  <button 
                    className="stylist-wishlist__closet-btn"
                    onClick={() => handleMoveToCloset(item)}
                  >
                    Move to Closet
                  </button>
                  <button 
                    className="stylist-wishlist__remove-btn"
                    onClick={() => handleRemoveItem(item)}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;