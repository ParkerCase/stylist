import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { SizePreference, StylePreference, UserProfile as UserProfileType } from '../../types/user';
import { ApiClient } from '../../api/apiClient';
import './UserProfile.scss';

interface UserProfileProps {
  apiClient: ApiClient;
  onClose?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ apiClient, onClose }) => {
  const user = useUserStore(state => state.user);
  const updateUser = useUserStore(state => state.updateUser);
  
  const [name, setName] = useState(user?.name || '');
  const [sizePreferences, setSizePreferences] = useState<SizePreference[]>(
    user?.preferences.sizePreferences || []
  );
  const [stylePreferences, setStylePreferences] = useState<StylePreference[]>(
    user?.preferences.stylePreferences || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSizePreferences(user.preferences.sizePreferences || []);
      setStylePreferences(user.preferences.stylePreferences || []);
    }
  }, [user]);
  
  // Size categories
  const sizeCategories = [
    { id: 'tops', label: 'Tops' },
    { id: 'bottoms', label: 'Bottoms' },
    { id: 'shoes', label: 'Shoes' }
  ];
  
  // Style options
  const styleOptions = [
    { id: 'casual', label: 'Casual' },
    { id: 'formal', label: 'Formal' },
    { id: 'business', label: 'Business' },
    { id: 'streetwear', label: 'Streetwear' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'minimalist', label: 'Minimalist' },
    { id: 'bohemian', label: 'Bohemian' }
  ];
  
  // Update size preference
  const updateSizePreference = (category: string, size: string) => {
    const updatedSizes = [...sizePreferences];
    const existingIndex = updatedSizes.findIndex(sp => sp.category === category);
    
    if (existingIndex >= 0) {
      updatedSizes[existingIndex].size = size;
    } else {
      updatedSizes.push({ category, size });
    }
    
    setSizePreferences(updatedSizes);
  };
  
  // Toggle style preference
  const toggleStylePreference = (style: string) => {
    const updatedStyles = [...stylePreferences];
    const existingIndex = updatedStyles.findIndex(sp => sp.style === style);
    
    if (existingIndex >= 0) {
      // Remove if already selected
      updatedStyles.splice(existingIndex, 1);
    } else {
      // Add with default weight
      updatedStyles.push({ style, weight: 0.8 });
    }
    
    setStylePreferences(updatedStyles);
  };
  
  // Get size for a category
  const getSizeForCategory = (category: string): string => {
    const preference = sizePreferences.find(sp => sp.category === category);
    return preference?.size || '';
  };
  
  // Check if style is selected
  const isStyleSelected = (style: string): boolean => {
    return stylePreferences.some(sp => sp.style === style);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    
    try {
      if (!user) {
        throw new Error('User not logged in');
      }
      
      // Create updated profile data
      const profileData = {
        name,
        preferences: {
          sizePreferences,
          stylePreferences,
        }
      };
      
      // Update profile on server
      await apiClient.put(`/api/v1/users/me`, profileData);
      
      // Update local store
      updateUser({
        ...user,
        name,
        preferences: {
          ...user.preferences,
          sizePreferences,
          stylePreferences
        }
      });
      
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!user) {
    return (
      <div className="user-profile">
        <h2>User Profile</h2>
        <p>Please log in to view your profile</p>
      </div>
    );
  }
  
  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>My Profile</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        )}
      </div>
      
      {error && <div className="profile-error">{error}</div>}
      {success && <div className="profile-success">Profile updated successfully!</div>}
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-section">
          <h3>Personal Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="Your name"
            />
          </div>
          
          <div className="form-group disabled">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={user.email || 'Anonymous User'}
              disabled={true}
              readOnly
            />
            <small>Email cannot be changed</small>
          </div>
        </div>
        
        <div className="form-section">
          <h3>Size Preferences</h3>
          
          {sizeCategories.map(category => (
            <div className="form-group" key={category.id}>
              <label htmlFor={`size-${category.id}`}>{category.label}</label>
              <input
                type="text"
                id={`size-${category.id}`}
                value={getSizeForCategory(category.id)}
                onChange={(e) => updateSizePreference(category.id, e.target.value)}
                disabled={isLoading}
                placeholder={`Your ${category.label.toLowerCase()} size`}
              />
            </div>
          ))}
        </div>
        
        <div className="form-section">
          <h3>Style Preferences</h3>
          <p className="hint-text">Select all styles that interest you</p>
          
          <div className="style-options">
            {styleOptions.map(style => (
              <div 
                key={style.id}
                className={`style-option ${isStyleSelected(style.id) ? 'selected' : ''}`}
                onClick={() => toggleStylePreference(style.id)}
              >
                {style.label}
              </div>
            ))}
          </div>
        </div>
        
        <button 
          type="submit" 
          className="save-button"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default UserProfile;