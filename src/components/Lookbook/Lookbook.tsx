// Lookbook component for displaying saved outfits and recommendations

import React, { useState } from 'react';
import './Lookbook.scss';
import ItemCard from '@/components/ItemCard';
import OutfitDisplay from '@/components/OutfitDisplay';
import { Recommendation } from '@/types/index';
import { useChatStore } from '@/store/index';
import TryOnModal from '@/components/TryOnModal';
import { GarmentType } from '@/types/tryOn';
import { startTryOn, openTryOnModal } from '@/integration/integrateTryOn';

interface LookbookProps {
  items: Recommendation.RecommendationItem[];
  outfits: Recommendation.Outfit[];
  savedOutfits: Recommendation.SavedOutfit[];
  tryOnResults?: Recommendation.SavedOutfit[];
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onOutfitFeedback?: (outfitId: string, liked: boolean) => void;
  onAddToWishlist?: (item: Recommendation.RecommendationItem) => void;
  onAddToCart?: (item: Recommendation.RecommendationItem, quantity?: number, size?: string, color?: string) => void;
  onSaveOutfit?: (outfit: Recommendation.Outfit) => void;
  onSaveTryOnResult?: (result: { id: string, imageUrl: string, name: string }) => void;
  primaryColor?: string;
}

const Lookbook: React.FC<LookbookProps> = ({
  items,
  outfits,
  savedOutfits,
  tryOnResults = [],
  onItemFeedback,
  onOutfitFeedback,
  onAddToWishlist,
  onAddToCart,
  onSaveOutfit,
  onSaveTryOnResult,
  primaryColor
}) => {
  const { addTextMessage } = useChatStore();
  const [activeTab, setActiveTab] = useState<'items' | 'outfits' | 'saved' | 'try-on'>('items');
  const [isTryOnModalOpen, setIsTryOnModalOpen] = useState(false);
  const [selectedTryOnItem, setSelectedTryOnItem] = useState<Recommendation.RecommendationItem | null>(null);
  
  // Combine saved outfits and try-on results
  const allSavedItems = [...savedOutfits];
  
  // Filter try-on results
  const tryOnItems = tryOnResults || [];

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
  
  const handleTryOn = (item: Recommendation.RecommendationItem) => {
    // Store selected item
    setSelectedTryOnItem(item);
    
    // Map item category to GarmentType
    let garmentType = GarmentType.TOP;
    if (item.category.toLowerCase().includes('dress')) {
      garmentType = GarmentType.DRESS;
    } else if (item.category.toLowerCase().includes('bottom') || 
               item.category.toLowerCase().includes('pant') || 
               item.category.toLowerCase().includes('short') || 
               item.category.toLowerCase().includes('skirt')) {
      garmentType = GarmentType.BOTTOM;
    } else if (item.category.toLowerCase().includes('jacket') || 
               item.category.toLowerCase().includes('coat')) {
      garmentType = GarmentType.OUTERWEAR;
    } else if (item.category.toLowerCase().includes('shoes')) {
      garmentType = GarmentType.SHOES;
    } else if (item.category.toLowerCase().includes('accessory')) {
      garmentType = GarmentType.ACCESSORY;
    }
    
    // Start try-on with the item's image
    const imageUrl = item.imageUrls?.[0] || '';
    if (imageUrl) {
      startTryOn(imageUrl, garmentType);
      openTryOnModal();
    }
  };
  
  const handleSaveTryOnResult = (resultUrl: string) => {
    if (onSaveTryOnResult && selectedTryOnItem) {
      const tryOnResult = {
        id: `tryon-${Date.now()}`,
        imageUrl: resultUrl,
        name: `Try-on: ${selectedTryOnItem.name}`
      };
      
      onSaveTryOnResult(tryOnResult);
      setActiveTab('try-on');
      
      // Reset selected item
      setSelectedTryOnItem(null);
    }
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
                  onTryOn={() => handleTryOn(item)}
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
            {allSavedItems.length > 0 ? (
              <div className="stylist-lookbook__saved-items">
                {allSavedItems.map(item => (
                  <div key={item.id} className="stylist-lookbook__saved-item">
                    <div className="stylist-lookbook__saved-image">
                      <img src={item.imageUrl} alt={item.name} />
                    </div>
                    <div className="stylist-lookbook__saved-details">
                      <h4>{item.name}</h4>
                      <p>{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="stylist-lookbook__empty">
                <p>No saved outfits yet.</p>
                <p>Save outfits you like to access them later!</p>
              </div>
            )}
          </div>
        );
        
      case 'try-on':
        return (
          <div className="stylist-lookbook__try-on">
            {tryOnItems.length > 0 ? (
              <div className="stylist-lookbook__try-on-items">
                {tryOnItems.map(item => (
                  <div key={item.id} className="stylist-lookbook__try-on-item">
                    <div className="stylist-lookbook__try-on-image">
                      <img src={item.imageUrl} alt={item.name} />
                    </div>
                    <div className="stylist-lookbook__try-on-details">
                      <h4>{item.name}</h4>
                      <p>{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="stylist-lookbook__empty">
                <p>No try-on results yet.</p>
                <p>Use the try-on feature on items to see them here!</p>
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
            style={activeTab === 'items' && primaryColor ? { borderBottomColor: primaryColor } : undefined}
          >
            Items ({items.length})
          </button>
          <button
            className={`stylist-lookbook__tab ${activeTab === 'outfits' ? 'stylist-lookbook__tab--active' : ''}`}
            onClick={() => setActiveTab('outfits')}
            style={activeTab === 'outfits' && primaryColor ? { borderBottomColor: primaryColor } : undefined}
          >
            Outfits ({outfits.length})
          </button>
          <button
            className={`stylist-lookbook__tab ${activeTab === 'saved' ? 'stylist-lookbook__tab--active' : ''}`}
            onClick={() => setActiveTab('saved')}
            style={activeTab === 'saved' && primaryColor ? { borderBottomColor: primaryColor } : undefined}
          >
            Saved ({allSavedItems.length})
          </button>
          <button
            className={`stylist-lookbook__tab ${activeTab === 'try-on' ? 'stylist-lookbook__tab--active' : ''}`}
            onClick={() => setActiveTab('try-on')}
            style={activeTab === 'try-on' && primaryColor ? { borderBottomColor: primaryColor } : undefined}
          >
            Try-On ({tryOnItems.length})
          </button>
        </div>
      </div>

      <div className="stylist-lookbook__content">
        {renderTabContent()}
      </div>
      
      {/* Try-On Modal is now handled via integrateTryOn.ts with global state */}
      <TryOnModal 
        onSave={handleSaveTryOnResult}
      />
    </div>
  );
};

export default Lookbook;