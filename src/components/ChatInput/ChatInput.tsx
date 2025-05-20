// Enhanced Chat input component with additional input methods

import React, { useState, useRef, useEffect } from 'react';
import './ChatInput.scss';
import { useChatStore } from '@/store/index';

// Import new components
import ChatImageUploader from './ChatImageUploader';
import ChatURLInput from './ChatURLInput';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onImageUpload?: (file: File) => void;
  onURLSubmit?: (url: string) => void;
  onVoiceInput?: () => void;
  placeholder?: string;
  disabled?: boolean;
  primaryColor?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onImageUpload,
  onURLSubmit,
  onVoiceInput,
  placeholder = 'Type a message...',
  disabled = false,
  primaryColor
}) => {
  const [message, setMessage] = useState('');
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showURLInput, setShowURLInput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isLoading } = useChatStore();
  
  // Define types for speech recognition
  interface SpeechRecognitionEvent extends Event {
    results: {
      [index: number]: SpeechRecognitionResult;
      length: number;
    };
    resultIndex: number;
  }
  
  interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative;
    length: number;
    isFinal: boolean;
  }
  
  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }
  
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    onerror: (event: Event) => void;
    start: () => void;
    stop: () => void;
    abort: () => void;
  }
  
  // SpeechRecognition setup
  const speechRecognition = useRef<SpeechRecognition | null>(null);
  
  // Initialize speech recognition when component mounts
  useEffect(() => {
    // Check if browser supports SpeechRecognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      speechRecognition.current = new SpeechRecognitionAPI();
      
      if (speechRecognition.current) {
        // Configure speech recognition
        speechRecognition.current.continuous = false;
        speechRecognition.current.interimResults = true;
        speechRecognition.current.lang = 'en-US';
        
        // Set up event handlers
        speechRecognition.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(Array.from({ length: event.results.length }, (_, i) => event.results[i]))
            .map(result => result[0]?.transcript || '')
            .join('');
            
          setMessage(prev => (prev + ' ' + transcript).trim());
        };
        
        speechRecognition.current.onend = () => {
          setIsListening(false);
        };
        
        speechRecognition.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
      }
    }
    
    return () => {
      // Clean up speech recognition
      if (speechRecognition.current) {
        speechRecognition.current.abort();
      }
    };
  }, []);
  
  // Toggle input helpers
  const toggleImageUploader = () => {
    setShowImageUploader(!showImageUploader);
    if (showURLInput) setShowURLInput(false);
  };
  
  const toggleURLInput = () => {
    setShowURLInput(!showURLInput);
    if (showImageUploader) setShowImageUploader(false);
  };
  
  // Handle voice input
  const handleVoiceInput = () => {
    if (!speechRecognition.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    
    if (isListening) {
      // Stop listening
      speechRecognition.current.stop();
      setIsListening(false);
    } else {
      // Start listening
      try {
        speechRecognition.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Speech recognition error:', error);
      }
    }
    
    // Also call the provided callback if available
    if (onVoiceInput) {
      onVoiceInput();
    }
  };
  
  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current && !showImageUploader && !showURLInput) {
      inputRef.current.focus();
    }
  }, [showImageUploader, showURLInput]);
  
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
  
  // Handle image upload
  const handleImageUpload = (file: File) => {
    if (onImageUpload) {
      onImageUpload(file);
      setShowImageUploader(false);
    }
  };
  
  // Handle URL submission
  const handleURLSubmit = (url: string) => {
    if (onURLSubmit) {
      onURLSubmit(url);
      setShowURLInput(false);
    }
  };
  
  // Style objects for theming
  const sendButtonStyle = {
    backgroundColor: primaryColor || undefined
  };
  
  const activeButtonStyle = {
    color: primaryColor || undefined,
    borderColor: primaryColor || undefined
  };
  
  return (
    <div className="stylist-chat-input-container">
      {/* Image uploader */}
      {showImageUploader && (
        <ChatImageUploader 
          onImageUpload={handleImageUpload}
          disabled={disabled || isLoading}
          primaryColor={primaryColor}
        />
      )}
      
      {/* URL input */}
      {showURLInput && (
        <ChatURLInput 
          onURLSubmit={handleURLSubmit}
          disabled={disabled || isLoading}
          primaryColor={primaryColor}
        />
      )}
      
      {/* Input toolbar */}
      <div className="stylist-chat-input-toolbar">
        <button 
          className={`stylist-chat-input-toolbar__button ${showImageUploader ? 'active' : ''}`}
          onClick={toggleImageUploader}
          disabled={disabled || isLoading}
          style={showImageUploader ? activeButtonStyle : undefined}
          aria-label="Upload image"
          title="Upload an image to find similar items"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4 2 3 3-4 4 5H5z"/>
          </svg>
        </button>
        
        <button 
          className={`stylist-chat-input-toolbar__button ${showURLInput ? 'active' : ''}`}
          onClick={toggleURLInput}
          disabled={disabled || isLoading}
          style={showURLInput ? activeButtonStyle : undefined}
          aria-label="Enter URL"
          title="Enter a product URL to analyze"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
          </svg>
        </button>
        
        {/* Voice input button */}
        {'SpeechRecognition' in window || 'webkitSpeechRecognition' in window ? (
          <button 
            className={`stylist-chat-input-toolbar__button ${isListening ? 'recording' : ''}`}
            onClick={handleVoiceInput}
            disabled={disabled || isLoading}
            aria-label={isListening ? 'Stop recording' : 'Voice input'}
            title="Use voice to input text"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
          </button>
        ) : null}
        
        <div className="stylist-chat-input__help">
          Type a message or use the tools above for more input options
        </div>
      </div>
      
      {/* Main input */}
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
    </div>
  );
};

export default ChatInput;