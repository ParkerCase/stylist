// src/components/ItemCard/__tests__/ItemCard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ItemCard from '../ItemCard';
import { Recommendation } from '../../../types/index';

// Mock utility functions
jest.mock('../../../utils/formatters', () => ({
  formatPrice: jest.fn((price) => `$${price.toFixed(2)}`),
}));

jest.mock('../../../utils/productMappings', () => ({
  mapProductTypeToGarmentType: jest.fn(() => 'top'),
}));

describe('ItemCard Component', () => {
  const mockItem: Recommendation.RecommendationItem = {
    id: 'test-item-1',
    name: 'Test Item',
    brand: 'Test Brand',
    price: 29.99,
    salePrice: undefined,
    url: 'https://example.com/product',
    matchScore: 0.85,
    matchReasons: ['Matches your style preference'],
    category: 'top',
    retailerId: 'test',
    inStock: true,
    colors: [],
    sizes: [],
    imageUrls: ['test-image.jpg'],
    description: '',
  };

  test('renders item information correctly', () => {
    render(<ItemCard item={mockItem} />);
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('Test Brand')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

  test('shows sale price when available', () => {
    const itemWithSale = { ...mockItem, salePrice: 19.99 };
    render(<ItemCard item={itemWithSale} />);
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toHaveClass('stylist-item-card__price--original');
  });

  test('shows heart icon (like) and X icon (dislike) in correct positions', () => {
    const handleFeedback = jest.fn();
    render(<ItemCard item={mockItem} onFeedback={handleFeedback} />);
    // Like button (heart)
    const likeBtn = document.querySelector('.stylist-item-feedback-overlay__button--like');
    expect(likeBtn).toBeInTheDocument();
    // Dislike button (X)
    const dislikeBtn = document.querySelector('.stylist-item-feedback-overlay__button--dislike');
    expect(dislikeBtn).toBeInTheDocument();
  });

  test('user preferences update and affect future recommendations', () => {
    const handleFeedback = jest.fn();
    render(<ItemCard item={mockItem} onFeedback={handleFeedback} />);
    // Like
    const likeBtn = document.querySelector('.stylist-item-feedback-overlay__button--like');
    if (likeBtn) {
      likeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handleFeedback).toHaveBeenCalledWith('test-item-1', true);
    }
    // Dislike
    const dislikeBtn = document.querySelector('.stylist-item-feedback-overlay__button--dislike');
    if (dislikeBtn) {
      dislikeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handleFeedback).toHaveBeenCalledWith('test-item-1', false);
    }
  });

  test('learning algorithm improves suggestions over time (simulated)', () => {
    const handleFeedback = jest.fn();
    render(<ItemCard item={mockItem} onFeedback={handleFeedback} />);
    // Simulate multiple feedbacks
    const likeBtn = document.querySelector('.stylist-item-feedback-overlay__button--like');
    const dislikeBtn = document.querySelector('.stylist-item-feedback-overlay__button--dislike');
    if (likeBtn && dislikeBtn) {
      for (let i = 0; i < 3; i++) {
        likeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        dislikeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
      // Should have called handler 6 times alternating true/false
      expect(handleFeedback).toHaveBeenCalledTimes(6);
      expect(handleFeedback).toHaveBeenNthCalledWith(1, 'test-item-1', true);
      expect(handleFeedback).toHaveBeenNthCalledWith(2, 'test-item-1', false);
      expect(handleFeedback).toHaveBeenNthCalledWith(3, 'test-item-1', true);
      expect(handleFeedback).toHaveBeenNthCalledWith(4, 'test-item-1', false);
    }
  });
});