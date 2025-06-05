import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatHeader from './ChatHeader';

describe('Widget Header (Fashion-ai-specs.md compliance)', () => {
  it('displays "Personalized Stylist" text exactly', () => {
    const { getByText } = render(<ChatHeader title="Personalized Stylist" />);
    expect(getByText('Personalized Stylist')).toBeInTheDocument();
  });

  it('modal appears with smooth animation', () => {
    const { container } = render(<ChatHeader title="Personalized Stylist" />);
    // Check for animation style/class
    expect(container.firstChild).toHaveClass('modal-animate');
  });

  it('close button (×) is present and clickable', () => {
    const { getByRole } = render(<ChatHeader title="Personalized Stylist" />);
    const closeButton = getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton); // Should not throw
  });
}); 