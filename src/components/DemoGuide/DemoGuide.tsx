// src/components/DemoGuide/DemoGuide.tsx

import React, { useState } from 'react';
import './DemoGuide.scss';
import { demoFlows, DemoFlow } from '../../utils/demoFlows';
import { getDebugMode } from '../../utils/debugMode';

interface DemoGuideProps {
  flowId?: keyof typeof demoFlows;
  onClose?: () => void;
  position?: 'left' | 'right' | 'bottom';
  showControls?: boolean;
}

/**
 * DemoGuide Component
 * 
 * Provides an interactive walkthrough of demo scenarios for presenters.
 * Guides the user through each step of the selected demo flow with
 * instructions, expected outcomes, and helpful tips.
 */
const DemoGuide: React.FC<DemoGuideProps> = ({
  flowId = 'newUser',
  onClose,
  position = 'right',
  showControls = true
}) => {
  // All hooks must be called before any return
  const [selectedFlow, setSelectedFlow] = useState<DemoFlow>(demoFlows[flowId]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  // Only render if debug mode or showControls is true, and isVisible
  const shouldRender = (getDebugMode() || showControls) && isVisible;

  // Current step
  const currentStep = selectedFlow.steps[currentStepIndex];

  // Navigate between steps
  const goToNextStep = () => {
    if (currentStepIndex < selectedFlow.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Handle flow selection
  const handleFlowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFlowId = e.target.value as keyof typeof demoFlows;
    setSelectedFlow(demoFlows[newFlowId]);
    setCurrentStepIndex(0);
  };

  // Toggle minimized state
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Handle close
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!shouldRender) return null;

  return (
    <div className={`stylist-demo-guide stylist-demo-guide--${position} ${isMinimized ? 'stylist-demo-guide--minimized' : ''}`}>
      <div className="stylist-demo-guide__header">
        <div className="stylist-demo-guide__header-title">
          {isMinimized ? 'Demo Guide' : selectedFlow.name}
        </div>
        <div className="stylist-demo-guide__header-controls">
          <button 
            className="stylist-demo-guide__control-btn" 
            onClick={toggleMinimize}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path 
                  fill="currentColor" 
                  d="M19 13h-14v-2h14v2z" 
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path 
                  fill="currentColor" 
                  d="M19 13H5v-2h14v2z" 
                />
              </svg>
            )}
          </button>
          {onClose && (
            <button 
              className="stylist-demo-guide__control-btn" 
              onClick={handleClose}
              title="Close"
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path 
                  fill="currentColor" 
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" 
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {showControls && (
            <div className="stylist-demo-guide__flow-selector">
              <label htmlFor="demo-flow-select">Demo Flow:</label>
              <select 
                id="demo-flow-select" 
                value={flowId}
                onChange={handleFlowChange}
              >
                {Object.entries(demoFlows).map(([id, flow]) => (
                  <option key={id} value={id}>
                    {flow.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="stylist-demo-guide__content">
            <div className="stylist-demo-guide__progress">
              <div className="stylist-demo-guide__progress-text">
                Step {currentStepIndex + 1} of {selectedFlow.steps.length}
              </div>
              <div className="stylist-demo-guide__progress-bar">
                <div 
                  className="stylist-demo-guide__progress-indicator"
                  style={{ width: `${((currentStepIndex + 1) / selectedFlow.steps.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="stylist-demo-guide__step">
              <h3 className="stylist-demo-guide__step-title">
                {currentStep.title}
              </h3>
              <p className="stylist-demo-guide__step-description">
                {currentStep.description}
              </p>

              <div className="stylist-demo-guide__step-action">
                <h4>Action:</h4>
                <p>{currentStep.action}</p>
              </div>

              <div className="stylist-demo-guide__step-outcome">
                <h4>Expected Outcome:</h4>
                <p>{currentStep.expectedOutcome}</p>
              </div>

              {currentStep.tips && (
                <div className="stylist-demo-guide__step-tips">
                  <h4>Tips:</h4>
                  <p>{currentStep.tips}</p>
                </div>
              )}

              {currentStep.fallbackAction && (
                <div className="stylist-demo-guide__step-fallback">
                  <h4>If that doesn't work:</h4>
                  <p>{currentStep.fallbackAction}</p>
                </div>
              )}
            </div>

            <div className="stylist-demo-guide__navigation">
              <button
                className="stylist-demo-guide__nav-btn"
                onClick={goToPreviousStep}
                disabled={currentStepIndex === 0}
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path 
                    fill="currentColor" 
                    d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z" 
                  />
                </svg>
                Previous
              </button>
              <button
                className="stylist-demo-guide__nav-btn"
                onClick={goToNextStep}
                disabled={currentStepIndex === selectedFlow.steps.length - 1}
              >
                Next
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path 
                    fill="currentColor" 
                    d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z" 
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="stylist-demo-guide__footer">
            <div className="stylist-demo-guide__duration">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path 
                  fill="currentColor" 
                  d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" 
                />
              </svg>
              <span>{selectedFlow.duration}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DemoGuide;