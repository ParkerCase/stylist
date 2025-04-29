// Outfit Builder component for creating outfits from closet items

import React, { useState, useCallback, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { ClosetItem } from '@/types';
import MyCloset from '../MyCloset/MyCloset';
import './OutfitBuilder.scss';

interface OutfitBuilderProps {
  onSaveOutfit?: (name: string, items: ClosetItem[]) => void;
}

const OutfitBuilder: React.FC<OutfitBuilderProps> = ({ onSaveOutfit }) => {
  const { user } = useUserStore();
  const [outfitItems, setOutfitItems] = useState<ClosetItem[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});

  // Update selectedCategories when outfitItems changes
  useEffect(() => {
    const categories: Record<string, boolean> = {};
    outfitItems.forEach(item => {
      categories[item.category] = true;
    });
    setSelectedCategories(categories);
  }, [outfitItems]);

  // Add item to outfit
  const handleAddToOutfit = useCallback((item: ClosetItem) => {
    // Don't add duplicate items
    if (!outfitItems.some(outfitItem => outfitItem.id === item.id)) {
      setOutfitItems(prev => [...prev, item]);
    }
  }, [outfitItems]);

  // Remove item from outfit
  const handleRemoveItem = useCallback((itemId: string) => {
    setOutfitItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Clear the outfit
  const handleClearOutfit = useCallback(() => {
    if (outfitItems.length > 0 && window.confirm('Are you sure you want to clear this outfit?')) {
      setOutfitItems([]);
    }
  }, [outfitItems.length]);

  // Handle outfit name input change
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setOutfitName(e.target.value);
  }, []);

  // Save the outfit
  const handleSaveOutfit = useCallback(() => {
    if (outfitItems.length === 0) {
      alert('Please add at least one item to your outfit before saving.');
      return;
    }

    if (!outfitName.trim()) {
      alert('Please enter a name for your outfit.');
      return;
    }

    setIsSaving(true);
    
    // Call the onSaveOutfit callback to handle saving
    if (onSaveOutfit) {
      onSaveOutfit(outfitName, outfitItems);
    }
    
    // Reset the form
    setTimeout(() => {
      setIsSaving(false);
      setOutfitName('');
      setOutfitItems([]);
      setShowSaveForm(false);
    }, 1000);
  }, [outfitName, outfitItems, onSaveOutfit]);

  // Get recommendations for completing the outfit
  const handleGetRecommendations = useCallback(() => {
    // This would call the recommendation API
    // For now, just show an alert with what categories are missing
    const missingCategories = [];
    
    // Check for tops
    if (!selectedCategories['tops'] && !selectedCategories['dresses']) {
      missingCategories.push('tops');
    }
    
    // Check for bottoms
    if (!selectedCategories['bottoms'] && !selectedCategories['dresses']) {
      missingCategories.push('bottoms');
    }
    
    // Check for shoes
    if (!selectedCategories['shoes']) {
      missingCategories.push('shoes');
    }
    
    if (missingCategories.length > 0) {
      alert(`Consider adding these categories to complete your outfit: ${missingCategories.join(', ')}`);
    } else {
      alert('Your outfit looks complete! Consider adding accessories to enhance it.');
    }
  }, [selectedCategories]);

  return (
    <div className="stylist-outfit-builder">
      <div className="stylist-outfit-builder__header">
        <h2>Outfit Builder</h2>
        <div className="stylist-outfit-builder__actions">
          <button 
            className="stylist-outfit-builder__clear-btn"
            onClick={handleClearOutfit}
            disabled={outfitItems.length === 0}
          >
            Clear Outfit
          </button>
          <button 
            className="stylist-outfit-builder__save-btn"
            onClick={() => setShowSaveForm(true)}
            disabled={outfitItems.length === 0}
          >
            Save Outfit
          </button>
        </div>
      </div>

      <div className="stylist-outfit-builder__content">
        <div className="stylist-outfit-builder__outfit-preview">
          <h3>Your Outfit</h3>
          
          {outfitItems.length > 0 ? (
            <>
              <div className="stylist-outfit-builder__items">
                {outfitItems.map(item => (
                  <div key={item.id} className="stylist-outfit-builder__item">
                    <button 
                      className="stylist-outfit-builder__item-remove"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      ×
                    </button>
                    <div className="stylist-outfit-builder__item-image">
                      <img src={item.imageUrl} alt={item.subcategory || item.category} />
                    </div>
                    <div className="stylist-outfit-builder__item-details">
                      <span className="stylist-outfit-builder__item-category">
                        {item.subcategory || item.category}
                      </span>
                      {item.brand && (
                        <span className="stylist-outfit-builder__item-brand">{item.brand}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                className="stylist-outfit-builder__recommend-btn"
                onClick={handleGetRecommendations}
              >
                Get Recommendations
              </button>
              
              {showSaveForm && (
                <div className="stylist-outfit-builder__save-form">
                  <h4>Save Your Outfit</h4>
                  <div className="stylist-outfit-builder__form-group">
                    <label htmlFor="outfitName">Outfit Name</label>
                    <input
                      type="text"
                      id="outfitName"
                      value={outfitName}
                      onChange={handleNameChange}
                      placeholder="E.g. Summer Casual, Work Meeting, etc."
                    />
                  </div>
                  <div className="stylist-outfit-builder__form-actions">
                    <button 
                      className="stylist-outfit-builder__cancel-btn"
                      onClick={() => setShowSaveForm(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      className="stylist-outfit-builder__confirm-btn"
                      onClick={handleSaveOutfit}
                      disabled={!outfitName.trim() || isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="stylist-outfit-builder__empty">
              <p>Add items from your closet to build an outfit.</p>
            </div>
          )}
        </div>
        
        <div className="stylist-outfit-builder__closet">
          <MyCloset
            onAddToOutfit={handleAddToOutfit}
            isBuilderMode={true}
          />
        </div>
      </div>
    </div>
  );
};

export default OutfitBuilder;