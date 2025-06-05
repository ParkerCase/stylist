import React, { useState, useEffect, useMemo } from 'react';
import './CompleteLookModal.scss';
import { Recommendation } from '@/types/index';
import ItemCard from '../ItemCard/ItemCard';

interface CompleteLookModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: Recommendation.RecommendationItem;
  complementaryItems: Recommendation.RecommendationItem[];
  onAddToCart: (itemId: string) => void;
  onAddAllToCart: (itemIds: string[]) => void;
  primaryColor?: string;
}

// Style coordination score ranges
const SCORE_RANGES = {
  EXCELLENT: { min: 0.8, max: 1.0, label: 'Perfect Match' },
  GOOD: { min: 0.6, max: 0.8, label: 'Great Pairing' },
  FAIR: { min: 0.4, max: 0.6, label: 'Good Match' },
  POOR: { min: 0.0, max: 0.4, label: 'Basic Match' }
};

// Enhanced utility types for style matching
interface StyleCoordination {
  score: number;
  reasons: string[];
  colorHarmony: number;
  categoryMatch: number;
  styleConsistency: number;
}

const CompleteLookModal: React.FC<CompleteLookModalProps> = ({
  isOpen,
  onClose,
  selectedItem,
  complementaryItems,
  onAddToCart,
  onAddAllToCart,
  primaryColor
}) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Reset selected items when modal opens with new items
  useEffect(() => {
    if (isOpen) {
      setSelectedItems([]);
    }
  }, [isOpen, selectedItem]);

  // Enhanced complementary items with style coordination scores
  const enhancedComplementaryItems = useMemo(() => {
    return complementaryItems.map(item => {
      const coordination = calculateStyleCoordination(selectedItem, item);
      return {
        ...item,
        styleCoordination: coordination
      };
    }).sort((a, b) => {
      // Sort by style coordination score (highest first)
      return (b.styleCoordination?.score || 0) - (a.styleCoordination?.score || 0);
    });
  }, [complementaryItems, selectedItem]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleAddAllToCart = () => {
    const itemsToAdd = selectedItems.length > 0
      ? selectedItems
      : enhancedComplementaryItems.map(item => item.id);

    onAddAllToCart(itemsToAdd);
    onClose();
  };

  const getCategoryHeading = () => {
    if (!selectedItem.category) return 'Complete Your Look';

    const category = selectedItem.category.toLowerCase();

    if (['top', 'shirt', 'blouse', 'tshirt'].some(item => category.includes(item))) {
      return 'Complete Your Look with Bottoms & Accessories';
    } else if (['bottom', 'pant', 'trouser', 'jean', 'skirt'].some(item => category.includes(item))) {
      return 'Complete Your Look with Tops & Accessories';
    } else if (['dress'].some(item => category.includes(item))) {
      return 'Complete Your Look with Shoes & Accessories';
    } else if (['shoe'].some(item => category.includes(item))) {
      return 'Complete Your Look with Clothing & Accessories';
    } else if (['accessory', 'bag', 'jewelry'].some(item => category.includes(item))) {
      return 'Complete Your Look with Clothing & Shoes';
    }

    return 'Complete Your Look';
  };

  /**
   * Calculate style coordination between two items
   * Returns a score and reasons for the match
   */
  function calculateStyleCoordination(
    baseItem: Recommendation.RecommendationItem,
    matchItem: Recommendation.RecommendationItem
  ): StyleCoordination {
    const reasons: string[] = [];

    // 1. Calculate color harmony (0-1)
    const colorHarmony = calculateColorHarmony(baseItem, matchItem);
    if (colorHarmony > 0.8) {
      reasons.push('Excellent color harmony');
    } else if (colorHarmony > 0.6) {
      reasons.push('Good color coordination');
    }

    // 2. Calculate category match (0-1)
    const categoryMatch = calculateCategoryMatch(baseItem, matchItem);
    if (categoryMatch > 0.9) {
      reasons.push('Perfect category pairing');
    } else if (categoryMatch > 0.7) {
      reasons.push('Complementary categories');
    }

    // 3. Calculate style consistency (0-1)
    const styleConsistency = calculateStyleConsistency(baseItem, matchItem);
    if (styleConsistency > 0.8) {
      reasons.push('Consistent style aesthetic');
    } else if (styleConsistency > 0.6) {
      reasons.push('Compatible styling');
    }

    // 4. Calculate overall score (weighted)
    const overallScore = (
      colorHarmony * 0.4 +
      categoryMatch * 0.35 +
      styleConsistency * 0.25
    );

    // 5. Add overall assessment
    if (overallScore >= SCORE_RANGES.EXCELLENT.min) {
      reasons.unshift(SCORE_RANGES.EXCELLENT.label);
    } else if (overallScore >= SCORE_RANGES.GOOD.min) {
      reasons.unshift(SCORE_RANGES.GOOD.label);
    } else if (overallScore >= SCORE_RANGES.FAIR.min) {
      reasons.unshift(SCORE_RANGES.FAIR.label);
    } else {
      reasons.unshift(SCORE_RANGES.POOR.label);
    }

    return {
      score: overallScore,
      reasons,
      colorHarmony,
      categoryMatch,
      styleConsistency
    };
  }

  /**
   * Calculate color harmony between two items
   * Considers color theory principles like complementary, analogous, etc.
   */
  function calculateColorHarmony(
    item1: Recommendation.RecommendationItem,
    item2: Recommendation.RecommendationItem
  ): number {
    // Default score if we can't determine colors
    if (!item1.colors || !item2.colors ||
        !item1.colors.length || !item2.colors.length) {
      return 0.5;
    }

    // Normalize colors to lowercase
    const colors1 = item1.colors.map(c => c.toLowerCase());
    const colors2 = item2.colors.map(c => c.toLowerCase());

    // Color families for harmony checks
    const neutralColors = ['black', 'white', 'gray', 'grey', 'beige', 'tan', 'cream', 'ivory', 'silver'];
    const warmColors = ['red', 'orange', 'yellow', 'pink', 'coral', 'peach', 'gold', 'brown', 'maroon', 'burgundy'];
    const coolColors = ['blue', 'green', 'purple', 'violet', 'teal', 'turquoise', 'navy', 'mint', 'lavender'];

    // Complementary color pairs that work well together
    const complementaryPairs = [
      ['blue', 'orange'], ['purple', 'yellow'], ['green', 'red'],
      ['teal', 'coral'], ['navy', 'gold']
    ];

    // Check for exact color matches (monochromatic - highest harmony)
    const exactMatches = colors1.filter(c => colors2.includes(c)).length;
    if (exactMatches > 0) {
      return 0.9; // High harmony for monochromatic scheme
    }

    // Check for neutrals (which go with everything)
    const hasNeutral1 = colors1.some(c => neutralColors.includes(c));
    const hasNeutral2 = colors2.some(c => neutralColors.includes(c));

    if (hasNeutral1 || hasNeutral2) {
      return 0.8; // Neutral + any color is safe
    }

    // Check for complementary colors (good contrast)
    for (const color1 of colors1) {
      for (const color2 of colors2) {
        for (const [c1, c2] of complementaryPairs) {
          if ((color1.includes(c1) && color2.includes(c2)) ||
              (color1.includes(c2) && color2.includes(c1))) {
            return 0.85; // Complementary colors work well
          }
        }
      }
    }

    // Check if both are warm colors or both cool colors (analogous harmony)
    const isWarm1 = colors1.some(c => warmColors.some(wc => c.includes(wc)));
    const isWarm2 = colors2.some(c => warmColors.some(wc => c.includes(wc)));
    const isCool1 = colors1.some(c => coolColors.some(cc => c.includes(cc)));
    const isCool2 = colors2.some(c => coolColors.some(cc => c.includes(cc)));

    if ((isWarm1 && isWarm2) || (isCool1 && isCool2)) {
      return 0.75; // Analogous harmony (within same temperature)
    }

    // Warm with cool can still work but less harmonious
    if ((isWarm1 && isCool2) || (isCool1 && isWarm2)) {
      return 0.6; // Temperature contrast
    }

    // Default middling harmony if we can't determine specific relationship
    return 0.5;
  }

  /**
   * Calculate if categories work well together in an outfit
   */
  function calculateCategoryMatch(
    item1: Recommendation.RecommendationItem,
    item2: Recommendation.RecommendationItem
  ): number {
    if (!item1.category || !item2.category) return 0.5;

    const cat1 = item1.category.toLowerCase();
    const cat2 = item2.category.toLowerCase();

    // Perfect pairs that complete outfits
    const idealPairs = [
      ['top', 'bottom'], ['shirt', 'pant'], ['shirt', 'skirt'],
      ['blouse', 'pant'], ['blouse', 'skirt'], ['top', 'jean'],
      ['dress', 'jacket'], ['dress', 'shoe'], ['dress', 'accessory'],
      ['outfit', 'accessory'], ['outfit', 'shoe'], ['top', 'accessory'],
      ['bottom', 'accessory'], ['shoe', 'bag']
    ];

    // Check for perfect category pairings
    for (const [c1, c2] of idealPairs) {
      if ((cat1.includes(c1) && cat2.includes(c2)) ||
          (cat1.includes(c2) && cat2.includes(c1))) {
        return 1.0;
      }
    }

    // Define category groups
    const topGroup = ['top', 'shirt', 'blouse', 'tee', 't-shirt', 'sweater'];
    const bottomGroup = ['bottom', 'pant', 'skirt', 'jean', 'trouser', 'legging', 'short'];
    const dressGroup = ['dress', 'gown', 'jumpsuit'];
    const outerGroup = ['jacket', 'coat', 'blazer', 'cardigan'];
    const accessoryGroup = ['accessory', 'jewelry', 'scarf', 'hat', 'belt'];
    const footwearGroup = ['shoe', 'boot', 'sneaker', 'heel', 'sandal'];
    const bagGroup = ['bag', 'handbag', 'purse', 'backpack', 'tote'];

    // Check if items are in the same category (less desirable for completing a look)
    const getCategory = (cat: string) => {
      if (topGroup.some(c => cat.includes(c))) return 'top';
      if (bottomGroup.some(c => cat.includes(c))) return 'bottom';
      if (dressGroup.some(c => cat.includes(c))) return 'dress';
      if (outerGroup.some(c => cat.includes(c))) return 'outer';
      if (accessoryGroup.some(c => cat.includes(c))) return 'accessory';
      if (footwearGroup.some(c => cat.includes(c))) return 'footwear';
      if (bagGroup.some(c => cat.includes(c))) return 'bag';
      return 'unknown';
    };

    const category1 = getCategory(cat1);
    const category2 = getCategory(cat2);

    // Same category is not ideal for completing a look except for accessories
    if (category1 === category2) {
      if (category1 === 'accessory') return 0.7; // Multiple accessories can work
      return 0.3; // Same category not ideal (e.g. two tops)
    }

    // Good pairings that aren't represented in idealPairs
    if (
      (category1 === 'top' && category2 === 'outer') ||
      (category1 === 'outer' && category2 === 'top') ||
      (category1 === 'bottom' && category2 === 'footwear') ||
      (category1 === 'footwear' && category2 === 'bottom')
    ) {
      return 0.9;
    }

    // Other combinations work reasonably well
    return 0.7;
  }

  /**
   * Calculate style consistency between items (casual, formal, etc.)
   */
  function calculateStyleConsistency(
    item1: Recommendation.RecommendationItem,
    item2: Recommendation.RecommendationItem
  ): number {
    // Style signals we can extract from product data
    const styleSignals = {
      casual: ['casual', 'relax', 'everyday', 'basic', 'tee', 't-shirt', 'jeans', 'denim', 'cotton', 'jersey', 'lounge', 'hoodie', 'sweatshirt', 'sneaker'],
      formal: ['formal', 'elegant', 'business', 'suit', 'blazer', 'office', 'professional', 'dress shoe', 'oxford', 'sophisticated'],
      athletic: ['sport', 'active', 'workout', 'athleisure', 'running', 'training', 'gym', 'performance', 'stretch', 'technical'],
      evening: ['evening', 'party', 'cocktail', 'gown', 'sequin', 'glitter', 'statement', 'special occasion'],
      bohemian: ['boho', 'bohemian', 'relaxed', 'earthy', 'flowy', 'natural', 'ethnic', 'artisan', 'fringe'],
      minimalist: ['minimal', 'clean', 'simple', 'modern', 'sleek', 'essential', 'basic', 'streamlined'],
      vintage: ['vintage', 'retro', 'classic', 'nostalgic', 'timeless', 'heritage']
    };

    // Function to detect style signals in item text
    const detectStyles = (item: Recommendation.RecommendationItem) => {
      const itemText = `${item.name || ''} ${item.description || ''}`.toLowerCase();

      return Object.entries(styleSignals).map(([style, keywords]) => {
        // Count how many style keywords are found
        const matches = keywords.filter(keyword => itemText.includes(keyword)).length;
        const score = matches > 0 ? matches / keywords.length : 0;
        return { style, score };
      }).filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score);
    };

    const styles1 = detectStyles(item1);
    const styles2 = detectStyles(item2);

    // If no style signals detected, default to medium consistency
    if (styles1.length === 0 || styles2.length === 0) {
      return 0.5;
    }

    // Check if primary style matches
    if (styles1[0]?.style === styles2[0]?.style) {
      return 0.9; // High consistency when primary styles match
    }

    // Check for any overlapping styles
    const overlappingStyles = styles1.filter(s1 =>
      styles2.some(s2 => s2.style === s1.style)
    );

    if (overlappingStyles.length > 0) {
      return 0.7; // Some style consistency
    }

    // Certain style combinations can still work well together
    const compatibleStylePairs = [
      ['casual', 'athletic'],
      ['casual', 'minimalist'],
      ['casual', 'bohemian'],
      ['formal', 'minimalist'],
      ['minimalist', 'evening'],
      ['vintage', 'bohemian']
    ];

    const primaryStyle1 = styles1[0]?.style;
    const primaryStyle2 = styles2[0]?.style;

    if (primaryStyle1 && primaryStyle2) {
      for (const [s1, s2] of compatibleStylePairs) {
        if ((primaryStyle1 === s1 && primaryStyle2 === s2) ||
            (primaryStyle1 === s2 && primaryStyle2 === s1)) {
          return 0.65; // Compatible styles
        }
      }
    }

    // Default - some inconsistency, but could still work
    return 0.4;
  }
  
  if (!isOpen) return null;

  return (
    <div className="complete-look-modal" data-cy="complete-look-modal">
      <div className="stylist-complete-look-modal__backdrop" onClick={onClose}></div>
      <div className="stylist-complete-look-modal__content">
        <button className="stylist-complete-look-modal__close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>

        <div className="stylist-complete-look-modal__header">
          <h3 className="stylist-complete-look-modal__title" style={{ color: primaryColor }}>
            {getCategoryHeading()}
          </h3>
          <p className="stylist-complete-look-modal__subtitle">
            We found these items that go perfectly with your {selectedItem.name}
          </p>
        </div>

        <div className="stylist-complete-look-modal__selected-item">
          <ItemCard
            item={selectedItem}
            onAddToCart={onAddToCart}
            primaryColor={primaryColor}
          />
        </div>

        <div className="stylist-complete-look-modal__complementary-items">
          {enhancedComplementaryItems.map(item => {
            const coordination = item.styleCoordination;
            const matchBadgeColor =
              coordination?.score >= SCORE_RANGES.EXCELLENT.min ? '#2C9E3F' :
              coordination?.score >= SCORE_RANGES.GOOD.min ? '#4C8BF5' :
              coordination?.score >= SCORE_RANGES.FAIR.min ? '#F5A623' : '#9B9B9B';

            return (
              <div
                key={item.id}
                className={`stylist-complete-look-modal__item ${
                  selectedItems.includes(item.id) ? 'stylist-complete-look-modal__item--selected' : ''
                }`}
                onClick={() => toggleItemSelection(item.id)}
              >
                {/* Style match indicator badge */}
                {coordination && (
                  <div className="stylist-complete-look-modal__match-badge"
                    style={{ backgroundColor: matchBadgeColor }}>
                    {Math.round(coordination.score * 100)}% Match
                  </div>
                )}
                <ItemCard
                  item={item}
                  onAddToCart={() => onAddToCart(item.id)}
                  primaryColor={primaryColor}
                  data-cy="complete-look-item-card"
                />
                <button
                  className="stylist-item-card__cart-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(item.id);
                  }}
                  style={{ marginTop: 8, background: primaryColor || '#000', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer' }}
                >
                  Add to Cart
                </button>
                {/* Style coordination details */}
                {coordination && (
                  <div className="stylist-complete-look-modal__style-details">
                    <div className="stylist-complete-look-modal__style-reason">
                      {coordination.reasons[0]}
                    </div>
                    <div className="stylist-complete-look-modal__style-metrics">
                      <div className="stylist-complete-look-modal__style-metric">
                        <span>Color: </span>
                        <span className="stylist-complete-look-modal__metric-bar">
                          <span className="stylist-complete-look-modal__metric-fill"
                            style={{ width: `${coordination.colorHarmony * 100}%`, backgroundColor: matchBadgeColor }}></span>
                        </span>
                      </div>
                      <div className="stylist-complete-look-modal__style-metric">
                        <span>Category: </span>
                        <span className="stylist-complete-look-modal__metric-bar">
                          <span className="stylist-complete-look-modal__metric-fill"
                            style={{ width: `${coordination.categoryMatch * 100}%`, backgroundColor: matchBadgeColor }}></span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="stylist-complete-look-modal__item-select">
                  <div className="stylist-complete-look-modal__checkbox">
                    {selectedItems.includes(item.id) && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="stylist-complete-look-modal__actions">
          <button
            className="stylist-complete-look-modal__add-all"
            onClick={handleAddAllToCart}
            style={{ backgroundColor: primaryColor }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-9.83-3.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.86-7.01L19.42 4h-.01l-1.1 2-2.76 5H8.53l-.13-.27L6.16 6l-.95-2-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.13 0-.25-.11-.25-.25z"/>
            </svg>
            Add {selectedItems.length > 0 ? 'Selected' : 'All'} To Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteLookModal;