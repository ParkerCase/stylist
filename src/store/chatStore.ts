// Chat state management

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageType, MessageSender, TextMessage } from '../types/index';

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isMinimized: boolean;
  isLoading: boolean;
  error: string | null;
  currentView: 'chat' | 'lookbook';
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  addTextMessage: (text: string, sender: MessageSender | string) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  toggleOpen: () => void;
  toggleMinimize: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentView: (view: 'chat' | 'lookbook') => void;
  setIsOpen: (isOpen: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isOpen: false, // Set to false by default so the widget is closed initially
  isMinimized: false,
  isLoading: false,
  error: null,
  currentView: 'chat',
  
  addMessage: (message) => {
    const id = uuidv4();
    const timestamp = new Date();
    const newMessage = { ...message, id, timestamp };
    
    // Using type assertion to work around type compatibility issues
    set((state) => ({
      messages: [...state.messages, newMessage]
    } as ChatState));
    
    return id;
  },
  
  addTextMessage: (text, sender) => {
    const senderValue = typeof sender === 'string' ? sender as MessageSender : sender;
    
    const message = {
      type: MessageType.TEXT,
      sender: senderValue,
      text
    } as Omit<TextMessage, 'id' | 'timestamp'>;
    
    return get().addMessage(message);
  },
  
  updateMessage: (id, updates) => {
    // Using type assertion to work around type compatibility issues
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    } as ChatState));
  },
  
  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id)
    }));
  },
  
  clearMessages: () => {
    set({ messages: [] });
  },
  
  toggleOpen: () => {
    const isCurrentlyOpen = get().isOpen;
    set({
      isOpen: !isCurrentlyOpen,
      isMinimized: false
    });
  },
  
  toggleMinimize: () => {
    const isCurrentlyMinimized = get().isMinimized;
    set({ isMinimized: !isCurrentlyMinimized });
  },
  
  setLoading: (isLoading) => {
    set({ isLoading });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  setCurrentView: (view) => {
    set({ currentView: view });
  },
  
  setIsOpen: (isOpen) => {
    set({ isOpen });
  }
}));
