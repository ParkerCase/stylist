// src/hooks/__tests__/useTryOn.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useTryOn } from '../useTryOn';
import { useTryOnStore } from '@/store/tryOnStore';
import { Recommendation } from '@/types/index';
import { GarmentType, UserImageInfo, ProcessingStatus } from '@/types/tryOn';

// Mock dependencies
jest.mock('@/store/tryOnStore');

describe('useTryOn Hook', () => {
  // Sample test data
  const mockItem: Recommendation.RecommendationItem = {
    id: 'item1',
    name: 'Test T-Shirt',
    brand: 'Test Brand',
    price: 29.99,
    category: 'tops',
    subcategory: 't-shirts',
    retailerId: 'test',
    inStock: true,
    imageUrls: ['test-image.jpg'],
    matchScore: 0.8,
    matchReasons: ['Matches your style'],
    colors: ['black'],
    sizes: ['M', 'L'],
    url: 'https://example.com/item1'
  };
  
  const mockUserImage: UserImageInfo = {
    id: 'user-image-1',
    url: 'data:image/jpeg;base64,mockImageData',
    dimensions: {
      width: 500,
      height: 800
    },
    processingStatus: ProcessingStatus.COMPLETED
  };
  
  // Mock try-on store state
  const mockTryOnStore = {
    canvasWidth: 600,
    canvasHeight: 800,
    userImage: null,
    currentOutfit: null,
    settings: {
      showGuidelines: true,
      autoPositionGarments: true,
      defaultGarmentScale: {
        [GarmentType.TOP]: 1.0,
        [GarmentType.BOTTOM]: 1.0
      },
      defaultGarmentOffset: {
        [GarmentType.TOP]: { x: 0, y: 0 },
        [GarmentType.BOTTOM]: { x: 0, y: 0 }
      }
    },
    isLoading: false,
    error: null,
    setUserImage: jest.fn(),
    clearUserImage: jest.fn(),
    addGarmentToOutfit: jest.fn(),
    updateGarment: jest.fn(),
    removeGarmentFromOutfit: jest.fn(),
    setCurrentOutfit: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    saveResult: jest.fn(),
    openTryOnModal: jest.fn(),
    closeTryOnModal: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock try-on store
    (useTryOnStore as unknown as jest.Mock).mockImplementation(() => mockTryOnStore);
  });
  
  test('initializes correctly', () => {
    const { result } = renderHook(() => useTryOn());
    
    expect(result.current.userImage).toBe(null);
    expect(result.current.currentOutfit).toBe(null);
    expect(typeof result.current.uploadUserImage).toBe('function');
    expect(typeof result.current.addGarment).toBe('function');
    expect(typeof result.current.removeGarment).toBe('function');
    expect(typeof result.current.updateGarmentProperties).toBe('function');
    expect(typeof result.current.canvasWidth).toBe('number');
  });
  
  test('adds item to try-on', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Add an item to try-on
    act(() => {
      result.current.addGarment(mockItem.imageUrls[0], GarmentType.TOP);
    });
    
    // Should call store's addGarmentToOutfit with garment data
    expect(mockTryOnStore.addGarmentToOutfit).toHaveBeenCalledWith(expect.objectContaining({
      url: mockItem.imageUrls[0],
      type: GarmentType.TOP,
      zIndex: expect.any(Number)
    }));
  });
  
  test('maps item category to garment type correctly', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Add a top item
    act(() => {
      result.current.addGarment(mockItem.imageUrls[0], GarmentType.TOP);
    });
    
    expect(mockTryOnStore.addGarmentToOutfit).toHaveBeenCalledWith(
      expect.objectContaining({ type: GarmentType.TOP })
    );
    
    // Clear mock and try with bottoms
    mockTryOnStore.addGarmentToOutfit.mockClear();
    
    // Add a bottom item
    act(() => {
      result.current.addGarment(mockItem.imageUrls[0], GarmentType.BOTTOM);
    });
    
    expect(mockTryOnStore.addGarmentToOutfit).toHaveBeenCalledWith(
      expect.objectContaining({ type: GarmentType.BOTTOM })
    );
  });
  
  test('uploads user image', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Upload a user image file
    const mockFile = new File(['test'], 'user.jpg', { type: 'image/jpeg' });
    
    act(() => {
      result.current.uploadUserImage(mockFile);
    });
    
    // Should set loading state
    expect(mockTryOnStore.setLoading).toHaveBeenCalledWith(true);
  });
  
  test('clears user image', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Clear user image
    act(() => {
      result.current.clearUserImage();
    });
    
    // Should call store's method to clear user image
    expect(mockTryOnStore.clearUserImage).toHaveBeenCalled();
  });
  
  test('starts new try-on session', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Start a new try-on session
    act(() => {
      result.current.startNewTryOn();
    });
    
    // Should call store's setCurrentOutfit and openTryOnModal
    expect(mockTryOnStore.setCurrentOutfit).toHaveBeenCalled();
    expect(mockTryOnStore.openTryOnModal).toHaveBeenCalled();
  });
  
  test('updates garment properties', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Update garment properties
    const updates = { 
      offset: { x: 10, y: 20 }, 
      scale: 1.2, 
      rotation: 45 
    };
    
    act(() => {
      result.current.updateGarmentProperties('item1', updates);
    });
    
    // Should call store's updateGarment
    expect(mockTryOnStore.updateGarment).toHaveBeenCalledWith('item1', updates);
  });
  
  test('removes garment', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Remove a garment
    act(() => {
      result.current.removeGarment('item1');
    });
    
    // Should call store's removeGarmentFromOutfit
    expect(mockTryOnStore.removeGarmentFromOutfit).toHaveBeenCalledWith('item1');
  });
  
  test('sets canvas reference', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Set canvas reference
    const mockCanvasElement = document.createElement('canvas');
    
    act(() => {
      result.current.setCanvasRef(mockCanvasElement);
    });
    
    // Canvas reference should be set
    expect(result.current.canvasRef).toBe(mockCanvasElement);
  });
  
  test('saves try-on result', () => {
    const { result } = renderHook(() => useTryOn());
    
    // Save try-on result
    act(() => {
      result.current.saveTryOnResult();
    });
    
    // Without canvas reference, it should not call saveResult
    expect(mockTryOnStore.saveResult).not.toHaveBeenCalled();
    
    // But it should have set loading
    expect(mockTryOnStore.setLoading).toHaveBeenCalled();
  });
  
  test('tries on an outfit', async () => {
    // Mock canvas element
    const mockCanvas = {
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mockSnapshotData')
    } as unknown as HTMLCanvasElement;
    
    const { result } = renderHook(() => useTryOn());
    
    // Try on outfit
    const mockOutfit = {
      id: 'outfit_123',
      garments: [],
      createdAt: new Date()
    };
    
    await act(async () => {
      result.current.tryOnOutfit(mockOutfit);
    });
    
    // Should call setCurrentOutfit and openTryOnModal
    expect(mockTryOnStore.setCurrentOutfit).toHaveBeenCalledWith(mockOutfit);
    expect(mockTryOnStore.openTryOnModal).toHaveBeenCalled();
  });
  
  test('closes try-on modal', async () => {
    const { result } = renderHook(() => useTryOn());
    
    // Close try-on modal
    await act(async () => {
      result.current.closeTryOnModal();
    });
    
    // Should call closeTryOnModal
    expect(mockTryOnStore.closeTryOnModal).toHaveBeenCalled();
  });
});