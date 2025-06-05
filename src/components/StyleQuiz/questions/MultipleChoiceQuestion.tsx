// src/components/StyleQuiz/questions/MultipleChoiceQuestion.tsx
import React from 'react';
import { MultipleChoiceQuestionProps } from './QuestionTypes';

const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  question,
  currentAnswer,
  onAnswer,
  primaryColor
}) => {
  const handleSelect = (optionId: string) => {
    const currentIds = currentAnswer?.answerIds || [];
    const isSelected = currentIds.includes(optionId);
    
    // Toggle selection
    const newIds = isSelected
      ? currentIds.filter(id => id !== optionId)
      : [...currentIds, optionId];
    
    onAnswer(question.id, {
      questionId: question.id,
      answerIds: newIds,
      answered: new Date()
    });
  };

  return (
    <div className="stylist-style-quiz__options" data-cy="quiz-options">
      {question.options?.map(option => {
        const isSelected = currentAnswer?.answerIds?.includes(option.id);
        
        return (
          <button
            key={option.id}
            className={`stylist-style-quiz__option ${isSelected ? 'stylist-style-quiz__option--selected' : ''}`}
            onClick={() => handleSelect(option.id)}
            style={isSelected ? { 
              borderColor: primaryColor, 
              backgroundColor: `${primaryColor}20` 
            } : undefined}
            aria-selected={isSelected}
            data-cy="option"
          >
            <span className="stylist-style-quiz__option-text">{option.text}</span>
            {isSelected && (
              <span className="stylist-style-quiz__option-check">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.67 12.6L2.5 8.4L3.9 7L6.67 9.8L12.1 4.33L13.5 5.75L6.67 12.6Z" fill="currentColor"/>
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MultipleChoiceQuestion;