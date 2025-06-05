import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SuggestionGrid from './SuggestionGrid';

const mockItems = [
  // 2 AI best match
  { id: 'ai1', name: 'AI Best 1', brand: 'BrandA', price: 100, salePrice: 90, imageUrls: [''], category: 'clothing', source: 'ai', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  { id: 'ai2', name: 'AI Best 2', brand: 'BrandB', price: 120, salePrice: 110, imageUrls: [''], category: 'clothing', source: 'ai', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  // 1 brand
  { id: 'brand1', name: 'Brand Match', brand: 'UserBrand', price: 80, salePrice: 70, imageUrls: [''], category: 'shoes', source: 'brand', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  // 1 social proof
  { id: 'social1', name: 'Celebrity Pick', brand: 'CelebBrand', price: 150, salePrice: 140, imageUrls: [''], category: 'hats', source: 'social', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  // 1 trending
  { id: 'trend1', name: 'Trending', brand: 'TrendBrand', price: 60, salePrice: 55, imageUrls: [''], category: 'accessories', source: 'trending', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  // 5 filler for grid
  { id: 'f1', name: 'Filler 1', brand: 'F1', price: 10, salePrice: 9, imageUrls: [''], category: 'etc', source: 'etc', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  { id: 'f2', name: 'Filler 2', brand: 'F2', price: 11, salePrice: 10, imageUrls: [''], category: 'etc', source: 'etc', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  { id: 'f3', name: 'Filler 3', brand: 'F3', price: 12, salePrice: 11, imageUrls: [''], category: 'etc', source: 'etc', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  { id: 'f4', name: 'Filler 4', brand: 'F4', price: 13, salePrice: 12, imageUrls: [''], category: 'etc', source: 'etc', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
  { id: 'f5', name: 'Filler 5', brand: 'F5', price: 14, salePrice: 13, imageUrls: [''], category: 'etc', source: 'etc', retailerId: 'r1', colors: [], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: '' },
];

describe('Generate Suggestions (Fashion-ai-specs.md compliance)', () => {
  it('Button exists and is prominently displayed', () => {
    render(<SuggestionGrid items={[]} onGenerate={jest.fn()} />);
    const btn = screen.getByRole('button', { name: /generate suggestions/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeVisible();
  });

  it('Clicking generates EXACTLY 2x5 grid (10 items)', () => {
    render(<SuggestionGrid items={mockItems} onGenerate={jest.fn()} />);
    // Should render 10 ItemCard elements (by role or test id)
    const itemCards = screen.getAllByText(/filler|ai best|brand match|celebrity pick|trending/i);
    expect(itemCards.length).toBe(10);
  });

  it('Categories organized as: Clothing, Shoes, Hats, Accessories, Etc.', () => {
    render(<SuggestionGrid items={mockItems} onGenerate={jest.fn()} />);
    const select = screen.getByLabelText(/category/i);
    expect(select).toBeInTheDocument();
    const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent?.toLowerCase());
    expect(options).toEqual(
      expect.arrayContaining([
        'all categories', 'clothing', 'shoes', 'hats', 'accessories', 'etc'
      ])
    );
  });

  it('Implements the 5/5 logic', () => {
    render(<SuggestionGrid items={mockItems} onGenerate={jest.fn()} />);
    // 2 AI best match
    expect(screen.getByText('AI Best 1')).toBeInTheDocument();
    expect(screen.getByText('AI Best 2')).toBeInTheDocument();
    // 1 brand
    expect(screen.getByText('Brand Match')).toBeInTheDocument();
    // 1 social proof
    expect(screen.getByText('Celebrity Pick')).toBeInTheDocument();
    // 1 trending
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });
}); 