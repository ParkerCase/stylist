import React from 'react';
import './ItemHoverMenu.scss';

interface ItemHoverMenuProps {
  onAddToDressingRoom: (e?: React.MouseEvent) => void;
  onAddToWishlist: (e?: React.MouseEvent) => void;
  onAddToCart: (e?: React.MouseEvent) => void;
  onOutfitSuggestions: (e?: React.MouseEvent) => void;
  primaryColor?: string;
}

const ItemHoverMenu: React.FC<ItemHoverMenuProps> = ({
  onAddToDressingRoom,
  onAddToWishlist,
  onAddToCart,
  onOutfitSuggestions,
  primaryColor
}) => {
  return (
    <div className="stylist-item-hover-menu">
      <div className="stylist-item-hover-menu__options">
        <button 
          className="stylist-item-hover-menu__option"
          onClick={onAddToDressingRoom}
          style={{ backgroundColor: primaryColor }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M21.6 18.2L13 11.75v-.91a3.496 3.496 0 0 0-.18-7C11.68 3.89 10.4 4 9.6 4.65l-.09.09a3.51 3.51 0 0 0 .19 5.07c.39.32.9.54 1.5.54l.16-.01v1.41L2.4 18.2c-.77.58-.36 1.8.6 1.8h18c.96 0 1.37-1.22.6-1.8zM12 4c.82 0 1.5.68 1.5 1.5v.01c0 .82-.68 1.5-1.5 1.5-.82 0-1.5-.68-1.5-1.5V5.5c0-.82.68-1.5 1.5-1.5z"/>
          </svg>
          <span>Add to dressing room</span>
        </button>
        
        <button 
          className="stylist-item-hover-menu__option"
          onClick={onAddToWishlist}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span>Add to wishlist</span>
        </button>
        
        <button 
          className="stylist-item-hover-menu__option"
          onClick={onAddToCart}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25z"/>
          </svg>
          <span>Add to cart</span>
        </button>
        
        <button 
          className="stylist-item-hover-menu__option"
          onClick={onOutfitSuggestions}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
          </svg>
          <span>Outfit suggestions</span>
        </button>
      </div>
    </div>
  );
};

export default ItemHoverMenu;