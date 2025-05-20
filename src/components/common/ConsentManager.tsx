/**
 * Consent Manager Component
 * 
 * This component handles user consent for analytics, tracking, and personalization
 * in a GDPR, CCPA, and other privacy regulation compliant way.
 */

import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../../services/AnalyticsProvider';
import { ConsentCategory } from '../../utils/analyticsSystem';

// Styles
import './ConsentManager.scss';

interface ConsentManagerProps {
  onAccept?: () => void;
  onDecline?: () => void;
  showDetailedOptions?: boolean;
  position?: 'bottom' | 'top' | 'center';
  theme?: 'light' | 'dark';
}

const ConsentManager: React.FC<ConsentManagerProps> = ({
  onAccept,
  onDecline,
  showDetailedOptions = true,
  position = 'bottom',
  theme = 'light'
}) => {
  const { isConsentRequired, isConsented, updateConsentSettings } = useAnalytics();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consentSettings, setConsentSettings] = useState({
    [ConsentCategory.ESSENTIAL]: true, // Always required
    [ConsentCategory.FUNCTIONAL]: false,
    [ConsentCategory.ANALYTICS]: false,
    [ConsentCategory.TARGETING]: false,
    [ConsentCategory.SOCIAL]: false
  });

  // Show consent manager only if consent is required and not already given
  useEffect(() => {
    setIsVisible(isConsentRequired && !isConsented);
  }, [isConsentRequired, isConsented]);

  // Handle accept all
  const handleAcceptAll = () => {
    const settings = {
      [ConsentCategory.ESSENTIAL]: true,
      [ConsentCategory.FUNCTIONAL]: true,
      [ConsentCategory.ANALYTICS]: true,
      [ConsentCategory.TARGETING]: true,
      [ConsentCategory.SOCIAL]: true
    };
    
    updateConsentSettings(settings);
    setIsVisible(false);
    onAccept?.();
  };

  // Handle decline all (except essential)
  const handleDeclineAll = () => {
    const settings = {
      [ConsentCategory.ESSENTIAL]: true, // Always required
      [ConsentCategory.FUNCTIONAL]: false,
      [ConsentCategory.ANALYTICS]: false,
      [ConsentCategory.TARGETING]: false,
      [ConsentCategory.SOCIAL]: false
    };
    
    updateConsentSettings(settings);
    setIsVisible(false);
    onDecline?.();
  };

  // Handle save preferences
  const handleSavePreferences = () => {
    updateConsentSettings(consentSettings);
    setIsVisible(false);
    
    // Call appropriate callback based on analytics setting
    if (consentSettings[ConsentCategory.ANALYTICS]) {
      onAccept?.();
    } else {
      onDecline?.();
    }
  };

  // Handle toggle
  const handleToggle = (category: ConsentCategory) => {
    setConsentSettings(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Show privacy settings
  const handleShowPrivacySettings = () => {
    setShowDetails(true);
  };

  // Don't render if not needed
  if (!isVisible) {
    return null;
  }

  const containerClass = `consent-manager consent-manager--${position} consent-manager--${theme}`;

  return (
    <div className={containerClass}>
      <div className="consent-manager__container">
        {!showDetails ? (
          // Simple consent banner
          <>
            <div className="consent-manager__content">
              <h3 className="consent-manager__title">We value your privacy</h3>
              <p className="consent-manager__description">
                We use cookies and similar technologies to provide our services, understand how you use our app,
                and enhance your experience. By clicking "Accept All", you consent to the use of cookies as described
                in our Privacy Policy.
              </p>
            </div>
            <div className="consent-manager__actions">
              {showDetailedOptions && (
                <button 
                  className="consent-manager__button consent-manager__button--secondary"
                  onClick={handleShowPrivacySettings}
                >
                  Manage Preferences
                </button>
              )}
              <button 
                className="consent-manager__button consent-manager__button--decline"
                onClick={handleDeclineAll}
              >
                Decline All
              </button>
              <button 
                className="consent-manager__button consent-manager__button--accept"
                onClick={handleAcceptAll}
              >
                Accept All
              </button>
            </div>
          </>
        ) : (
          // Detailed preferences
          <>
            <div className="consent-manager__content">
              <h3 className="consent-manager__title">Privacy Preferences</h3>
              <p className="consent-manager__description">
                Please select which cookies you want to accept. Essential cookies cannot be disabled as they are 
                necessary for the app to function properly.
              </p>
              
              <div className="consent-manager__preferences">
                {/* Essential (always enabled) */}
                <div className="consent-manager__preference">
                  <div className="consent-manager__preference-header">
                    <h4 className="consent-manager__preference-title">Essential</h4>
                    <div className="consent-manager__toggle consent-manager__toggle--disabled">
                      <input 
                        type="checkbox" 
                        checked={true} 
                        disabled={true}
                        id="toggle-essential"
                        onChange={() => {}}
                      />
                      <label htmlFor="toggle-essential" className="consent-manager__toggle-label">
                        <span className="consent-manager__toggle-dot"></span>
                      </label>
                    </div>
                  </div>
                  <p className="consent-manager__preference-description">
                    These cookies are necessary for the app to function properly and cannot be disabled.
                  </p>
                </div>
                
                {/* Functional */}
                <div className="consent-manager__preference">
                  <div className="consent-manager__preference-header">
                    <h4 className="consent-manager__preference-title">Functional</h4>
                    <div className="consent-manager__toggle">
                      <input 
                        type="checkbox" 
                        checked={consentSettings[ConsentCategory.FUNCTIONAL]} 
                        id="toggle-functional"
                        onChange={() => handleToggle(ConsentCategory.FUNCTIONAL)}
                      />
                      <label htmlFor="toggle-functional" className="consent-manager__toggle-label">
                        <span className="consent-manager__toggle-dot"></span>
                      </label>
                    </div>
                  </div>
                  <p className="consent-manager__preference-description">
                    These cookies enable personalized features and functionality.
                  </p>
                </div>
                
                {/* Analytics */}
                <div className="consent-manager__preference">
                  <div className="consent-manager__preference-header">
                    <h4 className="consent-manager__preference-title">Analytics</h4>
                    <div className="consent-manager__toggle">
                      <input 
                        type="checkbox" 
                        checked={consentSettings[ConsentCategory.ANALYTICS]} 
                        id="toggle-analytics"
                        onChange={() => handleToggle(ConsentCategory.ANALYTICS)}
                      />
                      <label htmlFor="toggle-analytics" className="consent-manager__toggle-label">
                        <span className="consent-manager__toggle-dot"></span>
                      </label>
                    </div>
                  </div>
                  <p className="consent-manager__preference-description">
                    These cookies help us understand how you use our app, measuring traffic and performance.
                  </p>
                </div>
                
                {/* Targeting */}
                <div className="consent-manager__preference">
                  <div className="consent-manager__preference-header">
                    <h4 className="consent-manager__preference-title">Targeting</h4>
                    <div className="consent-manager__toggle">
                      <input 
                        type="checkbox" 
                        checked={consentSettings[ConsentCategory.TARGETING]} 
                        id="toggle-targeting"
                        onChange={() => handleToggle(ConsentCategory.TARGETING)}
                      />
                      <label htmlFor="toggle-targeting" className="consent-manager__toggle-label">
                        <span className="consent-manager__toggle-dot"></span>
                      </label>
                    </div>
                  </div>
                  <p className="consent-manager__preference-description">
                    These cookies are used to deliver relevant content based on your interests.
                  </p>
                </div>
                
                {/* Social */}
                <div className="consent-manager__preference">
                  <div className="consent-manager__preference-header">
                    <h4 className="consent-manager__preference-title">Social</h4>
                    <div className="consent-manager__toggle">
                      <input 
                        type="checkbox" 
                        checked={consentSettings[ConsentCategory.SOCIAL]} 
                        id="toggle-social"
                        onChange={() => handleToggle(ConsentCategory.SOCIAL)}
                      />
                      <label htmlFor="toggle-social" className="consent-manager__toggle-label">
                        <span className="consent-manager__toggle-dot"></span>
                      </label>
                    </div>
                  </div>
                  <p className="consent-manager__preference-description">
                    These cookies enable social sharing features and user content from social media platforms.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="consent-manager__actions">
              <button 
                className="consent-manager__button consent-manager__button--secondary"
                onClick={() => setShowDetails(false)}
              >
                Back
              </button>
              <button 
                className="consent-manager__button consent-manager__button--decline"
                onClick={handleDeclineAll}
              >
                Decline All
              </button>
              <button 
                className="consent-manager__button consent-manager__button--save"
                onClick={handleSavePreferences}
              >
                Save Preferences
              </button>
            </div>
          </>
        )}
        
        <div className="consent-manager__footer">
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          <span className="consent-manager__separator">•</span>
          <a href="/terms-of-service" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConsentManager;