// Style quiz component for gathering user preferences

import React, { useState } from 'react';
import './StyleQuiz.scss';
import { StyleQuizQuestion, StyleQuizAnswer } from '../../types/index';

interface StyleQuizProps {
  quizId: string;
  title: string;
  description?: string;
  onSubmit: (answers: StyleQuizAnswer[]) => void;
  primaryColor?: string;
}

// Simplified quiz for demonstration
const DEMO_QUESTIONS: StyleQuizQuestion[] = [
  {
    id: 'q1',
    questionText: 'How would you describe your overall fashion style?',
    type: 'single',
    options: [
      { id: 'classic', text: 'Classic & Timeless', value: 'classic' },
      { id: 'minimalist', text: 'Minimalist & Clean', value: 'minimalist' },
      { id: 'trendy', text: 'Trendy & Fashion-Forward', value: 'trendy' },
      { id: 'edgy', text: 'Edgy & Alternative', value: 'edgy' },
      { id: 'sporty', text: 'Sporty & Casual', value: 'sporty' },
      { id: 'bohemian', text: 'Bohemian & Free-Spirited', value: 'bohemian' }
    ],
    category: 'style'
  },
  {
    id: 'q2',
    questionText: 'Which color palette do you prefer for your wardrobe?',
    type: 'single',
    options: [
      { id: 'neutrals', text: 'Neutrals (Black, White, Grey, Beige)', value: 'neutrals' },
      { id: 'earthy', text: 'Earthy Tones (Brown, Olive, Rust)', value: 'earthy' },
      { id: 'pastels', text: 'Pastels (Light Pink, Baby Blue, Lavender)', value: 'pastels' },
      { id: 'bold', text: 'Bold & Bright Colors (Red, Yellow, Electric Blue)', value: 'bold' },
      { id: 'monochrome', text: 'Monochrome or All-Black', value: 'monochrome' }
    ],
    category: 'color'
  },
  {
    id: 'q3',
    questionText: 'What type of outfits do you need the most recommendations for?',
    type: 'multiple',
    options: [
      { id: 'casual', text: 'Everyday Casual', value: 'casual' },
      { id: 'work', text: 'Workwear & Business Casual', value: 'work' },
      { id: 'street', text: 'Streetwear & Trendy Looks', value: 'street' },
      { id: 'date', text: 'Date Night & Going Out', value: 'date' },
      { id: 'formal', text: 'Formal & Special Events', value: 'formal' }
    ],
    category: 'occasion'
  }
];

