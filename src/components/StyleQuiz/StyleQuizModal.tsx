// src/components/StyleQuiz/StyleQuizModal.tsx

import React from 'react';
import './StyleQuizModal.scss';
import StyleQuiz from './StyleQuiz';
import { StyleQuizAnswer } from '@/types/index';

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
  // Handle escape key
  React.useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);
  
  // Prevent body scrolling when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);
  
  return (
    <div className="stylist-style-quiz-modal">
      <div className="stylist-style-quiz-modal__overlay" onClick={onClose}></div>
      <div className="stylist-style-quiz-modal__container">
        <StyleQuiz
          quizId="style-quiz-1"
          title="Style Preference Quiz"
          description="Help us understand your style better so we can make personalized recommendations."
          onSubmit={onSubmit}
          primaryColor={primaryColor}
        />
      </div>
    </div>
  );
};

export default StyleQuizModal;