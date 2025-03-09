// Chat state management

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageType, MessageSender, TextMessage } from '@types/index';

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isMinimized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  addTextMessage: (text: string, sender: MessageSender) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  toggleOpen: () => void;
  toggleMinimize: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isOpen: false,
  isMinimized: false,
  isLoading: false,
  error: null,
  
  addMessage: (message) => {
    const id = uuidv4();
    const timestamp = new Date();
    const newMessage = { ...message, id, timestamp };
    
    set((state) => ({
      messages: [...state.messages, newMessage]
    }));
    
    return id;
  },
  
  addTextMessage: (text, sender) => {
    const message: Omit<TextMessage, 'id' | 'timestamp'> = {
      type: MessageType.TEXT,
      sender,
      text
    };
    
    return get().addMessage(message);
  },
  
  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }));
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
  }
}));
