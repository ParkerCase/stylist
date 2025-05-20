// Style quiz component for gathering user preferences

import React, { useState, useEffect, useMemo } from 'react';
import './StyleQuiz.scss';
import { StyleQuizQuestion, StyleQuizAnswer } from '../../types/index';
import { 
  SingleChoiceQuestion, 
  MultipleChoiceQuestion, 
  ImageChoiceQuestion, 
  SliderQuestion 
} from './questions';

interface StyleQuizProps {
  quizId: string;
  title: string;
  description?: string;
  onSubmit: (answers: StyleQuizAnswer[]) => void;
  primaryColor?: string;
}

// Quiz sections definition
const quizSections = {
  basics: "Style, size, gender (Q1-5)",
  preferences: "Colors, patterns, fits (Q6-10)", 
  lifestyle: "Occasions, activities (Q11-15)",
  brands: "Favorite brands, budget (Q16-20)",
  celebrities: "Style icons, looks (Q21-25)"
};

// Comprehensive 25-question style quiz organized into 5 sections with 5 questions each
export const DEMO_QUESTIONS: StyleQuizQuestion[] = [
  // SECTION 1: BASICS (Q1-5)
  // Q1: Gender
  {
    id: 'q1',
    questionText: 'Which clothing category do you primarily shop?',
    type: 'single',
    options: [
      { id: 'womens', text: 'Women\'s', value: 'womens' },
      { id: 'mens', text: 'Men\'s', value: 'mens' },
      { id: 'unisex', text: 'Unisex/Gender-neutral', value: 'unisex' },
      { id: 'mixed', text: 'Mix of different categories', value: 'mixed' }
    ],
    category: 'basics',
    section: 'basics'
  },
  // Q2: Overall Style
  {
    id: 'q2',
    questionText: 'How would you describe your overall fashion style?',
    type: 'image',
    options: [
      { id: 'classic', text: 'Classic & Timeless', value: 'classic', imageUrl: 'https://images.unsplash.com/photo-1603189343302-e603f7add05a?w=400&h=300&fit=crop' },
      { id: 'minimalist', text: 'Minimalist & Clean', value: 'minimalist', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop' },
      { id: 'trendy', text: 'Trendy & Fashion-Forward', value: 'trendy', imageUrl: 'https://images.unsplash.com/photo-1523359346063-d879354c0ea5?w=400&h=300&fit=crop' },
      { id: 'edgy', text: 'Edgy & Alternative', value: 'edgy', imageUrl: 'https://images.unsplash.com/photo-1536243298747-ea8874136d64?w=400&h=300&fit=crop' },
      { id: 'sporty', text: 'Sporty & Casual', value: 'sporty', imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&h=300&fit=crop' },
      { id: 'bohemian', text: 'Bohemian & Free-Spirited', value: 'bohemian', imageUrl: 'https://images.unsplash.com/photo-1534777620591-29eb7d8d7563?w=400&h=300&fit=crop' }
    ],
    category: 'style',
    section: 'basics'
  },
  // Q3: Tops Size
  {
    id: 'q3',
    questionText: 'What size do you typically wear for tops?',
    type: 'single',
    options: [
      { id: 'xs', text: 'XS', value: 'xs' },
      { id: 's', text: 'S', value: 's' },
      { id: 'm', text: 'M', value: 'm' },
      { id: 'l', text: 'L', value: 'l' },
      { id: 'xl', text: 'XL', value: 'xl' },
      { id: 'xxl', text: 'XXL+', value: 'xxl' }
    ],
    category: 'size',
    section: 'basics'
  },
  // Q4: Bottoms Size
  {
    id: 'q4',
    questionText: 'What size do you typically wear for bottoms/pants?',
    type: 'single',
    options: [
      { id: '0-2', text: '0-2', value: '0-2' },
      { id: '4-6', text: '4-6', value: '4-6' },
      { id: '8-10', text: '8-10', value: '8-10' },
      { id: '12-14', text: '12-14', value: '12-14' },
      { id: '16-18', text: '16-18', value: '16-18' },
      { id: '20+', text: '20+', value: '20+' }
    ],
    category: 'size',
    section: 'basics'
  },
  // Q5: Shoe Size
  {
    id: 'q5',
    questionText: 'What shoe size do you typically wear?',
    type: 'single',
    options: [
      { id: 'us5', text: 'US 5 / EU 35-36', value: 'us5' },
      { id: 'us6', text: 'US 6 / EU 36-37', value: 'us6' },
      { id: 'us7', text: 'US 7 / EU 37-38', value: 'us7' },
      { id: 'us8', text: 'US 8 / EU 38-39', value: 'us8' },
      { id: 'us9', text: 'US 9 / EU 39-40', value: 'us9' },
      { id: 'us10', text: 'US 10 / EU 40-41', value: 'us10' },
      { id: 'us11', text: 'US 11 / EU 41-42', value: 'us11' },
      { id: 'us12', text: 'US 12+ / EU 42+', value: 'us12' }
    ],
    category: 'size',
    section: 'basics'
  },

  // SECTION 2: PREFERENCES (Q6-10)
  // Q6: Color Palette
  {
    id: 'q6',
    questionText: 'Which color palette do you prefer for your wardrobe?',
    type: 'image',
    options: [
      { id: 'neutrals', text: 'Neutrals (Black, White, Grey, Beige)', value: 'neutrals', imageUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=400&h=300&fit=crop' },
      { id: 'earthy', text: 'Earthy Tones (Brown, Olive, Rust)', value: 'earthy', imageUrl: 'https://images.unsplash.com/photo-1514362453360-8f94243c9996?w=400&h=300&fit=crop' },
      { id: 'pastels', text: 'Pastels (Light Pink, Baby Blue, Lavender)', value: 'pastels', imageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=300&fit=crop' },
      { id: 'bold', text: 'Bold & Bright Colors (Red, Yellow, Electric Blue)', value: 'bold', imageUrl: 'https://images.unsplash.com/photo-1535639818669-c059d2f038e6?w=400&h=300&fit=crop' },
      { id: 'monochrome', text: 'Monochrome or All-Black', value: 'monochrome', imageUrl: 'https://images.unsplash.com/photo-1550330550-36e5c4d9b0c3?w=400&h=300&fit=crop' }
    ],
    category: 'color',
    section: 'preferences'
  },
  // Q7: Pattern Preference
  {
    id: 'q7',
    questionText: 'Which patterns do you typically wear?',
    type: 'multiple',
    options: [
      { id: 'solid', text: 'Solid Colors (No Pattern)', value: 'solid' },
      { id: 'stripes', text: 'Stripes', value: 'stripes' },
      { id: 'floral', text: 'Floral', value: 'floral' },
      { id: 'geometric', text: 'Geometric', value: 'geometric' },
      { id: 'animal', text: 'Animal Print', value: 'animal' },
      { id: 'plaid', text: 'Plaid/Check', value: 'plaid' }
    ],
    category: 'pattern',
    section: 'preferences'
  },
  // Q8: Top Fit Preference
  {
    id: 'q8',
    questionText: 'How do you prefer your tops to fit?',
    type: 'image',
    options: [
      { id: 'oversized', text: 'Oversized & Relaxed', value: 'oversized', imageUrl: 'https://images.unsplash.com/photo-1542837209-3bd9538b3a96?w=400&h=300&fit=crop' },
      { id: 'fitted', text: 'Slim & Fitted', value: 'fitted', imageUrl: 'https://images.unsplash.com/photo-1570727624862-3008fe67a6f9?w=400&h=300&fit=crop' },
      { id: 'cropped', text: 'Cropped', value: 'cropped', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop' },
      { id: 'structured', text: 'Boxy & Structured', value: 'structured', imageUrl: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&h=300&fit=crop' }
    ],
    category: 'fit',
    section: 'preferences'
  },
  // Q9: Bottom Fit Preference
  {
    id: 'q9',
    questionText: 'How do you prefer your bottoms to fit?',
    type: 'image',
    options: [
      { id: 'skinny', text: 'Skinny/Slim', value: 'skinny', imageUrl: 'https://images.unsplash.com/photo-1598808503824-9725718f223d?w=400&h=300&fit=crop' },
      { id: 'relaxed', text: 'Relaxed/Regular', value: 'relaxed', imageUrl: 'https://images.unsplash.com/photo-1581985673473-0784a7a44e39?w=400&h=300&fit=crop' },
      { id: 'wide', text: 'Wide Leg', value: 'wide', imageUrl: 'https://images.unsplash.com/photo-1593030103066-0093718efeb9?w=400&h=300&fit=crop' },
      { id: 'straight', text: 'Straight Cut', value: 'straight', imageUrl: 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=300&fit=crop' }
    ],
    category: 'fit',
    section: 'preferences'
  },
  // Q10: Fabric Preferences
  {
    id: 'q10',
    questionText: 'Which fabric types do you prefer?',
    type: 'multiple',
    options: [
      { id: 'cotton', text: 'Cotton', value: 'cotton' },
      { id: 'linen', text: 'Linen', value: 'linen' },
      { id: 'silk', text: 'Silk', value: 'silk' },
      { id: 'wool', text: 'Wool', value: 'wool' },
      { id: 'synthetic', text: 'Synthetic/Technical Fabrics', value: 'synthetic' },
      { id: 'leather', text: 'Leather', value: 'leather' },
      { id: 'denim', text: 'Denim', value: 'denim' },
      { id: 'knit', text: 'Knits', value: 'knit' }
    ],
    category: 'fabrics',
    section: 'preferences'
  },

  // SECTION 3: LIFESTYLE (Q11-15)
  // Q11: Occasion Types
  {
    id: 'q11',
    questionText: 'What type of outfits do you need the most recommendations for?',
    type: 'multiple',
    options: [
      { id: 'casual', text: 'Everyday Casual', value: 'casual' },
      { id: 'work', text: 'Workwear & Business Casual', value: 'work' },
      { id: 'street', text: 'Streetwear & Trendy Looks', value: 'street' },
      { id: 'date', text: 'Date Night & Going Out', value: 'date' },
      { id: 'formal', text: 'Formal & Special Events', value: 'formal' }
    ],
    category: 'occasion',
    section: 'lifestyle'
  },
  // Q12: Work Environment
  {
    id: 'q12',
    questionText: 'What best describes your work environment dress code?',
    type: 'single',
    options: [
      { id: 'formal', text: 'Formal/Business Professional', value: 'formal' },
      { id: 'business', text: 'Business Casual', value: 'business' },
      { id: 'casual', text: 'Casual', value: 'casual' },
      { id: 'creative', text: 'Creative/No Dress Code', value: 'creative' },
      { id: 'uniform', text: 'Uniform Required', value: 'uniform' },
      { id: 'na', text: 'Not Applicable', value: 'na' }
    ],
    category: 'lifestyle',
    section: 'lifestyle'
  },
  // Q13: Active Lifestyle
  {
    id: 'q13',
    questionText: 'How active is your lifestyle?',
    type: 'single',
    options: [
      { id: 'very', text: 'Very active - I need clothes for frequent exercise', value: 'very' },
      { id: 'moderately', text: 'Moderately active - occasional exercise', value: 'moderately' },
      { id: 'somewhat', text: 'Somewhat active - light activity', value: 'somewhat' },
      { id: 'not', text: 'Not very active', value: 'not' }
    ],
    category: 'lifestyle',
    section: 'lifestyle'
  },
  // Q14: Seasonal Preference
  {
    id: 'q14',
    questionText: 'Which season do you most enjoy dressing for?',
    type: 'image',
    options: [
      { id: 'spring', text: 'Spring', value: 'spring', imageUrl: 'https://images.unsplash.com/photo-1497942304796-b8bc2cc898f3?w=400&h=300&fit=crop' },
      { id: 'summer', text: 'Summer', value: 'summer', imageUrl: 'https://images.unsplash.com/photo-1517206577696-6ce38fb787a3?w=400&h=300&fit=crop' },
      { id: 'fall', text: 'Fall/Autumn', value: 'fall', imageUrl: 'https://images.unsplash.com/photo-1551843073-4a9a5b6fcd5f?w=400&h=300&fit=crop' },
      { id: 'winter', text: 'Winter', value: 'winter', imageUrl: 'https://images.unsplash.com/photo-1515311320503-6591cade8414?w=400&h=300&fit=crop' }
    ],
    category: 'seasonal',
    section: 'lifestyle'
  },
  // Q15: Layering Preference
  {
    id: 'q15',
    questionText: 'How do you feel about layering clothes?',
    type: 'single',
    options: [
      { id: 'love', text: 'Love it - the more layers the better', value: 'love' },
      { id: 'sometimes', text: 'Sometimes - when appropriate for weather', value: 'sometimes' },
      { id: 'minimal', text: 'Prefer minimal layers', value: 'minimal' },
      { id: 'avoid', text: 'Avoid layering when possible', value: 'avoid' }
    ],
    category: 'styling',
    section: 'lifestyle'
  },

  // SECTION 4: BRANDS & BUDGET (Q16-20)
  // Q16: Budget Range
  {
    id: 'q16',
    questionText: "What's your typical budget for a single clothing item?",
    type: 'slider',
    minValue: 0,
    maxValue: 500,
    step: 10,
    category: 'budget',
    section: 'brands'
  },
  // Q17: Shopping Frequency
  {
    id: 'q17',
    questionText: 'How often do you shop for clothes?',
    type: 'single',
    options: [
      { id: 'weekly', text: 'Weekly', value: 'weekly' },
      { id: 'monthly', text: 'Monthly', value: 'monthly' },
      { id: 'seasonally', text: 'Seasonally', value: 'seasonally' },
      { id: 'rarely', text: 'Rarely/As needed', value: 'rarely' }
    ],
    category: 'shopping',
    section: 'brands'
  },
  // Q18: Casual Brands
  {
    id: 'q18',
    questionText: 'Which casual wear brands do you typically shop?',
    type: 'multiple',
    options: [
      { id: 'zara', text: 'Zara', value: 'zara' },
      { id: 'hm', text: 'H&M', value: 'hm' },
      { id: 'uniqlo', text: 'Uniqlo', value: 'uniqlo' },
      { id: 'gap', text: 'Gap', value: 'gap' },
      { id: 'jcrew', text: 'J.Crew', value: 'jcrew' },
      { id: 'madewell', text: 'Madewell', value: 'madewell' },
      { id: 'everlane', text: 'Everlane', value: 'everlane' },
      { id: 'aritzia', text: 'Aritzia', value: 'aritzia' },
      { id: 'mango', text: 'Mango', value: 'mango' },
      { id: 'urban', text: 'Urban Outfitters', value: 'urban' },
      { id: 'abercrombie', text: 'Abercrombie & Fitch', value: 'abercrombie' },
      { id: 'ae', text: 'American Eagle', value: 'ae' },
      { id: 'other_casual', text: 'Other', value: 'other_casual' }
    ],
    category: 'brand',
    section: 'brands'
  },
  // Q19: Athletic Brands
  {
    id: 'q19',
    questionText: 'Which athletic/athleisure brands do you prefer?',
    type: 'multiple',
    options: [
      { id: 'nike', text: 'Nike', value: 'nike' },
      { id: 'adidas', text: 'Adidas', value: 'adidas' },
      { id: 'lululemon', text: 'Lululemon', value: 'lululemon' },
      { id: 'athleta', text: 'Athleta', value: 'athleta' },
      { id: 'under_armour', text: 'Under Armour', value: 'under_armour' },
      { id: 'puma', text: 'Puma', value: 'puma' },
      { id: 'alo', text: 'Alo Yoga', value: 'alo' },
      { id: 'new_balance', text: 'New Balance', value: 'new_balance' },
      { id: 'gymshark', text: 'Gymshark', value: 'gymshark' },
      { id: 'fabletics', text: 'Fabletics', value: 'fabletics' },
      { id: 'other_athletic', text: 'Other', value: 'other_athletic' }
    ],
    category: 'brand',
    section: 'brands'
  },
  // Q20: Luxury Brands
  {
    id: 'q20',
    questionText: 'Do you shop any luxury or designer brands?',
    type: 'multiple',
    options: [
      { id: 'none', text: 'None/Not regularly', value: 'none' },
      { id: 'coach', text: 'Coach', value: 'coach' },
      { id: 'mk', text: 'Michael Kors', value: 'mk' },
      { id: 'tory_burch', text: 'Tory Burch', value: 'tory_burch' },
      { id: 'theory', text: 'Theory', value: 'theory' },
      { id: 'allsaints', text: 'AllSaints', value: 'allsaints' },
      { id: 'gucci', text: 'Gucci', value: 'gucci' },
      { id: 'louis', text: 'Louis Vuitton', value: 'louis' },
      { id: 'chanel', text: 'Chanel', value: 'chanel' },
      { id: 'prada', text: 'Prada', value: 'prada' },
      { id: 'burberry', text: 'Burberry', value: 'burberry' },
      { id: 'other_luxury', text: 'Other', value: 'other_luxury' }
    ],
    category: 'brand',
    section: 'brands'
  },

  // SECTION 5: CELEBRITY STYLE & INSPIRATION (Q21-25)
  // Q21: Modern Celebrity Inspiration
  {
    id: 'q21',
    questionText: "Which celebrity's style do you most admire? (Modern Icons)",
    type: 'image',
    options: [
      { id: 'zendaya', text: 'Zendaya (Fashion-Forward)', value: 'zendaya', imageUrl: 'https://www.fillmurray.com/400/301' },
      { id: 'harry', text: 'Harry Styles (Bold & Eclectic)', value: 'harry', imageUrl: 'https://www.fillmurray.com/401/300' },
      { id: 'rihanna', text: 'Rihanna (Trendsetter)', value: 'rihanna', imageUrl: 'https://www.fillmurray.com/401/302' },
      { id: 'timothee', text: 'Timothée Chalamet (Modern Minimal)', value: 'timothee', imageUrl: 'https://www.fillmurray.com/400/302' },
      { id: 'hailey', text: 'Hailey Bieber (Cool Girl)', value: 'hailey', imageUrl: 'https://www.fillmurray.com/402/301' },
      { id: 'asap', text: 'A$AP Rocky (Streetwear)', value: 'asap', imageUrl: 'https://www.fillmurray.com/403/300' }
    ],
    category: 'inspiration',
    section: 'celebrities'
  },
  // Q22: Classic Celebrity Inspiration
  {
    id: 'q22',
    questionText: "Which celebrity's style do you most admire? (Classic Icons)",
    type: 'image',
    options: [
      { id: 'audrey', text: 'Audrey Hepburn (Timeless)', value: 'audrey', imageUrl: 'https://www.fillmurray.com/400/300' },
      { id: 'jlo', text: 'Jennifer Lopez (Glamorous)', value: 'jlo', imageUrl: 'https://www.fillmurray.com/402/300' },
      { id: 'beyonce', text: 'Beyoncé (Bold & Confident)', value: 'beyonce', imageUrl: 'https://www.fillmurray.com/404/300' },
      { id: 'pharrell', text: 'Pharrell Williams (Streetwear)', value: 'pharrell', imageUrl: 'https://www.fillmurray.com/401/301' },
      { id: 'blake', text: 'Blake Lively (Classic Chic)', value: 'blake', imageUrl: 'https://www.fillmurray.com/403/302' },
      { id: 'beckham', text: 'David Beckham (Polished)', value: 'beckham', imageUrl: 'https://www.fillmurray.com/405/300' }
    ],
    category: 'inspiration',
    section: 'celebrities'
  },
  // Q23: Trend Approach
  {
    id: 'q23',
    questionText: 'How do you approach fashion trends?',
    type: 'single',
    options: [
      { id: 'early', text: 'Early adopter - always trying new trends', value: 'early' },
      { id: 'selective', text: 'Selective - adopt trends that match my style', value: 'selective' },
      { id: 'wait', text: 'Wait and see - adopt trends after they\'re established', value: 'wait' },
      { id: 'avoid', text: 'Avoid trends - prefer timeless styles', value: 'avoid' }
    ],
    category: 'styling',
    section: 'celebrities'
  },
  // Q24: Comfort vs Style Priority
  {
    id: 'q24',
    questionText: 'When it comes to choosing clothes, you prioritize:',
    type: 'slider',
    minValue: 0,
    maxValue: 100,
    step: 1,
    category: 'priorities',
    section: 'celebrities'
  },
  // Q25: Style Goal
  {
    id: 'q25',
    questionText: "What's your main style goal right now?",
    type: 'single',
    options: [
      { id: 'refresh', text: 'Refresh my everyday wardrobe', value: 'refresh' },
      { id: 'special', text: 'Find outfits for special occasions', value: 'special' },
      { id: 'transition', text: 'Transition to a new style', value: 'transition' },
      { id: 'minimize', text: 'Build a capsule wardrobe', value: 'minimize' },
      { id: 'experiment', text: 'Experiment with new styles', value: 'experiment' },
      { id: 'confidence', text: 'Gain confidence in my clothing choices', value: 'confidence' }
    ],
    category: 'goals',
    section: 'celebrities'
  }
];

const STORAGE_KEY = 'stylist_quiz_progress';

const StyleQuiz: React.FC<StyleQuizProps> = ({
  quizId,
  title,
  description,
  onSubmit,
  primaryColor
}) => {
  // Using DEMO_QUESTIONS directly, no need to update these
  const [questions] = useState<StyleQuizQuestion[]>(DEMO_QUESTIONS);
  
  // Try to load saved progress from localStorage
  const loadSavedProgress = () => {
    try {
      const savedProgress = localStorage.getItem(`${STORAGE_KEY}_${quizId}`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        if (progress.answers && Array.isArray(progress.answers)) {
          return {
            currentQuestionIndex: progress.currentQuestion || 0,
            savedAnswers: progress.answers as StyleQuizAnswer[],
            activeSection: progress.activeSection || 'basics'
          };
        }
      }
    } catch (e) {
      console.error('Error loading saved quiz progress:', e);
    }
    return { 
      currentQuestionIndex: 0, 
      savedAnswers: [],
      activeSection: 'basics'
    };
  };
  
  const { currentQuestionIndex, savedAnswers, activeSection: savedSection } = loadSavedProgress();
  
  const [currentQuestion, setCurrentQuestion] = useState(currentQuestionIndex);
  const [answers, setAnswers] = useState<StyleQuizAnswer[]>(savedAnswers);
  const [activeSection, setActiveSection] = useState(savedSection);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  
  // Save progress to localStorage whenever answers or current question changes
  useEffect(() => {
    try {
      const progress = {
        currentQuestion,
        answers,
        activeSection
      };
      localStorage.setItem(`${STORAGE_KEY}_${quizId}`, JSON.stringify(progress));
    } catch (e) {
      console.error('Error saving quiz progress:', e);
    }
  }, [currentQuestion, answers, activeSection, quizId]);
  
  // Track the quiz progress for analytics but don't trigger the actual submission
  // We're passing progress to the parent for tracking purposes only
  useEffect(() => {
    // Skip empty answers array (initial render)
    if (answers.length === 0) return;
    
    // Skip if we're submitting the final result
    if (submitting) return;
    
    // Inform the parent component about answer updates (useful for tracking abandonment)
    // The parent will decide whether to treat this as a real submission or just tracking
    onSubmit(answers);
  }, [answers, submitting, onSubmit]);
  
  // Group questions by section
  const questionsBySection = useMemo(() => {
    return questions.reduce((acc, question) => {
      if (!acc[question.section]) {
        acc[question.section] = [];
      }
      acc[question.section].push(question);
      return acc;
    }, {} as Record<string, StyleQuizQuestion[]>);
  }, [questions]);
  
  // Get questions for current section
  const currentSectionQuestions = useMemo(() => {
    return questionsBySection[activeSection] || [];
  }, [questionsBySection, activeSection]);
  
  // Get current question object
  const questionIndex = currentSectionQuestions.findIndex(q => q.id === questions[currentQuestion]?.id);
  const question = currentSectionQuestions[questionIndex >= 0 ? questionIndex : 0] || questions[currentQuestion];
  
  // Check if this is the last question in the current section
  const isLastQuestionInSection = questionIndex === currentSectionQuestions.length - 1;
  
  // Check if this is the last question overall
  const isLastQuestion = currentQuestion === questions.length - 1;
  
  // Calculate section progress
  const getSectionProgress = (section: string) => {
    const sectionQuestions = questionsBySection[section] || [];
    const answeredQuestions = answers.filter(a => 
      sectionQuestions.some(q => q.id === a.questionId)
    ).length;
    
    return {
      total: sectionQuestions.length,
      answered: answeredQuestions,
      percentage: Math.round((answeredQuestions / Math.max(sectionQuestions.length, 1)) * 100)
    };
  };
  
  // Main answer handler function
  const handleAnswerUpdate = (questionId: string, answer: StyleQuizAnswer) => {
    const newAnswers = [...answers];
    const existingIndex = answers.findIndex(a => a.questionId === questionId);
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answer;
    } else {
      newAnswers.push(answer);
    }
    
    setAnswers(newAnswers);
    
    // Auto-advance if it's a single or image type question
    if ((question.type === 'single' || question.type === 'image') && 
        answer.answerId && 
        currentQuestion < questions.length - 1) {
      setTimeout(() => {
        handleNextQuestion();
      }, 300);
    }
  };
  
  // Function to handle going to the next question
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      // Check if we need to move to the next section
      if (isLastQuestionInSection) {
        // Get the next section
        const sectionKeys = Object.keys(quizSections);
        const currentSectionIndex = sectionKeys.indexOf(activeSection);
        
        if (currentSectionIndex < sectionKeys.length - 1) {
          const nextSection = sectionKeys[currentSectionIndex + 1];
          
          // Animate the transition
          document.querySelector('.stylist-style-quiz__section-content')?.classList.add('fade-out');
          setTimeout(() => {
            setActiveSection(nextSection);
            // Find the first question in the next section
            const nextSectionQuestions = questionsBySection[nextSection] || [];
            const nextQuestionIndex = questions.findIndex(q => q.id === nextSectionQuestions[0]?.id);
            setCurrentQuestion(nextQuestionIndex >= 0 ? nextQuestionIndex : currentQuestion + 1);
            
            document.querySelector('.stylist-style-quiz__section-content')?.classList.remove('fade-out');
            document.querySelector('.stylist-style-quiz__section-content')?.classList.add('fade-in');
            setTimeout(() => {
              document.querySelector('.stylist-style-quiz__section-content')?.classList.remove('fade-in');
            }, 300);
          }, 200);
        }
      } else {
        // Just move to next question within current section
        document.querySelector('.stylist-style-quiz__question')?.classList.add('fade-out');
        setTimeout(() => {
          setCurrentQuestion(currentQuestion + 1);
          document.querySelector('.stylist-style-quiz__question')?.classList.remove('fade-out');
          document.querySelector('.stylist-style-quiz__question')?.classList.add('fade-in');
          setTimeout(() => {
            document.querySelector('.stylist-style-quiz__question')?.classList.remove('fade-in');
          }, 300);
        }, 200);
      }
    }
  };
  
  // Function to handle going to the previous question
  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      // Check if we need to move to the previous section
      if (questionIndex === 0) {
        // Get the previous section
        const sectionKeys = Object.keys(quizSections);
        const currentSectionIndex = sectionKeys.indexOf(activeSection);
        
        if (currentSectionIndex > 0) {
          const prevSection = sectionKeys[currentSectionIndex - 1];
          
          // Animate the transition
          document.querySelector('.stylist-style-quiz__section-content')?.classList.add('fade-out');
          setTimeout(() => {
            setActiveSection(prevSection);
            // Find the last question in the previous section
            const prevSectionQuestions = questionsBySection[prevSection] || [];
            const prevQuestionIndex = questions.findIndex(q => q.id === prevSectionQuestions[prevSectionQuestions.length - 1]?.id);
            setCurrentQuestion(prevQuestionIndex >= 0 ? prevQuestionIndex : currentQuestion - 1);
            
            document.querySelector('.stylist-style-quiz__section-content')?.classList.remove('fade-out');
            document.querySelector('.stylist-style-quiz__section-content')?.classList.add('fade-in');
            setTimeout(() => {
              document.querySelector('.stylist-style-quiz__section-content')?.classList.remove('fade-in');
            }, 300);
          }, 200);
        }
      } else {
        // Just move to previous question within current section
        document.querySelector('.stylist-style-quiz__question')?.classList.add('fade-out');
        setTimeout(() => {
          setCurrentQuestion(currentQuestion - 1);
          document.querySelector('.stylist-style-quiz__question')?.classList.remove('fade-out');
          document.querySelector('.stylist-style-quiz__question')?.classList.add('fade-in');
          setTimeout(() => {
            document.querySelector('.stylist-style-quiz__question')?.classList.remove('fade-in');
          }, 300);
        }, 200);
      }
    }
  };
  
  // Function to jump to a specific section
  const jumpToSection = (section: string) => {
    // Get first question in the target section
    const targetSectionQuestions = questionsBySection[section] || [];
    if (targetSectionQuestions.length === 0) return;
    
    const targetQuestionIndex = questions.findIndex(q => q.id === targetSectionQuestions[0].id);
    if (targetQuestionIndex === -1) return;
    
    // Animate the transition
    document.querySelector('.stylist-style-quiz__section-content')?.classList.add('fade-out');
    setTimeout(() => {
      setActiveSection(section);
      setCurrentQuestion(targetQuestionIndex);
      
      document.querySelector('.stylist-style-quiz__section-content')?.classList.remove('fade-out');
      document.querySelector('.stylist-style-quiz__section-content')?.classList.add('fade-in');
      setTimeout(() => {
        document.querySelector('.stylist-style-quiz__section-content')?.classList.remove('fade-in');
      }, 300);
    }, 200);
  };
  
  // Function to skip to results
  const handleSkipToResults = () => {
    setShowSkipConfirm(true);
  };
  
  // Function to confirm skip to results
  const confirmSkipToResults = () => {
    setShowSkipConfirm(false);
    handleSubmit();
  };
  
  // Function to cancel skip to results
  const cancelSkipToResults = () => {
    setShowSkipConfirm(false);
  };
  
  // Function to check if the current question has been answered
  const isCurrentQuestionAnswered = () => {
    return !!answers.find(a => a.questionId === question.id);
  };
  
  const handleSubmit = () => {
    if (submitting) return; // Prevent double submission
    
    setSubmitting(true);
    onSubmit(answers);
  };
  
  // If loading show loading state
  if (loading) {
    return (
      <div className="stylist-style-quiz stylist-style-quiz--loading">
        <div className="stylist-style-quiz__loader">Loading quiz...</div>
      </div>
    );
  }
  
  if (questions.length === 0) {
    return (
      <div className="stylist-style-quiz stylist-style-quiz--error">
        <div className="stylist-style-quiz__error">
          Sorry, we couldn&apos;t load the style quiz. Please try again later.
        </div>
      </div>
    );
  }
  
  // Calculate overall completion percentage
  const completionPercentage = Math.round((answers.length / questions.length) * 100);
  
  // Render the question based on its type
  const renderQuestion = () => {
    if (!question) return null;
    
    // Get current answer for this question
    const currentAnswer = answers.find(a => a.questionId === question.id);
    
    // Shared props for all question types
    const commonProps = {
      question,
      currentAnswer,
      onAnswer: handleAnswerUpdate,
      primaryColor
    };
    
    switch (question.type) {
      case 'single':
        return <SingleChoiceQuestion {...commonProps} />;
      
      case 'image':
        return <ImageChoiceQuestion {...commonProps} />;
        
      case 'multiple':
        return <MultipleChoiceQuestion {...commonProps} />;
        
      case 'slider':
        return <SliderQuestion {...commonProps} />;
        
      default:
        return null;
    }
  };
  
  // Render section navigation tabs
  const renderSectionTabs = () => {
    return (
      <div className="stylist-style-quiz__section-tabs">
        {Object.entries(quizSections).map(([sectionKey, sectionLabel]) => {
          const sectionProgress = getSectionProgress(sectionKey);
          const isActive = activeSection === sectionKey;
          
          return (
            <button
              key={sectionKey}
              className={`stylist-style-quiz__section-tab ${isActive ? 'stylist-style-quiz__section-tab--active' : ''}`}
              onClick={() => jumpToSection(sectionKey)}
              disabled={answers.length === 0 && sectionKey !== 'basics'} // Can't jump ahead if no answers yet
              style={isActive ? { borderColor: primaryColor, color: primaryColor } : undefined}
            >
              <div className="stylist-style-quiz__section-tab-label">{sectionLabel}</div>
              <div 
                className="stylist-style-quiz__section-tab-progress"
                style={{ width: `${sectionProgress.percentage}%`, backgroundColor: primaryColor }}
              ></div>
            </button>
          );
        })}
      </div>
    );
  };
  
  // Render the skip confirmation dialog
  const renderSkipConfirmation = () => {
    if (!showSkipConfirm) return null;
    
    return (
      <div className="stylist-style-quiz__skip-confirm">
        <div className="stylist-style-quiz__skip-confirm-backdrop" onClick={cancelSkipToResults}></div>
        <div className="stylist-style-quiz__skip-confirm-dialog">
          <h4>Skip to Results?</h4>
          <p>You've answered {answers.length} of {questions.length} questions ({completionPercentage}% complete).</p>
          <p>More answers will improve your personalized recommendations. Are you sure you want to skip to results?</p>
          <div className="stylist-style-quiz__skip-confirm-actions">
            <button 
              className="stylist-style-quiz__button stylist-style-quiz__button--secondary"
              onClick={cancelSkipToResults}
            >
              Continue Quiz
            </button>
            <button 
              className="stylist-style-quiz__button stylist-style-quiz__button--primary"
              onClick={confirmSkipToResults}
              style={{ backgroundColor: primaryColor }}
            >
              Skip to Results
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="stylist-style-quiz">
      <div className="stylist-style-quiz__header">
        <h3 className="stylist-style-quiz__title">{title}</h3>
        {description && (
          <p className="stylist-style-quiz__description">{description}</p>
        )}
      </div>
      
      {/* Overall progress bar */}
      <div className="stylist-style-quiz__progress">
        <div
          className="stylist-style-quiz__progress-bar"
          style={{
            width: `${completionPercentage}%`,
            backgroundColor: primaryColor
          }}
        ></div>
        <div className="stylist-style-quiz__progress-text">
          {completionPercentage}% Complete
        </div>
      </div>
      
      {/* Section tabs navigation */}
      {renderSectionTabs()}
      
      {/* Current section content */}
      <div className="stylist-style-quiz__section-content">
        <div className="stylist-style-quiz__section-header">
          <h3 className="stylist-style-quiz__section-title">
            {quizSections[activeSection]}
          </h3>
          
          <div className="stylist-style-quiz__section-progress">
            <span>
              Question {questionIndex + 1} of {currentSectionQuestions.length}
            </span>
          </div>
        </div>
        
        <div className="stylist-style-quiz__question">
          <div className="stylist-style-quiz__question-number">
            Question {currentQuestion + 1} of {questions.length}
          </div>
          <h4 className="stylist-style-quiz__question-text">{question.questionText}</h4>
        </div>
        
        {renderQuestion()}
        
        <div className="stylist-style-quiz__actions">
          {currentQuestion > 0 && (
            <button
              className="stylist-style-quiz__button stylist-style-quiz__button--secondary"
              onClick={handlePreviousQuestion}
            >
              Previous
            </button>
          )}
          
          {/* Skip to results button (only show after answering at least 5 questions) */}
          {answers.length >= 5 && !isLastQuestion && (
            <button
              className="stylist-style-quiz__button stylist-style-quiz__button--skip"
              onClick={handleSkipToResults}
            >
              Skip to Results
            </button>
          )}
          
          {isLastQuestion ? (
            <button
              className="stylist-style-quiz__button stylist-style-quiz__button--primary"
              onClick={handleSubmit}
              style={{ backgroundColor: primaryColor }}
              disabled={!isCurrentQuestionAnswered() || submitting}
            >
              {submitting ? 'Submitting...' : 'Complete Quiz'}
            </button>
          ) : (
            <button
              className="stylist-style-quiz__button stylist-style-quiz__button--primary"
              onClick={handleNextQuestion}
              style={{ backgroundColor: primaryColor }}
              disabled={!isCurrentQuestionAnswered()}
            >
              Next
            </button>
          )}
        </div>
      </div>
      
      {/* Save progress reminder */}
      <div className="stylist-style-quiz__save-progress">
        <div className="stylist-style-quiz__save-progress-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM8 14C4.7 14 2 11.3 2 8C2 4.7 4.7 2 8 2C11.3 2 14 4.7 14 8C14 11.3 11.3 14 8 14Z" fill="currentColor"/>
            <path d="M7 5H9V11H7V5Z" fill="currentColor"/>
            <path d="M7 3H9V5H7V3Z" fill="currentColor"/>
          </svg>
        </div>
        <div className="stylist-style-quiz__save-progress-text">
          Your progress is automatically saved. You can return to complete the quiz later.
        </div>
      </div>
      
      {/* Skip confirmation dialog */}
      {renderSkipConfirmation()}
    </div>
  );
};

export default StyleQuiz;