// TrendingItems component displays popular items based on user activity
import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { io, Socket } from 'socket.io-client';
import { createStylistApi } from '@/api/index';
import { useUserStore } from '@/store/userStore';
import { Recommendation } from '@/types';
import LoadingIndicator from '@/components/common/LoadingIndicator';
import GridLayout from '@/components/GridLayout';
import CategorySelector, { Category } from '@/components/CategorySelector';
import './TrendingItems.scss';

// Lazy load ItemCard component for better performance
const ItemCard = lazy(() => import('@/components/ItemCard'));

// TrendingLogic encapsulates the trending algorithm configuration
const TRENDING_LOGIC = {
  total: 100,
  layout: "2x50 grid", // Default grid layout
  filters: {
    age: ["18-25", "26-35", "36-45", "46+"],
    gender: ["Male", "Female", "Non-binary"],
    style: "User preferences"
  },
  update: "Real-time",
  realTimeUpdateInterval: 30 * 1000, // Poll interval in milliseconds if WebSockets unavailable
  socketEndpoint: '/trending-updates' // WebSocket endpoint for real-time updates
};

interface TrendingItemsProps {
  apiKey: string;
  retailerId: string;
  apiUrl?: string;
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onAddToWishlist?: (item: Recommendation.RecommendationItem) => void;
  onAddToCart?: (item: Recommendation.RecommendationItem) => void;
  onItemClick?: (item: Recommendation.RecommendationItem) => void;
  onQuickView?: (item: Recommendation.RecommendationItem) => void;
  onAddToCollection?: (item: Recommendation.RecommendationItem, collectionId?: string) => void;
  onShare?: (item: Recommendation.RecommendationItem) => void;
  onTryOn?: (item: Recommendation.RecommendationItem) => void;
  primaryColor?: string;
  layout?: string; // Optional layout override (defaults to "2x50 grid")
  ageFilter?: string; // Optional age filter
  genderFilter?: string; // Optional gender filter
  seasonFilter?: string; // Optional seasonal filter
  maxItems?: number; // Maximum items to show
}

