// Outfit display component for displaying outfit recommendations

import React from 'react';
import './OutfitDisplay.scss';
import { Outfit } from '@types/index';
import FeedbackControls from '@components/FeedbackControls';
import WishlistButton from '@components/WishlistButton';

interface OutfitDisplayProps {
  outfit: Outfit;
  onFeedback?: (outfitId: string, liked: boolean) => void;
  onSaveOutfit?: (outfitId: string) => void;
  onItemClick?: (itemId: string) => void;
  primaryColor?: string;
}

const OutfitDisplay: React.FC<OutfitDisplayProps> = ({
  outfit,
  onFeedback,
  onSaveOutfit,
  onItemClick,
  primaryColor
}) => {
  const {
    id,
    items,
    occasion,
    matchScore,
    matchReasons
  } = outfit;
  
  const handleFeedback = (liked: boolean) => {
    if (onFeedback) {
      onFeedback(id, liked);
    }
  };
  
  const handleSaveOutfit = () => {
    if (onSaveOutfit) {
      onSaveOutfit(id);
    }
  };
  
  const handleItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId);
    }
  };
  
  return (
    <div className="stylist-outfit-display">
      <div className="stylist-outfit-display__header">
        <div className="stylist-outfit-display__title">
          Complete Outfit for {occasion}
        </div>
        <div className="stylist-outfit-display__score" style={{ color: primaryColor }}>
          {Math.round(matchScore * 100)}% Match
        </div>
      </div>
      
      <div className="stylist-outfit-display__items">
        {items.map((item) => (
          <div
            key={item.id}
            className="stylist-outfit-display__item"
            onClick={() => handleItemClick(item.id)}
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="stylist-outfit-display__item-image"
              />
            ) : (
              <div className="stylist-outfit-display__item-placeholder">
                {item.category}
              </div>
            )}
            <div className="stylist-outfit-display__item-info">
              <div className="stylist-outfit-display__item-brand">{item.brand}</div>
              <div className="stylist-outfit-display__item-name">{item.name}</div>
            </div>
          </div>
        ))}
      </div>
      
      {matchReasons.length > 0 && (
        <div className="stylist-outfit-display__reasons">
          <div className="stylist-outfit-display__reasons-title">Why this outfit works:</div>
          <ul className="stylist-outfit-display__reasons-list">
            {matchReasons.map((reason, index) => (
              <li key={index} className="stylist-outfit-display__reason-item">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="stylist-outfit-display__actions">
        <FeedbackControls
          onLike={() => handleFeedback(true)}
          onDislike={() => handleFeedback(false)}
          primaryColor={primaryColor}
        />
        
        <WishlistButton
          onClick={handleSaveOutfit}
          primaryColor={primaryColor}
          label="Save Outfit"
        />
      </div>
    </div>
  );
};

export default OutfitDisplay;
