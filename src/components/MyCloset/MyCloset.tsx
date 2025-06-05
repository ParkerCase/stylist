// MyCloset component for displaying and managing user's clothing items

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { ClosetItem } from '@/types';
import ImageUploader from '../ImageUploader/ImageUploader';
import ItemCard from '../ItemCard/ItemCard';
import useSyncedStore from '@/hooks/useSyncedStore';
import AdaptiveImage from '../common/AdaptiveImage';
import './MyCloset.scss';

interface ClothingCategory {
  id: string;
  name: string;
}

interface MyClosetProps {
  onSelectItem?: (item: ClosetItem) => void;
  onAddToOutfit?: (item: ClosetItem) => void;
  isBuilderMode?: boolean;
}

// Add Item Flow steps enum
enum AddItemStep {
  SELECT_TYPE = 1,
  CHOOSE_COLOR = 2,
  SELECT_PATTERN = 3,
  UPLOAD_IMAGE = 4,
  CONFIRM_DETAILS = 5
}

// Type guard for AddItemStep
function isAddItemStep(value: number): value is AddItemStep {
  return Object.values(AddItemStep).includes(value as AddItemStep);
}

const MyCloset: React.FC<MyClosetProps> = ({
  onSelectItem,
  onAddToOutfit,
  isBuilderMode = false
}) => {
  const { user } = useUserStore();
  const { addToCloset, removeFromCloset, toggleItemFavorite } = useSyncedStore();
  const dragItemRef = useRef<number | null>(null);
  const dragOverItemRef = useRef<number | null>(null);

  // State for managing UI view
  const [activeView, setActiveView] = useState<'closet' | 'wishlist'>('closet');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<ClothingCategory[]>([]);
  const [showUploader, setShowUploader] = useState(false);

  // Item addition flow states
  const [currentStep, setCurrentStep] = useState<AddItemStep>(AddItemStep.SELECT_TYPE);
  const [newItem, setNewItem] = useState<Partial<ClosetItem>>({
    category: '',
    subcategory: '',
    color: '',
    pattern: '',
    brand: '',
    size: '',
    tags: []
  });

  // State for filtering
  const [filterType, setFilterType] = useState<string>('');
  const [filterColor, setFilterColor] = useState<string>('');
  const [filterBrand, setFilterBrand] = useState<string>('');

  // State for editing
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Filter and sort closet items based on selected category and filters
  const filteredItems = useCallback(() => {
    if (!user?.closet) return [];

    let items = [...user.closet]; // Make a copy to preserve original order

    // First, apply category filter
    if (selectedCategory === 'all') {
      // Keep all items
    } else if (selectedCategory === 'favorites') {
      items = items.filter(item => item.favorite);
    } else {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Then apply specific filters if they are set
    if (filterType) {
      items = items.filter(item =>
        item.subcategory?.toLowerCase().includes(filterType.toLowerCase()) ||
        item.category.toLowerCase().includes(filterType.toLowerCase())
      );
    }

    if (filterColor) {
      items = items.filter(item =>
        item.color.toLowerCase().includes(filterColor.toLowerCase())
      );
    }

    if (filterBrand) {
      items = items.filter(item =>
        item.brand?.toLowerCase().includes(filterBrand.toLowerCase())
      );
    }

    return items;
  }, [user?.closet, selectedCategory, filterType, filterColor, filterBrand]);

  // Get wishlist items
  const wishlistItems = useCallback(() => {
    if (!user?.feedback?.likedItems) return [];
    // In a real implementation, fetch the actual wishlist items
    // For now, just pretend that likedItems are the wishlist
    return user.feedback.likedItems.map(id => {
      // This would actually fetch the item data from a store
      return {
        id,
        name: "Wishlist Item",
        imageUrl: "",
        favorite: true
      };
    });
  }, [user?.feedback?.likedItems]);
  
  // Extract categories from user's closet
  useEffect(() => {
    if (user?.closet) {
      const uniqueCategories = new Set(user.closet.map(item => item.category));
      const categoryList: ClothingCategory[] = [
        { id: 'all', name: 'All Items' },
        { id: 'favorites', name: 'Favorites' },
        ...Array.from(uniqueCategories).map(category => ({
          id: category,
          name: category.charAt(0).toUpperCase() + category.slice(1)
        }))
      ];
      setCategories(categoryList);
    }
  }, [user?.closet]);

  // Handle drag start
  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
  };

  // Handle drag over
  const handleDragOver = (index: number) => {
    dragOverItemRef.current = index;
  };

  // Handle drop to reorder items
  const handleDrop = () => {
    if (dragItemRef.current === null || dragOverItemRef.current === null) return;

    const _items = [...filteredItems()];
    const dragItem = _items[dragItemRef.current];

    // Remove the dragged item
    _items.splice(dragItemRef.current, 1);

    // Insert at the destination
    _items.splice(dragOverItemRef.current, 0, dragItem);

    // In a real implementation, this would update the order in the store
    // For now, just console log the reordering
    console.log('Items reordered:', _items);

    // Reset refs
    dragItemRef.current = null;
    dragOverItemRef.current = null;
  };

  // Handle file upload for new closet item
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // Create URL for the image file
      const imageUrl = URL.createObjectURL(file);

      // Set the image URL in the new item data
      setNewItem(prev => ({ ...prev, imageUrl }));

      // Move to the final step
      setCurrentStep(AddItemStep.CONFIRM_DETAILS);

      // Automatically detect category, color, etc. here
      // For now, we'll use a mock detection service
      await detectClothingAttributes();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }, []);

  // Mock function to detect clothing attributes
  const detectClothingAttributes = async () => {
    // In a real implementation, this would call a machine learning model
    // For now, we'll simulate a response after a short delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock detection results
    const detectedCategory = ['tops', 'bottoms', 'shoes', 'accessories'][Math.floor(Math.random() * 4)];
    
    let detectedSubcategory = '';
    if (detectedCategory === 'tops') {
      detectedSubcategory = ['t-shirt', 'blouse', 'sweater', 'jacket'][Math.floor(Math.random() * 4)];
    } else if (detectedCategory === 'bottoms') {
      detectedSubcategory = ['jeans', 'skirt', 'shorts', 'slacks'][Math.floor(Math.random() * 4)];
    } else if (detectedCategory === 'shoes') {
      detectedSubcategory = ['sneakers', 'heels', 'boots', 'sandals'][Math.floor(Math.random() * 4)];
    }
    
    const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'purple', 'pink', 'grey', 'brown'];
    const detectedColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Update the new item with detected attributes
    setNewItem(prev => ({
      ...prev,
      category: detectedCategory,
      subcategory: detectedSubcategory,
      color: detectedColor,
    }));
  };

  // Handle changes in the new item form
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  }, []);

  // Handle tag input
  const handleTagInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const tag = input.value.trim();
      
      if (tag && !newItem.tags?.includes(tag)) {
        setNewItem(prev => ({
          ...prev,
          tags: [...(prev.tags || []), tag]
        }));
        input.value = '';
      }
    }
  }, [newItem.tags]);

  // Remove a tag
  const removeTag = useCallback((tagToRemove: string) => {
    setNewItem(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  }, []);

  // Handle selecting item type
  const handleSelectType = useCallback((type: string) => {
    setNewItem(prev => ({ ...prev, category: type }));
    setCurrentStep(AddItemStep.CHOOSE_COLOR);
  }, []);

  // Handle selecting color
  const handleSelectColor = useCallback((color: string) => {
    setNewItem(prev => ({ ...prev, color }));
    setCurrentStep(AddItemStep.SELECT_PATTERN);
  }, []);

  // Handle selecting pattern
  const handleSelectPattern = useCallback((pattern: string) => {
    setNewItem(prev => ({ ...prev, pattern }));
    setCurrentStep(AddItemStep.UPLOAD_IMAGE);
  }, []);

  // Handle item edit action
  const handleEditItem = useCallback((itemId: string) => {
    const itemToEdit = user?.closet.find(item => item.id === itemId);
    if (itemToEdit) {
      setEditingItem(itemId);
      setNewItem({
        category: itemToEdit.category,
        subcategory: itemToEdit.subcategory || '',
        color: itemToEdit.color,
        pattern: itemToEdit.pattern || '',
        brand: itemToEdit.brand || '',
        size: itemToEdit.size || '',
        imageUrl: itemToEdit.imageUrl,
        tags: itemToEdit.tags || []
      });
      setShowUploader(true);
      setCurrentStep(AddItemStep.CONFIRM_DETAILS);
    }
  }, [user?.closet]);

  // Export closet data
  const exportClosetData = useCallback(() => {
    if (!user?.closet) return;

    const dataStr = JSON.stringify(user.closet);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = 'my-closet-data.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [user?.closet]);

  // Import closet data
  const importClosetData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = e => {
        try {
          const content = e.target?.result;
          if (typeof content === 'string') {
            const parsedItems = JSON.parse(content) as ClosetItem[];
            // Here you would add these items to the user's closet
            console.log('Imported items:', parsedItems);
          }
        } catch (error) {
          console.error('Error parsing imported file:', error);
        }
      };
    }
  }, []);

  // Save the new item to the user's closet
  const saveNewItem = useCallback(() => {
    if (newItem.category && newItem.color && newItem.imageUrl) {
      const newItemData: Partial<ClosetItem> = {
        category: newItem.category,
        subcategory: newItem.subcategory || undefined,
        color: newItem.color,
        pattern: newItem.pattern || undefined,
        brand: newItem.brand || undefined,
        size: newItem.size || undefined,
        imageUrl: newItem.imageUrl,
        tags: newItem.tags || []
      };

      if (editingItem) {
        // Update existing item
        const updatedItem = {
          ...user?.closet.find(item => item.id === editingItem),
          ...newItemData
        } as ClosetItem;

        // In a real implementation, this would update the item
        console.log('Updating item:', updatedItem);

        // Reset editing state
        setEditingItem(null);
      } else {
        // Create new item
        const item: ClosetItem = {
          id: `closet_${Date.now()}`,
          ...newItemData as any,
          dateAdded: new Date(),
          favorite: false
        };

        addToCloset(item);
      }

      // Reset the form and close the uploader
      setNewItem({
        category: '',
        subcategory: '',
        color: '',
        pattern: '',
        brand: '',
        size: '',
        tags: []
      });
      setShowUploader(false);
      setCurrentStep(AddItemStep.SELECT_TYPE);
    }
  }, [newItem, addToCloset, editingItem, user?.closet]);

  // Toggle favorite status of a closet item
  const handleToggleFavorite = useCallback((itemId: string, isFavorite: boolean) => {
    toggleItemFavorite(itemId, isFavorite);
  }, [toggleItemFavorite]);

  // Remove item from closet
  const handleRemoveItem = useCallback((itemId: string) => {
    if (window.confirm('Are you sure you want to remove this item from your closet?')) {
      removeFromCloset(itemId);
    }
  }, [removeFromCloset]);

  // Handle adding item to outfit
  const handleAddToOutfit = useCallback((item: ClosetItem) => {
    if (onAddToOutfit) {
      onAddToOutfit(item);
    }
  }, [onAddToOutfit]);

  // Render the current step of the add item flow
  const renderAddItemStep = () => {
    switch (currentStep) {
      case AddItemStep.SELECT_TYPE:
        return (
          <div className="stylist-my-closet__item-type-selector">
            <h3>Select Item Type</h3>
            <div className="stylist-my-closet__type-grid">
              {['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'].map(type => (
                <button
                  key={type}
                  className="stylist-my-closet__type-btn"
                  data-testid={`type-btn-${type}`}
                  onClick={() => handleSelectType(type)}
                >
                  <div className="stylist-my-closet__type-icon">{type.charAt(0).toUpperCase()}</div>
                  <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </button>
              ))}
            </div>
            <button
              className="stylist-my-closet__cancel-btn"
              onClick={() => {
                setShowUploader(false);
                setCurrentStep(AddItemStep.SELECT_TYPE);
              }}
            >
              Cancel
            </button>
          </div>
        );

      case AddItemStep.CHOOSE_COLOR:
        return (
          <div className="stylist-my-closet__color-selector">
            <h3>Choose Color</h3>
            <div className="stylist-my-closet__color-palette">
              {['black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange', 'brown', 'grey'].map(color => (
                <button
                  key={color}
                  className="stylist-my-closet__color-btn"
                  style={{ backgroundColor: color }}
                  onClick={() => handleSelectColor(color)}
                  aria-label={color}
                />
              ))}
            </div>
            <div className="stylist-my-closet__step-nav">
              <button
                className="stylist-my-closet__back-btn"
                onClick={() => setCurrentStep(AddItemStep.SELECT_TYPE)}
              >
                Back
              </button>
              <button
                className="stylist-my-closet__cancel-btn"
                onClick={() => {
                  setShowUploader(false);
                  setCurrentStep(AddItemStep.SELECT_TYPE);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case AddItemStep.SELECT_PATTERN:
        return (
          <div className="stylist-my-closet__pattern-selector">
            <h3>Select Pattern</h3>
            <div className="stylist-my-closet__pattern-grid">
              {['solid', 'striped', 'plaid', 'floral', 'polka-dot', 'check', 'geometric', 'animal-print'].map(pattern => (
                <button
                  key={pattern}
                  className="stylist-my-closet__pattern-btn"
                  onClick={() => handleSelectPattern(pattern)}
                >
                  <span>{pattern.charAt(0).toUpperCase() + pattern.slice(1)}</span>
                </button>
              ))}
            </div>
            <div className="stylist-my-closet__step-nav">
              <button
                className="stylist-my-closet__back-btn"
                onClick={() => setCurrentStep(AddItemStep.CHOOSE_COLOR)}
              >
                Back
              </button>
              <button
                className="stylist-my-closet__cancel-btn"
                onClick={() => {
                  setShowUploader(false);
                  setCurrentStep(AddItemStep.SELECT_TYPE);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case AddItemStep.UPLOAD_IMAGE:
        return (
          <div className="stylist-my-closet__image-uploader">
            <h3>Upload Image</h3>
            <ImageUploader
              onUpload={handleFileUpload}
              title="Upload Clothing Item"
              description="Take a photo or upload an image of your clothing item"
            />
            <div className="stylist-my-closet__step-nav">
              <button
                className="stylist-my-closet__back-btn"
                onClick={() => setCurrentStep(AddItemStep.SELECT_PATTERN)}
              >
                Back
              </button>
              <button
                className="stylist-my-closet__cancel-btn"
                onClick={() => {
                  setShowUploader(false);
                  setCurrentStep(AddItemStep.SELECT_TYPE);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        );

      case AddItemStep.CONFIRM_DETAILS:
        return (
          <div className="stylist-my-closet__new-item-form">
            <div className="stylist-my-closet__preview">
              <AdaptiveImage 
                src={newItem.imageUrl || ''} 
                alt="New item preview"
                loadingPriority="high" 
                quality="medium"
              />
            </div>

            <div className="stylist-my-closet__form-fields">
              <div className="stylist-my-closet__form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={newItem.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select category</option>
                  <option value="tops">Tops</option>
                  <option value="bottoms">Bottoms</option>
                  <option value="dresses">Dresses</option>
                  <option value="outerwear">Outerwear</option>
                  <option value="shoes">Shoes</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>

              <div className="stylist-my-closet__form-group">
                <label htmlFor="subcategory">Subcategory</label>
                <input
                  type="text"
                  id="subcategory"
                  name="subcategory"
                  value={newItem.subcategory || ''}
                  onChange={handleInputChange}
                  placeholder="E.g. T-shirt, Jeans, etc."
                />
              </div>

              <div className="stylist-my-closet__form-group">
                <label htmlFor="color">Color *</label>
                <input
                  type="text"
                  id="color"
                  name="color"
                  value={newItem.color}
                  onChange={handleInputChange}
                  required
                  placeholder="E.g. Blue, Black, etc."
                />
              </div>

              <div className="stylist-my-closet__form-group">
                <label htmlFor="pattern">Pattern</label>
                <input
                  type="text"
                  id="pattern"
                  name="pattern"
                  value={newItem.pattern || ''}
                  onChange={handleInputChange}
                  placeholder="E.g. Solid, Striped, etc."
                />
              </div>

              <div className="stylist-my-closet__form-group">
                <label htmlFor="brand">Brand</label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={newItem.brand || ''}
                  onChange={handleInputChange}
                  placeholder="E.g. Nike, Zara, etc."
                />
              </div>

              <div className="stylist-my-closet__form-group">
                <label htmlFor="size">Size</label>
                <input
                  type="text"
                  id="size"
                  name="size"
                  value={newItem.size || ''}
                  onChange={handleInputChange}
                  placeholder="E.g. S, M, L, 10, etc."
                />
              </div>

              <div className="stylist-my-closet__form-group">
                <label htmlFor="tags">Tags</label>
                <input
                  type="text"
                  id="tags"
                  onKeyDown={handleTagInput}
                  placeholder="Add tags (press Enter or comma to add)"
                />

                <div className="stylist-my-closet__tags">
                  {newItem.tags?.map(tag => (
                    <span key={tag} className="stylist-my-closet__tag">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="stylist-my-closet__tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="stylist-my-closet__form-actions">
                {currentStep > AddItemStep.SELECT_TYPE && (
                  <button
                    type="button"
                    className="stylist-my-closet__back-btn"
                    onClick={() => {
                      // Calculate previous step safely
                      const prevStep = (currentStep as number) - 1;
                      // Ensure it's a valid enum value
                      if (isAddItemStep(prevStep)) {
                        setCurrentStep(prevStep);
                      } else {
                        // Fallback to first step if not valid
                        setCurrentStep(AddItemStep.SELECT_TYPE);
                      }
                    }}
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="stylist-my-closet__cancel-btn"
                  onClick={() => {
                    setNewItem({
                      category: '',
                      subcategory: '',
                      color: '',
                      pattern: '',
                      brand: '',
                      size: '',
                      tags: []
                    });
                    setShowUploader(false);
                    setCurrentStep(AddItemStep.SELECT_TYPE);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="stylist-my-closet__save-btn"
                  onClick={saveNewItem}
                  disabled={!newItem.category || !newItem.color}
                >
                  {editingItem ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="stylist-my-closet" data-cy="my-closet-section">
      <div className="stylist-my-closet__header">
        <h2>My Wardrobe</h2>
        <div className="stylist-my-closet__actions">
          <div className="stylist-my-closet__import-export">
            <button
              className="stylist-my-closet__export-btn"
              onClick={exportClosetData}
              title="Export closet data"
            >
              Export
            </button>
            <label className="stylist-my-closet__import-btn">
              Import
              <input
                type="file"
                accept=".json"
                onChange={importClosetData}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <button
            className="stylist-my-closet__add-btn"
            id="openClosetUpload"
            onClick={() => {
              setShowUploader(true);
              setCurrentStep(AddItemStep.SELECT_TYPE);
              setEditingItem(null);
            }}
            data-cy="add-item-button"
          >
            Add Item
          </button>
        </div>
      </div>

      <div className="stylist-my-closet__view-selector">
        <button
          className={`stylist-my-closet__view-btn ${activeView === 'wishlist' ? 'active' : ''}`}
          onClick={() => setActiveView('wishlist')}
        >
          My Wishlist
        </button>
        <button
          className={`stylist-my-closet__view-btn ${activeView === 'closet' ? 'active' : ''}`}
          onClick={() => setActiveView('closet')}
        >
          My Closet
        </button>
      </div>

      {/* Only show categories when in closet view */}
      {activeView === 'closet' && (
        <div className="stylist-my-closet__filters">
          <div className="stylist-my-closet__categories">
            {categories.map(category => (
              <button
                key={category.id}
                className={`stylist-my-closet__category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="stylist-my-closet__filter-controls">
            <input
              type="text"
              placeholder="Filter by type..."
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="stylist-my-closet__filter-input"
            />
            <input
              type="text"
              placeholder="Filter by color..."
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              className="stylist-my-closet__filter-input"
            />
            <input
              type="text"
              placeholder="Filter by brand..."
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="stylist-my-closet__filter-input"
            />
          </div>
        </div>
      )}

      {showUploader ? (
        <div className="stylist-my-closet__uploader">
          <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
          {renderAddItemStep()}
        </div>
      ) : (
        <>
          {activeView === 'wishlist' ? (
            <div className="stylist-my-closet__wishlist-grid" data-cy="wishlist-section">
              {wishlistItems().length > 0 ? (
                wishlistItems().map((item, index) => (
                  <div
                    key={item.id}
                    className="stylist-my-closet__item"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={() => handleDragOver(index)}
                    onDrop={handleDrop}
                  >
                    <ItemCard
                      item={{
                        id: item.id,
                        name: item.name || 'Wishlist Item',
                        brand: '',
                        price: 0,
                        image: item.imageUrl || ''
                      }}
                      isClosetItem={true}
                      isFavorite={true}
                      onRemove={() => handleRemoveItem(item.id)}
                    />
                  </div>
                ))
              ) : (
                <div className="stylist-my-closet__empty" data-cy="empty-state-message">
                  <p>No items in your wishlist yet.</p>
                  <p>Items you like will appear here.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="stylist-my-closet__grid" data-cy="closet-grid">
              {filteredItems().length > 0 ? (
                filteredItems().map((item, index) => (
                  <div
                    key={item.id}
                    className="stylist-my-closet__item"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={() => handleDragOver(index)}
                    onDrop={handleDrop}
                  >
                    <ItemCard
                      item={{
                        id: item.id,
                        name: item.subcategory || item.category,
                        brand: item.brand || '',
                        price: 0, // Not applicable for closet items
                        image: item.imageUrl || ''
                      }}
                      isClosetItem={true}
                      onFavorite={(isFavorite) => handleToggleFavorite(item.id, isFavorite)}
                      isFavorite={item.favorite}
                      onRemove={() => handleRemoveItem(item.id)}
                      onClick={() => onSelectItem && onSelectItem(item)}
                    />
                    <div className="stylist-my-closet__item-actions">
                      <button
                        className="stylist-my-closet__edit-btn"
                        onClick={() => handleEditItem(item.id)}
                      >
                        Edit
                      </button>
                      {isBuilderMode && (
                        <button
                          className="stylist-my-closet__add-to-outfit-btn"
                          onClick={() => handleAddToOutfit(item)}
                        >
                          Add to Outfit
                        </button>
                      )}
                    </div>
                    <div className="stylist-my-closet__item-details">
                      <div className="stylist-my-closet__item-category">
                        {item.category}
                        {item.subcategory && ` • ${item.subcategory}`}
                      </div>
                      {item.color && (
                        <div className="stylist-my-closet__item-color">
                          <span
                            className="stylist-my-closet__color-swatch"
                            style={{ backgroundColor: item.color }}
                          ></span>
                          {item.color}
                          {item.pattern && ` (${item.pattern})`}
                        </div>
                      )}
                      {item.brand && (
                        <div className="stylist-my-closet__item-brand">{item.brand}</div>
                      )}
                      {item.size && (
                        <div className="stylist-my-closet__item-size">Size: {item.size}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="stylist-my-closet__empty">
                  <p>No items in your closet yet.</p>
                  <button
                    className="stylist-my-closet__add-first-btn"
                    onClick={() => {
                      setShowUploader(true);
                      setCurrentStep(AddItemStep.SELECT_TYPE);
                    }}
                  >
                    Add Your First Item
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyCloset;