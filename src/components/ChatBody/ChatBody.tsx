// Chat body component - displays messages

import React, { useRef, useEffect } from 'react';
import './ChatBody.scss';
import MessageBubble from '@components/MessageBubble';
import ItemCard from '@components/ItemCard';
import OutfitDisplay from '@components/OutfitDisplay';
import StyleQuiz from '@components/StyleQuiz';
import { ChatMessage, MessageType } from '@types/index';

interface ChatBodyProps {
  messages: ChatMessage[];
  onItemFeedback?: (itemId: string, liked: boolean) => void;
  onOutfitFeedback?: (outfitId: string, liked: boolean) => void;
  onQuizSubmit?: (answers: any) => void;
  isLoading?: boolean;
  primaryColor?: string;
}

const ChatBody: React.FC<ChatBodyProps> = ({
  messages,
  onItemFeedback,
  onOutfitFeedback,
  onQuizSubmit,
  isLoading = false,
  primaryColor
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Render a message based on its type
  const renderMessage = (message: ChatMessage) => {
    switch (message.type) {
      case MessageType.TEXT:
        return (
          <MessageBubble
            key={message.id}
            message={message}
            primaryColor={primaryColor}
          />
        );
        
      case MessageType.RECOMMENDATION:
        return (
          <div key={message.id} className="stylist-chat-body__recommendation">
            <div className="stylist-chat-body__recommendation-title">
              Here are some recommendations for you:
            </div>
            <div className="stylist-chat-body__recommendation-items">
              {message.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onFeedback={onItemFeedback}
                  primaryColor={primaryColor}
                />
              ))}
            </div>
          </div>
        );
        
      case MessageType.OUTFIT:
        return (
          <OutfitDisplay
            key={message.id}
            outfit={message.outfit}
            onFeedback={onOutfitFeedback}
            primaryColor={primaryColor}
          />
        );
        
      case MessageType.QUIZ:
        return (
          <StyleQuiz
            key={message.id}
            quizId={message.quizId}
            title={message.title}
            description={message.description}
            onSubmit={onQuizSubmit}
            primaryColor={primaryColor}
          />
        );
        
      case MessageType.LOADING:
        return (
          <div key={message.id} className="stylist-chat-body__loading">
            <div className="stylist-chat-body__loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        );
        
      case MessageType.ERROR:
        return (
          <div key={message.id} className="stylist-chat-body__error">
            <div className="stylist-chat-body__error-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <div className="stylist-chat-body__error-message">
              {message.error}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="stylist-chat-body" ref={scrollContainerRef}>
      <div className="stylist-chat-body__messages">
        {messages.map((message) => renderMessage(message))}
        
        {/* Loading indicator for active loading state */}
        {isLoading && (
          <div className="stylist-chat-body__loading">
            <div className="stylist-chat-body__loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        {/* Empty element for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatBody;
