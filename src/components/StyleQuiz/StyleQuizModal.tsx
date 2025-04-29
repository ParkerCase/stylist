// src/components/StyleQuiz/StyleQuizModal.tsx

import React, { useState, useEffect } from 'react';
import './StyleQuizModal.scss';
import StyleQuiz from './StyleQuiz';
import { StyleQuizAnswer } from '@/types/index';
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
  const [finalSubmission, setFinalSubmission] = useState(false);
  
  // Get user and sync service
  const userStore = useUserStore();
  const syncedStore = useSyncedStore();

  // Wrapped onSubmit to track answers before submitting
  const handleSubmit = (answers: StyleQuizAnswer[]) => {
    setCurrentAnswers(answers);
    
    // Only on final submission (from submit button) should we call the parent's onSubmit
    if (answers.length === 25 || finalSubmission) {
      setFinalSubmission(true);
      
      // Submit through the synced store to ensure data is queued for sync
      if (userStore.user) {
        syncedStore.submitStyleQuiz(answers);
      }
      
      // Also pass to parent component for immediate UI updates
      onSubmit(answers);
    }
  };

  // Wrapped onClose to track abandonment
  const handleClose = () => {
    // If we have some answers but not a complete set, track as abandoned
    if (currentAnswers.length > 0 && currentAnswers.length < 25) {
      const userId = getUserId();
      trackEvent(AnalyticsEventType.STYLE_QUIZ_ABANDON, userId, {
        questionCount: 25,
        answeredCount: currentAnswers.length,
        completionRate: Math.round((currentAnswers.length / 25) * 100)
      });
    }
    
    onClose();
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
  }, [onClose, currentAnswers]);
  
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
        <StyleQuiz
          quizId="style-quiz-1"
          title="Your Style Profile"
          description="Help us understand your fashion preferences to create personalized style recommendations just for you."
          onSubmit={handleSubmit}
          primaryColor={primaryColor}
        />
      </div>
    </div>
  );
};

export default StyleQuizModal;