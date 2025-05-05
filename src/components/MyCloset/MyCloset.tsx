// MyCloset component for displaying and managing user's clothing items

import React, { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@/store/userStore';
import { ClosetItem } from '@/types';
import ImageUploader from '../ImageUploader/ImageUploader';
import ItemCard from '../ItemCard/ItemCard';
import useSyncedStore from '@/hooks/useSyncedStore';
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

const MyCloset: React.FC<MyClosetProps> = ({ 
  onSelectItem, 
  onAddToOutfit,
  isBuilderMode = false
}) => {
  const { user } = useUserStore();
  const { addToCloset, removeFromCloset, toggleItemFavorite } = useSyncedStore();
  
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<ClothingCategory[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [newItem, setNewItem] = useState<Partial<ClosetItem>>({
    category: '',
    subcategory: '',
    color: '',
    brand: '',
    size: '',
    tags: []
  });

  // Filter closet items based on selected category
  const filteredItems = useCallback(() => {
    if (!user?.closet) return [];
    
    if (selectedCategory === 'all') {
      return user.closet;
    } else if (selectedCategory === 'favorites') {
      return user.closet.filter(item => item.favorite);
    } else {
      return user.closet.filter(item => item.category === selectedCategory);
    }
  }, [user?.closet, selectedCategory]);
  
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

  // Handle file upload for new closet item
  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    
    try {
      // Create URL for the image file
      const imageUrl = URL.createObjectURL(file);
      
      // Set the image URL in the new item data
      setNewItem(prev => ({ ...prev, imageUrl }));
      
      // Automatically detect category, color, etc. here
      // For now, we'll use a mock detection service
      await detectClothingAttributes(file);
      
      // Show the form to complete item details - don't hide uploader
      // The form will be shown within the uploader area
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Mock function to detect clothing attributes
  const detectClothingAttributes = async (file: File) => {
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

  // Save the new item to the user's closet
  const saveNewItem = useCallback(() => {
    if (newItem.category && newItem.color && newItem.imageUrl) {
      const item: ClosetItem = {
        id: `closet_${Date.now()}`,
        category: newItem.category,
        subcategory: newItem.subcategory || undefined,
        color: newItem.color,
        brand: newItem.brand || undefined,
        size: newItem.size || undefined,
        imageUrl: newItem.imageUrl,
        dateAdded: new Date(),
        favorite: false,
        tags: newItem.tags || []
      };
      
      addToCloset(item);
      
      // Reset the form
      setNewItem({
        category: '',
        subcategory: '',
        color: '',
        brand: '',
        size: '',
        tags: []
      });
    }
  }, [newItem, addToCloset]);

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

  return (
    <div className="stylist-my-closet">
      <div className="stylist-my-closet__header">
        <h2>My Closet</h2>
        <button 
          className="stylist-my-closet__add-btn"
          id="openClosetUpload"
          onClick={() => setShowUploader(true)}
        >
          Add Item
        </button>
      </div>
      
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
      
      {showUploader ? (
        <div className="stylist-my-closet__uploader">
          <h3>Add New Item</h3>
          {!newItem.imageUrl ? (
            <ImageUploader
              onUpload={handleFileUpload}
              title="Upload Clothing Item"
              description="Take a photo or upload an image of your clothing item"
            />
          ) : (
            <div className="stylist-my-closet__new-item-form">
              <div className="stylist-my-closet__preview">
                <img src={newItem.imageUrl} alt="New item preview" />
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
                  <button
                    type="button"
                    className="stylist-my-closet__cancel-btn"
                    onClick={() => {
                      setNewItem({
                        category: '',
                        subcategory: '',
                        color: '',
                        brand: '',
                        size: '',
                        tags: []
                      });
                      setShowUploader(false);
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
                    Save Item
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="stylist-my-closet__grid">
          {filteredItems().length > 0 ? (
            filteredItems().map(item => (
              <div key={item.id} className="stylist-my-closet__item">
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
                {isBuilderMode && (
                  <button 
                    className="stylist-my-closet__add-to-outfit-btn"
                    onClick={() => handleAddToOutfit(item)}
                  >
                    Add to Outfit
                  </button>
                )}
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
                onClick={() => setShowUploader(true)}
              >
                Add Your First Item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyCloset;