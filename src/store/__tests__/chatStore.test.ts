// src/store/__tests__/chatStore.test.ts
import { act, renderHook } from '@testing-library/react-hooks';
import { useChatStore } from '../chatStore';
import { MessageSender, MessageType } from '@/types/index';

// Clear store before each test
beforeEach(() => {
  act(() => {
    useChatStore.getState().clearMessages();
    useChatStore.getState().setLoading(false);
    useChatStore.getState().setError(null);
    
    if (useChatStore.getState().isOpen) {
      useChatStore.getState().toggleOpen();
    }
    
    if (useChatStore.getState().isMinimized) {
      useChatStore.getState().toggleMinimize();
    }
  });
});

describe('Chat Store', () => {
  test('should add a text message', () => {
    const { result } = renderHook(() => useChatStore());
    
    act(() => {
      result.current.addTextMessage('Hello, world!', MessageSender.USER);
    });
    
    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].type).toBe(MessageType.TEXT);
    expect(result.current.messages[0].sender).toBe(MessageSender.USER);
    expect(result.current.messages[0].text).toBe('Hello, world!');
  });
  
  test('should toggle open state', () => {
    const { result } = renderHook(() => useChatStore());
    
    // Initial state should be closed
    expect(result.current.isOpen).toBe(false);
    
    act(() => {
      result.current.toggleOpen();
    });
    
    expect(result.current.isOpen).toBe(true);
    
    act(() => {
      result.current.toggleOpen();
    });
    
    expect(result.current.isOpen).toBe(false);
});

test('should toggle minimize state', () => {
  const { result } = renderHook(() => useChatStore());
  
  // Initial state should not be minimized
  expect(result.current.isMinimized).toBe(false);
  
  act(() => {
    result.current.toggleMinimize();
  });
  
  expect(result.current.isMinimized).toBe(true);
  
  act(() => {
    result.current.toggleMinimize();
  });
  
  expect(result.current.isMinimized).toBe(false);
});

test('should update and remove messages', () => {
  const { result } = renderHook(() => useChatStore());
  
  let msgId: string;
  
  act(() => {
    msgId = result.current.addTextMessage('Original text', MessageSender.USER);
  });
  
  expect(result.current.messages[0].text).toBe('Original text');
  
  act(() => {
    result.current.updateMessage(msgId, { text: 'Updated text' });
  });
  
  expect(result.current.messages[0].text).toBe('Updated text');
  
  act(() => {
    result.current.removeMessage(msgId);
  });
  
  expect(result.current.messages.length).toBe(0);
});

test('should set loading state', () => {
  const { result } = renderHook(() => useChatStore());
  
  expect(result.current.isLoading).toBe(false);
  
  act(() => {
    result.current.setLoading(true);
  });
  
  expect(result.current.isLoading).toBe(true);
});

test('should set error state', () => {
  const { result } = renderHook(() => useChatStore());
  
  expect(result.current.error).toBe(null);
  
  act(() => {
    result.current.setError('Test error message');
  });
  
  expect(result.current.error).toBe('Test error message');
});
});