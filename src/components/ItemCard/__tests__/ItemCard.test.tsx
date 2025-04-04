// src/components/ItemCard/__tests__/ItemCard.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  test('calls onFeedback when like/dislike buttons are clicked', () => {
    const handleFeedback = jest.fn();
    render(<ItemCard item={mockItem} onFeedback={handleFeedback} />);
    
    // Find and click like button
    const likeButton = screen.getAllByRole('button')[0];
    fireEvent.click(likeButton);
    
    expect(handleFeedback).toHaveBeenCalledWith('test-item-1', true);
    
    // Clear mock calls
    handleFeedback.mockClear();
    
    // Find and click dislike button
    const dislikeButton = screen.getAllByRole('button')[1];
    fireEvent.click(dislikeButton);
    
    expect(handleFeedback).toHaveBeenCalledWith('test-item-1', false);
  });
});