// Feedback controls component for like/dislike

import React, { useState, useEffect } from 'react';
import './FeedbackControls.scss';
import { useFeedbackStore } from '@/store/feedbackStore';

interface FeedbackControlsProps {
  onLike: () => void;
  onDislike: () => void;
  itemId?: string;
  outfitId?: string;
  liked?: boolean;
  disliked?: boolean;
  primaryColor?: string;
}

const FeedbackControls: React.FC<FeedbackControlsProps> = ({
  onLike,
  onDislike,
  itemId,
  outfitId,
  liked: propLiked = false,
  disliked: propDisliked = false,
  primaryColor
}) => {
  // Use local state to immediately reflect user interactions
  const [liked, setLiked] = useState(propLiked);
  const [disliked, setDisliked] = useState(propDisliked);

  // Get feedback state and actions from the store
  const feedbackStore = useFeedbackStore();
  const addItemFeedback = feedbackStore.addItemFeedback;
  const addOutfitFeedback = feedbackStore.addOutfitFeedback;
  const getItemFeedbackStatus = feedbackStore.getItemFeedbackStatus;
  const getOutfitFeedbackStatus = feedbackStore.getOutfitFeedbackStatus;
  
  // Sync with store on initial render if we have an ID
  useEffect(() => {
    if (itemId) {
      const status = getItemFeedbackStatus(itemId);
      setLiked(status.liked);
      setDisliked(status.disliked);
    } else if (outfitId) {
      const status = getOutfitFeedbackStatus(outfitId);
      setLiked(status.liked);
      setDisliked(status.disliked);
    } else {
      // If no ID, use props
      setLiked(propLiked);
      setDisliked(propDisliked);
    }
  }, [itemId, outfitId, propLiked, propDisliked, getItemFeedbackStatus, getOutfitFeedbackStatus]);
  
  const handleLike = () => {
    // Update local state immediately for responsive UI
    setLiked(true);
    setDisliked(false);
    
    // Call the passed onLike handler
    onLike();
    
    // Update persistent feedback state if we have an ID
    if (itemId) {
      addItemFeedback(itemId, 'like');
    } else if (outfitId) {
      addOutfitFeedback(outfitId, 'like');
    }
  };
  
  const handleDislike = () => {
    // Update local state immediately for responsive UI
    setLiked(false);
    setDisliked(true);
    
    // Call the passed onDislike handler
    onDislike();
    
    // Update persistent feedback state if we have an ID
    if (itemId) {
      addItemFeedback(itemId, 'dislike');
    } else if (outfitId) {
      addOutfitFeedback(outfitId, 'dislike');
    }
  };
  
  const likeStyle = liked && primaryColor
    ? { color: primaryColor, borderColor: primaryColor }
    : undefined;
    
  const dislikeStyle = disliked && primaryColor
    ? { color: primaryColor, borderColor: primaryColor }
    : undefined;
  
  return (
    <div className="stylist-feedback-controls">
      <button
        className={`stylist-feedback-controls__button ${liked ? 'stylist-feedback-controls__button--active' : ''}`}
        onClick={handleLike}
        style={likeStyle}
        aria-label="Like"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"/>
        </svg>
      </button>
      
      <button
        className={`stylist-feedback-controls__button ${disliked ? 'stylist-feedback-controls__button--active' : ''}`}
        onClick={handleDislike}
        style={dislikeStyle}
        aria-label="Dislike"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v1.91l.01.01L1 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
        </svg>
      </button>
    </div>
  );
};

export default FeedbackControls;
