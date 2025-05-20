import React, { useState, useEffect } from 'react';
import CelebrityGrid from '@/components/CelebrityGrid';
import CelebrityDetail from '@/components/CelebrityDetail';
import SocialProofArchive from '@/components/SocialProofArchive';
import ShopTheLook from '@/components/ShopTheLook';
import { Recommendation } from '@/types';
import { getCelebrities, getCelebrityById } from '@/utils/celebrity-demo-data';
import SocialProofUpdateScheduler, { ArchivedUpdate } from '@/services/social-proof/updateScheduler';
import { SocialProofItem } from '@/services/social-proof/types';
import findSimilarItems from '@/services/social-proof/findSimilarItems';
import findExactItems from '@/services/social-proof/findExactItems';

interface SocialProofContainerProps {
  onAddToCart: (product: Recommendation.RecommendationItem) => void;
  onAddToWishlist: (product: Recommendation.RecommendationItem) => void;
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  primaryColor?: string;
  retailerId?: string;
}

const SocialProofContainer: React.FC<SocialProofContainerProps> = ({
  onAddToCart,
  onAddToWishlist,
  onItemFeedback,
  primaryColor = '#000000',
  retailerId = 'demo_retailer'
}) => {
  const [celebrities, setCelebrities] = useState(getCelebrities());
  const [selectedCelebrity, setSelectedCelebrity] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Recommendation.RecommendationItem | null>(null);
  const [archivedUpdates, setArchivedUpdates] = useState<ArchivedUpdate[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [scheduler] = useState(() => new SocialProofUpdateScheduler());

  // Initialize with demo data and scheduler
  useEffect(() => {
    // Get celebrities
    const allCelebrities = getCelebrities();
    setCelebrities(allCelebrities);

    // Set up demo archived updates if none exist
    const existingArchives = scheduler.getArchivedUpdates();
    if (existingArchives.length === 0) {
      createDemoArchives();
    } else {
      setArchivedUpdates(existingArchives);
    }

    // Set last updated date
    const latestUpdate = scheduler.getLatestUpdate();
    if (latestUpdate) {
      setLastUpdated(latestUpdate.publishedAt.toString());
    }

    // Check for any scheduled updates that should be published
    const pendingUpdates = scheduler.checkForPendingUpdates();
    pendingUpdates.forEach(update => {
      scheduler.publishUpdate(update.id);
    });
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
      <CelebrityGrid
        celebrities={celebrities}
        onCelebrityClick={handleCelebrityClick}
        primaryColor={primaryColor}
        title="Celebrity Style Inspiration"
        subtitle="Shop your favorite celebrity looks"
        lastUpdated={lastUpdated}
      />

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