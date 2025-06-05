import React, { useState, useEffect } from 'react';
import CelebrityGrid from '@/components/CelebrityGrid';
import CelebrityDetail from '@/components/CelebrityDetail';
import SocialProofArchive from '@/components/SocialProofArchive';
import ShopTheLook from '@/components/ShopTheLook';
import { Recommendation } from '@/types';
import { getCelebrities } from '@/utils/celebrity-demo-data';
import SocialProofUpdateScheduler, { ArchivedUpdate } from '@/services/social-proof/updateScheduler';
import { fetchCelebrityData } from '@/utils/fetchCelebrityData';

interface SocialProofContainerProps {
  onAddToCart: (product: Recommendation.RecommendationItem) => void;
  onAddToWishlist: (product: Recommendation.RecommendationItem) => void;
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  primaryColor?: string;
}

const SocialProofContainer: React.FC<SocialProofContainerProps> = ({
  onAddToCart,
  onAddToWishlist,
  onItemFeedback,
  primaryColor = '#000000'
}) => {
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [selectedCelebrity, setSelectedCelebrity] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Recommendation.RecommendationItem | null>(null);
  const [archivedUpdates, setArchivedUpdates] = useState<ArchivedUpdate[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [scheduler] = useState(() => new SocialProofUpdateScheduler());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadCelebrities() {
      setLoading(true);
      // Use real API in production, mock in dev/demo
      const isDemo = process.env.NODE_ENV !== 'production';
      try {
        let apiCelebs: any[] = [];
        if (!isDemo) {
          apiCelebs = await fetchCelebrityData(20);
        }
        // Map API data to CelebrityGrid shape
        if (apiCelebs && apiCelebs.length > 0) {
          const mapped = apiCelebs.map((item: any) => ({
            id: item.id,
            name: item.celebrity,
            imageUrl: item.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.celebrity || 'Celebrity')}&background=eee&color=555&size=256`,
            latestLook: item.outfitTags && item.outfitTags.length > 0 ? item.outfitTags[0] : 'Celebrity Look',
            event: item.event || '',
            description: item.outfitTags && item.outfitTags.length > 1 ? item.outfitTags.slice(1).join(', ') : '',
            timestamp: item.timestamp || new Date().toISOString(),
            tags: item.outfitTags || [],
            matchedProducts: item.matchedProducts || [],
          }));
          if (isMounted) setCelebrities(mapped);
        } else {
          // Fallback to mock/demo data
          const demoCelebs = getCelebrities(20);
          if (isMounted) setCelebrities(demoCelebs);
        }
      } catch {
        // Fallback to mock/demo data
        const demoCelebs = getCelebrities(20);
        if (isMounted) setCelebrities(demoCelebs);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCelebrities();
    // Archive/demo logic (unchanged, only used for archive modal)
    const existingArchives = scheduler.getArchivedUpdates();
    if (existingArchives.length === 0) {
      createDemoArchives();
    } else {
      setArchivedUpdates(existingArchives);
    }
    const latestUpdate = scheduler.getLatestUpdate();
    if (latestUpdate) {
      setLastUpdated(latestUpdate.publishedAt.toString());
    }
    const pendingUpdates = scheduler.checkForPendingUpdates();
    pendingUpdates.forEach(update => {
      scheduler.publishUpdate(update.id);
    });
    return () => { isMounted = false; };
  }, []);

  // Create demo archived updates for previous weeks
  const createDemoArchives = () => {
    // Create archives for past weeks
    const allCelebrities = getCelebrities();
    
    // Convert celebrities to SocialProofItem format for the scheduler
    const convertToSocialProofItems = (celebrities: any[]): any[] => {
      return celebrities.map(celeb => ({
        id: celeb.id,
        celebrity: celeb.name,
        event: celeb.event,
        outfitTags: celeb.tags || [],
        patterns: ['solid'], // Default pattern
        colors: ['black'], // Default color
        timestamp: celeb.timestamp,
        matchedProducts: celeb.matchedProducts || []
      }));
    };
    
    // Split celebrities into groups for different weeks
    const week1Celebrities = convertToSocialProofItems(allCelebrities.slice(0, 5));
    const week2Celebrities = convertToSocialProofItems(allCelebrities.slice(5, 10));
    const week3Celebrities = convertToSocialProofItems(allCelebrities.slice(10, 15));
    
    // Get dates for previous weeks
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    
    const threeWeeksAgo = new Date(now);
    threeWeeksAgo.setDate(now.getDate() - 21);
    
    // Schedule updates for those weeks
    const update1 = scheduler.scheduleNextUpdate(week1Celebrities);
    const update2 = scheduler.scheduleNextUpdate(week2Celebrities);
    const update3 = scheduler.scheduleNextUpdate(week3Celebrities);
    
    // Backdate them and publish
    update1.scheduledFor = oneWeekAgo;
    update2.scheduledFor = twoWeeksAgo;
    update3.scheduledFor = threeWeeksAgo;
    
    scheduler.publishUpdate(update1.id);
    scheduler.publishUpdate(update2.id);
    scheduler.publishUpdate(update3.id);
    
    // Get updated archives
    const updatedArchives = scheduler.getArchivedUpdates();
    setArchivedUpdates(updatedArchives);
    
    // Set last updated to the most recent one
    setLastUpdated(oneWeekAgo.toISOString());
  };

  // Handle celebrity click
  const handleCelebrityClick = (celebrity: any) => {
    setSelectedCelebrity(celebrity);
    setIsDetailOpen(true);
  };

  // Handle finding similar items
  const handleFindSimilar = async (product: Recommendation.RecommendationItem) => {
    // In a real app, this would call an API with all available products
    // For demo, we'll just show the original product
    setSelectedProduct(product);
    setIsShopOpen(true);
  };

  // Handle finding exact items
  const handleFindExact = async (product: Recommendation.RecommendationItem) => {
    // In a real app, this would call an API to find exact matches
    // For demo, we'll just show the original product
    setSelectedProduct(product);
    setIsShopOpen(true);
  };

  // Handle opening archive
  const handleViewArchive = () => {
    setIsArchiveOpen(true);
  };

  // Handle selecting a week from archive
  const handleSelectWeek = (weekId: string) => {
    const selectedArchive = archivedUpdates.find(update => update.id === weekId);
    
    if (selectedArchive) {
      // Convert SocialProofItems back to Celebrity format
      const convertToCelebrities = (items: any[]): any[] => {
        return items.map(item => ({
          id: item.id,
          name: item.celebrity,
          event: item.event,
          tags: item.outfitTags || [],
          timestamp: item.timestamp,
          matchedProducts: item.matchedProducts || [],
          // Add required Celebrity fields with placeholder values
          imageUrl: `https://via.placeholder.com/500x700?text=${item.celebrity.replace(/\s/g, '+')}`,
          latestLook: "Celebrity Look",
          description: `Look from ${item.event || "recent event"}`
        }));
      };
      
      setCelebrities(convertToCelebrities(selectedArchive.items));
      setIsArchiveOpen(false);
    }
  };

  return (
    <div className="social-proof-container">
      {/* Celebrity Grid */}
      {loading ? (
        <div className="celebrity-grid__empty"><p>Loading celebrity style inspiration...</p></div>
      ) : (
        <CelebrityGrid
          celebrities={celebrities}
          onCelebrityClick={handleCelebrityClick}
          primaryColor={primaryColor}
          title="Celebrity Style Inspiration"
          subtitle="Shop your favorite celebrity looks"
          lastUpdated={lastUpdated}
        />
      )}

      {/* View Archive Button */}
      <div className="social-proof-container__archive-button">
        <button 
          onClick={handleViewArchive}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          View Previous Weeks
        </button>
      </div>

      {/* Celebrity Detail Modal */}
      {selectedCelebrity && (
        <CelebrityDetail
          celebrity={selectedCelebrity}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onFindSimilar={handleFindSimilar}
          onFindExact={handleFindExact}
          onAddToCart={onAddToCart}
          onAddToWishlist={onAddToWishlist}
          onItemFeedback={onItemFeedback}
          primaryColor={primaryColor}
        />
      )}

      {/* Archive Modal */}
      <SocialProofArchive
        archivedUpdates={archivedUpdates}
        onSelectWeek={handleSelectWeek}
        onClose={() => setIsArchiveOpen(false)}
        isOpen={isArchiveOpen}
        primaryColor={primaryColor}
      />

      {/* Shop The Look Modal */}
      {selectedProduct && (
        <ShopTheLook
          product={selectedProduct}
          onAddToCart={onAddToCart}
          onAddToWishlist={onAddToWishlist}
          onClose={() => setIsShopOpen(false)}
          isOpen={isShopOpen}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
};

export default SocialProofContainer;