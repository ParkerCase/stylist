import React from 'react';
import './CategorySelector.scss';

export interface Category {
  id: string;
  name: string;
}

interface CategorySelectorProps {
  categories: Category[];
  selectedCategory: string;
  onChange: (categoryId: string) => void;
  includeAll?: boolean;
  label?: string;
  primaryColor?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onChange,
  includeAll = true,
  label = 'Category',
  primaryColor
}) => {
  // Custom style for dropdown focus state
  const focusStyle = primaryColor ? { '--stylist-focus-color': primaryColor } : undefined;
  
  return (
    <div className="stylist-category-selector" style={focusStyle as React.CSSProperties}>
      {label && (
        <label className="stylist-category-selector__label">{label}</label>
      )}
      <select
        className="stylist-category-selector__select"
        value={selectedCategory}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        {includeAll && (
          <option value="all">All Categories</option>
        )}
        {categories.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <div className="stylist-category-selector__arrow">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </div>
    </div>
  );
};

export default CategorySelector;