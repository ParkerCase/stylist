import React, { useState } from 'react';
import './CelebrityDetail.scss';
import ItemCard from '@/components/ItemCard';
import { Recommendation } from '@/types';

interface Celebrity {
  id: string;
  name: string;
  imageUrl: string;
  latestLook: string;
  event: string;
  description: string;
  timestamp: string;
  tags: string[];
  matchedProducts: Recommendation.RecommendationItem[];
}

interface CelebrityDetailProps {
  celebrity: Celebrity;
  isOpen: boolean;
  onClose: () => void;
  onFindSimilar: (product: Recommendation.RecommendationItem) => void;
  onFindExact: (product: Recommendation.RecommendationItem) => void;
  onAddToCart: (product: Recommendation.RecommendationItem) => void;
  onAddToWishlist: (product: Recommendation.RecommendationItem) => void;
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  primaryColor?: string;
}

const CelebrityDetail: React.FC<CelebrityDetailProps> = ({
  celebrity,
  isOpen,
  onClose,
  onFindSimilar,
  onFindExact,
  onAddToCart,
  onAddToWishlist,
  onItemFeedback,
  primaryColor = '#000000'
}) => {
  const [activeTab, setActiveTab] = useState<'outfit' | 'similar' | 'exact'>('outfit');
  const [selectedProduct, setSelectedProduct] = useState<Recommendation.RecommendationItem | null>(null);

  if (!isOpen) return null;

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleProductSelect = (product: Recommendation.RecommendationItem) => {
    setSelectedProduct(product);
  };

  return (
    <div className="celebrity-detail-backdrop" onClick={handleBackdropClick}>
      <div className="celebrity-detail">
        <button 
          className="celebrity-detail__close-btn" 
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="celebrity-detail__header">
          <h2 className="celebrity-detail__title">
            {celebrity.name}
            <span className="celebrity-detail__subtitle">{celebrity.event}</span>
          </h2>
          <span className="celebrity-detail__date">{formatDate(celebrity.timestamp)}</span>
        </div>

        <div className="celebrity-detail__content">
          <div className="celebrity-detail__image-container">
            <img 
              src={celebrity.imageUrl} 
              alt={`${celebrity.name} wearing ${celebrity.latestLook}`} 
              className="celebrity-detail__image"
            />
            <div className="celebrity-detail__tags">
              {celebrity.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="celebrity-detail__tag"
                  style={{ borderColor: primaryColor }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="celebrity-detail__info">
            <div className="celebrity-detail__tabs">
              <button 
                className={`celebrity-detail__tab ${activeTab === 'outfit' ? 'celebrity-detail__tab--active' : ''}`}
                onClick={() => setActiveTab('outfit')}
                style={activeTab === 'outfit' ? { borderBottomColor: primaryColor } : {}}
              >
                Complete Outfit
              </button>
              <button 
                className={`celebrity-detail__tab ${activeTab === 'similar' ? 'celebrity-detail__tab--active' : ''}`}
                onClick={() => setActiveTab('similar')}
                style={activeTab === 'similar' ? { borderBottomColor: primaryColor } : {}}
              >
                Similar Items
              </button>
              <button 
                className={`celebrity-detail__tab ${activeTab === 'exact' ? 'celebrity-detail__tab--active' : ''}`}
                onClick={() => setActiveTab('exact')}
                style={activeTab === 'exact' ? { borderBottomColor: primaryColor } : {}}
              >
                Exact Matches
              </button>
            </div>

            <div className="celebrity-detail__tab-content">
              {activeTab === 'outfit' && (
                <div className="celebrity-detail__outfit">
                  <p className="celebrity-detail__description">{celebrity.description}</p>
                  <div className="celebrity-detail__products">
                    {celebrity.matchedProducts.map(product => (
                      <div 
                        key={product.id} 
                        className={`celebrity-detail__product ${selectedProduct?.id === product.id ? 'celebrity-detail__product--selected' : ''}`}
                        onClick={() => handleProductSelect(product)}
                      >
                        <ItemCard
                          item={product}
                          onFeedback={onItemFeedback}
                          onAddToWishlist={() => onAddToWishlist(product)}
                          onAddToCart={() => onAddToCart(product)}
                          primaryColor={primaryColor}
                          showDetails={true}
                        />
                        <div className="celebrity-detail__product-actions">
                          <button 
                            className="celebrity-detail__find-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFindSimilar(product);
                            }}
                            style={{ borderColor: primaryColor, color: primaryColor }}
                          >
                            Find Similar
                          </button>
                          <button 
                            className="celebrity-detail__find-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFindExact(product);
                            }}
                            style={{ backgroundColor: primaryColor }}
                          >
                            Find Exact
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'similar' && (
                <div className="celebrity-detail__similar-items">
                  <p className="celebrity-detail__algorithm-description">
                    <strong>Find Similar</strong> uses AI to match style attributes, texture, and design elements
                    across brands to find items that match the celebrity's look.
                  </p>
                  <div className="celebrity-detail__algorithm-features">
                    <div className="celebrity-detail__feature">
                      <span className="celebrity-detail__feature-icon">🔍</span>
                      <span className="celebrity-detail__feature-text">Style matching</span>
                    </div>
                    <div className="celebrity-detail__feature">
                      <span className="celebrity-detail__feature-icon">💰</span>
                      <span className="celebrity-detail__feature-text">Price range options</span>
                    </div>
                    <div className="celebrity-detail__feature">
                      <span className="celebrity-detail__feature-icon">🛍️</span>
                      <span className="celebrity-detail__feature-text">Available at your retailer</span>
                    </div>
                  </div>
                  <button 
                    className="celebrity-detail__action-btn"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Find Similar Items
                  </button>
                </div>
              )}

              {activeTab === 'exact' && (
                <div className="celebrity-detail__exact-matches">
                  <p className="celebrity-detail__algorithm-description">
                    <strong>Find Exact</strong> uses brand identification and product matching
                    to locate the exact items worn by celebrities.
                  </p>
                  <div className="celebrity-detail__algorithm-features">
                    <div className="celebrity-detail__feature">
                      <span className="celebrity-detail__feature-icon">✅</span>
                      <span className="celebrity-detail__feature-text">Brand identification</span>
                    </div>
                    <div className="celebrity-detail__feature">
                      <span className="celebrity-detail__feature-icon">👗</span>
                      <span className="celebrity-detail__feature-text">Model matching</span>
                    </div>
                    <div className="celebrity-detail__feature">
                      <span className="celebrity-detail__feature-icon">⭐</span>
                      <span className="celebrity-detail__feature-text">Availability check</span>
                    </div>
                  </div>
                  <button 
                    className="celebrity-detail__action-btn"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Find Exact Items
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CelebrityDetail;