const TrendingItems: React.FC<TrendingItemsProps> = ({
  apiKey,
  retailerId,
  apiUrl,
  onItemFeedback,
  onAddToWishlist,
  onAddToCart,
  onItemClick,
  onQuickView,
  onAddToCollection,
  onShare,
  onTryOn,
  primaryColor,
  layout = TRENDING_LOGIC.layout,
  ageFilter,
  genderFilter,
  seasonFilter,
  maxItems = TRENDING_LOGIC.total
}) => {
  // Refs for infinite scrolling and intersection observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const apiClientRef = useRef<any>(null);

  // State for trending items and UI
  const [trendingItems, setTrendingItems] = useState<Recommendation.RecommendationItem[]>([]);
  const [displayedItems, setDisplayedItems] = useState<Recommendation.RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [ageRange, setAgeRange] = useState<string>(ageFilter || 'all');
  const [gender, setGender] = useState<string>(genderFilter || 'all');
  const [season, setSeason] = useState<string>(seasonFilter || 'all');
  const [visibleCount, setVisibleCount] = useState(20); // Initial visible items count
  const [hasMore, setHasMore] = useState(true); // For infinite scroll
  const [hasNewTrends, setHasNewTrends] = useState(false); // Flag for new trend notification
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);

  // User store for preferences
  const { user } = useUserStore();
  
  // Get trending items on component mount
  useEffect(() => {
    if (user) {
      // Initialize API client for reuse
      apiClientRef.current = createStylistApi({ apiKey, retailerId, apiUrl });
      fetchTrendingItems();

      // Set up real-time updates
      initializeRealTimeUpdates();

      // Clean up real-time connections on unmount
      return () => {
        cleanupRealTimeUpdates();
      };
    }
  }, [user?.userId, ageFilter, genderFilter, seasonFilter]);

  // Helper function to get current season
  const getCurrentSeason = useCallback((): string => {
    const now = new Date();
    const month = now.getMonth();

    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }, []);

  // Helper function to calculate days between two dates
  const daysBetween = useCallback((date1: Date, date2: Date): number => {
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  }, []);

  // Rank trending items based on various factors
  const rankTrendingItems = useCallback((items: Recommendation.RecommendationItem[]): Recommendation.RecommendationItem[] => {
    if (!items.length) return [];

    // Apply the ranking algorithm weights
    return items.map(item => {
      // Base trending score starts with the match score
      let trendingScore = item.matchScore || 0.5;

      // 1. Global likes/dislikes
      const likeWeight = 0.3;
      if (item.likeCount && item.dislikeCount) {
        const likeRatio = item.likeCount / (item.likeCount + item.dislikeCount);
        trendingScore += likeRatio * likeWeight;
      } else if (item.likeCount) {
        trendingScore += likeWeight;
      }

      // 2. User demographic matching (age and gender)
      const demographicWeight = 0.15;
      if (user?.preferences) {
        // Try to extract age and gender from preferences structure
        // In a real app, we'd know the exact structure
        const userPrefs = user.preferences as any;
        const userAge = userPrefs.age || (userPrefs.preferences?.age) || '';
        const userGender = userPrefs.gender || (userPrefs.preferences?.gender) || '';

        if (item.targetDemographics) {
          // Age match
          if (userAge && item.targetDemographics.age?.includes(userAge)) {
            trendingScore += demographicWeight * 0.5;
          }

          // Gender match
          if (userGender && item.targetDemographics.gender?.includes(userGender)) {
            trendingScore += demographicWeight * 0.5;
          }
        }
      }

      // 3. Recent activity weight
      const recencyWeight = 0.25;
      if (item.recentViews) {
        // Logarithmic scale to prevent extremely popular items from dominating
        const viewScore = Math.min(Math.log10(item.recentViews + 1) / 3, 1);
        trendingScore += viewScore * recencyWeight;
      }

      // 4. Seasonal adjustments
      const seasonalWeight = 0.15;
      const currentSeason = getCurrentSeason();
      if (item.seasonality === currentSeason) {
        trendingScore += seasonalWeight;
      }

      // 5. New arrival boost
      const newArrivalWeight = 0.15;
      if (item.isNewArrival) {
        trendingScore += newArrivalWeight;
      } else if (item.releaseDate) {
        // Gradually reduce boost based on days since release (up to 30 days)
        try {
          const releaseDate = item.releaseDate instanceof Date
            ? item.releaseDate
            : new Date(typeof item.releaseDate === 'string' ? item.releaseDate : Date.now());

          const daysSinceRelease = daysBetween(releaseDate, new Date());
          if (daysSinceRelease <= 30) {
            const newness = 1 - (daysSinceRelease / 30);
            trendingScore += newness * newArrivalWeight;
          }
        } catch (e) {
          console.warn('Error processing release date:', e);
        }
      }

      // Normalize score to 0-1 range
      trendingScore = Math.min(Math.max(trendingScore, 0), 1);

      return {
        ...item,
        trendingScore
      };
    })
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
    .map((item, index) => ({
      ...item,
      trendingRank: index + 1
    }));
  }, [user?.preferences, getCurrentSeason, daysBetween]);

  // Initialize real-time updates via WebSocket or polling
  const initializeRealTimeUpdates = useCallback(() => {
    // First try WebSockets
    try {
      // Use the API URL base if available, otherwise default to current origin
      const socketUrl = apiUrl
        ? new URL(TRENDING_LOGIC.socketEndpoint, apiUrl).toString()
        : TRENDING_LOGIC.socketEndpoint;

      // Initialize socket connection
      socketRef.current = io(socketUrl, {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        auth: {
          token: apiKey,
          retailerId
        }
      });

      // Listen for new trending items
      socketRef.current.on('trending:update', (data) => {
        console.log('Received real-time trending update', data);
        handleRealTimeUpdate(data);
        setIsRealTimeActive(true);
      });

      // Listen for connection events
      socketRef.current.on('connect', () => {
        console.log('WebSocket connected for trending updates');
        setIsRealTimeActive(true);

        // Join user-specific and filter-specific rooms
        socketRef.current?.emit('join', {
          userId: user?.userId,
          retailerId,
          filters: {
            age: ageRange !== 'all' ? ageRange : undefined,
            gender: gender !== 'all' ? gender : undefined,
            season: season !== 'all' ? season : undefined,
            category: filterCategory !== 'all' ? filterCategory : undefined
          }
        });
      });

      socketRef.current.on('connect_error', (err) => {
        console.warn('WebSocket connection error:', err);
        setIsRealTimeActive(false);

        // Fall back to polling if WebSocket fails
        startPolling();
      });

      socketRef.current.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsRealTimeActive(false);

        // Start polling as fallback
        startPolling();
      });
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);

      // Fall back to polling
      startPolling();
    }
  }, [user?.userId, retailerId, apiKey, apiUrl, ageRange, gender, season, filterCategory]);

  // Start polling for updates as fallback to WebSockets
  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    console.log('Starting polling for trending updates');

    // Set up polling interval
    pollingRef.current = setInterval(() => {
      console.log('Polling for trending updates...');
      checkForTrendingUpdates();
    }, TRENDING_LOGIC.realTimeUpdateInterval);
  }, []);

  // Clean up real-time update connections
  const cleanupRealTimeUpdates = useCallback(() => {
    // Close WebSocket connection
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clear polling interval
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Check for trending updates via API when using polling
  const checkForTrendingUpdates = useCallback(async () => {
    if (!apiClientRef.current || !user?.userId) return;

    try {
      // Check for updates since last fetch
      const response = await apiClientRef.current.recommendation.getUpdatedRecommendations({
        userId: user.userId,
        since: lastUpdateTime.toISOString(),
        context: 'trending',
        filters: {
          trending: true,
          age: ageRange !== 'all' ? ageRange : undefined,
          gender: gender !== 'all' ? gender : undefined,
          season: season !== 'all' ? season : undefined,
          category: filterCategory !== 'all' ? filterCategory : undefined
        }
      });

      // If we have updates, handle them
      if (response && response.hasUpdates) {
        console.log('Found trending updates via polling');
        setHasNewTrends(true);

        // If autoUpdate is enabled, update the items immediately
        if (response.items && response.items.length > 0) {
          handleRealTimeUpdate({
            items: response.items,
            timestamp: new Date(),
            updateType: 'polling'
          });
        }
      }
    } catch (error) {
      console.error('Error checking for trending updates:', error);
    }
  }, [user?.userId, lastUpdateTime, ageRange, gender, season, filterCategory]);

  // Handle real-time updates from WebSocket or polling
  const handleRealTimeUpdate = useCallback((data: any) => {
    // Update timestamp
    setLastUpdateTime(new Date(data.timestamp || Date.now()));

    if (data.items && data.items.length > 0) {
      setTrendingItems(prevItems => {
        // Create a map of existing items for quick lookup
        const existingItemsMap = new Map(prevItems.map(item => [item.id, item]));

        // Process new items
        data.items.forEach((item: Recommendation.RecommendationItem) => {
          // If item already exists, update it with new data
          if (existingItemsMap.has(item.id)) {
            const existingItem = existingItemsMap.get(item.id);
            // Update trending data
            existingItemsMap.set(item.id, {
              ...existingItem,
              ...item,
              trendingScore: item.trendingScore || existingItem?.trendingScore,
              likeCount: item.likeCount || existingItem?.likeCount,
              dislikeCount: item.dislikeCount || existingItem?.dislikeCount,
              recentViews: item.recentViews || existingItem?.recentViews,
              isRealTimeUpdate: true, // Flag to animate this item
              lastUpdated: new Date()
            });
          } else {
            // Add new item
            existingItemsMap.set(item.id, {
              ...item,
              isNewTrend: true, // Flag as new trending item
              lastUpdated: new Date()
            });
          }
        });

        // Convert back to array and re-rank
        const updatedItems = Array.from(existingItemsMap.values());
        const rankedItems = rankTrendingItems(updatedItems);

        // Reset the notification after applying the updates
        setHasNewTrends(false);

        return rankedItems;
      });
    }
  }, [rankTrendingItems]);

  // These functions are now defined earlier in the component


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
        limit: maxItems, // Get configured number of items
        layout: layout,
        filters: {
          trending: true, // Flag to get trending items
          size: user.preferences?.sizePreferences?.[0]?.size,
          style: user.preferences?.stylePreferences?.[0]?.style,
          age: ageRange !== 'all' ? ageRange : undefined,
          gender: gender !== 'all' ? gender : undefined,
          season: season !== 'all' ? season : undefined
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
        setDisplayedItems([]);
        return;
      }

      // Transform the response for consistent property naming and apply initial ranking
      const items = response.items.map(item => ({
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
        complementaryItems: item.complementaryItems || [],
        inStock: item.inStock !== false, // Default to true unless explicitly false
        trending: true,
        trendingScore: item.trendingScore,
        likeCount: item.likeCount || 0,
        dislikeCount: item.dislikeCount || 0,
        recentViews: item.recentViews || 0,
        releaseDate: item.releaseDate,
        seasonality: item.seasonality,
        targetDemographics: item.targetDemographics,
        isNewArrival: item.isNewArrival
      }));

      // Apply ranking algorithm
      const rankedItems = rankTrendingItems(items);
      setTrendingItems(rankedItems);

      // Set initial displayed items
      setDisplayedItems(rankedItems.slice(0, visibleCount));
      setHasMore(rankedItems.length > visibleCount);

      // Log success for debugging
      console.log(`Loaded ${rankedItems.length} trending items from API`);
    } catch (error) {
      console.error('Error fetching trending items:', error);
      setError('Failed to fetch trending items. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter items by category and other criteria
  const filteredItems = useMemo(() => {
    // Start with all trending items
    let filtered = trendingItems;

    // Filter by category first
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    // Apply additional filters if active (these are applied at the API level but this ensures consistency)
    if (ageRange !== 'all' && ageRange) {
      filtered = filtered.filter(item =>
        item.targetDemographics?.age?.includes(ageRange)
      );
    }

    if (gender !== 'all' && gender) {
      filtered = filtered.filter(item =>
        item.targetDemographics?.gender?.includes(gender)
      );
    }

    if (season !== 'all' && season) {
      filtered = filtered.filter(item =>
        item.seasonality === season
      );
    }

    return filtered;
  }, [trendingItems, filterCategory, ageRange, gender, season]);

  // Get unique categories from the trending items
  const categories = useMemo(() => {
    const uniqueCategories = new Set(trendingItems.map(item => item.category));
    return ['all', ...Array.from(uniqueCategories)].filter(Boolean);
  }, [trendingItems]);

  // Get unique age ranges from the trending logic
  const ageRanges = useMemo(() => {
    return ['all', ...TRENDING_LOGIC.filters.age];
  }, []);

  // Get unique genders from the trending logic
  const genders = useMemo(() => {
    return ['all', ...TRENDING_LOGIC.filters.gender];
  }, []);

  // Get seasons for filtering
  const seasons = useMemo(() => {
    return ['all', 'spring', 'summer', 'fall', 'winter'];
  }, []);

  // Load more items for infinite scroll with debounce to prevent multiple calls
  const loadMoreItems = useCallback(() => {
    // Safety checks
    if (!filteredItems || filteredItems.length <= visibleCount || loadingMore) {
      setHasMore(false);
      return;
    }

    setLoadingMore(true);

    // Simulate network delay for smoother UX
    setTimeout(() => {
      try {
        // Increase the number of displayed items
        const nextVisibleCount = Math.min(visibleCount + 20, filteredItems.length);
        setVisibleCount(nextVisibleCount);
        setDisplayedItems(filteredItems.slice(0, nextVisibleCount));
        setHasMore(nextVisibleCount < filteredItems.length);
      } catch (error) {
        console.error('Error loading more items:', error);
      } finally {
        setLoadingMore(false);
      }
    }, 300); // Small delay for smoother loading UX
  }, [filteredItems, visibleCount, loadingMore]);

  // Setup Intersection Observer for infinite scroll
  useEffect(() => {
    // Disconnect previous observer if exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingMore) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the element is visible
    );

    // Observe the load more element when it exists
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMoreItems]);
  
  // Effect to update displayed items when filters change
  useEffect(() => {
    setVisibleCount(20); // Reset to initial count when filters change
    setDisplayedItems(filteredItems.slice(0, 20));
    setHasMore(filteredItems.length > 20);
  }, [filteredItems]);

  // Handle item feedback (like/dislike)
  const handleItemFeedback = (itemId: string, liked: boolean) => {
    if (onItemFeedback) {
      onItemFeedback(itemId, liked);

      // Update item in state to reflect the feedback immediately
      setTrendingItems(prev => {
        return prev.map(item => {
          if (item.id === itemId) {
            // Update like/dislike count for immediate visual feedback
            return {
              ...item,
              likeCount: liked ? (item.likeCount || 0) + 1 : item.likeCount,
              dislikeCount: !liked ? (item.dislikeCount || 0) + 1 : item.dislikeCount
            };
          }
          return item;
        });
      });
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

      // Update view count for trending score
      setTrendingItems(prev => {
        return prev.map(i => {
          if (i.id === item.id) {
            return {
              ...i,
              recentViews: (i.recentViews || 0) + 1
            };
          }
          return i;
        });
      });
    }
  };

  // Handle quick view
  const handleQuickView = (item: Recommendation.RecommendationItem) => {
    if (onQuickView) {
      onQuickView(item);

      // Also count as a view for trending
      setTrendingItems(prev => {
        return prev.map(i => {
          if (i.id === item.id) {
            return {
              ...i,
              recentViews: (i.recentViews || 0) + 1
            };
          }
          return i;
        });
      });
    }
  };

  // Handle adding to collection
  const handleAddToCollection = (item: Recommendation.RecommendationItem, collectionId?: string) => {
    if (onAddToCollection) {
      onAddToCollection(item, collectionId);
    }
  };

  // Handle sharing
  const handleShare = (item: Recommendation.RecommendationItem) => {
    if (onShare) {
      onShare(item);
    }
  };

  // Handle try on
  const handleTryOn = (item: Recommendation.RecommendationItem) => {
    if (onTryOn) {
      onTryOn(item);
    }
  };
  
  // Fallback scroll handler for browsers without Intersection Observer support
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (
      !isLoading &&
      !loadingMore &&
      hasMore &&
      target.scrollHeight - target.scrollTop <= target.clientHeight * 1.5
    ) {
      loadMoreItems();
    }
  }, [isLoading, loadingMore, hasMore, loadMoreItems]);

  // Function to refresh trending data
  const refreshTrendingItems = useCallback(() => {
    setHasNewTrends(false);
    fetchTrendingItems();
  }, [fetchTrendingItems]);

  return (
    <div className="stylist-trending-items">
      {isLoading && displayedItems.length === 0 ? (
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
      ) : filteredItems.length === 0 ? (
        <div className="stylist-trending-items__empty">
          <p>No trending items found. Check back later!</p>
        </div>
      ) : (
        <div className="stylist-trending-items__container">
          {/* Real-time update indicator */}
          <div className="stylist-trending-items__status-bar">
            <div className={`stylist-trending-items__status-indicator ${isRealTimeActive ? 'active' : ''}`}>
              <span className="stylist-trending-items__status-dot"></span>
              {isRealTimeActive ? 'Real-time updates active' : 'Updates paused'}
            </div>

            {/* New trends notification */}
            {hasNewTrends && (
              <button
                className="stylist-trending-items__refresh-button"
                onClick={refreshTrendingItems}
                style={{ backgroundColor: primaryColor }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                New trending items available! Refresh
              </button>
            )}

            {/* Last updated time */}
            <div className="stylist-trending-items__update-time">
              Last updated: {lastUpdateTime.toLocaleTimeString()}
            </div>
          </div>

          <div className="stylist-trending-items__filters">
            <CategorySelector
              categories={categories.filter(cat => cat !== 'all').map(cat => ({
                id: cat,
                name: cat.charAt(0).toUpperCase() + cat.slice(1)
              }))}
              selectedCategory={filterCategory}
              onChange={setFilterCategory}
              includeAll={true}
              label="Category"
              primaryColor={primaryColor}
            />

            <CategorySelector
              categories={ageRanges.filter(age => age !== 'all').map(age => ({
                id: age,
                name: age
              }))}
              selectedCategory={ageRange}
              onChange={setAgeRange}
              includeAll={true}
              label="Age"
              primaryColor={primaryColor}
            />

            <CategorySelector
              categories={genders.filter(gen => gen !== 'all').map(gen => ({
                id: gen,
                name: gen
              }))}
              selectedCategory={gender}
              onChange={setGender}
              includeAll={true}
              label="Gender"
              primaryColor={primaryColor}
            />

            <CategorySelector
              categories={seasons.filter(s => s !== 'all').map(s => ({
                id: s,
                name: s.charAt(0).toUpperCase() + s.slice(1)
              }))}
              selectedCategory={season}
              onChange={setSeason}
              includeAll={true}
              label="Season"
              primaryColor={primaryColor}
            />
          </div>

          <div
            className="stylist-trending-items__scroll-container"
            onScroll={handleScroll}
          >
            <GridLayout
              size="2x50"
              title="Trending Items"
              className="stylist-trending-items__grid-layout"
              items={displayedItems.map(item => (
                <React.Fragment key={item.id}>
                  {/* Trending badge with rank */}
                  <div
                    className={`stylist-trending-items__trending-badge ${item.isNewTrend ? 'new-trend' : ''} ${item.isRealTimeUpdate ? 'updated' : ''}`}
                    style={{ backgroundColor: `${primaryColor}cc` }}
                  >
                    {item.trendingRank && item.trendingRank <= 10
                      ? `🔥 #${item.trendingRank} Trending`
                      : item.isNewTrend
                        ? "🆕 New Trend!"
                        : "🔥 Trending"}
                  </div>

                  <Suspense fallback={<div className="stylist-trending-items__item-placeholder"></div>}>
                    <ItemCard
                      item={item}
                      onFeedback={handleItemFeedback}
                      onAddToWishlist={() => handleAddToWishlist(item)}
                      onAddToCart={() => handleAddToCart(item)}
                      onClick={() => handleItemClick(item)}
                      primaryColor={primaryColor}
                      onTryOn={() => handleTryOn(item)}
                      onAddToDressingRoom={() => handleAddToCollection(item)}
                      complementaryItems={[]}
                      onOutfitSuggestions={() => handleQuickView(item)}
                      showDetails
                      className={item.isRealTimeUpdate ? 'highlight-update' : ''}
                    />
                  </Suspense>
                </React.Fragment>
              ))}
            />

            {isLoading && displayedItems.length > 0 && (
              <div className="stylist-trending-items__loading-more">
                <LoadingIndicator size="small" />
                <p>Loading more items...</p>
              </div>
            )}

            {!hasMore && displayedItems.length > 0 && (
              <div className="stylist-trending-items__end-message">
                <p>You've reached the end of trending items!</p>
              </div>
            )}

            {/* Invisible element for intersection observer */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="stylist-trending-items__load-more-trigger"
              ></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingItems;