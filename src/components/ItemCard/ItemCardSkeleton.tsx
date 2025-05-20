// src/components/ItemCard/ItemCardSkeleton.tsx

import React from 'react';
import './ItemCardSkeleton.scss';

interface ItemCardSkeletonProps {
  count?: number;
  showDiscount?: boolean;
  showActions?: boolean;
  showMatchReason?: boolean;
}

/**
 * ItemCardSkeleton Component
 * 
 * A specialized skeleton loader specifically designed to match the ItemCard component's layout
 * to provide a seamless loading experience.
 */
const ItemCardSkeleton: React.FC<ItemCardSkeletonProps> = ({
  count = 1,
  showDiscount = false,
  showActions = true,
  showMatchReason = false
}) => {
  const renderSingleSkeleton = (index: number) => (
    <div key={index} className="stylist-item-card-skeleton">
      <div className="stylist-item-card-skeleton__image-container">
        {showDiscount && (
          <div className="stylist-item-card-skeleton__discount"></div>
        )}
      </div>
      
      <div className="stylist-item-card-skeleton__content">
        <div className="stylist-item-card-skeleton__brand"></div>
        <div className="stylist-item-card-skeleton__name"></div>
        <div className="stylist-item-card-skeleton__price"></div>
      </div>
      
      {showMatchReason && (
        <div className="stylist-item-card-skeleton__match-reasons">
          <div className="stylist-item-card-skeleton__match-score"></div>
          <div className="stylist-item-card-skeleton__reason"></div>
          <div className="stylist-item-card-skeleton__reason"></div>
        </div>
      )}
      
      {showActions && (
        <div className="stylist-item-card-skeleton__actions">
          <div className="stylist-item-card-skeleton__action-btn"></div>
          <div className="stylist-item-card-skeleton__action-btn"></div>
          <div className="stylist-item-card-skeleton__action-btn"></div>
        </div>
      )}
    </div>
  );
  
  return (
    <>
      {Array.from({ length: count }).map((_, index) => renderSingleSkeleton(index))}
    </>
  );
};

export default ItemCardSkeleton;