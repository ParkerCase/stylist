// src/components/StyleQuiz/questions/SingleChoiceQuestion.tsx
import React from 'react';
import { SingleChoiceQuestionProps } from './QuestionTypes';

const SingleChoiceQuestion: React.FC<SingleChoiceQuestionProps> = ({
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
    <div className="stylist-style-quiz__options">
      {question.options?.map(option => (
        <button
          key={option.id}
          className={`stylist-style-quiz__option ${currentAnswer?.answerId === option.id ? 'stylist-style-quiz__option--selected' : ''}`}
          onClick={() => handleSelect(option.id)}
          style={currentAnswer?.answerId === option.id ? { 
            borderColor: primaryColor, 
            backgroundColor: `${primaryColor}20` 
          } : undefined}
          aria-selected={currentAnswer?.answerId === option.id}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
};

export default SingleChoiceQuestion;