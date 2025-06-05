// Lookbook component for displaying saved outfits and recommendations

import React, { useState, useEffect } from 'react';
import './Lookbook.scss';
import ItemCard from '@/components/ItemCard';
import OutfitDisplay from '@/components/OutfitDisplay';
import { Recommendation } from '@/types/index';
import { useChatStore } from '@/store/index';
import TryOnModal from '@/components/TryOnModal';
import { GarmentType } from '@/types/tryOn';
import { startTryOn, openTryOnModal } from '@/integration/integrateTryOn';
import TrendingItems from '@/components/TrendingItems';
import SocialProofModal from '@/components/SocialProofModal';
import WishlistTab from '@/components/WishlistTab';

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
  const [activeTab, setActiveTab] = useState<'items' | 'outfits' | 'saved' | 'try-on' | 'trending' | 'wishlist'>('items');
  const [isTryOnModalOpen, setIsTryOnModalOpen] = useState(false);
  const [selectedTryOnItem, setSelectedTryOnItem] = useState<Recommendation.RecommendationItem | null>(null);
  const [isSocialProofModalOpen, setIsSocialProofModalOpen] = useState(false);
  const [selectedCelebrityOutfit, setSelectedCelebrityOutfit] = useState<{
    id: string;
    celebrityName: string;
    imageUrl: string;
    description: string;
  } | null>(null);
  
  // Combine saved outfits and try-on results
  const allSavedItems = [...savedOutfits];
  
  // Filter try-on results
  const tryOnItems = tryOnResults || [];
  
  // Example celebrity outfits data
  const celebrityOutfits = [
    {
      id: 'celeb-1',
      celebrityName: 'Celebrity Name 1',
      imageUrl: 'https://via.placeholder.com/400x600?text=Celebrity+Outfit+1',
      description: 'Spotted on the red carpet wearing a stunning ensemble that combines elegance with modern trends.'
    },
    {
      id: 'celeb-2',
      celebrityName: 'Celebrity Name 2',
      imageUrl: 'https://via.placeholder.com/400x600?text=Celebrity+Outfit+2',
      description: 'A casual yet stylish look perfect for everyday wear, showing how to combine comfort with fashion.'
    }
  ];

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
    if (item.category) {
      const category = item.category.toLowerCase();
      if (category.includes('dress')) {
        garmentType = GarmentType.DRESS;
      } else if (category.includes('bottom') || 
                category.includes('pant') || 
                category.includes('short') || 
                category.includes('skirt')) {
        garmentType = GarmentType.BOTTOM;
      } else if (category.includes('jacket') || 
                category.includes('coat')) {
        garmentType = GarmentType.OUTERWEAR;
      } else if (category.includes('shoes')) {
        garmentType = GarmentType.SHOES;
      } else if (category.includes('accessory')) {
        garmentType = GarmentType.ACCESSORY;
      }
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
  
  // Handle opening the social proof modal
  const handleOpenSocialProofModal = (celebrityOutfit: {
    id: string;
    celebrityName: string;
    imageUrl: string;
    description: string;
  }) => {
    setSelectedCelebrityOutfit(celebrityOutfit);
    setIsSocialProofModalOpen(true);
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
                  data-cy="lookbook-item-card"
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
                    category: item.category || '',
                    price: item.price,
                    salePrice: item.salePrice,
                    imageUrl: item.imageUrls?.[0] || '',
                    url: item.url || '',
                    matchScore: item.matchScore || 0,
                    matchReasons: item.matchReasons || []
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
                      <p>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date(item.savedAt).toLocaleDateString()}</p>
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
                      <p>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date(item.savedAt).toLocaleDateString()}</p>
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
        
      case 'trending':
        return (
          <div className="stylist-lookbook__trending">
            <div className="stylist-lookbook__celebrity-section">
              <h3 className="stylist-lookbook__section-title">Celebrity Inspiration</h3>
              <div className="stylist-lookbook__celebrity-outfits">
                {celebrityOutfits.map(outfit => (
                  <div 
                    key={outfit.id} 
                    className="stylist-lookbook__celebrity-outfit"
                    onClick={() => handleOpenSocialProofModal(outfit)}
                  >
                    <div className="stylist-lookbook__celebrity-image">
                      <img src={outfit.imageUrl} alt={outfit.celebrityName} />
                    </div>
                    <div className="stylist-lookbook__celebrity-details">
                      <h4>{outfit.celebrityName}</h4>
                      <p className="stylist-lookbook__celebrity-description">
                        {outfit.description}
                      </p>
                      <button 
                        className="stylist-lookbook__get-the-look-btn"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Get the Look
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="stylist-lookbook__trending-section">
              <h3 className="stylist-lookbook__section-title">Trending Now</h3>
              <TrendingItems 
                apiKey={process.env.REACT_APP_API_KEY || ''}
                retailerId={process.env.REACT_APP_RETAILER_ID || ''}
                apiUrl={process.env.REACT_APP_API_URL || ''}
                onItemFeedback={onItemFeedback}
                onAddToWishlist={onAddToWishlist}
                onAddToCart={onAddToCart}
                primaryColor={primaryColor}
              />
            </div>
          </div>
        );
        
      case 'wishlist':
        return (
          <div className="stylist-lookbook__wishlist">
            <WishlistTab 
              onAddToCart={onAddToCart}
              onRemoveFromWishlist={(itemId) => {
                // This would trigger the remove from wishlist action
                console.log('Remove from wishlist:', itemId);
              }}
              onMoveToCloset={(item) => {
                // This would trigger adding to closet
                console.log('Move to closet:', item);
              }}
              primaryColor={primaryColor}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="stylist-lookbook" data-cy="lookbook">
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
            className={`stylist-lookbook__tab ${activeTab === 'trending' ? 'stylist-lookbook__tab--active' : ''}`}
            onClick={() => setActiveTab('trending')}
            style={activeTab === 'trending' && primaryColor ? { borderBottomColor: primaryColor } : undefined}
          >
            <span role="img" aria-label="Fire">🔥</span> Trending
          </button>
          <button
            className={`stylist-lookbook__tab ${activeTab === 'wishlist' ? 'stylist-lookbook__tab--active' : ''}`}
            onClick={() => setActiveTab('wishlist')}
            style={activeTab === 'wishlist' && primaryColor ? { borderBottomColor: primaryColor } : undefined}
          >
            <span role="img" aria-label="Heart">💖</span> Wishlist
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
      
      {/* Social Proof Modal for celebrity outfits */}
      {isSocialProofModalOpen && selectedCelebrityOutfit && (
        <SocialProofModal
          isOpen={isSocialProofModalOpen}
          onClose={() => setIsSocialProofModalOpen(false)}
          outfitData={selectedCelebrityOutfit}
          apiKey={process.env.REACT_APP_API_KEY || ''}
          retailerId={process.env.REACT_APP_RETAILER_ID || ''}
          apiUrl={process.env.REACT_APP_API_URL || ''}
          onItemFeedback={onItemFeedback}
          onAddToWishlist={onAddToWishlist}
          onAddToCart={onAddToCart}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
};

export default Lookbook;