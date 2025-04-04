// src/components/UserPreferences/UserPreferences.tsx
import React, { useState } from 'react';
import './UserPreferences.scss';
import { UserPreferences as UserPrefsType } from '@/types/index';

interface UserPreferencesProps {
  preferences: UserPrefsType;
  onUpdate: (preferences: Partial<UserPrefsType>) => void;
  onClose: () => void;
}

const UserPreferences: React.FC<UserPreferencesProps> = ({
  preferences,
  onUpdate,
  onClose
}) => {
  const [stylePrefs, setStylePrefs] = useState(preferences.stylePreferences);
  const [colorPrefs, setColorPrefs] = useState(preferences.colorPreferences);
  const [sizePrefs, setSizePrefs] = useState(preferences.sizePreferences);
  const [excludedCategories, setExcludedCategories] = useState(preferences.excludedCategories || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onUpdate({
      stylePreferences: stylePrefs,
      colorPreferences: colorPrefs,
      sizePreferences: sizePrefs,
      excludedCategories
    });
    
    onClose();
  };

  const toggleExcludedCategory = (category: string) => {
    if (excludedCategories.includes(category)) {
      setExcludedCategories(excludedCategories.filter(c => c !== category));
    } else {
      setExcludedCategories([...excludedCategories, category]);
    }
  };
  
  return (
    <div className="stylist-user-preferences">
      <div className="stylist-user-preferences__header">
        <h3 className="stylist-user-preferences__title">Your Style Preferences</h3>
        <button className="stylist-user-preferences__close-btn" onClick={onClose}>×</button>
      </div>
      
      <form className="stylist-user-preferences__form" onSubmit={handleSubmit}>
        <div className="stylist-user-preferences__section">
          <h4 className="stylist-user-preferences__section-title">Style Preferences</h4>
          
          <div className="stylist-user-preferences__styles">
            {['Classic', 'Casual', 'Minimalist', 'Trendy', 'Bohemian', 'Sporty', 'Vintage', 'Glamorous'].map(style => {
              const existingPref = stylePrefs.find(p => p.style === style);
              const weight = existingPref ? existingPref.weight : 0;
              
              return (
                <div key={style} className="stylist-user-preferences__style-item">
                  <label className="stylist-user-preferences__style-label">
                    {style}
                    <span className="stylist-user-preferences__style-value">
                      {Math.round(weight * 100)}%
                    </span>
                  </label>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={weight}
                    onChange={(e) => {
                      const newWeight = parseFloat(e.target.value);
                      const newPrefs = stylePrefs.filter(p => p.style !== style);
                      if (newWeight > 0) {
                        newPrefs.push({ style, weight: newWeight });
                      }
                      setStylePrefs(newPrefs);
                    }}
                    className="stylist-user-preferences__style-slider"
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="stylist-user-preferences__section">
          <h4 className="stylist-user-preferences__section-title">Color Preferences</h4>
          
          <div className="stylist-user-preferences__colors">
            {['Black', 'White', 'Gray', 'Navy', 'Blue', 'Red', 'Green', 'Yellow', 'Purple', 'Pink', 'Brown', 'Beige'].map(color => {
              const existingPref = colorPrefs.find(p => p.color === color);
              const weight = existingPref ? existingPref.weight : 0;
              
              return (
                <div key={color} className="stylist-user-preferences__color-item">
                  <div 
                    className="stylist-user-preferences__color-swatch"
                    style={{ backgroundColor: color.toLowerCase() }}
                  />
                  <label className="stylist-user-preferences__color-label">
                    {color}
                  </label>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={weight}
                    onChange={(e) => {
                      const newWeight = parseFloat(e.target.value);
                      const newPrefs = colorPrefs.filter(p => p.color !== color);
                      if (newWeight > 0) {
                        newPrefs.push({ color, weight: newWeight });
                      }
                      setColorPrefs(newPrefs);
                    }}
                    className="stylist-user-preferences__color-slider"
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="stylist-user-preferences__section">
          <h4 className="stylist-user-preferences__section-title">Size Preferences</h4>
          
          <div className="stylist-user-preferences__sizes">
            <div className="stylist-user-preferences__size-category">
              <label className="stylist-user-preferences__size-label">Tops</label>
              <select 
                className="stylist-user-preferences__size-select"
                value={sizePrefs.find(p => p.category === 'tops')?.size || ''}
                onChange={(e) => {
                  const size = e.target.value;
                  const newPrefs = sizePrefs.filter(p => p.category !== 'tops');
                  if (size) {
                    newPrefs.push({ category: 'tops', size });
                  }
                  setSizePrefs(newPrefs);
                }}
              >
                <option value="">Select size</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            </div>
            
            <div className="stylist-user-preferences__size-category">
              <label className="stylist-user-preferences__size-label">Bottoms</label>
              <select 
                className="stylist-user-preferences__size-select"
                value={sizePrefs.find(p => p.category === 'bottoms')?.size || ''}
                onChange={(e) => {
                  const size = e.target.value;
                  const newPrefs = sizePrefs.filter(p => p.category !== 'bottoms');
                  if (size) {
                    newPrefs.push({ category: 'bottoms', size });
                  }
                  setSizePrefs(newPrefs);
                }}
              >
                <option value="">Select size</option>
                <option value="28">28</option>
                <option value="30">30</option>
                <option value="32">32</option>
                <option value="34">34</option>
                <option value="36">36</option>
                <option value="38">38</option>
              </select>
            </div>
            
            <div className="stylist-user-preferences__size-category">
              <label className="stylist-user-preferences__size-label">Shoes</label>
              <select 
                className="stylist-user-preferences__size-select"
                value={sizePrefs.find(p => p.category === 'shoes')?.size || ''}
                onChange={(e) => {
                  const size = e.target.value;
                  const newPrefs = sizePrefs.filter(p => p.category !== 'shoes');
                  if (size) {
                    newPrefs.push({ category: 'shoes', size });
                  }
                  setSizePrefs(newPrefs);
                }}
              >
                <option value="">Select size</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="stylist-user-preferences__section">
          <h4 className="stylist-user-preferences__section-title">Excluded Categories</h4>
          <p className="stylist-user-preferences__section-desc">
            Select categories you don&apos;t want to see in recommendations
          </p>
          
          <div className="stylist-user-preferences__categories">
            {['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'].map(category => (
              <label key={category} className="stylist-user-preferences__category-item">
                <input 
                  type="checkbox"
                  checked={excludedCategories.includes(category.toLowerCase())}
                  onChange={() => toggleExcludedCategory(category.toLowerCase())}
                  className="stylist-user-preferences__category-checkbox"
                />
                {category}
              </label>
            ))}
          </div>
        </div>
        
        <div className="stylist-user-preferences__actions">
          <button 
            type="button" 
            className="stylist-user-preferences__cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="stylist-user-preferences__save-btn"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserPreferences;