// Recommendation state management

import { create } from 'zustand';
import { Recommendation, WishlistItem, CartItem } from '../types/index';

interface RecommendationState {
  recommendedItems: Recommendation.RecommendationItem[];
  recommendedOutfits: Recommendation.Outfit[];
  savedOutfits: Recommendation.SavedOutfit[];
  wishlistItems: WishlistItem[];
  cartItems: CartItem[];
  viewedItems: string[];
  context: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setRecommendedItems: (items: Recommendation.RecommendationItem[]) => void;
  setRecommendedOutfits: (outfits: Recommendation.Outfit[]) => void;
  setSavedOutfits: (outfits: Recommendation.SavedOutfit[]) => void;
  addRecommendedItem: (item: Recommendation.RecommendationItem) => void;
  addRecommendedOutfit: (outfit: Recommendation.Outfit) => void;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (itemId: string) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  addViewedItem: (itemId: string) => void;
  saveOutfit: (outfit: Recommendation.SavedOutfit) => void;
  removeSavedOutfit: (outfitId: string) => void;
  setContext: (context: string | null) => void;
  clearRecommendations: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getItemsByCategory: (category: string) => Recommendation.RecommendationItem[];
  getItemsSortedByMatchScore: () => Recommendation.RecommendationItem[];
  getOutfitById: (id: string) => Recommendation.Outfit | undefined;
  getItemById: (id: string) => Recommendation.RecommendationItem | undefined;
  updateItem: (id: string, updates: Partial<Recommendation.RecommendationItem>) => void;
}

export const useRecommendationStore = create<RecommendationState>((set, get) => ({
  recommendedItems: [],
  recommendedOutfits: [],
  savedOutfits: [],
  wishlistItems: [],
  cartItems: [],
  viewedItems: [],
  context: null,
  loading: false,
  error: null,
  
  setRecommendedItems: (items) => {
    set({ recommendedItems: items });
  },
  
  setRecommendedOutfits: (outfits) => {
    set({ recommendedOutfits: outfits });
  },
  
  setSavedOutfits: (outfits) => {
    set({ savedOutfits: outfits });
  },
  
  addRecommendedItem: (item) => {
    set((state) => ({
      recommendedItems: [...state.recommendedItems, item]
    }));
  },
  
  addRecommendedOutfit: (outfit) => {
    set((state) => ({
      recommendedOutfits: [...state.recommendedOutfits, outfit]
    }));
  },
  
  addToWishlist: (item) => {
    // Check if item is already in wishlist
    const exists = get().wishlistItems.some(
      (wishlistItem) => wishlistItem.itemId === item.itemId
    );
    
    if (!exists) {
      set((state) => ({
        wishlistItems: [...state.wishlistItems, item]
      }));
    }
  },
  
  removeFromWishlist: (itemId) => {
    set((state) => ({
      wishlistItems: state.wishlistItems.filter(
        (item) => item.itemId !== itemId
      )
    }));
  },
  
  addToCart: (item) => {
    // Check if item is already in cart
    const existingItemIndex = get().cartItems.findIndex(
      (cartItem) => cartItem.itemId === item.itemId
    );
    
    if (existingItemIndex >= 0) {
      // Update quantity if already in cart
      set((state) => {
        const updatedCartItems = [...state.cartItems];
        updatedCartItems[existingItemIndex].quantity += item.quantity;
        return { cartItems: updatedCartItems };
      });
    } else {
      // Add new item to cart
      set((state) => ({
        cartItems: [...state.cartItems, item]
      }));
    }
  },
  
  removeFromCart: (itemId) => {
    set((state) => ({
      cartItems: state.cartItems.filter((item) => item.itemId !== itemId)
    }));
  },
  
  updateCartItemQuantity: (itemId, quantity) => {
    set((state) => ({
      cartItems: state.cartItems.map((item) =>
        item.itemId === itemId ? { ...item, quantity } : item
      )
    }));
  },
  
  addViewedItem: (itemId) => {
    if (!get().viewedItems.includes(itemId)) {
      set((state) => ({
        viewedItems: [...state.viewedItems, itemId]
      }));
    }
  },
  
  saveOutfit: (outfit) => {
    // Check if outfit is already saved
    const exists = get().savedOutfits.some(
      (savedOutfit) => savedOutfit.outfitId === outfit.outfitId
    );
    
    if (!exists) {
      set((state) => ({
        savedOutfits: [...state.savedOutfits, outfit]
      }));
    }
  },
  
  removeSavedOutfit: (outfitId) => {
    set((state) => ({
      savedOutfits: state.savedOutfits.filter(
        (outfit) => outfit.outfitId !== outfitId
      )
    }));
  },
  
  setContext: (context) => {
    set({ context });
  },
  
  clearRecommendations: () => {
    set({
      recommendedItems: [],
      recommendedOutfits: [],
      context: null
    });
  },
  
  setLoading: (loading) => {
    set({ loading });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  getItemsByCategory: (category) => {
    return get().recommendedItems.filter(item => item.category === category);
  },
  
  getItemsSortedByMatchScore: () => {
    return [...get().recommendedItems].sort((a, b) => b.matchScore - a.matchScore);
  },
  
  getOutfitById: (id) => {
    return get().recommendedOutfits.find(outfit => outfit.id === id);
  },
  
  getItemById: (id) => {
    return get().recommendedItems.find(item => item.id === id);
  },
  
  updateItem: (id, updates) => {
    set((state) => ({
      recommendedItems: state.recommendedItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  }
}));

export default useRecommendationStore;
