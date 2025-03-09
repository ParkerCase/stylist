// Chat-related types for the widget

export enum MessageType {
    TEXT = 'text',
    RECOMMENDATION = 'recommendation',
    OUTFIT = 'outfit',
    QUIZ = 'quiz',
    LOADING = 'loading',
    ERROR = 'error'
  }
  
  export enum MessageSender {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system'
  }
  
  // Base message interface
  export interface Message {
    id: string;
    type: MessageType;
    sender: MessageSender;
    timestamp: Date;
  }
  
  // Text message
  export interface TextMessage extends Message {
    type: MessageType.TEXT;
    text: string;
  }
  
  // Recommendation message with items
  export interface RecommendationMessage extends Message {
    type: MessageType.RECOMMENDATION;
    items: RecommendationItem[];
    context?: string;
  }
  
  // Outfit recommendation message
  export interface OutfitMessage extends Message {
    type: MessageType.OUTFIT;
    outfit: Outfit;
    context?: string;
  }
  
  // Style quiz message
  export interface QuizMessage extends Message {
    type: MessageType.QUIZ;
    quizId: string;
    title: string;
    description?: string;
  }
  
  // Loading message
  export interface LoadingMessage extends Message {
    type: MessageType.LOADING;
  }
  
  // Error message
  export interface ErrorMessage extends Message {
    type: MessageType.ERROR;
    error: string;
    code?: string;
  }
  
  // Union type for all message types
  export type ChatMessage =
    | TextMessage
    | RecommendationMessage
    | OutfitMessage
    | QuizMessage
    | LoadingMessage
    | ErrorMessage;
  
  // Types for recommendation items within messages
  export interface RecommendationItem {
    id: string;
    name: string;
    brand: string;
    price: number;
    salePrice?: number;
    imageUrl: string;
    category: string;
    url: string;
    matchScore: number;
    matchReasons: string[];
  }
  
  // Types for outfit recommendations
  export interface Outfit {
    id: string;
    name?: string;
    items: RecommendationItem[];
    occasion: string;
    matchScore: number;
    matchReasons: string[];
  }
  
  // Chat configuration options
  export interface ChatConfig {
    greeting?: string;
    initialMessages?: ChatMessage[];
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    primaryColor?: string;
    secondaryColor?: string;
    showWelcomeScreen?: boolean;
  }
  