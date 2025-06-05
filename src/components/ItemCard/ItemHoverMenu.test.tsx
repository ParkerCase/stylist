import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ItemHoverMenu from './ItemHoverMenu';

describe('ItemHoverMenu (Fashion-ai-specs.md compliance)', () => {
  it('shows menu with exactly 4 options', () => {
    render(
      <ItemHoverMenu
        onAddToDressingRoom={jest.fn()}
        onAddToWishlist={jest.fn()}
        onAddToCart={jest.fn()}
        onOutfitSuggestions={jest.fn()}
      />
    );
    const options = screen.getAllByRole('button');
    expect(options.length).toBe(4);
  });

  it('options are labeled correctly', () => {
    render(
      <ItemHoverMenu
        onAddToDressingRoom={jest.fn()}
        onAddToWishlist={jest.fn()}
        onAddToCart={jest.fn()}
        onOutfitSuggestions={jest.fn()}
      />
    );
    expect(screen.getByText(/add to dressing room/i)).toBeInTheDocument();
    expect(screen.getByText(/add to wishlist/i)).toBeInTheDocument();
    expect(screen.getByText(/add to cart/i)).toBeInTheDocument();
    expect(screen.getByText(/outfit suggestions/i)).toBeInTheDocument();
  });

  it('each option triggers correct functionality', () => {
    const dressingRoom = jest.fn();
    const wishlist = jest.fn();
    const cart = jest.fn();
    const outfit = jest.fn();
    render(
      <ItemHoverMenu
        onAddToDressingRoom={dressingRoom}
        onAddToWishlist={wishlist}
        onAddToCart={cart}
        onOutfitSuggestions={outfit}
      />
    );
    fireEvent.click(screen.getByText(/add to dressing room/i));
    expect(dressingRoom).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/add to wishlist/i));
    expect(wishlist).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/add to cart/i));
    expect(cart).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/outfit suggestions/i));
    expect(outfit).toHaveBeenCalled();
  });
}); 