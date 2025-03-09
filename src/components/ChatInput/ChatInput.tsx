// Chat input component

import React, { useState, useRef, useEffect } from 'react';
import './ChatInput.scss';
import { MessageSender, MessageType } from '@types/index';
import { useChatStore } from '@store/index';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  primaryColor?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  primaryColor
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isLoading } = useChatStore();
  
  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Auto-resize textarea based on content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter key (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled && !isLoading) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };
  
  const sendButtonStyle = {
    backgroundColor: primaryColor || undefined
  };
  
  return (
    <div className="stylist-chat-input">
      <div className="stylist-chat-input__container">
        <textarea
          ref={inputRef}
          className="stylist-chat-input__textarea"
          placeholder={placeholder}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          rows={1}
          aria-label="Message input"
        />
      </div>
      <button
        className="stylist-chat-input__send-button"
        onClick={handleSendMessage}
        disabled={!message.trim() || disabled || isLoading}
        style={sendButtonStyle}
        aria-label="Send message"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  );
};

export default ChatInput;
