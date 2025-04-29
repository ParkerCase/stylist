// ThumbsUpButton.tsx - Thumbs up button for recommendations

import React, { useState, useEffect } from 'react';
import './FeedbackControls.scss';
import { useFeedbackStore } from '@/store/feedbackStore';

interface ThumbsUpButtonProps {
  messageId: string;
  onThumbsUp: () => void;
  primaryColor?: string;
}

const ThumbsUpButton: React.FC<ThumbsUpButtonProps> = ({
  messageId,
  onThumbsUp,
  primaryColor
}) => {
  // Local state for UI responsiveness
  const [isActive, setIsActive] = useState(false);
  
  // Get feedback state and actions from the store
  const { addMessageThumbsUp, isMessageThumbedUp } = useFeedbackStore();
  
  // Sync with store on initial render
  useEffect(() => {
    setIsActive(isMessageThumbedUp(messageId));
  }, [messageId, isMessageThumbedUp]);
  
  const handleThumbsUp = () => {
    // Update local state
    setIsActive(true);
    
    // Call the callback
    onThumbsUp();
    
    // Update store
    addMessageThumbsUp(messageId);
  };
  
  const buttonStyle = isActive && primaryColor
    ? { color: primaryColor, borderColor: primaryColor }
    : undefined;
  
  return (
    <div className="stylist-feedback-controls stylist-feedback-controls--thumbs-up">
      <button
        className={`stylist-feedback-controls__button ${isActive ? 'stylist-feedback-controls__button--active' : ''}`}
        onClick={handleThumbsUp}
        style={buttonStyle}
        aria-label="This was helpful"
        disabled={isActive}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"/>
        </svg>
        <span className="stylist-feedback-controls__button-text">
          {isActive ? 'Thanks for your feedback!' : 'Was this helpful?'}
        </span>
      </button>
    </div>
  );
};

export default ThumbsUpButton;