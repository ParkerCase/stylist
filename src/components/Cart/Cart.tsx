// src/components/Cart/Cart.tsx
import React, { useState, useEffect } from 'react';
import './Cart.scss';
import { CartItem } from '@/types/index';
import { formatPrice } from '@utils/formatters';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  onClose: () => void;
}

const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onClose
}) => {
  const [total, setTotal] = useState(0);
  
  // Calculate total price when items change
  useEffect(() => {
    const calculatedTotal = items.reduce((sum, item) => {
      return sum + ((item.price || 0) * item.quantity);
    }, 0);
    
    setTotal(calculatedTotal);
  }, [items]);
  
  if (items.length === 0) {
    return (
      <div className="stylist-cart">
        <div className="stylist-cart__header">
          <h3 className="stylist-cart__title">Shopping Cart</h3>
          <button className="stylist-cart__close-btn" onClick={onClose}>×</button>
        </div>
        <div className="stylist-cart__empty">
          <p>Your cart is empty</p>
          <button className="stylist-cart__continue-btn" onClick={onClose}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="stylist-cart">
      <div className="stylist-cart__header">
        <h3 className="stylist-cart__title">Shopping Cart</h3>
        <button className="stylist-cart__close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="stylist-cart__items">
        {items.map((item) => (
          <div key={item.itemId} className="stylist-cart__item">
            <div className="stylist-cart__item-image">
              <img src={item.imageUrl} alt={item.name} />
            </div>
            <div className="stylist-cart__item-details">
              <h4 className="stylist-cart__item-name">{item.name}</h4>
              <p className="stylist-cart__item-brand">{item.brand}</p>
              {item.size && (
                <p className="stylist-cart__item-size">Size: {item.size}</p>
              )}
              {item.color && (
                <p className="stylist-cart__item-color">Color: {item.color}</p>
              )}
              <p className="stylist-cart__item-price">{formatPrice(item.price || 0)}</p>
            </div>
            <div className="stylist-cart__item-actions">
              <div className="stylist-cart__quantity">
                <button 
                  className="stylist-cart__quantity-btn" 
                  onClick={() => onUpdateQuantity(item.itemId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <span className="stylist-cart__quantity-value">{item.quantity}</span>
                <button 
                  className="stylist-cart__quantity-btn" 
                  onClick={() => onUpdateQuantity(item.itemId, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button 
                className="stylist-cart__remove-btn"
                onClick={() => onRemoveItem(item.itemId)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="stylist-cart__footer">
        <div className="stylist-cart__total">
          <span className="stylist-cart__total-label">Total:</span>
          <span className="stylist-cart__total-value">{formatPrice(total)}</span>
        </div>
        <button className="stylist-cart__checkout-btn" onClick={onCheckout}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
};

export default Cart;