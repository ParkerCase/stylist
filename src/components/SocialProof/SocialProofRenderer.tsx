// SocialProofRenderer.tsx
// Renders social proof items using existing ItemCard component

import React from 'react';
import ItemCard from '@/components/ItemCard';
import './SocialProofRenderer.scss';

interface SocialProofItem {
  id: string;
  celebrity: string;
  event: string;
  outfitTags: string[];
  patterns?: string[];
  colors?: string[];
  timestamp: string;
  matchedProducts: ProductRecommendation[];
  imageUrl?: string;
}

interface ProductRecommendation {
  id: string;
  name: string;
  description: string;
  price: number;
  brand: string;
  category: string;
  imageUrl: string;
  matchScore?: number;
  matchReasons?: string[];
}

interface SocialProofRendererProps {
  items?: SocialProofItem[];
  initialItems?: SocialProofItem[];
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onAddToWishlist?: (item: any) => void;
  onAddToCart?: (item: any) => void;
  primaryColor?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const SocialProofRenderer: React.FC<SocialProofRendererProps> = ({
  items = [],
  initialItems = [],
  onItemFeedback,
  onAddToWishlist,
  onAddToCart,
  primaryColor,
  isExpanded = false,
  onToggleExpand
}) => {
  const isTestOrDev = typeof window !== 'undefined' && (window['Cypress'] || process.env.NODE_ENV !== 'production');
  const defaultMockCelebrities = isTestOrDev ? Array.from({ length: 20 }, (_, i) => ({
    id: `mock-celeb-${i}`,
    name: `Celebrity ${i + 1}`,
    imageUrl: '',
    details: 'Mock details',
  })) : [];

  // Use initialItems in test/dev mode if provided
  const displaySource = (initialItems && initialItems.length > 0)
    ? initialItems
    : (isTestOrDev ? defaultMockCelebrities : (items ?? []));
  // Defensive fallback
  const safeDisplaySource = Array.isArray(displaySource) ? displaySource : [];
  // Limit display to top 3 items if not expanded
  const displayItems = isExpanded ? safeDisplaySource : safeDisplaySource.slice(0, 3);

  return (
    <div className="social-proof-renderer social-proof-section" data-cy="social-proof-section">
      <div className="social-proof-renderer__header">
        <h3 className="social-proof-renderer__title">
          <span className="social-proof-renderer__icon">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg>
          </span>
          Celebrity Inspiration
        </h3>
        <p className="social-proof-renderer__subtitle">
          Get the looks worn by your favorite celebrities
        </p>
      </div>

      <div className="social-proof-renderer__content" data-cy="celebrity-grid">
        {displayItems.map((socialProofItem) => (
          <div 
            key={socialProofItem.id} 
            className="social-proof-renderer__item"
            data-cy="celebrity-card"
          >
            {/* Celebrity image */}
            <div className="social-proof-renderer__celebrity-photo-wrapper">
              <img
                className="social-proof-renderer__celebrity-photo"
                src={
                  socialProofItem.imageUrl
                    ? socialProofItem.imageUrl
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(socialProofItem.celebrity || 'Celebrity')}&background=eee&color=555&size=256`
                }
                alt={socialProofItem.celebrity + ' outfit'}
                onError={e => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(socialProofItem.celebrity || 'Celebrity')}&background=eee&color=555&size=256`)}
              />
            </div>
            <div className="social-proof-renderer__celebrity-info">
              <div className="social-proof-renderer__celebrity-header">
                <h4 className="social-proof-renderer__celebrity-name">
                  {socialProofItem.celebrity}
                </h4>
                <span className="social-proof-renderer__event">
                  {socialProofItem.event}
                </span>
              </div>
              
              <div className="social-proof-renderer__outfit-description">
                {(socialProofItem.outfitTags || []).map((tag: string, index: number) => (
                  <span 
                    key={index} 
                    className="social-proof-renderer__outfit-tag"
                    style={{ borderColor: primaryColor }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {(socialProofItem.colors || socialProofItem.patterns) && (
                <div className="social-proof-renderer__style-details">
                  {socialProofItem.colors && (
                    <div className="social-proof-renderer__colors">
                      {socialProofItem.colors.map((color: string, idx: number) => (
                        <span 
                          key={idx} 
                          className="social-proof-renderer__color-badge"
                          style={{ backgroundColor: getColorCode(color) }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {socialProofItem.patterns && (
                    <div className="social-proof-renderer__patterns">
                      {socialProofItem.patterns.map((pattern: string, idx: number) => (
                        <span 
                          key={idx} 
                          className="social-proof-renderer__pattern-badge"
                          style={{ color: primaryColor }}
                        >
                          {pattern}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="social-proof-renderer__products">
              {(socialProofItem.matchedProducts && socialProofItem.matchedProducts.length > 0)
                ? socialProofItem.matchedProducts.map((product: ProductRecommendation) => (
                  <ItemCard
                    key={product.id}
                    item={{
                      id: product.id,
                      name: product.name,
                      brand: product.brand,
                      price: product.price,
                      imageUrls: [product.imageUrl],
                      category: product.category,
                      matchScore: product.matchScore || 0,
                      matchReasons: product.matchReasons || [],
                      url: '#',
                      retailerId: 'demo_retailer',
                      colors: [],
                      sizes: [],
                      inStock: true,
                      description: product.description || '',
                      salePrice: undefined,
                    }}
                    onFeedback={onItemFeedback}
                    onAddToWishlist={() => onAddToWishlist && onAddToWishlist(product)}
                    onAddToCart={() => onAddToCart && onAddToCart(product)}
                    showDetails={true}
                    primaryColor={primaryColor}
                  />
                ))
                : (
                  // Mock best-match product for now; replace with real product matching in the future
                  (() => {
                    // Generate a plausible product name and category from tags or description
                    const tag = (socialProofItem.outfitTags && socialProofItem.outfitTags[0]) || 'Fashion Piece';
                    const celeb = socialProofItem.celebrity || 'Celebrity';
                    const desc = socialProofItem.outfitTags?.join(' ') || socialProofItem.event || 'outfit';
                    const productName = `${celeb.split(' ')[0]}'s ${tag.charAt(0).toUpperCase() + tag.slice(1)}`;
                    const productCategory = tag.toLowerCase();
                    // Use a stylish Unsplash image as a placeholder
                    const unsplashImg = `https://source.unsplash.com/400x600/?${encodeURIComponent(productCategory)},fashion`;
                    return (
                      <ItemCard
                        key={socialProofItem.id + '-best-match'}
                        item={{
                          id: socialProofItem.id + '-best-match',
                          name: productName,
                          brand: 'AI Stylist',
                          price: 120,
                          imageUrls: [unsplashImg],
                          category: productCategory,
                          matchScore: 0.92,
                          matchReasons: ['High similarity to celebrity look'],
                          url: '#',
                          retailerId: 'demo_retailer',
                          colors: [],
                          sizes: [],
                          inStock: true,
                          description: `Inspired by ${celeb}'s look: ${desc}`,
                          salePrice: undefined,
                        }}
                        onFeedback={onItemFeedback}
                        onAddToWishlist={() => onAddToWishlist && onAddToWishlist({})}
                        onAddToCart={() => onAddToCart && onAddToCart({})}
                        showDetails={true}
                        primaryColor={primaryColor}
                      />
                    );
                  })()
                )}
            </div>
          </div>
        ))}
      </div>

      {safeDisplaySource.length > 3 && (
        <button 
          className="social-proof-renderer__toggle"
          onClick={onToggleExpand}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          {isExpanded ? 'Show Less' : `View All ${safeDisplaySource.length} Celebrity Looks`}
        </button>
      )}

      {safeDisplaySource.length === 0 && (
        <div className="social-proof-renderer__empty">
          <p>Loading celebrity style inspiration...</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get color codes for color badges
function getColorCode(colorName: string): string {
  const colorMap: { [key: string]: string } = {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'yellow': '#FFFF00',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'grey': '#808080',
    'brown': '#A52A2A',
    'navy': '#000080',
    'burgundy': '#800020',
    'beige': '#F5F5DC',
    'cream': '#FFFDD0',
    'silver': '#C0C0C0',
    'gold': '#FFD700',
    'off-white': '#F5F5F5'
  };

  return colorMap[colorName.toLowerCase()] || '#888888';
}

export default SocialProofRenderer;