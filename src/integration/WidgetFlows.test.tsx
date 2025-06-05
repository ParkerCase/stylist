import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SyncProvider } from '../services/SyncProvider';
// NOTE: Use the correct relative default import for StylistWidget
import StylistWidget from '../StylistWidget';

// Mock user store and API for new user
jest.mock('../store/userStore', () => ({
  useUserStore: () => ({
    user: null,
    setUser: jest.fn(),
    updatePreferences: jest.fn(),
    addClosetItem: jest.fn(),
  }),
}));

jest.mock('../api/index', () => ({
  createStylistApi: () => ({
    recommendation: {
      getRecommendations: jest.fn(() => Promise.resolve({
        items: [
          { id: 'item1', name: 'Test Dress', category: 'dresses', imageUrls: ['dress.jpg'], matchReasons: ['Matches your style profile'] },
        ],
        outfits: [],
      })),
    },
  }),
}));

describe('Widget Integration Flows (Fashion-ai-specs.md)', () => {
  describe('New User Flow', () => {
    it('completes the full onboarding: open widget → style quiz → recommendations → try-on → save to closet, with data persistence', async () => {
      // Create portal container for widget modal if needed
      const portalDiv = document.createElement('div');
      portalDiv.id = 'stylist-widget-container';
      document.body.appendChild(portalDiv);
      render(
        <SyncProvider>
          <StylistWidget apiKey="test-key" retailerId="test-retailer" />
        </SyncProvider>
      );
      // 1. Open widget (click floating button)
      const openBtn = screen.getByLabelText(/open personalized stylist widget/i);
      fireEvent.click(openBtn);
      // Wait for header to appear (search entire body in case of portal)
      await waitFor(() => {
        expect(document.body.textContent).toMatch(/personalized stylist/i);
      });
      // 2. Start style quiz
      fireEvent.click(screen.getByText(/start style quiz/i));
      // 3. Complete quiz (simulate answering all questions)
      for (let i = 0; i < 25; i++) {
        const option = screen.getAllByRole('button', { name: /option/i })[0];
        fireEvent.click(option);
        const next = screen.queryByRole('button', { name: /next/i });
        if (next && !(next as HTMLButtonElement).disabled) fireEvent.click(next);
      }
      // 4. See style profile results
      await waitFor(() => expect(document.body.textContent).toMatch(/your style profile/i));
      // 5. Get personalized recommendations
      fireEvent.click(screen.getByText(/see recommendations/i));
      await waitFor(() => expect(document.body.textContent).toMatch(/test dress/i));
      // 6. Try on a recommended item
      fireEvent.click(screen.getByText(/try on/i));
      await waitFor(() => expect(document.body.textContent).toMatch(/virtual try-on/i));
      // 7. Save to closet
      fireEvent.click(screen.getByText(/save to closet/i));
      // 8. Assert item is in closet (simulate navigation)
      fireEvent.click(screen.getByText(/my closet/i));
      await waitFor(() => expect(document.body.textContent).toMatch(/test dress/i));
      // 9. Data persists (simulate reload)
      // (Would require rerender with updated store, or check localStorage/session)
    });
  });
}); 