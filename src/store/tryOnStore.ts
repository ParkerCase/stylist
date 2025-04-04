// Store for managing virtual try-on state

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  OutfitTryOn,
  GarmentInfo,
  UserImageInfo,
  BackgroundRemovalMethod,
  TryOnSettings,
  GarmentType,
  SavedTryOnResult
} from '../types/tryOn';
import { getDefaultBodyPosition } from '../services/image-processing/imagePositioning';

interface TryOnState {
  // Current try-on state
  currentOutfit: OutfitTryOn | null;
  userImage: UserImageInfo | null;
  isLoading: boolean;
  error: string | null;
  
  // Virtual try-on settings
  settings: TryOnSettings;
  
  // Saved try-on results
  savedResults: SavedTryOnResult[];
  
  // Canvas state
  canvasWidth: number;
  canvasHeight: number;
  
  // Modal state
  isTryOnModalOpen: boolean;
  isUploadModalOpen: boolean;
  
  // Actions
  setCurrentOutfit: (outfit: OutfitTryOn | null) => void;
  addGarmentToOutfit: (garment: GarmentInfo) => void;
  removeGarmentFromOutfit: (garmentId: string) => void;
  updateGarment: (garmentId: string, updates: Partial<GarmentInfo>) => void;
  setUserImage: (image: UserImageInfo | null) => void;
  updateUserImage: (updates: Partial<UserImageInfo>) => void;
  clearUserImage: () => void;
  updateOutfit: (updates: Partial<OutfitTryOn>) => void;
  setSettings: (settings: Partial<TryOnSettings>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  saveResult: (result: SavedTryOnResult) => void;
  deleteSavedResult: (resultId: string) => void;
  setCanvasDimensions: (width: number, height: number) => void;
  openTryOnModal: () => void;
  closeTryOnModal: () => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  reset: () => void;
  
  // Integration methods
  startNewTryOn: (productImage: string | File, productType: GarmentType) => void;
  tryOnOutfit: (outfit: OutfitTryOn) => void;
}

// Default settings
const DEFAULT_SETTINGS: TryOnSettings = {
  preferredBackgroundRemovalMethod: BackgroundRemovalMethod.TENSORFLOW,
  removeBackgroundAutomatically: true,
  showGuidelines: true,
  highQualityRendering: true,
  defaultGarmentScale: {
    [GarmentType.TOP]: 0.8,
    [GarmentType.BOTTOM]: 0.7,
    [GarmentType.DRESS]: 0.9,
    [GarmentType.OUTERWEAR]: 0.85,
    [GarmentType.SHOES]: 0.5,
    [GarmentType.ACCESSORY]: 0.4
  },
  defaultGarmentOffset: {
    [GarmentType.TOP]: { x: 0, y: -50 },
    [GarmentType.BOTTOM]: { x: 0, y: 100 },
    [GarmentType.DRESS]: { x: 0, y: 0 },
    [GarmentType.OUTERWEAR]: { x: 0, y: -30 },
    [GarmentType.SHOES]: { x: 0, y: 200 },
    [GarmentType.ACCESSORY]: { x: 0, y: -150 }
  }
};

export const useTryOnStore = create<TryOnState>()(
  devtools(
    persist(
      (set, get) => ({
        // Current try-on state
        currentOutfit: null,
        userImage: null,
        isLoading: false,
        error: null,
        
        // Settings
        settings: DEFAULT_SETTINGS,
        
        // Saved results
        savedResults: [],
        
        // Canvas state
        canvasWidth: 600,
        canvasHeight: 800,
        
        // Modal state
        isTryOnModalOpen: false,
        isUploadModalOpen: false,
        
        // Actions
        setCurrentOutfit: (outfit) => {
          set({ currentOutfit: outfit });
        },
        
        addGarmentToOutfit: (garment) => {
          const { currentOutfit } = get();
          
          if (!currentOutfit) {
            // Create a new outfit if none exists
            const newOutfit: OutfitTryOn = {
              id: `outfit_${Date.now()}`,
              garments: [garment],
              createdAt: new Date()
            };
            set({ currentOutfit: newOutfit });
          } else {
            // Remove any existing garment of the same type if it has the same body position
            const filteredGarments = currentOutfit.garments.filter(
              (g: GarmentInfo) => !(g.type === garment.type && g.bodyPosition === garment.bodyPosition)
            );
            
            // Add the new garment
            set({
              currentOutfit: {
                ...currentOutfit,
                garments: [...filteredGarments, garment]
              }
            });
          }
        },
        
        removeGarmentFromOutfit: (garmentId) => {
          const { currentOutfit } = get();
          
          if (currentOutfit) {
            const updatedGarments = currentOutfit.garments.filter(
              (g: GarmentInfo) => g.id !== garmentId
            );
            
            set({
              currentOutfit: {
                ...currentOutfit,
                garments: updatedGarments
              }
            });
          }
        },
        
        updateGarment: (garmentId, updates) => {
          const { currentOutfit } = get();
          
          if (currentOutfit) {
            const updatedGarments = currentOutfit.garments.map((g: GarmentInfo) =>
              g.id === garmentId ? { ...g, ...updates } : g
            );
            
            set({
              currentOutfit: {
                ...currentOutfit,
                garments: updatedGarments
              }
            });
          }
        },
        
        setUserImage: (image) => {
          set({ userImage: image });
          
          // Also update the current outfit if it exists
          const { currentOutfit } = get();
          if (currentOutfit) {
            // Cast image to UserImageInfo | undefined to match the expected type
            const userImageForOutfit = image as UserImageInfo | undefined;
            set({
              currentOutfit: {
                ...currentOutfit,
                userImage: userImageForOutfit
              }
            });
          }
        },
        
        updateUserImage: (updates) => {
          const { userImage } = get();
          
          if (userImage) {
            const updatedImage = {
              ...userImage,
              ...updates
            };
            
            set({ userImage: updatedImage });
            
            // Also update the current outfit if it exists
            const { currentOutfit } = get();
            if (currentOutfit) {
              set({
                currentOutfit: {
                  ...currentOutfit,
                  userImage: updatedImage
                }
              });
            }
          }
        },
        
        clearUserImage: () => {
          set({ userImage: null });
          
          // Also update the current outfit if it exists
          const { currentOutfit } = get();
          if (currentOutfit) {
            // Set to undefined to match expected type
            const updatedOutfit = {
              ...currentOutfit,
              userImage: undefined
            };
            set({ currentOutfit: updatedOutfit });
          }
        },
        
        updateOutfit: (updates) => {
          const { currentOutfit } = get();
          
          if (currentOutfit) {
            set({
              currentOutfit: {
                ...currentOutfit,
                ...updates
              }
            });
          }
        },
        
        setSettings: (settings) => {
          set({
            settings: {
              ...get().settings,
              ...settings
            }
          });
        },
        
        setLoading: (isLoading) => {
          set({ isLoading });
        },
        
        setError: (error) => {
          set({ error });
        },
        
        saveResult: (result) => {
          const results = [...get().savedResults];
          
          // Check if this result already exists
          const existingIndex = results.findIndex((r) => r.id === result.id);
          
          if (existingIndex >= 0) {
            // Update existing result
            results[existingIndex] = result;
          } else {
            // Add new result
            results.push(result);
          }
          
          set({ savedResults: results });
        },
        
        deleteSavedResult: (resultId) => {
          const filteredResults = get().savedResults.filter(
            (r) => r.id !== resultId
          );
          
          set({ savedResults: filteredResults });
        },
        
        setCanvasDimensions: (width, height) => {
          set({ canvasWidth: width, canvasHeight: height });
        },
        
        openTryOnModal: () => {
          set({ isTryOnModalOpen: true });
        },
        
        closeTryOnModal: () => {
          set({ isTryOnModalOpen: false });
        },
        
        openUploadModal: () => {
          set({ isUploadModalOpen: true });
        },
        
        closeUploadModal: () => {
          set({ isUploadModalOpen: false });
        },
        
        reset: () => {
          set({
            currentOutfit: null,
            userImage: null,
            isLoading: false,
            error: null
          });
        },
        
        // Integration methods
        startNewTryOn: (productImage, productType) => {
          const { settings } = get();
          const state = get();
          
          // Create a new outfit if none exists
          const outfit: OutfitTryOn = state.currentOutfit || {
            id: crypto.randomUUID(),
            garments: [],
            createdAt: new Date()
          };
          
          // Create a garment info object
          const newGarment: GarmentInfo = {
            id: crypto.randomUUID(),
            type: productType,
            url: typeof productImage === 'string' ? productImage : URL.createObjectURL(productImage),
            bodyPosition: getDefaultBodyPosition(productType),
            zIndex: outfit.garments.length + 1,
            layerIndex: outfit.garments.length,
            scale: settings.defaultGarmentScale[productType] || 1,
            offset: settings.defaultGarmentOffset[productType] || { x: 0, y: 0 },
            rotation: 0,
            withoutBackground: true
          };
          
          // Add the garment to the outfit
          const updatedGarments = [...(outfit.garments || []), newGarment];
          
          set({
            currentOutfit: {
              ...outfit,
              garments: updatedGarments
            }
          });
        },
        
        tryOnOutfit: (outfit) => {
          set({ currentOutfit: outfit });
        }
      }),
      {
        name: 'stylist-try-on-storage',
        // Only persist settings and saved results
        partialize: (state) => ({
          settings: state.settings,
          savedResults: state.savedResults
        })
      }
    ),
    { name: 'try-on-store' }
  )
);
