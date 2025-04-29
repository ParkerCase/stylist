// src/components/StyleQuiz/__tests__/StyleQuiz.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StyleQuiz from '../StyleQuiz';
import { useUserStore } from '@/store/userStore';
import { createStylistApi } from '@/api/index';

// Mock dependencies
jest.mock('@/store/userStore');
jest.mock('@/api/index');

describe('StyleQuiz Component', () => {
  const mockUserStore = {
    user: { id: 'test-user', styleQuizCompleted: false },
    setUser: jest.fn(),
    updateUserPreferences: jest.fn(),
    updateStyleQuiz: jest.fn()
  };
  
  const mockApiClient = {
    user: {
      updateStyleQuiz: jest.fn().mockResolvedValue({ success: true }),
      updateUserPreferences: jest.fn().mockResolvedValue({ success: true })
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user store hook
    (useUserStore as unknown as jest.Mock).mockImplementation((selector) => 
      selector(mockUserStore)
    );
    
    // Mock API client
    (createStylistApi as jest.Mock).mockReturnValue(mockApiClient);
  });
  
  test('renders initial step correctly', () => {
    render(<StyleQuiz 
      quizId="test-quiz"
      title="Style Quiz"
      onSubmit={jest.fn()}
    />);
    
    // Check title is displayed
    expect(screen.getByText(/style quiz/i)).toBeInTheDocument();
    expect(screen.getByText(/help us understand your style preferences/i)).toBeInTheDocument();
    
    // First step should be style preferences
    expect(screen.getByText(/What's your style?/i)).toBeInTheDocument();
    
    // Check style option buttons are rendered
    expect(screen.getByText(/casual/i)).toBeInTheDocument();
    expect(screen.getByText(/minimalist/i)).toBeInTheDocument();
    expect(screen.getByText(/classic/i)).toBeInTheDocument();
    
    // Next button should be present but might be disabled
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });
  
  test('allows selecting style preferences and navigating to next step', () => {
    render(<StyleQuiz 
      quizId="test-quiz"
      title="Style Quiz"
      onSubmit={jest.fn()}
    />);
    
    // Select some style preferences
    fireEvent.click(screen.getByText(/casual/i));
    fireEvent.click(screen.getByText(/minimalist/i));
    
    // Click next
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Should move to color preferences
    expect(screen.getByText(/What colors do you prefer?/i)).toBeInTheDocument();
    
    // Color options should be displayed
    expect(screen.getByText(/neutrals/i)).toBeInTheDocument();
    expect(screen.getByText(/pastels/i)).toBeInTheDocument();
    
    // Previous button should also be visible now
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
  });
  
  test('allows navigating back to previous step', () => {
    render(<StyleQuiz 
      quizId="test-quiz"
      title="Style Quiz"
      onSubmit={jest.fn()}
    />);
    
    // Select style and go to next step
    fireEvent.click(screen.getByText(/casual/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Now we're on color preferences
    expect(screen.getByText(/What colors do you prefer?/i)).toBeInTheDocument();
    
    // Go back to style preferences
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    
    // Should be back on style preferences
    expect(screen.getByText(/What's your style?/i)).toBeInTheDocument();
    
    // Selected style should still be active
    const casualButton = screen.getByText(/casual/i).closest('button');
    expect(casualButton).toHaveClass('stylist-style-quiz__option--selected');
  });
  
  test('completes quiz and submits data on final step', async () => {
    const mockOnSubmit = jest.fn();
    render(<StyleQuiz 
      quizId="test-quiz"
      title="Style Quiz"
      onSubmit={mockOnSubmit}
    />);
    
    // Go through all steps of the quiz
    // Step 1: Style
    fireEvent.click(screen.getByText(/casual/i));
    fireEvent.click(screen.getByText(/classic/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 2: Colors
    fireEvent.click(screen.getByText(/neutrals/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 3: Fit preferences
    fireEvent.click(screen.getByText(/regular/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 4: Occasions
    fireEvent.click(screen.getByText(/casual/i));
    fireEvent.click(screen.getByText(/business/i));
    
    // Submit the quiz
    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    
    // Wait for API calls to complete
    await waitFor(() => {
      // Should call API to update style quiz results
      expect(mockApiClient.user.updateStyleQuiz).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user',
          stylePreferences: expect.arrayContaining(['casual', 'classic']),
          colorPreferences: expect.arrayContaining(['neutrals']),
          fitPreferences: expect.objectContaining({
            tops: 'regular',
            bottoms: 'regular'
          }),
          occasions: expect.arrayContaining(['casual', 'business'])
        })
      );
      
      // Should update local user store
      expect(mockUserStore.updateStyleQuiz).toHaveBeenCalled();
      
      // Should call onSubmit callback
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
  
  test('disables next button until selections are made', () => {
    render(<StyleQuiz 
      quizId="test-quiz"
      title="Style Quiz"
      onSubmit={jest.fn()}
    />);
    
    // Next button should be disabled initially
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
    
    // Select a style preference
    fireEvent.click(screen.getByText(/casual/i));
    
    // Next button should be enabled
    expect(nextButton).not.toBeDisabled();
  });
  
  test('handles API errors gracefully', async () => {
    // Mock API error
    mockApiClient.user.updateStyleQuiz.mockRejectedValueOnce(
      new Error('Failed to update style quiz')
    );
    
    render(<StyleQuiz 
      quizId="test-quiz"
      title="Style Quiz"
      onSubmit={jest.fn()}
    />);
    
    // Go through all steps of the quiz quickly
    fireEvent.click(screen.getByText(/casual/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    fireEvent.click(screen.getByText(/neutrals/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    fireEvent.click(screen.getByText(/regular/i));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    fireEvent.click(screen.getByText(/casual/i));
    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });
    
    // Click try again
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    
    // Should allow resubmitting
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });
  
  test('pre-fills quiz with existing user data', () => {
    // Mock user with existing style quiz data
    const userWithQuizData = {
      id: 'test-user',
      styleQuizCompleted: true,
      styleQuiz: {
        stylePreferences: ['minimalist', 'sporty'],
        colorPreferences: ['bright'],
        fitPreferences: {
          tops: 'oversized',
          bottoms: 'slim'
        },
        occasions: ['athletic', 'weekend']
      }
    };
    
    // Update mock to return user with quiz data
    (useUserStore as unknown as jest.Mock).mockImplementation((selector) => 
      selector({
        ...mockUserStore,
        user: userWithQuizData
      })
    );
    
    render(<StyleQuiz 
      quizId="test-quiz"
      title="Style Quiz"
      onSubmit={jest.fn()}
    />);
    
    // First step should have user's existing preferences selected
    const minimalistButton = screen.getByText(/minimalist/i).closest('button');
    const sportyButton = screen.getByText(/sporty/i).closest('button');
    
    expect(minimalistButton).toHaveClass('stylist-style-quiz__option--selected');
    expect(sportyButton).toHaveClass('stylist-style-quiz__option--selected');
    
    // Navigate to next step
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Color preferences should be pre-selected
    const brightButton = screen.getByText(/bright/i).closest('button');
    expect(brightButton).toHaveClass('stylist-style-quiz__option--selected');
  });
});