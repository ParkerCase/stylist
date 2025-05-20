// Mock data for user-related endpoints
import { mockData } from '../utils/mockData';
import { 
  UserProfile, 
  SavedOutfit, 
  ItemFeedback,
  OutfitFeedback
} from '../types';

// Use the existing mock user profile
const { userProfile: defaultUserProfile } = mockData;

// Store user data for current session
const userStore: {
  profiles: Record<string, UserProfile>,
  savedOutfits: Record<string, SavedOutfit[]>,
  itemFeedback: Record<string, ItemFeedback[]>,
  outfitFeedback: Record<string, OutfitFeedback[]>
} = {
  profiles: {
    'demo_user': defaultUserProfile,
    'test_user': {
      ...defaultUserProfile,
      userId: 'test_user',
      preferences: {
        ...defaultUserProfile.preferences,
        styles: ['preppy', 'formal', 'classic'],
        brands: ['ClassicCouture', 'PremiumBlends', 'ItalianCraft']
      }
    }
  },
  savedOutfits: {
    'demo_user': [],
    'test_user': []
  },
  itemFeedback: {
    'demo_user': [],
    'test_user': []
  },
  outfitFeedback: {
    'demo_user': [],
    'test_user': []
  }
};

// Generate default profiles for new users
const generateDefaultProfile = (userId: string): UserProfile => {
  return {
    userId,
    username: `user_${Math.random().toString(36).substring(2, 8)}`,
    preferences: {
      stylePreferences: [
        {
          style: 'casual',
          weight: 0.8
        },
        {
          style: 'minimalist',
          weight: 0.7
        },
        {
          style: 'contemporary',
          weight: 0.9
        }
      ],
      colorPreferences: [
        {
          color: 'black',
          weight: 0.9
        },
        {
          color: 'navy',
          weight: 0.8
        },
        {
          color: 'white',
          weight: 0.7
        },
        {
          color: 'gray',
          weight: 0.6
        },
        {
          color: 'blue',
          weight: 0.8
        }
      ],
      sizePreferences: [
        {
          category: 'top',
          size: 'M'
        },
        {
          category: 'bottom',
          size: '32'
        },
        {
          category: 'dress',
          size: '10'
        },
        {
          category: 'shoe',
          size: '9'
        }
      ],
      // Keep these for backward compatibility
      sizes: {
        top: ['M'],
        bottom: ['32'],
        dress: ['10'],
        shoe: ['9']
      },
      colors: ['black', 'navy', 'white', 'gray', 'blue'],
      styles: ['casual', 'minimalist', 'contemporary'],
      brands: ['UrbanFlair', 'ModernEssentials', 'ClassicCouture'],
      occasions: ['casual', 'work'],
      priceRanges: ['BUDGET', 'MIDRANGE']
    },
    history: {
      viewedItems: [],
      likedItems: [],
      dislikedItems: [],
      purchasedItems: []
    },
    createdAt: new Date(),
    lastActive: new Date()
  };
};

/**
 * Get user profile
 */
const getProfile = (options: any = {}): UserProfile => {
  const { params = {}, userId = 'demo_user' } = options;
  
  // Get user ID from params or options
  const id = params.userId || userId;
  
  // Return existing profile or create new one
  if (userStore.profiles[id]) {
    return userStore.profiles[id];
  }
  
  // Create new profile for this user
  const newProfile = generateDefaultProfile(id);
  userStore.profiles[id] = newProfile;
  
  return newProfile;
};

/**
 * Update user profile
 */
const updateProfile = (options: any = {}): UserProfile => {
  const { params = {}, userId = 'demo_user', body = {} } = options;
  
  // Get user ID from params or options
  const id = params.userId || userId;
  
  // Get existing profile or create new one
  let profile = userStore.profiles[id] || generateDefaultProfile(id);
  
  // Update profile with new data
  profile = {
    ...profile,
    ...body,
    // Merge preferences rather than replace
    preferences: {
      ...profile.preferences,
      ...(body.preferences || {})
    },
    lastActive: new Date()
  };
  
  // Save updated profile
  userStore.profiles[id] = profile;
  
  return profile;
};

/**
 * Get saved outfits
 */
const getSavedOutfits = (options: any = {}): SavedOutfit[] => {
  const { params = {}, userId = 'demo_user' } = options;
  
  // Get user ID from params or options
  const id = params.userId || userId;
  
  // Return saved outfits or empty array
  return userStore.savedOutfits[id] || [];
};

