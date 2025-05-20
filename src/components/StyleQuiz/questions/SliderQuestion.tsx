// src/components/StyleQuiz/questions/SliderQuestion.tsx
import React, { useState, useEffect } from 'react';
import { SliderQuestionProps } from './QuestionTypes';

const SliderQuestion: React.FC<SliderQuestionProps> = ({
  question,
  currentAnswer,
  onAnswer,
  primaryColor
}) => {
  // Set initial value from current answer or default to middle of range
  const defaultValue = currentAnswer?.answerValue ?? 
    Math.floor((question.minValue ?? 0) + ((question.maxValue ?? 100) - (question.minValue ?? 0)) / 2);
  
  const [value, setValue] = useState(defaultValue);
  
  // Update local state when the external answer changes
  useEffect(() => {
    if (currentAnswer?.answerValue !== undefined) {
      setValue(currentAnswer.answerValue);
    }
  }, [currentAnswer]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setValue(newValue);
    
    // Debounce to avoid too many updates
    clearTimeout((window as any).sliderTimeout);
    (window as any).sliderTimeout = setTimeout(() => {
      onAnswer(question.id, {
        questionId: question.id,
        answerValue: newValue,
        answered: new Date()
      });
    }, 300);
  };
  
  // Get slider labels based on question
  const getSliderLabels = () => {
    switch(question.id) {
      case 'q24': // Comfort vs Style priority
        return { left: 'Comfort', right: 'Style' };
      case 'q16': // Budget
        return { left: '$0', right: '$500+' };
      default:
        return { left: 'Low', right: 'High' };
    }
  };
  
  const labels = getSliderLabels();
  
  // Format the displayed value
  const getDisplayValue = () => {
    if (question.id === 'q16') { // Budget question
      return `$${value}`;
    }
    return value;
  };

  return (
    <div className="stylist-style-quiz__slider">
      <input
        type="range"
        min={question.minValue || 0}
        max={question.maxValue || 100}
        step={question.step || 1}
        value={value}
        onChange={handleChange}
        style={{ accentColor: primaryColor }}
      />
      <div className="stylist-style-quiz__slider-value" style={{ color: primaryColor }}>
        {getDisplayValue()}
      </div>
      <div className="stylist-style-quiz__slider-labels">
        <div className="stylist-style-quiz__slider-label-left">{labels.left}</div>
        <div className="stylist-style-quiz__slider-label-right">{labels.right}</div>
      </div>
    </div>
  );
};

export default SliderQuestion;