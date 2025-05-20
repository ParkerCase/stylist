import React, { useState, useEffect } from 'react';
import './SocialProofArchive.scss';
import { ArchivedUpdate } from '@/services/social-proof/updateScheduler';

interface SocialProofArchiveProps {
  archivedUpdates: ArchivedUpdate[];
  onSelectWeek: (weekId: string) => void;
  onClose: () => void;
  isOpen: boolean;
  primaryColor?: string;
}

const SocialProofArchive: React.FC<SocialProofArchiveProps> = ({
  archivedUpdates,
  onSelectWeek,
  onClose,
  isOpen,
  primaryColor = '#000000'
}) => {
  const [groupedUpdates, setGroupedUpdates] = useState<{ [year: string]: ArchivedUpdate[] }>({});

  // Group updates by year
  useEffect(() => {
    const grouped: { [year: string]: ArchivedUpdate[] } = {};
    
    archivedUpdates.forEach(update => {
      const year = update.week.split('-')[0];
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(update);
    });
    
    // Sort updates within each year by week number (descending)
    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => {
        const weekA = parseInt(a.week.split('W')[1]);
        const weekB = parseInt(b.week.split('W')[1]);
        return weekB - weekA;
      });
    });
    
    setGroupedUpdates(grouped);
  }, [archivedUpdates]);

  if (!isOpen) return null;

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Convert week string to readable format
  const formatWeek = (weekString: string): string => {
    const [year, week] = weekString.split('-W');
    return `Week ${week}, ${year}`;
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get years in descending order
  const years = Object.keys(groupedUpdates).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div className="social-proof-archive-backdrop" onClick={handleBackdropClick}>
      <div className="social-proof-archive">
        <button 
          className="social-proof-archive__close-btn" 
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="social-proof-archive__header">
          <h2 className="social-proof-archive__title">Celebrity Style Archive</h2>
          <p className="social-proof-archive__subtitle">Browse previous weeks of celebrity inspiration</p>
        </div>

        <div className="social-proof-archive__content">
          {years.length > 0 ? (
            <div className="social-proof-archive__years">
              {years.map(year => (
                <div key={year} className="social-proof-archive__year-group">
                  <h3 className="social-proof-archive__year-title">{year}</h3>
                  <div className="social-proof-archive__weeks">
                    {groupedUpdates[year].map(update => (
                      <div 
                        key={update.id} 
                        className="social-proof-archive__week-item"
                        onClick={() => onSelectWeek(update.id)}
                      >
                        <div className="social-proof-archive__week-header">
                          <span className="social-proof-archive__week-name">
                            {formatWeek(update.week)}
                          </span>
                          <span className="social-proof-archive__week-date">
                            Published: {formatDate(update.publishedAt.toString())}
                          </span>
                        </div>
                        <div className="social-proof-archive__week-preview">
                          <span className="social-proof-archive__week-count">
                            {update.items.length} celebrities
                          </span>
                          <button 
                            className="social-proof-archive__view-btn"
                            style={{ backgroundColor: primaryColor }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectWeek(update.id);
                            }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="social-proof-archive__empty">
              <p>No archived celebrity looks available.</p>
              <p>Future updates will be archived here for reference.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialProofArchive;