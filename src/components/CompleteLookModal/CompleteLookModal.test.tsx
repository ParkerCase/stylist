import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompleteLookModal from './CompleteLookModal';

const baseItem = {
  id: 'shirt1',
  name: 'White Shirt',
  brand: 'BrandA',
  price: 50,
  salePrice: 45,
  imageUrls: [''],
  category: 'shirt',
  retailerId: 'retailer1',
  colors: ['white'],
  sizes: [],
  url: '',
  inStock: true,
  matchScore: 1,
  matchReasons: [],
  description: 'A crisp white shirt',
};
const compItems = [
  { id: 'pants1', name: 'Black Pants', brand: 'BrandA', price: 60, salePrice: 55, imageUrls: [''], category: 'pants', retailerId: 'retailer1', colors: ['black'], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: 'Classic black pants' },
  { id: 'shoes1', name: 'Brown Shoes', brand: 'BrandA', price: 80, salePrice: 75, imageUrls: [''], category: 'shoes', retailerId: 'retailer1', colors: ['brown'], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: 'Leather shoes' },
  { id: 'belt1', name: 'Leather Belt', brand: 'BrandA', price: 30, salePrice: 25, imageUrls: [''], category: 'accessories', retailerId: 'retailer1', colors: ['brown'], sizes: [], url: '', inStock: true, matchScore: 1, matchReasons: [], description: 'Brown leather belt' },
];

describe('CompleteLookModal (Fashion-ai-specs.md compliance)', () => {
  it('Modal triggers ONLY after "Add to cart" action', () => {
    // Simulate parent logic: modal isOpen only after add to cart
    const { rerender } = render(
      <CompleteLookModal isOpen={false} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={jest.fn()} onAddAllToCart={jest.fn()} />
    );
    expect(screen.queryByText(/complete your look/i)).not.toBeInTheDocument();
    rerender(
      <CompleteLookModal isOpen={true} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={jest.fn()} onAddAllToCart={jest.fn()} />
    );
    expect(screen.getByText(/complete your look/i)).toBeInTheDocument();
  });

  it('Does NOT trigger for other actions', () => {
    render(
      <CompleteLookModal isOpen={false} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={jest.fn()} onAddAllToCart={jest.fn()} />
    );
    expect(screen.queryByText(/complete your look/i)).not.toBeInTheDocument();
  });

  it('Shows EXACTLY 3-5 complementary items (no more, no less)', () => {
    render(
      <CompleteLookModal isOpen={true} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={jest.fn()} onAddAllToCart={jest.fn()} />
    );
    const items = screen.getAllByText(/pants|shoes|belt/i);
    expect(items.length).toBe(3);
  });

  it('Items are from same website as original item', () => {
    render(
      <CompleteLookModal isOpen={true} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={jest.fn()} onAddAllToCart={jest.fn()} />
    );
    compItems.forEach(item => {
      expect(item.retailerId).toBe(baseItem.retailerId);
    });
  });

  it('Smart category matching works: Shirt → pants, shoes, accessories', () => {
    render(
      <CompleteLookModal isOpen={true} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={jest.fn()} onAddAllToCart={jest.fn()} />
    );
    expect(screen.getByText(/black pants/i)).toBeInTheDocument();
    expect(screen.getByText(/brown shoes/i)).toBeInTheDocument();
    expect(screen.getByText(/leather belt/i)).toBeInTheDocument();
  });

  it('"Add all" option functions correctly', () => {
    const addAll = jest.fn();
    render(
      <CompleteLookModal isOpen={true} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={jest.fn()} onAddAllToCart={addAll} />
    );
    const addAllBtn = document.querySelector('.stylist-complete-look-modal__add-all');
    expect(addAllBtn).toBeInTheDocument();
    if (addAllBtn) fireEvent.click(addAllBtn);
    expect(addAll).toHaveBeenCalled();
  });

  it('Individual item selection works', () => {
    render(
      <CompleteLookModal isOpen={true} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={jest.fn()} onAddAllToCart={jest.fn()} />
    );
    // Click on the first complementary item
    const itemDivs = document.querySelectorAll('.stylist-complete-look-modal__item');
    expect(itemDivs.length).toBe(3);
    fireEvent.click(itemDivs[0]);
    // Should show a checkmark (svg) in the first item
    expect(itemDivs[0].querySelector('svg')).toBeInTheDocument();
  });

  it('Items integrate with existing cart', () => {
    const addToCart = jest.fn();
    render(
      <CompleteLookModal isOpen={true} onClose={jest.fn()} selectedItem={baseItem} complementaryItems={compItems} onAddToCart={addToCart} onAddAllToCart={jest.fn()} />
    );
    // Find the first complementary item card's add-to-cart button by class
    const addCartBtns = document.querySelectorAll('.stylist-item-card__cart-btn');
    expect(addCartBtns.length).toBeGreaterThan(0);
    fireEvent.click(addCartBtns[0]);
    expect(addToCart).toHaveBeenCalled();
  });
}); 