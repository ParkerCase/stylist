// src/components/StyleQuiz/questions/ImageChoiceQuestion.tsx
import React from 'react';
import { ImageChoiceQuestionProps } from './QuestionTypes';

const ImageChoiceQuestion: React.FC<ImageChoiceQuestionProps> = ({
  question,
  currentAnswer,
  onAnswer,
  primaryColor,
  autoAdvance = true
}) => {
  const handleSelect = (optionId: string) => {
    onAnswer(question.id, {
      questionId: question.id,
      answerId: optionId,
      answered: new Date()
    });
  };

  return (
    <div className="stylist-style-quiz__image-options">
      {question.options?.map(option => (
        <button
          key={option.id}
          className={`stylist-style-quiz__image-option ${currentAnswer?.answerId === option.id ? 'stylist-style-quiz__image-option--selected' : ''}`}
          onClick={() => handleSelect(option.id)}
          aria-selected={currentAnswer?.answerId === option.id}
        >
          <div 
            className="stylist-style-quiz__image-container"
            style={{ 
              backgroundImage: option.imageUrl ? `url(${option.imageUrl})` : undefined,
              borderColor: currentAnswer?.answerId === option.id ? primaryColor : undefined
            }}
          >
            {!option.imageUrl && <div className="stylist-style-quiz__image-placeholder"></div>}
          </div>
          <div 
            className="stylist-style-quiz__image-label"
            style={currentAnswer?.answerId === option.id ? { color: primaryColor } : undefined}
          >
            {option.text}
          </div>
        </button>
      ))}
    </div>
  );
};

export default ImageChoiceQuestion;