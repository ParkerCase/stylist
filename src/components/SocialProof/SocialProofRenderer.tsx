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
  items: SocialProofItem[];
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onAddToWishlist?: (item: any) => void;
  onAddToCart?: (item: any) => void;
  primaryColor?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const SocialProofRenderer: React.FC<SocialProofRendererProps> = ({
  items,
  onItemFeedback,
  onAddToWishlist,
  onAddToCart,
  primaryColor,
  isExpanded = false,
  onToggleExpand
}) => {
  // Limit display to top 3 items if not expanded
  const displayItems = isExpanded ? items : items.slice(0, 3);

  return (
    <div className="social-proof-renderer">
      <div className="social-proof-renderer__header">
        <h3 className="social-proof-renderer__title">
          <span className="social-proof-renderer__icon">✨</span>
          Celebrity Inspiration
        </h3>
        <p className="social-proof-renderer__subtitle">
          Get the looks worn by your favorite celebrities
        </p>
      </div>

      <div className="social-proof-renderer__content">
        {displayItems.map((socialProofItem) => (
          <div 
            key={socialProofItem.id} 
            className="social-proof-renderer__item"
          >
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
                {socialProofItem.outfitTags.map((tag: string, index: number) => (
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
                        >
                          {color}
                        </span>
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
              {socialProofItem.matchedProducts.map((product: ProductRecommendation) => (
                <ItemCard
  key={product.id}
  item={{
    id: product.id,
    name: product.name,
    brand: product.brand,
    price: product.price,
    imageUrls: [product.imageUrl],
    category: product.category,
    matchScore: product.matchScore || 0,  // Provide default value
    matchReasons: product.matchReasons || [],  // Provide default value
    url: '#',
    retailerId: 'demo_retailer',
    colors: [],
    sizes: [],
    inStock: true,
    description: product.description || '',  // Provide default value
    salePrice: undefined,  // Add missing property
  }}
  onFeedback={onItemFeedback}
  onAddToWishlist={(itemId) => onAddToWishlist && onAddToWishlist(product)}
  onAddToCart={(itemId) => onAddToCart && onAddToCart(product)}
  showDetails={true}
  primaryColor={primaryColor}
/>
              ))}
            </div>

            {socialProofItem.matchedProducts.length === 0 && (
              <div className="social-proof-renderer__no-matches">
                <p>No matching products found for this look</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length > 3 && (
        <button 
          className="social-proof-renderer__toggle"
          onClick={onToggleExpand}
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          {isExpanded ? 'Show Less' : `View All ${items.length} Celebrity Looks`}
        </button>
      )}

      {items.length === 0 && (
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