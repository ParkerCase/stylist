// Recommendation state management

import { create } from 'zustand';
import {
  RecommendationItem,
  Outfit,
  SavedOutfit,
  WishlistItem,
  CartItem
} from '../types/index';

interface RecommendationState {
  recommendedItems: RecommendationItem[];
  recommendedOutfits: Outfit[];
  savedOutfits: SavedOutfit[];
  wishlistItems: WishlistItem[];
  cartItems: CartItem[];
  viewedItems: string[];
  context: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setRecommendedItems: (items: RecommendationItem[]) => void;
  setRecommendedOutfits: (outfits: Outfit[]) => void;
  setSavedOutfits: (outfits: SavedOutfit[]) => void;
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (itemId: string) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  addViewedItem: (itemId: string) => void;
  saveOutfit: (outfit: SavedOutfit) => void;
  removeSavedOutfit: (outfitId: string) => void;
  setContext: (context: string | null) => void;
  clearRecommendations: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

const useRecommendationStore = create<RecommendationState>((set, get) => ({
  recommendedItems: [],
  recommendedOutfits: [],
  savedOutfits: [],
  wishlistItems: [],
  cartItems: [],
  viewedItems: [],
  context: null,
  isLoading: false,
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
  
  setLoading: (isLoading) => {
    set({ isLoading });
  },
  
  setError: (error) => {
    set({ error });
  }
}));

export default useRecommendationStore;
