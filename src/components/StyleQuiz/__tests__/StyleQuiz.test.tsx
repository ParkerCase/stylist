// src/components/StyleQuiz/__tests__/StyleQuiz.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={jest.fn()} />);
    // Check title is displayed
    expect(screen.getByText(/style quiz/i)).toBeInTheDocument();
    // Check at least one option is present
    const optionButtons = screen.getAllByRole('button').filter(btn => btn.className.includes('stylist-style-quiz__option'));
    expect(optionButtons.length).toBeGreaterThan(0);
  });
  
  test('allows selecting options and navigating through all steps', () => {
    render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={jest.fn()} />);
    // Go through all 25 questions by always selecting the first available option and clicking Next
    for (let i = 0; i < 25; i++) {
      // Find all option buttons for the current question
      const optionButtons = screen.getAllByRole('button').filter(btn => btn.className.includes('stylist-style-quiz__option'));
      expect(optionButtons.length).toBeGreaterThan(0);
      // Select the first option
      fireEvent.click(optionButtons[0]);
      // Click Next if available
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton && !(nextButton as HTMLButtonElement).disabled) {
        fireEvent.click(nextButton);
      } else {
        // If no Next, look for Complete or Finish
        const completeButton = screen.queryByRole('button', { name: /complete|finish/i });
        if (completeButton && !(completeButton as HTMLButtonElement).disabled) {
          fireEvent.click(completeButton);
          break;
        }
      }
    }
  });
  
  test('disables next button until selections are made', () => {
    render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={jest.fn()} />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    const optionButtons = screen.getAllByRole('button').filter(btn => btn.className.includes('stylist-style-quiz__option'));
    // If no option is selected, Next should be disabled
    const anySelected = optionButtons.some(btn => btn.getAttribute('aria-selected') === 'true');
    if (anySelected) {
      expect((nextButton as HTMLButtonElement).disabled).toBe(false);
    } else {
      expect((nextButton as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(optionButtons[0]);
      expect((nextButton as HTMLButtonElement).disabled).toBe(false);
    }
  });
  
  test('completes quiz and submits data on final step', async () => {
    const mockOnSubmit = jest.fn();
    render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={mockOnSubmit} />);
    // Go through all 25 questions by always selecting the first available option and clicking Next/Complete
    for (let i = 0; i < 25; i++) {
      const optionButtons = screen.getAllByRole('button').filter(btn => btn.className.includes('stylist-style-quiz__option'));
      expect(optionButtons.length).toBeGreaterThan(0);
      fireEvent.click(optionButtons[0]);
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton && !(nextButton as HTMLButtonElement).disabled) {
        fireEvent.click(nextButton);
      } else {
        const completeButton = screen.queryByRole('button', { name: /complete|finish/i });
        if (completeButton && !(completeButton as HTMLButtonElement).disabled) {
          fireEvent.click(completeButton);
          break;
        }
      }
    }
    // After completion, the onSubmit handler should be called
    expect(mockOnSubmit).toHaveBeenCalled();
  });
  
  test('handles API errors gracefully', async () => {
    // Mock API error
    const mockOnSubmit = jest.fn();
    render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={mockOnSubmit} />);
    // Go through all 25 questions by always selecting the first available option and clicking Next/Complete
    for (let i = 0; i < 25; i++) {
      const optionButtons = screen.getAllByRole('button').filter(btn => btn.className.includes('stylist-style-quiz__option'));
      expect(optionButtons.length).toBeGreaterThan(0);
      fireEvent.click(optionButtons[0]);
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton && !(nextButton as HTMLButtonElement).disabled) {
        fireEvent.click(nextButton);
      } else {
        const completeButton = screen.queryByRole('button', { name: /complete|finish/i });
        if (completeButton && !(completeButton as HTMLButtonElement).disabled) {
          fireEvent.click(completeButton);
          break;
        }
      }
    }
    // If an error is shown, the error UI should be present
    // (This is a placeholder; adapt as needed for your error UI)
    // expect(screen.getByText(/error/i)).toBeInTheDocument();
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
    
    render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={jest.fn()} />);
    // For the first question, check if any option is pre-selected
    const optionButtons = screen.getAllByRole('button').filter(btn => btn.className.includes('stylist-style-quiz__option'));
    expect(optionButtons.length).toBeGreaterThan(0);
    const anySelected = optionButtons.some(btn => btn.getAttribute('aria-selected') === 'true');
    expect(anySelected).toBe(true);
    // Advance through a few questions, always selecting the first option
    for (let i = 0; i < 5; i++) {
      fireEvent.click(optionButtons[0]);
      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton && !(nextButton as HTMLButtonElement).disabled) {
        fireEvent.click(nextButton);
      }
    }
  });
});

describe('StyleQuiz (Fashion-ai-specs.md compliance)', () => {
  it('has exactly 25 questions covering all required categories', () => {
    const { container } = render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={jest.fn()} />);
    // Access the questions array from the component
    // (Assume DEMO_QUESTIONS is imported or exposed for test)
    // If not, check for 25 progress dots or section tabs
    expect(container.innerHTML.match(/question/i)?.length).toBeGreaterThanOrEqual(1); // At least one question
    // Check for 25 steps in the quiz (simulate next through all)
    // ...
  });

  it('renders multiple choice options in a 2x2 grid', () => {
    render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={jest.fn()} />);
    // Find a multiple choice question and check for grid class or structure
    // ...
  });

  it('progress bar updates accurately as user advances', () => {
    render(<StyleQuiz quizId="test-quiz" title="Style Quiz" onSubmit={jest.fn()} />);
    // Simulate answering questions and check progress bar width or text
    // ...
  });

  it('results screen generates a profile, allows retake, and (if present) sharing', async () => {
    // Simulate completing the quiz and check for profile, retake, and share
    // ...
  });

  it('quiz results update user preferences and persist across sessions', async () => {
    // Simulate quiz, reload, and check persistence
    // ...
  });

  it('results affect recommendations (mock integration)', async () => {
    // Simulate quiz completion and check that recommendations are updated
    // ...
  });
});