import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TabNavigation, { TabId } from './TabNavigation';

const TABS = [
  'Trending Items',
  'Virtual Try-On',
  'My Closet',
  'Social Proof',
  'Style Quiz',
];

const TAB_IDS: TabId[] = [
  'trending',
  'tryOn',
  'myCloset',
  'socialProof',
  'styleQuiz',
];

describe('Main Interface Layout (Fashion-ai-specs.md compliance)', () => {
  it('renders all 5 main tabs with correct labels', () => {
    const { getByText } = render(
      <TabNavigation activeTab={'trending'} onTabChange={() => {}} />
    );
    TABS.forEach(tab => {
      expect(getByText(tab)).toBeInTheDocument();
    });
  });

  it('tab navigation works between all sections', () => {
    let activeTab: TabId = 'trending';
    const setActiveTab = (tab: TabId) => { activeTab = tab; };
    const { getByText, rerender, queryAllByRole } = render(
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    );
    TABS.forEach((tab, idx) => {
      fireEvent.click(getByText(tab));
      rerender(<TabNavigation activeTab={TAB_IDS[idx]} onTabChange={setActiveTab} />);
      // Find the button with the correct label
      const buttons = queryAllByRole('button');
      const button = buttons.find(btn => btn.textContent?.includes(tab));
      expect(button).toHaveClass('stylist-tab--active');
    });
  });

  it('Home button appears fixed at top of all views', () => {
    const { getByTestId } = render(
      <TabNavigation activeTab={'trending'} onTabChange={() => {}} />
    );
    const homeButton = getByTestId('home-button');
    expect(homeButton).toBeInTheDocument();
    expect(homeButton).toHaveStyle('position: fixed');
    expect(homeButton).toHaveStyle('top: 0');
  });
}); 