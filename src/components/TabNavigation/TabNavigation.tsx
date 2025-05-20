import React from 'react';
import './TabNavigation.scss';

export type TabId = 'chat' | 'lookbook' | 'myCloset' | 'tryOn' | 'social' | 'trending' | 'recommendations';

export interface Tab {
  id: TabId;
  label: string;
  icon?: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  primaryColor?: string;
  // Which features to enable - all enabled by default
  enabledFeatures?: {
    chat?: boolean;
    recommendations?: boolean;
    lookbook?: boolean;
    myCloset?: boolean;
    tryOn?: boolean;
    social?: boolean;
    trending?: boolean;
  };
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  primaryColor = '#4361ee',
  enabledFeatures = {}
}) => {
  // Default all features to enabled unless explicitly disabled
  const {
    chat = true,
    lookbook = true,
    myCloset = true,
    tryOn = true,
    social = true,
    trending = true
  } = enabledFeatures;

  // Define all available tabs
  const allTabs: Tab[] = [
    { id: 'chat', label: 'Chat' },
    { id: 'lookbook', label: 'Lookbook' },
    { id: 'myCloset', label: 'My Closet' },
    { id: 'tryOn', label: 'Try On' },
    { id: 'social', label: 'Celebrity' },
    { id: 'trending', label: 'Trending' }
  ];

  // Filter tabs based on enabled features
  const tabs = allTabs.filter(tab => {
    switch (tab.id) {
      case 'chat': return chat;
      case 'lookbook': return lookbook;
      case 'myCloset': return myCloset;
      case 'tryOn': return tryOn;
      case 'social': return social;
      case 'trending': return trending;
      default: return true;
    }
  });

  return (
    <div className="stylist-tab-navigation" style={{ '--tab-primary-color': primaryColor } as React.CSSProperties}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`stylist-tab ${activeTab === tab.id ? 'stylist-tab--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          title={tab.label}
        >
          {tab.icon && <span className="stylist-tab__icon">{tab.icon}</span>}
          <span className="stylist-tab__label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;