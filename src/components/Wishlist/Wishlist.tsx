// src/components/Wishlist/Wishlist.tsx
import React from 'react';
import './Wishlist.scss';
import { WishlistItem } from '@/types/index';
import { formatPrice } from '@utils/formatters';

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
                {formatPrice(item.price)}
                {item.salePrice && (
                  <span className="stylist-wishlist__item-original-price">
                    {formatPrice(item.originalPrice)}
                  </span>
                )}
              </p>
            </div>
            <div className="stylist-wishlist__item-actions">
              <button 
                className="stylist-wishlist__cart-btn"
                onClick={() => onAddToCart(item.itemId)}
              >
                Add to Cart
              </button>
              <button 
                className="stylist-wishlist__remove-btn"
                onClick={() => onRemoveItem(item.itemId)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wishlist;