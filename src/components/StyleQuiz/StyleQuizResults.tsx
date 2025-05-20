// src/components/StyleQuiz/StyleQuizResults.tsx

import React, { useEffect, useState } from 'react';
import { StyleQuizAnswer, StyleQuizQuestion, UserPreferences } from '../../types/user';
import StyleQuizResultsProcessor from './utils/StyleQuizResultsProcessor';
import './StyleQuizResults.scss';

interface StyleQuizResultsProps {
  answers: StyleQuizAnswer[];
  questions: StyleQuizQuestion[];
  primaryColor?: string;
  onRetakeQuiz: () => void;
  onViewRecommendations: (preferences: UserPreferences) => void;
}

const StyleQuizResults: React.FC<StyleQuizResultsProps> = ({
  answers,
  questions,
  primaryColor,
  onRetakeQuiz,
  onViewRecommendations
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [profileSummary, setProfileSummary] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [recommendationCategories, setRecommendationCategories] = useState<string[]>([]);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  
  useEffect(() => {
    // Simulate processing time
    setIsLoading(true);
    
    // Process the results
    const processor = new StyleQuizResultsProcessor(answers, questions);
    
    // Give a slight delay to show the loading state
    setTimeout(() => {
      try {
        const preferences = processor.generateUserPreferences();
        const summary = processor.generateProfileSummary();
        const categories = processor.generateRecommendationCategories();
        const completion = processor.getCompletionPercentage();
        
        setUserPreferences(preferences);
        setProfileSummary(summary);
        setRecommendationCategories(categories);
        setCompletionPercentage(completion);
        setIsLoading(false);
      } catch (error) {
        console.error('Error generating quiz results:', error);
        setIsLoading(false);
      }
    }, 1200);
  }, [answers, questions]);
  
  const handleViewRecommendations = () => {
    if (userPreferences) {
      onViewRecommendations(userPreferences);
    }
  };
  
  if (isLoading) {
    return (
      <div className="stylist-style-quiz-results stylist-style-quiz-results--loading">
        <div className="stylist-style-quiz-results__loading">
          <div className="stylist-style-quiz-results__loading-spinner"></div>
          <div className="stylist-style-quiz-results__loading-text">
            Creating your personalized style profile...
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="stylist-style-quiz-results">
      <div className="stylist-style-quiz-results__header">
        <h2 className="stylist-style-quiz-results__title">Your Style Profile</h2>
        <div className="stylist-style-quiz-results__completion">
          <span>Profile Completion: {completionPercentage}%</span>
          <div className="stylist-style-quiz-results__completion-bar">
            <div 
              className="stylist-style-quiz-results__completion-bar-fill"
              style={{ width: `${completionPercentage}%`, backgroundColor: primaryColor }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="stylist-style-quiz-results__content">
        <div className="stylist-style-quiz-results__profile">
          <h3>Style Summary</h3>
          <div className="stylist-style-quiz-results__profile-summary">
            {profileSummary.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
        
        <div className="stylist-style-quiz-results__recommendations">
          <h3>Recommended Categories</h3>
          <div className="stylist-style-quiz-results__categories">
            {recommendationCategories.map((category, index) => (
              <div 
                key={index} 
                className="stylist-style-quiz-results__category"
                style={{ borderColor: primaryColor }}
              >
                {category}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="stylist-style-quiz-results__actions">
        <button 
          className="stylist-style-quiz-results__button stylist-style-quiz-results__button--secondary"
          onClick={onRetakeQuiz}
        >
          Retake Quiz
        </button>
        <button 
          className="stylist-style-quiz-results__button stylist-style-quiz-results__button--primary"
          onClick={handleViewRecommendations}
          style={{ backgroundColor: primaryColor }}
        >
          View Recommendations
        </button>
      </div>
      
      <div className="stylist-style-quiz-results__note">
        <p>
          Your style profile will be used to personalize recommendations throughout your shopping experience.
          You can retake the quiz or update your preferences anytime in your account settings.
        </p>
      </div>
    </div>
  );
};

export default StyleQuizResults;