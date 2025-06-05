import React, { useState, useMemo } from 'react';
import { Recommendation } from '@/types';
import ItemCard from '@/components/ItemCard';
import GridLayout from '@/components/GridLayout';
import CategorySelector from '@/components/CategorySelector';
import './SuggestionGrid.scss';

interface SuggestionGridProps {
  items: Recommendation.RecommendationItem[];
  requestedItems?: Recommendation.RecommendationItem[];
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onAddToWishlist?: (item: Recommendation.RecommendationItem) => void;
  onAddToCart?: (item: Recommendation.RecommendationItem) => void;
  onItemClick?: (item: Recommendation.RecommendationItem) => void;
  primaryColor?: string;
  onGenerate?: () => void;
  isLoading?: boolean;
}

const SuggestionGrid: React.FC<SuggestionGridProps> = ({
  items,
  requestedItems = [],
  onItemFeedback,
  onAddToWishlist,
  onAddToCart,
  onItemClick,
  primaryColor,
  onGenerate,
  isLoading = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Get all categories from items
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    
    items.forEach(item => {
      if (item.category) {
        categorySet.add(item.category);
      }
    });
    
    return Array.from(categorySet).map(category => ({
      id: category,
      name: category.charAt(0).toUpperCase() + category.slice(1)
    }));
  }, [items]);
  
  // Filter items by selected category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return items;
    }
    return items.filter(item => item.category === selectedCategory);
  }, [items, selectedCategory]);
  
  // Process items for 2x5 grid (10 items max)
  const displayItems = useMemo(() => {
    return filteredItems.slice(0, 10);
  }, [filteredItems]);
  
  // Create item components
  const itemComponents = displayItems.map(item => (
    <ItemCard
      key={item.id}
      item={{
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        salePrice: item.salePrice,
        image: item.imageUrls[0] || ''
      }}
      onFavorite={onItemFeedback ? (liked) => onItemFeedback(item.id, liked) : undefined}
      onAddToWishlist={onAddToWishlist ? () => onAddToWishlist(item) : undefined}
      onAddToCart={onAddToCart ? () => onAddToCart(item) : undefined}
      onClick={onItemClick ? () => onItemClick(item) : undefined}
      primaryColor={primaryColor}
      data-cy="item-card"
    />
  ));
  
  // Create requested item components
  const requestedItemComponents = requestedItems.map(item => (
    <ItemCard
      key={item.id}
      item={{
        id: item.id,
        name: item.name,
        brand: item.brand,
        price: item.price,
        salePrice: item.salePrice,
        image: item.imageUrls[0] || ''
      }}
      onFavorite={onItemFeedback ? (liked) => onItemFeedback(item.id, liked) : undefined}
      onAddToWishlist={onAddToWishlist ? () => onAddToWishlist(item) : undefined}
      onAddToCart={onAddToCart ? () => onAddToCart(item) : undefined}
      onClick={onItemClick ? () => onItemClick(item) : undefined}
      primaryColor={primaryColor}
      className="stylist-suggestion-grid__requested-item"
      data-cy="item-card"
    />
  ));
  
  return (
    <div className="stylist-suggestion-grid" data-cy="suggestion-grid">
      {onGenerate && (
        <div className="stylist-suggestion-grid__generate-btn-row">
          <button
            className="stylist-suggestion-grid__generate-btn"
            onClick={onGenerate}
            disabled={isLoading}
            style={primaryColor ? { backgroundColor: primaryColor } : {}}
            data-cy="generate-suggestions"
          >
            {isLoading ? (
              <span className="stylist-suggestion-grid__spinner" />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 8 }}>
                  <circle cx="10" cy="10" r="9" stroke="#fff" strokeWidth="2" />
                  <path d="M10 3v7l5 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Generate Suggestions
              </>
            )}
          </button>
        </div>
      )}
      <GridLayout
        size="2x5"
        title="Suggested Items"
        categoryDropdown={
          <CategorySelector
            categories={categories}
            selectedCategory={selectedCategory}
            onChange={setSelectedCategory}
            includeAll={true}
            primaryColor={primaryColor}
          />
        }
        showRequestedSection={requestedItems.length > 0}
        requestedItems={requestedItemComponents}
        items={itemComponents}
        data-cy="suggestion-grid-layout"
      />
    </div>
  );
};

export default SuggestionGrid;