/**
 * Test script for verifying social proof rendering in the Lookbook component
 * 
 * This script simulates loading social proof data and passing it to the Lookbook component
 * to verify that the celebrity-inspired recommendations render correctly.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Lookbook from './components/Lookbook/Lookbook';
import socialProofData from './utils/social_proof_test_data.json';

// Mock function for testing feedback
const mockFeedback = (itemId, liked) => {
  console.log(`Item ${itemId} feedback: ${liked ? 'liked' : 'disliked'}`);
};

// Mock function for testing wishlist
const mockAddToWishlist = (item) => {
  console.log(`Added to wishlist: ${item.name}`);
};

// Mock function for testing cart
const mockAddToCart = (item) => {
  console.log(`Added to cart: ${item.name}`);
};

// Mock function for testing saving outfits
const mockSaveOutfit = (outfit) => {
  console.log(`Saved outfit: ${outfit.name}`);
};

// Render the Lookbook component with social proof data
const renderSocialProofLookbook = () => {
  render(
    <Lookbook
      items={socialProofData.recommended_items}
      outfits={socialProofData.outfits}
      savedOutfits={[]}
      tryOnResults={[]}
      onItemFeedback={mockFeedback}
      onOutfitFeedback={mockFeedback}
      onAddToWishlist={mockAddToWishlist}
      onAddToCart={mockAddToCart}
      onSaveOutfit={mockSaveOutfit}
      primaryColor="#0066cc"
    />
  );
};

// Test for verifying social proof rendering
const testSocialProofRendering = () => {
  renderSocialProofLookbook();
  
  // Check that celebrity-inspired recommendations are rendered
  const itemElements = screen.getAllByText(/Inspired by/i);
  if (itemElements.length > 0) {
    console.log('✅ Social proof recommendations rendered successfully');
    console.log(`Found ${itemElements.length} items with social proof context`);
    
    // Check for specific celebrities
    const haileyItems = screen.getAllByText(/Hailey Bieber/i);
    const rihannaItems = screen.getAllByText(/Rihanna/i);
    
    console.log(`✅ Found ${haileyItems.length} items inspired by Hailey Bieber`);
    console.log(`✅ Found ${rihannaItems.length} items inspired by Rihanna`);
    
    return true;
  } else {
    console.log('❌ Social proof recommendations not rendered properly');
    return false;
  }
};

// Run the test
testSocialProofRendering();

// Export test functions for potential reuse
export {
  testSocialProofRendering,
  renderSocialProofLookbook
};