const StyleQuiz: React.FC<StyleQuizProps> = ({
  // quizId param is required by the interface but not used in this implementation
  title,
  description,
  onSubmit,
  primaryColor
}) => {
  // Using DEMO_QUESTIONS directly, no need to update these
  const [questions] = useState<StyleQuizQuestion[]>(DEMO_QUESTIONS);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<StyleQuizAnswer[]>([]);
  
  // In a real implementation, we would fetch questions from the API
  // useEffect(() => {
  //   const fetchQuestions = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await api.user.getStyleQuiz();
  //       setQuestions(response);
  //     } catch (error) {
  //       console.error('Error fetching quiz questions:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   
  //   fetchQuestions();
  // }, [quizId]);
  
  const handleSingleAnswer = (questionId: string, answerId: string) => {
    const newAnswers = [...answers];
    const existingIndex = answers.findIndex(a => a.questionId === questionId);
    
    const answer: StyleQuizAnswer = {
      questionId,
      answerId,
      answered: new Date()
    };
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answer;
    } else {
      newAnswers.push(answer);
    }
    
    setAnswers(newAnswers);
    
    // Move to next question
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    }
  };
  
  const handleMultipleAnswer = (questionId: string, answerIds: string[]) => {
    const newAnswers = [...answers];
    const existingIndex = answers.findIndex(a => a.questionId === questionId);
    
    const answer: StyleQuizAnswer = {
      questionId,
      answerIds,
      answered: new Date()
    };
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answer;
    } else {
      newAnswers.push(answer);
    }
    
    setAnswers(newAnswers);
  };
  
  const handleSliderAnswer = (questionId: string, value: number) => {
    const newAnswers = [...answers];
    const existingIndex = answers.findIndex(a => a.questionId === questionId);
    
    const answer: StyleQuizAnswer = {
      questionId,
      answerValue: value,
      answered: new Date()
    };
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answer;
    } else {
      newAnswers.push(answer);
    }
    
    setAnswers(newAnswers);
  };
  
  const handleSubmit = () => {
    onSubmit(answers);
  };
  
  // Loading check removed - we use demo questions
  if (false as boolean) {
    return (
      <div className="stylist-style-quiz stylist-style-quiz--loading">
        <div className="stylist-style-quiz__loader">Loading quiz...</div>
      </div>
    );
  }
  
  if (questions.length === 0) {
    return (
      <div className="stylist-style-quiz stylist-style-quiz--error">
        <div className="stylist-style-quiz__error">
          Sorry, we couldn&apos;t load the style quiz. Please try again later.
        </div>
      </div>
    );
  }
  
  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  
  const renderQuestion = () => {
    if (!question) return null;
    
    // Get current answer for this question
    const currentAnswer = answers.find(a => a.questionId === question.id);
    
    switch (question.type) {
      case 'single':
        return (
          <div className="stylist-style-quiz__options">
            {question.options?.map(option => (
              <button
                key={option.id}
                className={`stylist-style-quiz__option ${currentAnswer?.answerId === option.id ? 'stylist-style-quiz__option--selected' : ''}`}
                onClick={() => handleSingleAnswer(question.id, option.id)}
                style={currentAnswer?.answerId === option.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}20` } : undefined}
              >
                {option.text}
              </button>
            ))}
          </div>
        );
        
      case 'multiple':
        return (
          <div className="stylist-style-quiz__options">
            {question.options?.map(option => {
              const isSelected = currentAnswer?.answerIds?.includes(option.id);
              return (
                <button
                  key={option.id}
                  className={`stylist-style-quiz__option ${isSelected ? 'stylist-style-quiz__option--selected' : ''}`}
                  onClick={() => {
                    const currentIds = currentAnswer?.answerIds || [];
                    const newIds = isSelected
                      ? currentIds.filter(id => id !== option.id)
                      : [...currentIds, option.id];
                    handleMultipleAnswer(question.id, newIds);
                  }}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}20` } : undefined}
                >
                  {option.text}
                </button>
              );
            })}
          </div>
        );
        
      case 'slider':
        return (
          <div className="stylist-style-quiz__slider">
            <input
              type="range"
              min={question.minValue || 0}
              max={question.maxValue || 100}
              step={question.step || 1}
              value={currentAnswer?.answerValue || 50}
              onChange={(e) => handleSliderAnswer(question.id, parseInt(e.target.value))}
              style={{ accentColor: primaryColor }}
            />
            <div className="stylist-style-quiz__slider-labels">
              <span>{question.minValue || 0}</span>
              <span>{question.maxValue || 100}</span>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="stylist-style-quiz">
      <div className="stylist-style-quiz__header">
        <h3 className="stylist-style-quiz__title">{title}</h3>
        {description && (
          <p className="stylist-style-quiz__description">{description}</p>
        )}
      </div>
      
      <div className="stylist-style-quiz__progress">
        <div
          className="stylist-style-quiz__progress-bar"
          style={{
            width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            backgroundColor: primaryColor
          }}
        ></div>
      </div>
      
      <div className="stylist-style-quiz__question">
        <div className="stylist-style-quiz__question-number">
          Question {currentQuestion + 1} of {questions.length}
        </div>
        <h4 className="stylist-style-quiz__question-text">{question.questionText}</h4>
      </div>
      
      {renderQuestion()}
      
      <div className="stylist-style-quiz__actions">
        {currentQuestion > 0 && (
          <button
            className="stylist-style-quiz__button stylist-style-quiz__button--secondary"
            onClick={() => setCurrentQuestion(currentQuestion - 1)}
          >
            Previous
          </button>
        )}
        
        {isLastQuestion ? (
          <button
            className="stylist-style-quiz__button stylist-style-quiz__button--primary"
            onClick={handleSubmit}
            style={{ backgroundColor: primaryColor }}
            disabled={answers.length < questions.length}
          >
            Submit
          </button>
        ) : (
          <button
            className="stylist-style-quiz__button stylist-style-quiz__button--primary"
            onClick={() => setCurrentQuestion(currentQuestion + 1)}
            style={{ backgroundColor: primaryColor }}
            disabled={!answers.find(a => a.questionId === question.id)}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default StyleQuiz;
