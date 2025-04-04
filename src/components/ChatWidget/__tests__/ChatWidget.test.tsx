// src/components/ChatWidget/__tests__/ChatWidget.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
// Import is defined but not used in current tests
// import userEvent from '@testing-library/user-event';
import ChatWidget from '../ChatWidget';

// Mock the stores
jest.mock('@store/index', () => ({
  useChatStore: jest.fn(() => ({
    messages: [],
    isOpen: true,
    isMinimized: false,
    isLoading: false,
    addTextMessage: jest.fn(),
    toggleOpen: jest.fn(),
    toggleMinimize: jest.fn(),
    setLoading: jest.fn(),
  })),
  useUserStore: jest.fn(() => ({
    user: null,
    setUser: jest.fn(),
    addLikedItem: jest.fn(),
    addDislikedItem: jest.fn(),
    addViewedItem: jest.fn(),
  })),
  useRecommendationStore: jest.fn(() => ({
    setRecommendedItems: jest.fn(),
    setRecommendedOutfits: jest.fn(),
  })),
}));

// Mock API client
jest.mock('@api/index', () => ({
  createStylistApi: jest.fn(() => ({
    user: {
      createUser: jest.fn(() => Promise.resolve({ userId: 'test-user' })),
      getUserProfile: jest.fn(() => Promise.resolve({ userId: 'test-user' })),
    },
    recommendation: {
      getRecommendations: jest.fn(() => Promise.resolve({
        items: [],
        outfits: []
      })),
      addItemFeedback: jest.fn(),
      addOutfitFeedback: jest.fn(),
    },
  })),
}));

describe('ChatWidget', () => {
  test('renders the chat widget when open', () => {
    render(
      <ChatWidget 
        apiKey="test-key" 
        retailerId="test-retailer" 
        greeting="Test greeting"
      />
    );
    
    // Header should be visible
    expect(screen.getByText('The Stylist')).toBeInTheDocument();
  });
});