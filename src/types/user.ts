// User-related types for the widget

export interface UserProfile {
    userId: string;
    isAnonymous: boolean;
    email?: string;
    name?: string;
    preferences: UserPreferences;
    closet: ClosetItem[];
    feedback: UserFeedback;
    createdAt: Date;
    lastActive: Date;
  }
  
  export interface UserPreferences {
    stylePreferences: StylePreference[];
    colorPreferences: ColorPreference[];
    sizePreferences: SizePreference[];
    priceRange?: PriceRange;
    favoriteRetailers?: string[];
    excludedCategories?: string[];
    occasionPreferences?: string[];
  }
  
  export interface StylePreference {
    style: string;
    weight: number; // 0 to 1, representing user's preference strength
  }
  
  export interface ColorPreference {
    color: string;
    weight: number;
  }
  
  export interface SizePreference {
    category: string; // e.g., "tops", "bottoms", "shoes"
    size: string;
  }
  
  export interface PriceRange {
    min?: number;
    max?: number;
    target?: number;
  }
  
  export interface ClosetItem {
    id: string;
    category: string;
    subcategory?: string;
    brand?: string;
    color: string;
    size?: string;
    imageUrl?: string;
    dateAdded: Date;
    favorite: boolean;
    tags: string[];
  }
  
  export interface UserFeedback {
    likedItems: string[];
    dislikedItems: string[];
    savedOutfits: string[][];
    viewedItems: string[];
    lastInteraction: Date;
  }
  
  export interface StyleQuizQuestion {
    id: string;
    questionText: string;
    type: 'single' | 'multiple' | 'slider' | 'image';
    options?: StyleQuizOption[];
    minValue?: number;
    maxValue?: number;
    step?: number;
    category: string; // e.g., "style", "color", "fit", "occasion"
  }
  
  export interface StyleQuizOption {
    id: string;
    text: string;
    imageUrl?: string;
    value: string | number;
  }
  
  export interface StyleQuizAnswer {
    questionId: string;
    answerId?: string; // For single/multiple choice
    answerIds?: string[]; // For multiple choice
    answerValue?: number; // For slider
    answered: Date;
  }
  
  export interface StyleQuizResult {
    quizId: string;
    userId: string;
    completedAt: Date;
    answers: StyleQuizAnswer[];
    generatedPreferences: UserPreferences;
  }
  