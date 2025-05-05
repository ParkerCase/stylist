// Style quiz component for gathering user preferences

import React, { useState, useEffect } from 'react';
import './StyleQuiz.scss';
import { StyleQuizQuestion, StyleQuizAnswer } from '../../types/index';

interface StyleQuizProps {
  quizId: string;
  title: string;
  description?: string;
  onSubmit: (answers: StyleQuizAnswer[]) => void;
  primaryColor?: string;
}

// Comprehensive 25-question style quiz with additions for shoe size, accessory size, and brand preferences
const DEMO_QUESTIONS: StyleQuizQuestion[] = [
  // Overall Style
  {
    id: 'q1',
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
    category: 'style'
  },
  // Color Palette
  {
    id: 'q2',
    questionText: 'Which color palette do you prefer for your wardrobe?',
    type: 'image',
    options: [
      { id: 'neutrals', text: 'Neutrals (Black, White, Grey, Beige)', value: 'neutrals', imageUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=400&h=300&fit=crop' },
      { id: 'earthy', text: 'Earthy Tones (Brown, Olive, Rust)', value: 'earthy', imageUrl: 'https://images.unsplash.com/photo-1514362453360-8f94243c9996?w=400&h=300&fit=crop' },
      { id: 'pastels', text: 'Pastels (Light Pink, Baby Blue, Lavender)', value: 'pastels', imageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=300&fit=crop' },
      { id: 'bold', text: 'Bold & Bright Colors (Red, Yellow, Electric Blue)', value: 'bold', imageUrl: 'https://images.unsplash.com/photo-1535639818669-c059d2f038e6?w=400&h=300&fit=crop' },
      { id: 'monochrome', text: 'Monochrome or All-Black', value: 'monochrome', imageUrl: 'https://images.unsplash.com/photo-1550330550-36e5c4d9b0c3?w=400&h=300&fit=crop' }
    ],
    category: 'color'
  },
  // Occasion
  {
    id: 'q3',
    questionText: 'What type of outfits do you need the most recommendations for?',
    type: 'multiple',
    options: [
      { id: 'casual', text: 'Everyday Casual', value: 'casual' },
      { id: 'work', text: 'Workwear & Business Casual', value: 'work' },
      { id: 'street', text: 'Streetwear & Trendy Looks', value: 'street' },
      { id: 'date', text: 'Date Night & Going Out', value: 'date' },
      { id: 'formal', text: 'Formal & Special Events', value: 'formal' }
    ],
    category: 'occasion'
  },
  // Pattern Preference
  {
    id: 'q4',
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
    category: 'pattern'
  },
  // Top Fit
  {
    id: 'q5',
    questionText: 'How do you prefer your tops to fit?',
    type: 'image',
    options: [
      { id: 'oversized', text: 'Oversized & Relaxed', value: 'oversized', imageUrl: 'https://images.unsplash.com/photo-1542837209-3bd9538b3a96?w=400&h=300&fit=crop' },
      { id: 'fitted', text: 'Slim & Fitted', value: 'fitted', imageUrl: 'https://images.unsplash.com/photo-1570727624862-3008fe67a6f9?w=400&h=300&fit=crop' },
      { id: 'cropped', text: 'Cropped', value: 'cropped', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=300&fit=crop' },
      { id: 'structured', text: 'Boxy & Structured', value: 'structured', imageUrl: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=400&h=300&fit=crop' }
    ],
    category: 'fit'
  },
  // Bottom Fit
  {
    id: 'q6',
    questionText: 'How do you prefer your bottoms to fit?',
    type: 'image',
    options: [
      { id: 'skinny', text: 'Skinny/Slim', value: 'skinny', imageUrl: 'https://images.unsplash.com/photo-1598808503824-9725718f223d?w=400&h=300&fit=crop' },
      { id: 'relaxed', text: 'Relaxed/Regular', value: 'relaxed', imageUrl: 'https://images.unsplash.com/photo-1581985673473-0784a7a44e39?w=400&h=300&fit=crop' },
      { id: 'wide', text: 'Wide Leg', value: 'wide', imageUrl: 'https://images.unsplash.com/photo-1593030103066-0093718efeb9?w=400&h=300&fit=crop' },
      { id: 'straight', text: 'Straight Cut', value: 'straight', imageUrl: 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?w=400&h=300&fit=crop' }
    ],
    category: 'fit'
  },
  // Size Profiling
  {
    id: 'q7',
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
    category: 'size'
  },
  {
    id: 'q8',
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
    category: 'size'
  },
  // Budget Range
  {
    id: 'q9',
    questionText: "What's your typical budget for a single clothing item?",
    type: 'single',
    options: [
      { id: 'budget_low', text: 'Under $50', value: 'Under $50' },
      { id: 'budget_medium_low', text: '$50 - $100', value: '$50 - $100' },
      { id: 'budget_medium_high', text: '$100 - $250', value: '$100 - $250' },
      { id: 'budget_high', text: '$250+', value: '$250+' }
    ],
    category: 'budget'
  },
  // Brand Preferences - Casual Wear
  {
    id: 'q10',
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
    category: 'brand'
  },
  // Brand Preferences - Athletic Wear
  {
    id: 'q10a',
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
    category: 'brand'
  },
  // Brand Preferences - Luxury
  {
    id: 'q10b',
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
    category: 'brand'
  },
  // Celebrity Style Matching - Option 1
  {
    id: 'q11',
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
    category: 'inspiration'
  },
  // Celebrity Style Matching - Option 2
  {
    id: 'q11a',
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
    category: 'inspiration'
  },
  // Shoe Preferences
  {
    id: 'q12',
    questionText: 'What types of shoes do you wear most often?',
    type: 'multiple',
    options: [
      { id: 'sneakers', text: 'Sneakers', value: 'sneakers' },
      { id: 'boots', text: 'Boots', value: 'boots' },
      { id: 'flats', text: 'Flats/Loafers', value: 'flats' },
      { id: 'heels', text: 'Heels', value: 'heels' },
      { id: 'sandals', text: 'Sandals', value: 'sandals' },
      { id: 'athletic', text: 'Athletic Shoes', value: 'athletic' }
    ],
    category: 'footwear'
  },
  // Shoe Size
  {
    id: 'q12a',
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
    category: 'size'
  },
  // Accessory Preferences
  {
    id: 'q13',
    questionText: 'Which accessories do you typically wear?',
    type: 'multiple',
    options: [
      { id: 'none', text: 'Minimal/No Accessories', value: 'none' },
      { id: 'earrings', text: 'Earrings', value: 'earrings' },
      { id: 'necklaces', text: 'Necklaces', value: 'necklaces' },
      { id: 'bracelets', text: 'Bracelets/Watches', value: 'bracelets' },
      { id: 'rings', text: 'Rings', value: 'rings' },
      { id: 'scarves', text: 'Scarves/Bandanas', value: 'scarves' },
      { id: 'hats', text: 'Hats', value: 'hats' },
      { id: 'belts', text: 'Belts', value: 'belts' }
    ],
    category: 'accessories'
  },
  // Accessory Sizes
  {
    id: 'q13a',
    questionText: 'What sizes do you typically wear for accessories?',
    type: 'multiple',
    options: [
      { id: 'bracelet_small', text: 'Bracelets: Small (6-7")', value: 'bracelet_small' },
      { id: 'bracelet_medium', text: 'Bracelets: Medium (7-8")', value: 'bracelet_medium' },
      { id: 'bracelet_large', text: 'Bracelets: Large (8"+)', value: 'bracelet_large' },
      { id: 'ring_small', text: 'Rings: Small (5-6)', value: 'ring_small' },
      { id: 'ring_medium', text: 'Rings: Medium (7-8)', value: 'ring_medium' },
      { id: 'ring_large', text: 'Rings: Large (9+)', value: 'ring_large' },
      { id: 'hat_small', text: 'Hats: Small/Medium', value: 'hat_small' },
      { id: 'hat_large', text: 'Hats: Large/XL', value: 'hat_large' },
      { id: 'not_sure', text: 'Not sure / Varies', value: 'not_sure' }
    ],
    category: 'size'
  },
  // Seasonal Preference
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
    category: 'seasonal'
  },
  // Layering Preference
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
    category: 'styling'
  },
  // Shopping Frequency
  {
    id: 'q16',
    questionText: 'How often do you shop for clothes?',
    type: 'single',
    options: [
      { id: 'weekly', text: 'Weekly', value: 'weekly' },
      { id: 'monthly', text: 'Monthly', value: 'monthly' },
      { id: 'seasonally', text: 'Seasonally', value: 'seasonally' },
      { id: 'rarely', text: 'Rarely/As needed', value: 'rarely' }
    ],
    category: 'shopping'
  },
  // Trend Interest
  {
    id: 'q17',
    questionText: 'How do you approach fashion trends?',
    type: 'single',
    options: [
      { id: 'early', text: 'Early adopter - always trying new trends', value: 'early' },
      { id: 'selective', text: 'Selective - adopt trends that match my style', value: 'selective' },
      { id: 'wait', text: 'Wait and see - adopt trends after they\'re established', value: 'wait' },
      { id: 'avoid', text: 'Avoid trends - prefer timeless styles', value: 'avoid' }
    ],
    category: 'styling'
  },
  // Comfort vs Style
  {
    id: 'q18',
    questionText: 'When it comes to choosing clothes, you prioritize:',
    type: 'slider',
    minValue: 0,
    maxValue: 100,
    step: 1,
    category: 'priorities'
  },
  // Sustainability
  {
    id: 'q19',
    questionText: 'How important is sustainability in your clothing choices?',
    type: 'single',
    options: [
      { id: 'very', text: 'Very important - I prioritize sustainable brands', value: 'very' },
      { id: 'somewhat', text: 'Somewhat important - I consider it when convenient', value: 'somewhat' },
      { id: 'neutral', text: 'Neutral - I don\'t specifically seek it out', value: 'neutral' },
      { id: 'not', text: 'Not important to me', value: 'not' }
    ],
    category: 'values'
  },
  // Secondhand Interest
  {
    id: 'q20',
    questionText: 'Do you shop secondhand/vintage clothing?',
    type: 'single',
    options: [
      { id: 'frequently', text: 'Frequently', value: 'frequently' },
      { id: 'sometimes', text: 'Sometimes', value: 'sometimes' },
      { id: 'rarely', text: 'Rarely', value: 'rarely' },
      { id: 'never', text: 'Never', value: 'never' }
    ],
    category: 'shopping'
  },
  // Work Environment
  {
    id: 'q21',
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
    category: 'lifestyle'
  },
  // Active Lifestyle
  {
    id: 'q22',
    questionText: 'How active is your lifestyle?',
    type: 'single',
    options: [
      { id: 'very', text: 'Very active - I need clothes for frequent exercise', value: 'very' },
      { id: 'moderately', text: 'Moderately active - occasional exercise', value: 'moderately' },
      { id: 'somewhat', text: 'Somewhat active - light activity', value: 'somewhat' },
      { id: 'not', text: 'Not very active', value: 'not' }
    ],
    category: 'lifestyle'
  },
  // Fabric Preferences
  {
    id: 'q23',
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
    category: 'fabrics'
  },
  // Special Requirements
  {
    id: 'q24',
    questionText: 'Do you have any special clothing requirements or preferences?',
    type: 'multiple',
    options: [
      { id: 'none', text: 'None', value: 'none' },
      { id: 'pockets', text: 'Must have pockets', value: 'pockets' },
      { id: 'petite', text: 'Petite sizes', value: 'petite' },
      { id: 'tall', text: 'Tall sizes', value: 'tall' },
      { id: 'plus', text: 'Plus sizes', value: 'plus' },
      { id: 'adaptable', text: 'Adaptable/Accessible clothing', value: 'adaptable' },
      { id: 'allergy', text: 'Hypoallergenic fabrics', value: 'allergy' }
    ],
    category: 'requirements'
  },
  // Style Goal
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
    category: 'goals'
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
            savedAnswers: progress.answers as StyleQuizAnswer[]
          };
        }
      }
    } catch (e) {
      console.error('Error loading saved quiz progress:', e);
    }
    return { currentQuestionIndex: 0, savedAnswers: [] };
  };
  
  const { currentQuestionIndex, savedAnswers } = loadSavedProgress();
  
  const [currentQuestion, setCurrentQuestion] = useState(currentQuestionIndex);
  const [answers, setAnswers] = useState<StyleQuizAnswer[]>(savedAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Save progress to localStorage whenever answers or current question changes
  useEffect(() => {
    try {
      const progress = {
        currentQuestion,
        answers
      };
      localStorage.setItem(`${STORAGE_KEY}_${quizId}`, JSON.stringify(progress));
    } catch (e) {
      console.error('Error saving quiz progress:', e);
    }
  }, [currentQuestion, answers, quizId]);
  
  // In a real implementation, we would fetch questions from the API
  // useEffect(() => {
  //   const fetchQuestions = async () => {
  //     try {
  //       setLoading(true);
  //       const response = await api.user.getStyleQuiz();
  //       setQuestions(response);
  //     } catch (error) {
  //       console.error('Error fetching quiz questions:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   
  //   fetchQuestions();
  // }, [quizId]);
  
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
  
  // Auto-move to next question for single & image options when selected
  const handleOptionSelect = (questionId: string, optionId: string, type: string) => {
    if (type === 'single' || type === 'image') {
      handleSingleAnswer(questionId, optionId);
      
      // For single/image selections, auto-advance to next question after short delay
      if (currentQuestion < questions.length - 1) {
        setTimeout(() => {
          setCurrentQuestion(currentQuestion + 1);
        }, 300);
      }
    }
  };
  
  const handleSingleAnswer = (questionId: string, answerId: string) => {
    const newAnswers = [...answers];
    const existingIndex = answers.findIndex(a => a.questionId === questionId);
    
    const answer: StyleQuizAnswer = {
      questionId,
      answerId,
      answered: new Date()
    };
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answer;
    } else {
      newAnswers.push(answer);
    }
    
    setAnswers(newAnswers);
    
    // Note: Auto-advancing to next question is now handled in handleOptionSelect
    // We don't automatically advance here to allow the Next button to work properly
  };
  
  const handleMultipleAnswer = (questionId: string, answerIds: string[]) => {
    const newAnswers = [...answers];
    const existingIndex = answers.findIndex(a => a.questionId === questionId);
    
    const answer: StyleQuizAnswer = {
      questionId,
      answerIds,
      answered: new Date()
    };
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answer;
    } else {
      newAnswers.push(answer);
    }
    
    setAnswers(newAnswers);
  };
  
  const handleSliderAnswer = (questionId: string, value: number) => {
    const newAnswers = [...answers];
    const existingIndex = answers.findIndex(a => a.questionId === questionId);
    
    const answer: StyleQuizAnswer = {
      questionId,
      answerValue: value,
      answered: new Date()
    };
    
    if (existingIndex >= 0) {
      newAnswers[existingIndex] = answer;
    } else {
      newAnswers.push(answer);
    }
    
    setAnswers(newAnswers);
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
  
  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  
  const renderQuestion = () => {
    if (!question) return null;
    
    // Get current answer for this question
    const currentAnswer = answers.find(a => a.questionId === question.id);
    
    switch (question.type) {
      case 'single':
        return (
          <div className="stylist-style-quiz__options">
            {question.options?.map(option => (
              <button
                key={option.id}
                className={`stylist-style-quiz__option ${currentAnswer?.answerId === option.id ? 'stylist-style-quiz__option--selected' : ''}`}
                onClick={() => handleOptionSelect(question.id, option.id, 'single')}
                style={currentAnswer?.answerId === option.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}20` } : undefined}
              >
                {option.text}
              </button>
            ))}
          </div>
        );
      
      case 'image':
        return (
          <div className="stylist-style-quiz__image-options">
            {question.options?.map(option => (
              <button
                key={option.id}
                className={`stylist-style-quiz__image-option ${currentAnswer?.answerId === option.id ? 'stylist-style-quiz__image-option--selected' : ''}`}
                onClick={() => handleOptionSelect(question.id, option.id, 'image')}
                style={currentAnswer?.answerId === option.id ? { borderColor: primaryColor } : undefined}
              >
                <div 
                  className="stylist-style-quiz__image-container"
                  style={{ 
                    backgroundImage: option.imageUrl ? `url(${option.imageUrl})` : undefined,
                  }}
                >
                  {!option.imageUrl && <div className="stylist-style-quiz__image-placeholder"></div>}
                </div>
                <div className="stylist-style-quiz__image-label" style={currentAnswer?.answerId === option.id ? { color: primaryColor } : undefined}>{option.text}</div>
              </button>
            ))}
          </div>
        );
        
      case 'multiple':
        return (
          <div className="stylist-style-quiz__options">
            {question.options?.map(option => {
              const isSelected = currentAnswer?.answerIds?.includes(option.id);
              return (
                <button
                  key={option.id}
                  className={`stylist-style-quiz__option ${isSelected ? 'stylist-style-quiz__option--selected' : ''}`}
                  onClick={() => {
                    const currentIds = currentAnswer?.answerIds || [];
                    const newIds = isSelected
                      ? currentIds.filter(id => id !== option.id)
                      : [...currentIds, option.id];
                    handleMultipleAnswer(question.id, newIds);
                  }}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}20` } : undefined}
                >
                  {option.text}
                </button>
              );
            })}
          </div>
        );
        
      case 'slider':
        const getSliderLabels = (id: string) => {
          // Define labels based on question ID
          switch(id) {
            case 'q18': // Comfort vs Style priority
              return { left: 'Comfort', right: 'Style' };
            default:
              return { left: 'Low', right: 'High' };
          }
        };
        
        const labels = getSliderLabels(question.id);
        
        return (
          <div className="stylist-style-quiz__slider">
            <input
              type="range"
              min={question.minValue || 0}
              max={question.maxValue || 100}
              step={question.step || 1}
              value={currentAnswer?.answerValue || 50}
              onChange={(e) => handleSliderAnswer(question.id, parseInt(e.target.value))}
              style={{ accentColor: primaryColor }}
            />
            <div className="stylist-style-quiz__slider-labels">
              <div className="stylist-style-quiz__slider-label-left">{labels.left}</div>
              <div className="stylist-style-quiz__slider-label-right">{labels.right}</div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Function to check if the current question has been answered
  const isCurrentQuestionAnswered = () => {
    return !!answers.find(a => a.questionId === question.id);
  };
  
  // Function to handle going to the next question
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      // Animate the transition
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
  };
  
  // Function to handle going to the previous question
  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      // Animate the transition
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
  };
  
  // Calculate completion percentage
  const completionPercentage = Math.round((answers.length / questions.length) * 100);
  
  return (
    <div className="stylist-style-quiz">
      <div className="stylist-style-quiz__header">
        <h3 className="stylist-style-quiz__title">{title}</h3>
        {description && (
          <p className="stylist-style-quiz__description">{description}</p>
        )}
      </div>
      
      <div className="stylist-style-quiz__progress">
        <div
          className="stylist-style-quiz__progress-bar"
          style={{
            width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            backgroundColor: primaryColor
          }}
        ></div>
        <div className="stylist-style-quiz__progress-text">
          {completionPercentage}% Complete
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
  );
};

export default StyleQuiz;
