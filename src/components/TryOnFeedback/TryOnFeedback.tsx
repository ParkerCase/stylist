// TryOnFeedback component for providing feedback on virtual try-on
import React, { useState } from 'react';
import './TryOnFeedback.scss';
import { Recommendation, WishlistItem, CartItem } from '@/types';
import { useRecommendationStore } from '@/store/index';

interface TryOnFeedbackProps {
  garmentId: string;
  onLike: (garmentId: string) => void;
  onDislike: (garmentId: string) => void;
  onAddToWishlist: (garmentId: string) => void;
  onAddToCart: (garmentId: string) => void;
  onSaveNote: (garmentId: string, note: string) => void;
  item?: Recommendation.RecommendationItem;
  primaryColor?: string;
}

const TryOnFeedback: React.FC<TryOnFeedbackProps> = ({
  garmentId,
  onLike,
  onDislike,
  onAddToWishlist,
  onAddToCart,
  onSaveNote,
  item,
  primaryColor
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showLikeOptions, setShowLikeOptions] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [addedToWishlist, setAddedToWishlist] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  
  // Access the recommendation store
  const { addToWishlist, addToCart } = useRecommendationStore();
  
  // Handle like button click
  const handleLike = () => {
    setIsLiked(true);
    onLike(garmentId);
    setShowLikeOptions(true);
  };
  
  // Handle dislike button click
  const handleDislike = () => {
    onDislike(garmentId);
  };
  
  // Handle add to wishlist
  const handleAddToWishlist = () => {
    // Create a wishlist item (even if item is not provided)
    const wishlistItem: WishlistItem = {
      itemId: garmentId,
      retailerId: item?.retailerId || 'demo_retailer',
      addedAt: new Date(),
      name: item?.name || `Item ${garmentId.slice(0, 6)}`,
      brand: item?.brand || 'Unknown brand',
      price: item?.price || 0,
      imageUrl: item?.imageUrls?.[0] || ''
    };
    
    // Add to store
    addToWishlist(wishlistItem);
    
    // Call the prop callback
    onAddToWishlist(garmentId);
    
    // Show success state
    setAddedToWishlist(true);
    setShowLikeOptions(false);
    
    // Reset success state after a delay
    setTimeout(() => {
      setAddedToWishlist(false);
    }, 2000);
  };
  
  // Handle add to cart
  const handleAddToCart = () => {
    // Create a cart item (even if item is not provided)
    const cartItem: CartItem = {
      itemId: garmentId,
      retailerId: item?.retailerId || 'demo_retailer',
      quantity: 1,
      size: item?.sizes?.[0] || 'M',
      color: item?.colors?.[0] || 'default',
      addedAt: new Date(),
      name: item?.name || `Item ${garmentId.slice(0, 6)}`,
      brand: item?.brand || 'Unknown brand',
      price: item?.price || 0,
      imageUrl: item?.imageUrls?.[0] || ''
    };
    
    // Add to store
    addToCart(cartItem);
    
    // Call the prop callback
    onAddToCart(garmentId);
    
    // Show success state
    setAddedToCart(true);
    setShowLikeOptions(false);
    
    // Reset success state after a delay
    setTimeout(() => {
      setAddedToCart(false);
    }, 2000);
  };
  
  // Handle save note
  const handleSaveNote = () => {
    if (note.trim()) {
      onSaveNote(garmentId, note);
      
      // Show success state
      setNoteSaved(true);
      setShowNoteInput(false);
      setShowLikeOptions(false);
      
      // Reset success state after a delay
      setTimeout(() => {
        setNoteSaved(false);
        setNote('');
      }, 2000);
    }
  };
  
  // Custom style for primary color
  const buttonStyle = primaryColor ? { backgroundColor: primaryColor } : undefined;
  
  // Render success states
  if (addedToWishlist) {
    return (
      <div className="stylist-try-on-feedback__success">
        <span role="img" aria-label="Added to Wishlist">❤️</span> Added to Wishlist!
      </div>
    );
  }
  
  if (addedToCart) {
    return (
      <div className="stylist-try-on-feedback__success">
        <span role="img" aria-label="Added to Cart">🛒</span> Added to Cart!
      </div>
    );
  }
  
  if (noteSaved) {
    return (
      <div className="stylist-try-on-feedback__success">
        <span role="img" aria-label="Note Saved">📝</span> Note Saved!
      </div>
    );
  }
  
  return (
    <div className="stylist-try-on-feedback">
      {!isLiked ? (
        <div className="stylist-try-on-feedback__buttons">
          <button
            className="stylist-try-on-feedback__button stylist-try-on-feedback__button--like"
            onClick={handleLike}
            style={buttonStyle}
            data-cy="tryon-like-button"
          >
            <span role="img" aria-label="Like">👍</span>
          </button>
          <button
            className="stylist-try-on-feedback__button stylist-try-on-feedback__button--dislike"
            onClick={handleDislike}
            data-cy="tryon-dislike-button"
          >
            <span role="img" aria-label="Dislike">👎</span>
          </button>
        </div>
      ) : showLikeOptions ? (
        <div className="stylist-try-on-feedback__options">
          <button
            className="stylist-try-on-feedback__option-button"
            onClick={handleAddToWishlist}
            style={buttonStyle}
            data-cy="tryon-add-to-wishlist"
          >
            Add to Wishlist
          </button>
          <button
            className="stylist-try-on-feedback__option-button"
            onClick={handleAddToCart}
            style={buttonStyle}
            data-cy="tryon-add-to-cart"
          >
            Add to Cart
          </button>
          <button
            className="stylist-try-on-feedback__option-button"
            onClick={() => setShowNoteInput(true)}
            style={buttonStyle}
            data-cy="tryon-save-note"
          >
            Just Save a Note
          </button>
        </div>
      ) : showNoteInput ? (
        <div className="stylist-try-on-feedback__note-input">
          <input
            type="text"
            placeholder="What do you like about this item?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          <button
            className="stylist-try-on-feedback__note-save"
            onClick={handleSaveNote}
            style={buttonStyle}
          >
            Save
          </button>
        </div>
      ) : (
        <div className="stylist-try-on-feedback__liked">
          <span role="img" aria-label="Liked">💖</span> Liked!
        </div>
      )}
    </div>
  );
};

export default TryOnFeedback;