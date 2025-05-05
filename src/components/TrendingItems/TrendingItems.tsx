// TrendingItems component displays popular items based on user activity
import React, { useState, useEffect } from 'react';
import { createStylistApi } from '@/api/index';
import { useUserStore } from '@/store/userStore';
import { Recommendation } from '@/types';
import ItemCard from '@/components/ItemCard';
import LoadingIndicator from '@/components/common/LoadingIndicator';
import './TrendingItems.scss';

interface TrendingItemsProps {
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onAddToWishlist?: (item: Recommendation.RecommendationItem) => void;
  onAddToCart?: (item: Recommendation.RecommendationItem) => void;
  onItemClick?: (item: Recommendation.RecommendationItem) => void;
  primaryColor?: string;
}

const TrendingItems: React.FC<TrendingItemsProps> = ({
  apiKey,
  retailerId,
  apiUrl,
  onItemFeedback,
  onAddToWishlist,
  onAddToCart,
  onItemClick,
  primaryColor
}) => {
  const [trendingItems, setTrendingItems] = useState<Recommendation.RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { user } = useUserStore();
  
  // Get trending items on component mount
  useEffect(() => {
    if (user) {
      fetchTrendingItems();
    }
  }, [user?.userId]);
  
  // Fetch trending items from API
  const fetchTrendingItems = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const api = createStylistApi({ apiKey, retailerId, apiUrl });
      
      // Fetch trending items with user's size and style profile
      const response = await api.recommendation.getRecommendations({
        userId: user.userId,
        limit: 100, // Get top 100 items
        filters: {
          trending: true, // Flag to get trending items
          size: user.preferences?.size,
          style: user.stylePreferences?.style
        }
      });
      
      // Ensure we have items
      if (!response || !response.items || response.items.length === 0) {
        if (response.message) {
          // API returned an explanation message
          setError(response.message);
        } else {
          setError('No trending items found. Please check back later.');
        }
        setTrendingItems([]);
        return;
      }
      
      // Sort by match score if available
      const sortedItems = [...response.items].sort((a, b) => {
        // Sort by trending flag first (if available)
        if (a.trending && !b.trending) return -1;
        if (!a.trending && b.trending) return 1;
        
        // Then by match score
        return (b.matchScore || 0) - (a.matchScore || 0);
      });
      
      // Transform the response for consistent property naming
      const items = sortedItems.map(item => ({
        id: item.id,
        retailerId: item.retailerId || retailerId,
        name: item.name || 'Unnamed Item',
        brand: item.brand || '',
        category: item.category || '',
        price: item.price || 0,
        salePrice: item.salePrice,
        colors: item.colors || [],
        sizes: item.sizes || [],
        imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : 
                  (item.imageUrl ? [item.imageUrl] : []),
        url: item.url || '#',
        matchScore: item.matchScore || 0,
        matchReasons: item.matchReasons || [],
        inStock: item.inStock !== false, // Default to true unless explicitly false
        trending: true
      }));
      
      setTrendingItems(items);
      
      // Log success for debugging
      console.log(`Loaded ${items.length} trending items from API`);
    } catch (error) {
      console.error('Error fetching trending items:', error);
      setError('Failed to fetch trending items. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter items by category
  const filteredItems = () => {
    if (filterCategory === 'all') {
      return trendingItems;
    }
    return trendingItems.filter(item => item.category === filterCategory);
  };
  
  // Get unique categories
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(trendingItems.map(item => item.category));
    return ['all', ...Array.from(uniqueCategories)];
  }, [trendingItems]);
  
  // Handle item feedback
  const handleItemFeedback = (itemId: string, liked: boolean) => {
    if (onItemFeedback) {
      onItemFeedback(itemId, liked);
    }
  };
  
  // Handle adding item to wishlist
  const handleAddToWishlist = (item: Recommendation.RecommendationItem) => {
    if (onAddToWishlist) {
      onAddToWishlist(item);
    }
  };
  
  // Handle adding item to cart
  const handleAddToCart = (item: Recommendation.RecommendationItem) => {
    if (onAddToCart) {
      onAddToCart(item);
    }
  };
  
  // Handle clicking an item
  const handleItemClick = (item: Recommendation.RecommendationItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };
  
  return (
    <div className="stylist-trending-items">
      <div className="stylist-trending-items__header">
        <h2 className="stylist-trending-items__title">Trending Items</h2>
        <div className="stylist-trending-items__filter">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="stylist-trending-items__filter-select"
          >
            <option value="all">All Categories</option>
            {categories.filter(cat => cat !== 'all').map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="stylist-trending-items__loading">
          <LoadingIndicator />
          <p>Loading trending items...</p>
        </div>
      ) : error ? (
        <div className="stylist-trending-items__error">
          <p>{error}</p>
          <button 
            className="stylist-trending-items__retry-btn"
            onClick={fetchTrendingItems}
          >
            Retry
          </button>
        </div>
      ) : filteredItems().length === 0 ? (
        <div className="stylist-trending-items__empty">
          <p>No trending items found. Check back later!</p>
        </div>
      ) : (
        <div className="stylist-trending-items__grid">
          {filteredItems().map(item => (
            <div key={item.id} className="stylist-trending-items__item">
              <div className="stylist-trending-items__trending-badge">
                🔥 Trending
              </div>
              <ItemCard
                item={{
                  id: item.id,
                  name: item.name,
                  brand: item.brand,
                  price: item.price,
                  salePrice: item.salePrice,
                  image: item.imageUrls[0] || ''
                }}
                onFavorite={(liked) => handleItemFeedback(item.id, liked)}
                onAddToWishlist={() => handleAddToWishlist(item)}
                onAddToCart={() => handleAddToCart(item)}
                onClick={() => handleItemClick(item)}
                primaryColor={primaryColor}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendingItems;