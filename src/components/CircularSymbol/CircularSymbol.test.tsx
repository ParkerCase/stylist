import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CircularSymbol from './CircularSymbol';

// Mock for widget open handler
const openWidget = jest.fn();

describe('CircularSymbol (Fashion-ai-specs.md compliance)', () => {
  it('renders with fixed position at bottom: 20px, right: 20px', () => {
    const { container } = render(<CircularSymbol onClick={openWidget} />);
    const symbol = container.firstChild;
    expect(symbol).toHaveStyle('position: fixed');
    expect(symbol).toHaveStyle('bottom: 20px');
    expect(symbol).toHaveStyle('right: 20px');
  });

  it('uses company door icon or placeholder', () => {
    const { getByTestId } = render(<CircularSymbol onClick={openWidget} />);
    // Accepts either a real icon or a placeholder with data-testid
    expect(getByTestId('company-door-icon')).toBeInTheDocument();
  });

  it('opens widget modal on click', () => {
    const { getByRole } = render(<CircularSymbol onClick={openWidget} />);
    fireEvent.click(getByRole('button'));
    expect(openWidget).toHaveBeenCalled();
  });

  it('has smooth scale animation on hover', () => {
    const { container } = render(<CircularSymbol onClick={openWidget} />);
    const symbol = container.firstChild;
    // Check for the full transition property and value
    expect(symbol).toHaveStyle('transition: transform 0.2s cubic-bezier(0.4,0,0.2,1)');
  });
}); 