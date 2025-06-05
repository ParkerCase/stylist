import React, { useState } from 'react';
import './CelebrityGrid.scss';

interface Celebrity {
  id: string;
  name: string;
  imageUrl: string;
  latestLook: string;
  event: string;
  description: string;
  timestamp: string;
  tags: string[];
}

interface CelebrityGridProps {
  celebrities: Celebrity[];
  onCelebrityClick: (celebrity: Celebrity) => void;
  primaryColor?: string;
  title?: string;
  subtitle?: string;
  lastUpdated?: string;
}

const CelebrityGrid: React.FC<CelebrityGridProps> = ({
  celebrities,
  onCelebrityClick,
  primaryColor = '#000000',
  title = 'Celebrity Style Inspiration',
  subtitle = 'Shop your favorite celebrity looks',
  lastUpdated
}) => {
  const [hoveredCelebrity, setHoveredCelebrity] = useState<string | null>(null);

  // Handle celebrity card hover
  const handleMouseEnter = (celebrityId: string) => {
    setHoveredCelebrity(celebrityId);
  };

  const handleMouseLeave = () => {
    setHoveredCelebrity(null);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="celebrity-grid" data-cy="celebrity-grid">
      <div className="celebrity-grid__header" style={{ borderColor: primaryColor }}>
        <h2 className="celebrity-grid__title">{title}</h2>
        <p className="celebrity-grid__subtitle">{subtitle}</p>
        {lastUpdated && (
          <div className="celebrity-grid__updated">
            <span className="celebrity-grid__updated-label">Last Updated:</span>
            <span className="celebrity-grid__updated-date">{formatDate(lastUpdated)}</span>
          </div>
        )}
      </div>

      <div className="celebrity-grid__content">
        {celebrities.length > 0 ? (
          <div className="celebrity-grid__grid">
            {celebrities.map((celebrity) => (
              <div
                key={celebrity.id}
                className={`celebrity-grid__item ${hoveredCelebrity === celebrity.id ? 'celebrity-grid__item--hovered' : ''}`}
                onMouseEnter={() => handleMouseEnter(celebrity.id)}
                onMouseLeave={handleMouseLeave}
                onClick={() => onCelebrityClick(celebrity)}
                data-cy="celebrity-card"
              >
                <div className="celebrity-grid__image-container">
                  <img 
                    src={celebrity.imageUrl} 
                    alt={`${celebrity.name} wearing ${celebrity.latestLook}`} 
                    className="celebrity-grid__image"
                  />
                  <div className="celebrity-grid__overlay" style={{ backgroundColor: `${primaryColor}99` }}>
                    <div className="celebrity-grid__details">
                      <span className="celebrity-grid__event">{celebrity.event}</span>
                      <p className="celebrity-grid__description">{celebrity.description}</p>
                      <div className="celebrity-grid__tags">
                        {celebrity.tags.slice(0, 3).map((tag, index) => (
                          <span 
                            key={index} 
                            className="celebrity-grid__tag"
                            style={{ borderColor: primaryColor }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button 
                        className="celebrity-grid__view-button"
                        style={{ backgroundColor: primaryColor }}
                      >
                        View Look
                      </button>
                    </div>
                  </div>
                </div>
                <div className="celebrity-grid__caption">
                  <h3 className="celebrity-grid__name">{celebrity.name}</h3>
                  <p className="celebrity-grid__look">{celebrity.latestLook}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="celebrity-grid__empty">
            <p>No celebrity looks available at the moment.</p>
            <p>Check back soon for the latest style inspiration!</p>
          </div>
        )}
      </div>

      <div className="celebrity-grid__archive">
        <button 
          className="celebrity-grid__archive-button"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          View Previous Weeks
        </button>
      </div>
    </div>
  );
};

export default CelebrityGrid;