/**
 * Save outfit
 */
const saveOutfit = (options: any = {}): SavedOutfit => {
  const { params = {}, userId = 'demo_user', body = {} } = options;
  
  // Get user ID from params or options
  const id = params.userId || userId;
  
  // Create outfit object
  const outfit: SavedOutfit = {
    id: body.outfitId || `outfit_${Date.now()}`,
    userId: id,
    outfitId: body.outfitId || `outfit_${Date.now()}`,
    name: body.name || 'My Outfit',
    items: body.items || [],
    notes: body.notes || '',
    savedAt: new Date(),
    createdAt: new Date(),
  };
  
  // Initialize user's outfits array if needed
  if (!userStore.savedOutfits[id]) {
    userStore.savedOutfits[id] = [];
  }
  
  // Add outfit to user's saved outfits
  userStore.savedOutfits[id].push(outfit);
  
  return outfit;
};

/**
 * Delete saved outfit
 */
const deleteSavedOutfit = (options: any = {}): { success: boolean } => {
  const { params = {}, userId = 'demo_user' } = options;
  
  // Get user ID and outfit ID from params
  const id = params.userId || userId;
  const outfitId = params.outfitId;
  
  if (!outfitId || !userStore.savedOutfits[id]) {
    return { success: false };
  }
  
  // Find outfit index
  const index = userStore.savedOutfits[id].findIndex(o => o.id === outfitId);
  
  if (index === -1) {
    return { success: false };
  }
  
  // Remove outfit
  userStore.savedOutfits[id].splice(index, 1);
  
  return { success: true };
};

/**
 * Add item feedback
 */
const addItemFeedback = (options: any = {}): { success: boolean } => {
  const { params = {}, userId = 'demo_user', body = {} } = options;
  
  // Get user ID and item ID from params
  const id = params.userId || userId;
  const itemId = params.itemId;
  
  if (!itemId) {
    return { success: false };
  }
  
  // Create feedback object
  const feedback: ItemFeedback = {
    userId: id,
    itemId,
    liked: body.liked === true,
    context: body.context || 'general',
    timestamp: new Date()
  };
  
  // Initialize user's feedback array if needed
  if (!userStore.itemFeedback[id]) {
    userStore.itemFeedback[id] = [];
  }
  
  // Add feedback to user's feedback history
  userStore.itemFeedback[id].push(feedback);
  
  // Also update profile history
  if (!userStore.profiles[id]) {
    userStore.profiles[id] = generateDefaultProfile(id);
  }
  
  if (feedback.liked) {
    userStore.profiles[id].history.likedItems.push(itemId);
  } else {
    userStore.profiles[id].history.dislikedItems.push(itemId);
  }
  
  return { success: true };
};

/**
 * Add outfit feedback
 */
const addOutfitFeedback = (options: any = {}): { success: boolean } => {
  const { params = {}, userId = 'demo_user', body = {} } = options;
  
  // Get user ID and outfit ID from params
  const id = params.userId || userId;
  const outfitId = params.outfitId;
  
  if (!outfitId) {
    return { success: false };
  }
  
  // Create feedback object
  const feedback: OutfitFeedback = {
    userId: id,
    outfitId,
    liked: body.liked === true,
    context: body.context || 'general',
    timestamp: new Date()
  };
  
  // Initialize user's feedback array if needed
  if (!userStore.outfitFeedback[id]) {
    userStore.outfitFeedback[id] = [];
  }
  
  // Add feedback to user's feedback history
  userStore.outfitFeedback[id].push(feedback);
  
  return { success: true };
};

/**
 * Log item view
 */
const logItemView = (options: any = {}): { success: boolean } => {
  const { params = {}, userId = 'demo_user' } = options;
  
  // Get user ID and item ID from params
  const id = params.userId || userId;
  const itemId = params.itemId;
  
  if (!itemId) {
    return { success: false };
  }
  
  // Initialize profile if needed
  if (!userStore.profiles[id]) {
    userStore.profiles[id] = generateDefaultProfile(id);
  }
  
  // Add item to viewed items
  userStore.profiles[id].history.viewedItems.push(itemId);
  
  return { success: true };
};

export default {
  getProfile,
  updateProfile,
  getSavedOutfits,
  saveOutfit,
  deleteSavedOutfit,
  addItemFeedback,
  addOutfitFeedback,
  logItemView
};