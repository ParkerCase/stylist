// Lookbook component for displaying saved outfits and recommendations

import React, { useState } from 'react';
import './Lookbook.scss';
import ItemCard from '@/components/ItemCard';
import OutfitDisplay from '@/components/OutfitDisplay';
import { Recommendation } from '@/types/index';
import { useChatStore } from '@/store/index';

interface LookbookProps {
  items: Recommendation.RecommendationItem[];
  outfits: Recommendation.Outfit[];
  savedOutfits: Recommendation.SavedOutfit[];
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onOutfitFeedback?: (outfitId: string, liked: boolean) => void;
  onAddToWishlist?: (item: Recommendation.RecommendationItem) => void;
  onAddToCart?: (item: Recommendation.RecommendationItem, quantity?: number, size?: string, color?: string) => void;
  onSaveOutfit?: (outfit: Recommendation.Outfit) => void;
  primaryColor?: string;
}

const Lookbook: React.FC<LookbookProps> = ({
  items,
  outfits,
  savedOutfits,
  onItemFeedback,
  onOutfitFeedback,
  onAddToWishlist,
  onAddToCart,
  onSaveOutfit,
  primaryColor
}) => {
  const { addTextMessage } = useChatStore();
  const [activeTab, setActiveTab] = useState<'items' | 'outfits' | 'saved'>('items');

  const handleSaveOutfit = (outfitId: string) => {
    if (onSaveOutfit) {
      const outfit = outfits.find(o => o.id === outfitId);
      if (outfit) {
        onSaveOutfit(outfit);
        addTextMessage(
          `I've saved this outfit to your lookbook! You can access it anytime.`,
          'assistant'
        );
      }
    }
  };

  const handleItemClick = (item: Recommendation.RecommendationItem) => {
    // Add chat message about the selected item
    addTextMessage(
      `${item.name} by ${item.brand} is a great choice! Would you like to know more about this item or see similar styles?`,
      'assistant'
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'items':
        return (
          <div className="stylist-lookbook__items">
            {items.length > 0 ? (
              items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onFeedback={onItemFeedback}
                  onAddToWishlist={() => onAddToWishlist && onAddToWishlist(item)}
                  onAddToCart={() => onAddToCart && onAddToCart(item)}
                  showDetails={true}
                  primaryColor={primaryColor}
                  onClick={() => handleItemClick(item)}
                />
              ))
            ) : (
              <div className="stylist-lookbook__empty">
                <p>No recommended items yet.</p>
                <p>Ask me for recommendations to see items here!</p>
              </div>
            )}
          </div>
        );

      case 'outfits':
        return (
          <div className="stylist-lookbook__outfits">
            {outfits.length > 0 ? (
              outfits.map(outfit => {
                // Convert Recommendation.Outfit to ChatTypes.Outfit for OutfitDisplay
                const chatOutfit = {
                  id: outfit.id,
                  name: outfit.name || '',
                  occasion: outfit.occasion,
                  matchScore: outfit.matchScore,
                  matchReasons: outfit.matchReasons,
                  items: outfit.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    brand: item.brand,
                    category: item.category,
                    price: item.price,
                    salePrice: item.salePrice,
                    imageUrl: item.imageUrls[0] || '',
                    url: item.url,
                    matchScore: item.matchScore,
                    matchReasons: item.matchReasons
                  }))
                };
                
                return (
                  <OutfitDisplay
                    key={outfit.id}
                    outfit={chatOutfit}
                    onFeedback={onOutfitFeedback}
                    onSaveOutfit={handleSaveOutfit}
                    primaryColor={primaryColor}
                  />
                );
              })
            ) : (
              <div className="stylist-lookbook__empty">
                <p>No outfit recommendations yet.</p>
                <p>Ask me to create outfits for you!</p>
              </div>
            )}
          </div>
        );

      case 'saved':
        return (
          <div className="stylist-lookbook__saved">
            {savedOutfits.length > 0 ? (
              <p>Your saved outfits will appear here.</p>
            ) : (
              <div className="stylist-lookbook__empty">
                <p>No saved outfits yet.</p>
                <p>Save outfits you like to access them later!</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="stylist-lookbook">
      <div className="stylist-lookbook__header">
        <h3 className="stylist-lookbook__title">Your Lookbook</h3>
        <div className="stylist-lookbook__tabs">
          <button
            className={`stylist-lookbook__tab ${activeTab === 'items' ? 'stylist-lookbook__tab--active' : ''}`}
            onClick={() => setActiveTab('items')}
            style={activeTab === 'items' ? { borderBottomColor: primaryColor } : undefined}
          >
            Items ({items.length})
          </button>
          <button
            className={`stylist-lookbook__tab ${activeTab === 'outfits' ? 'stylist-lookbook__tab--active' : ''}`}
            onClick={() => setActiveTab('outfits')}
            style={activeTab === 'outfits' ? { borderBottomColor: primaryColor } : undefined}
          >
            Outfits ({outfits.length})
          </button>
          <button
            className={`stylist-lookbook__tab ${activeTab === 'saved' ? 'stylist-lookbook__tab--active' : ''}`}
            onClick={() => setActiveTab('saved')}
            style={activeTab === 'saved' ? { borderBottomColor: primaryColor } : undefined}
          >
            Saved ({savedOutfits.length})
          </button>
        </div>
      </div>

      <div className="stylist-lookbook__content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Lookbook;