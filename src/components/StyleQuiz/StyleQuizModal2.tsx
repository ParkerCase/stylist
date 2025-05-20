// src/components/StyleQuiz/StyleQuizModal.tsx

import React, { useState, useEffect } from 'react';
import './StyleQuizModal.scss';
import StyleQuiz, { DEMO_QUESTIONS } from './StyleQuiz';
import StyleQuizResults from './StyleQuizResults';
import { StyleQuizAnswer, UserPreferences } from '@/types/index';
import { trackEvent, AnalyticsEventType } from '@/utils/analytics';
import { getUserId } from '@/utils/localStorage';
import useSyncedStore from '@/hooks/useSyncedStore';
import { useUserStore } from '@/store/userStore';

interface StyleQuizModalProps {
  onSubmit: (answers: StyleQuizAnswer[]) => void;
  onClose: () => void;
  primaryColor?: string;
}

const StyleQuizModal: React.FC<StyleQuizModalProps> = ({ 
  onSubmit, 
  onClose,
  primaryColor
}) => {
  // Store current answers to track abandonment
  const [currentAnswers, setCurrentAnswers] = useState<StyleQuizAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [finalSubmission, setFinalSubmission] = useState(false);
  
  // Get user and sync service
  const userStore = useUserStore();
  const syncedStore = useSyncedStore();

  // Wrapped onSubmit to track answers before submitting
  const handleSubmit = (answers: StyleQuizAnswer[]) => {
    setCurrentAnswers(answers);
    
    // Check if this is a final submission
    const isCompleteSubmission = answers.length >= 5; // Require at least 5 answers
    
    if (isCompleteSubmission) {
      setFinalSubmission(true);
      
      // Submit through the synced store to ensure data is queued for sync
      if (userStore.user) {
        syncedStore.submitStyleQuiz(answers);
      }
      
      // Also pass to parent component for immediate UI updates
      onSubmit(answers);
      
      // Show results view
      setShowResults(true);

      // Track completion
      const userId = getUserId();
      trackEvent(AnalyticsEventType.STYLE_QUIZ_COMPLETE, userId, {
        questionCount: 25,
        answeredCount: answers.length,
        completionRate: Math.round((answers.length / 25) * 100)
      });
    } else {
      // Keep track of progress for abandonment tracking
      setCurrentAnswers(answers);
    }
  };
  
  // Wrapped onClose to track abandonment
  const handleClose = () => {
    // If we have some answers but not a final submission, track as abandoned
    if (currentAnswers.length > 0 && !finalSubmission) {
      const userId = getUserId();
      trackEvent(AnalyticsEventType.STYLE_QUIZ_ABANDON, userId, {
        questionCount: 25,
        answeredCount: currentAnswers.length,
        completionRate: Math.round((currentAnswers.length / 25) * 100)
      });
    }
    
    onClose();
  };

  // Handle retaking the quiz
  const handleRetakeQuiz = () => {
    setShowResults(false);
    // Keep the existing answers but allow the user to change them
  };

  // Handle viewing recommendations
  const handleViewRecommendations = (preferences: UserPreferences) => {
    // Update user preferences in the store
    if (userStore.user) {
      // Use setUser to update preferences as updateUserPreferences might not exist
      userStore.setUser({
        ...userStore.user,
        preferences: preferences
      });
    }
    
    // Close the modal and pass preferences to parent
    onSubmit(currentAnswers);
    onClose();
    
    // Track the view recommendations action
    const userId = getUserId();
    // Use a safer analytics event type that exists
    trackEvent(AnalyticsEventType.WIDGET_OPEN, userId, {
      action: 'view_recommendations',
      source: 'style_quiz',
      preferences: JSON.stringify(preferences)
    });
  };
  
  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose, currentAnswers, finalSubmission]);
  
  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  
  return (
    <div className="stylist-style-quiz-modal">
      <div className="stylist-style-quiz-modal__overlay" onClick={handleClose}></div>
      <div className="stylist-style-quiz-modal__container">
        <button 
          className="stylist-style-quiz-modal__close-button" 
          onClick={handleClose}
          aria-label="Close style quiz"
        ></button>
        
        {showResults ? (
          <StyleQuizResults
            answers={currentAnswers}
            questions={DEMO_QUESTIONS}
            primaryColor={primaryColor}
            onRetakeQuiz={handleRetakeQuiz}
            onViewRecommendations={handleViewRecommendations}
          />
        ) : (
          <StyleQuiz
            quizId="style-quiz-1"
            title="Your Style Profile"
            description="Help us understand your fashion preferences to create personalized style recommendations just for you."
            onSubmit={handleSubmit}
            primaryColor={primaryColor}
          />
        )}
      </div>
    </div>
  );
};

export default StyleQuizModal;