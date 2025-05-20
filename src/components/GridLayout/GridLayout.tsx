import React from 'react';
import './GridLayout.scss';

export type GridSize = '2x5' | '2x50' | '2xn';

interface GridLayoutProps {
  items: React.ReactNode[];
  size: GridSize;
  title?: string;
  categoryDropdown?: React.ReactNode;
  showRequestedSection?: boolean;
  requestedItems?: React.ReactNode[];
  className?: string;
}

const GridLayout: React.FC<GridLayoutProps> = ({
  items,
  size,
  title,
  categoryDropdown,
  showRequestedSection = false,
  requestedItems = [],
  className = ''
}) => {
  const getGridClassName = () => {
    switch (size) {
      case '2x5':
        return 'stylist-grid-layout--2x5';
      case '2x50':
        return 'stylist-grid-layout--2x50';
      case '2xn':
      default:
        return 'stylist-grid-layout--2xn';
    }
  };

  return (
    <div className={`stylist-grid-layout ${getGridClassName()} ${className}`}>
      {(title || categoryDropdown) && (
        <div className="stylist-grid-layout__header">
          {title && <h2 className="stylist-grid-layout__title">{title}</h2>}
          {categoryDropdown && (
            <div className="stylist-grid-layout__category">
              {categoryDropdown}
            </div>
          )}
        </div>
      )}

      {showRequestedSection && requestedItems.length > 0 && (
        <div className="stylist-grid-layout__section">
          <h3 className="stylist-grid-layout__section-title">Requested Items</h3>
          <div className="stylist-grid-layout__requested-grid">
            {requestedItems.map((item, index) => (
              <div key={`requested-${index}`} className="stylist-grid-layout__item">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stylist-grid-layout__grid">
        {items.map((item, index) => (
          <div key={`item-${index}`} className="stylist-grid-layout__item">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridLayout;