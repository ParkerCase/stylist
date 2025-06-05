import React from 'react';
import HomeButton from '../HomeButton/HomeButton';
import './TabNavigation.scss';

export type TabId = 'chat' | 'trending' | 'tryOn' | 'myCloset' | 'socialProof' | 'styleQuiz' | 'lookbook' | 'recommendations';

export interface Tab {
  id: TabId;
  label: string;
  icon?: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  primaryColor?: string;
}

const allTabs: Tab[] = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'trending', label: 'Trending Items', icon: 'trending' },
  { id: 'tryOn', label: 'Virtual Try-On', icon: 'tryon' },
  { id: 'myCloset', label: 'My Closet', icon: 'closet' },
  { id: 'socialProof', label: 'Social Proof', icon: 'star' },
  { id: 'styleQuiz', label: 'Style Quiz', icon: 'quiz' },
];

const TabNavigation: React.FC<TabNavigationProps & { dataCyPrefix?: string }> = ({
  activeTab,
  onTabChange,
  primaryColor = '#4361ee',
  dataCyPrefix = 'nav-tab-'
}) => {
  return (
    <div className="stylist-tab-navigation" style={{ '--tab-primary-color': primaryColor } as React.CSSProperties}>
      <div data-testid="home-button" style={{ position: 'fixed', top: 0 }}>
        <HomeButton onClick={() => onTabChange('trending')} />
      </div>
      {allTabs.map(tab => (
        <button
          key={tab.id}
          className={`stylist-tab ${activeTab === tab.id ? 'stylist-tab--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          title={tab.label}
          data-cy={`${dataCyPrefix}${tab.id}`}
        >
          {tab.icon && (
            <span className="stylist-tab__icon">
              {/* SVGs for each tab */}
              {tab.icon === 'chat' && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              )}
              {tab.icon === 'trending' && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
              )}
              {tab.icon === 'tryon' && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21h13a2 2 0 0 0 2-2v-2a7 7 0 0 0-14 0v2a2 2 0 0 0 2 2z"/></svg>
              )}
              {tab.icon === 'closet' && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>
              )}
              {tab.icon === 'star' && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15 8.5 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.5 12 2"/></svg>
              )}
              {tab.icon === 'quiz' && (
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><circle cx="12" cy="8" r="1"/></svg>
              )}
            </span>
          )}
          <span className="stylist-tab__label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;