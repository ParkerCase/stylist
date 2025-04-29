// Message bubble component for text messages

import React, { useState } from 'react';
import classNames from 'classnames';
import './MessageBubble.scss';
import { TextMessage, MessageSender } from '../../types/index';
import { formatDate } from '../../utils/formatters';
import { ThumbsUpButton } from '@/components/FeedbackControls';
import { trackEvent } from '@/utils/analytics';
import { getUserId } from '@/utils/localStorage';

interface MessageBubbleProps {
  message: TextMessage;
  primaryColor?: string;
  onFeedback?: (messageId: string, helpful: boolean) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  primaryColor,
  onFeedback
}) => {
  const { id, sender, text, timestamp } = message;
  const [feedbackGiven, setFeedbackGiven] = useState<boolean>(false);
  
  const isUser = sender === MessageSender.USER;
  const isAssistant = sender === MessageSender.ASSISTANT;
  const isSystem = sender === MessageSender.SYSTEM;
  
  // Only show feedback for assistant messages that are long enough to be meaningful
  const shouldShowFeedback = isAssistant && 
                           text.length > 20 && 
                           !text.includes('Would you like') && 
                           onFeedback;
  
  const bubbleClasses = classNames('stylist-message-bubble', {
    'stylist-message-bubble--user': isUser,
    'stylist-message-bubble--assistant': isAssistant,
    'stylist-message-bubble--system': isSystem,
    'stylist-message-bubble--with-feedback': shouldShowFeedback
  });
  
  const contentStyle = isUser && primaryColor
    ? { backgroundColor: primaryColor }
    : undefined;
  
  const handleThumbsUp = () => {
    setFeedbackGiven(true);
    if (onFeedback) {
      onFeedback(id, true);
      
      // Track the event
      trackEvent('ASSISTANT_RESPONSE_THUMBS_UP', getUserId(), {
        messageId: id,
        messageContent: text.substring(0, 100) // First 100 chars for context
      });
    }
  };
  
  return (
    <div className={bubbleClasses}>
      {!isUser && (
        <div className="stylist-message-bubble__avatar">
          {isAssistant ? (
            <div className="stylist-message-bubble__avatar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 1a9 9 0 019 9c0 4.56-3.37 8.33-7.76 8.95l-.19-.47a7.99 7.99 0 002.93-10.57A8.02 8.02 0 004.06 13.1 9 9 0 0112 1zm7.12 13.93l.37.37-.36.36.01-.73zm1.36-1.55a2.83 2.83 0 00-.5-.31l.36-.74c.28.12.54.29.78.48l-.64.57zm-14.81.19l.36.73c-.29.16-.57.35-.8.57l-.57-.64c.31-.3.65-.54 1.01-.66zM6.66 22l1.93-3.1c-.47-.55-.85-1.16-1.14-1.8L2.8 19.13V22h3.86zm10.46-2.91L19 21.99v-2.86l-1.14-.93c.12-.39.19-.8.19-1.22l.08-.04A8.96 8.96 0 0022 10 10 10 0 002 10a9 9 0 003.34 7.03L1.94 20.5A1 1 0 002.86 22h16.28a1 1 0 00.92-1.5l-2.94-3.41z"/>
              </svg>
            </div>
          ) : (
            <div className="stylist-message-bubble__avatar-info">i</div>
          )}
        </div>
      )}
      
      <div className="stylist-message-bubble__content" style={contentStyle}>
        {text.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < text.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
        
        {/* Thumbs up button for assistant recommendations */}
        {shouldShowFeedback && (
          <div className="stylist-message-bubble__feedback">
            <ThumbsUpButton 
              messageId={id}
              onThumbsUp={handleThumbsUp}
              primaryColor={primaryColor}
            />
          </div>
        )}
      </div>
      
      <div className="stylist-message-bubble__time">
        {formatDate(timestamp, 'h:mm a')}
      </div>
    </div>
  );
};

export default MessageBubble;
