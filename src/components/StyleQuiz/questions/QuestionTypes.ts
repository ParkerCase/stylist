// src/components/StyleQuiz/questions/QuestionTypes.ts
import { StyleQuizQuestion, StyleQuizAnswer } from '../../../types/user';

export interface BaseQuestionProps {
  question: StyleQuizQuestion;
  currentAnswer?: StyleQuizAnswer;
  onAnswer: (questionId: string, answer: any) => void;
  primaryColor?: string;
  autoAdvance?: boolean;
}

export interface SingleChoiceQuestionProps extends BaseQuestionProps {
  // Any single-choice specific props would go here
}

export interface MultipleChoiceQuestionProps extends BaseQuestionProps {
  // Any multiple-choice specific props would go here
}

export interface ImageChoiceQuestionProps extends BaseQuestionProps {
  // Any image-choice specific props would go here
}

export interface SliderQuestionProps extends BaseQuestionProps {
  // Any slider-choice specific props would go here
}