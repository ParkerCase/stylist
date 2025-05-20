// Mock data for style quiz-related endpoints
import { mockData } from '../utils/mockData';

// Quiz question types
type QuestionType = 'multiple_choice' | 'single_choice' | 'slider' | 'image_choice';

// Quiz question interface
interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: {
    id: string;
    text: string;
    imageUrl?: string;
  }[];
  minValue?: number;
  maxValue?: number;
  defaultValue?: number;
}

// Quiz section interface
interface QuizSection {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

// Quiz data
const quizData: QuizSection[] = [
  {
    id: 'style_preferences',
    title: 'Style Preferences',
    description: 'Let\'s learn about your personal style preferences.',
    questions: [
      {
        id: 'preferred_styles',
        type: 'multiple_choice',
        question: 'Which styles do you prefer?',
        required: true,
        options: [
          { id: 'casual', text: 'Casual' },
          { id: 'business', text: 'Business' },
          { id: 'formal', text: 'Formal' },
          { id: 'bohemian', text: 'Bohemian' },
          { id: 'sporty', text: 'Sporty' },
          { id: 'vintage', text: 'Vintage' },
          { id: 'minimalist', text: 'Minimalist' },
          { id: 'preppy', text: 'Preppy' },
          { id: 'street', text: 'Street Style' },
          { id: 'romantic', text: 'Romantic' }
        ]
      },
      {
        id: 'color_preferences',
        type: 'multiple_choice',
        question: 'Which colors do you typically wear?',
        required: true,
        options: [
          { id: 'black', text: 'Black' },
          { id: 'white', text: 'White' },
          { id: 'navy', text: 'Navy' },
          { id: 'gray', text: 'Gray' },
          { id: 'beige', text: 'Beige' },
          { id: 'brown', text: 'Brown' },
          { id: 'red', text: 'Red' },
          { id: 'pink', text: 'Pink' },
          { id: 'blue', text: 'Blue' },
          { id: 'green', text: 'Green' },
          { id: 'yellow', text: 'Yellow' },
          { id: 'orange', text: 'Orange' },
          { id: 'purple', text: 'Purple' }
        ]
      },
      {
        id: 'pattern_preferences',
        type: 'multiple_choice',
        question: 'Which patterns do you like?',
        required: false,
        options: [
          { id: 'solid', text: 'Solid colors (no pattern)' },
          { id: 'stripes', text: 'Stripes' },
          { id: 'plaid', text: 'Plaid' },
          { id: 'floral', text: 'Floral' },
          { id: 'geometric', text: 'Geometric' },
          { id: 'animal', text: 'Animal print' },
          { id: 'polka_dots', text: 'Polka dots' },
          { id: 'abstract', text: 'Abstract' }
        ]
      }
    ]
  },
  {
    id: 'body_type',
    title: 'Body Type & Fit',
    description: 'Help us understand your body type and fit preferences.',
    questions: [
      {
        id: 'top_size',
        type: 'single_choice',
        question: 'What size do you typically wear for tops?',
        required: true,
        options: [
          { id: 'xs', text: 'XS' },
          { id: 's', text: 'S' },
          { id: 'm', text: 'M' },
          { id: 'l', text: 'L' },
          { id: 'xl', text: 'XL' },
          { id: 'xxl', text: 'XXL' }
        ]
      },
      {
        id: 'bottom_size',
        type: 'single_choice',
        question: 'What size do you typically wear for bottoms?',
        required: true,
        options: [
          { id: '00', text: '00' },
          { id: '0', text: '0' },
          { id: '2', text: '2' },
          { id: '4', text: '4' },
          { id: '6', text: '6' },
          { id: '8', text: '8' },
          { id: '10', text: '10' },
          { id: '12', text: '12' },
          { id: '14', text: '14' },
          { id: '16', text: '16' },
          { id: '18', text: '18' }
        ]
      },
      {
        id: 'shoe_size',
        type: 'single_choice',
        question: 'What is your shoe size?',
        required: true,
        options: [
          { id: '5', text: '5' },
          { id: '5.5', text: '5.5' },
          { id: '6', text: '6' },
          { id: '6.5', text: '6.5' },
          { id: '7', text: '7' },
          { id: '7.5', text: '7.5' },
          { id: '8', text: '8' },
          { id: '8.5', text: '8.5' },
          { id: '9', text: '9' },
          { id: '9.5', text: '9.5' },
          { id: '10', text: '10' },
          { id: '10.5', text: '10.5' },
          { id: '11', text: '11' }
        ]
      },
      {
        id: 'fit_preference',
        type: 'single_choice',
        question: 'How do you prefer your clothes to fit?',
        required: true,
        options: [
          { id: 'tight', text: 'Tight/fitted' },
          { id: 'semi_fitted', text: 'Semi-fitted' },
          { id: 'relaxed', text: 'Relaxed' },
          { id: 'loose', text: 'Loose/oversized' }
        ]
      }
    ]
  },
  {
    id: 'brand_preferences',
    title: 'Brand & Price Preferences',
    description: 'Tell us about your favorite brands and budget.',
    questions: [
      {
        id: 'favorite_brands',
        type: 'multiple_choice',
        question: 'Which brands do you typically shop from?',
        required: false,
        options: [
          { id: 'luxe_style', text: 'LuxeStyle' },
          { id: 'urban_flair', text: 'UrbanFlair' },
          { id: 'eco_chic', text: 'EcoChic' },
          { id: 'modern_essentials', text: 'ModernEssentials' },
          { id: 'coastal_breeze', text: 'CoastalBreeze' },
          { id: 'nordic_minimal', text: 'NordicMinimal' },
          { id: 'vintage_revival', text: 'VintageRevival' },
          { id: 'metro_edge', text: 'MetroEdge' },
          { id: 'classic_couture', text: 'ClassicCouture' },
          { id: 'athletic_prime', text: 'AthleticPrime' }
        ]
      },
      {
        id: 'price_range',
        type: 'single_choice',
        question: 'What is your typical budget for clothing items?',
        required: true,
        options: [
          { id: 'budget', text: 'Budget ($0-$50)' },
          { id: 'mid_range', text: 'Mid-range ($50-$150)' },
          { id: 'premium', text: 'Premium ($150-$300)' },
          { id: 'luxury', text: 'Luxury ($300+)' }
        ]
      },
      {
        id: 'sustainability',
        type: 'slider',
        question: 'How important is sustainability in your clothing choices?',
        required: false,
        minValue: 1,
        maxValue: 10,
        defaultValue: 5
      }
    ]
  },
  {
    id: 'style_inspirations',
    title: 'Style Inspirations',
    description: 'Select celebrities or influencers whose style you admire.',
    questions: [
      {
        id: 'celebrity_style',
        type: 'image_choice',
        question: 'Which celebrity styles do you admire?',
        required: false,
        options: [
          { 
            id: 'emma_watson', 
            text: 'Emma Watson', 
            imageUrl: 'https://via.placeholder.com/200?text=Emma+Watson' 
          },
          { 
            id: 'zendaya', 
            text: 'Zendaya', 
            imageUrl: 'https://via.placeholder.com/200?text=Zendaya' 
          },
          { 
            id: 'timothee_chalamet', 
            text: 'Timothée Chalamet', 
            imageUrl: 'https://via.placeholder.com/200?text=Timothee+Chalamet' 
          },
          { 
            id: 'harry_styles', 
            text: 'Harry Styles', 
            imageUrl: 'https://via.placeholder.com/200?text=Harry+Styles' 
          },
          { 
            id: 'rihanna', 
            text: 'Rihanna', 
            imageUrl: 'https://via.placeholder.com/200?text=Rihanna' 
          },
          { 
            id: 'beyonce', 
            text: 'Beyoncé', 
            imageUrl: 'https://via.placeholder.com/200?text=Beyonce' 
          },
          { 
            id: 'taylor_swift', 
            text: 'Taylor Swift', 
            imageUrl: 'https://via.placeholder.com/200?text=Taylor+Swift' 
          },
          { 
            id: 'bts', 
            text: 'BTS', 
            imageUrl: 'https://via.placeholder.com/200?text=BTS' 
          }
        ]
      },
      {
        id: 'style_icons',
        type: 'multiple_choice',
        question: 'Which fashion eras or icons influence your style?',
        required: false,
        options: [
          { id: '90s', text: '90s Fashion' },
          { id: 'y2k', text: 'Y2K (Early 2000s)' },
          { id: '70s', text: '70s Bohemian' },
          { id: '80s', text: '80s Bold' },
          { id: '50s', text: '50s Classic' },
          { id: 'parisian', text: 'Parisian Chic' },
          { id: 'scandi', text: 'Scandinavian Minimal' },
          { id: 'streetwear', text: 'Modern Streetwear' }
        ]
      }
    ]
  },
  {
    id: 'occasion_preferences',
    title: 'Occasions & Activities',
    description: 'Tell us about your lifestyle and clothing needs.',
    questions: [
      {
        id: 'common_occasions',
        type: 'multiple_choice',
        question: 'What occasions do you regularly dress for?',
        required: true,
        options: [
          { id: 'casual', text: 'Casual everyday' },
          { id: 'work', text: 'Work/office' },
          { id: 'formal', text: 'Formal events' },
          { id: 'evening', text: 'Evening out' },
          { id: 'athletic', text: 'Athletic/workout' },
          { id: 'outdoors', text: 'Outdoor activities' },
          { id: 'beach', text: 'Beach/pool' },
          { id: 'travel', text: 'Travel' }
        ]
      },
      {
        id: 'activity_level',
        type: 'slider',
        question: 'How active is your lifestyle?',
        required: false,
        minValue: 1,
        maxValue: 10,
        defaultValue: 5
      },
      {
        id: 'weather_conditions',
        type: 'multiple_choice',
        question: 'What weather conditions do you typically dress for?',
        required: true,
        options: [
          { id: 'hot', text: 'Hot/summer' },
          { id: 'mild', text: 'Mild/spring-fall' },
          { id: 'cold', text: 'Cold/winter' },
          { id: 'rainy', text: 'Rainy/wet' },
          { id: 'variable', text: 'Variable/all seasons' }
        ]
      }
    ]
  }
];

/**
 * Get quiz questions
 */
const getQuestions = (options: any = {}): { sections: QuizSection[] } => {
  return { sections: quizData };
};

/**
 * Process quiz results
 */
const getResults = (options: any = {}): { 
  styleProfile: { 
    primaryStyle: string; 
    secondaryStyle: string;
    colorPalette: string[];
    occasions: string[];
    recommendations: {
      tops: string[];
      bottoms: string[];
      dresses: string[];
      outerwear: string[];
      accessories: string[];
    }
  } 
} => {
  const { body = {} } = options;
  
  // In a real implementation, this would analyze the answers
  // For mock purposes, generate a style profile based on current time
  // to give some variation in responses
  
  // Get a "random" selection based on time
  const timeBasedIndex = new Date().getSeconds() % 5;
  
  const styleProfiles = [
    {
      primaryStyle: 'Minimalist',
      secondaryStyle: 'Contemporary',
      colorPalette: ['black', 'white', 'gray', 'navy'],
      occasions: ['work', 'casual', 'evening'],
      recommendations: {
        tops: ['Classic white button-down', 'Relaxed black t-shirt', 'Sleek turtleneck'],
        bottoms: ['Straight-leg jeans', 'Tailored trousers', 'A-line midi skirt'],
        dresses: ['Simple shift dress', 'Sleeveless maxi dress'],
        outerwear: ['Structured blazer', 'Classic trench coat'],
        accessories: ['Leather tote bag', 'Minimalist watch', 'Simple gold hoops']
      }
    },
    {
      primaryStyle: 'Bohemian',
      secondaryStyle: 'Vintage',
      colorPalette: ['terracotta', 'mustard', 'olive', 'cream'],
      occasions: ['casual', 'beach', 'travel'],
      recommendations: {
        tops: ['Embroidered blouse', 'Flowy camisole', 'Off-shoulder top'],
        bottoms: ['Wide-leg pants', 'Maxi skirt', 'Distressed denim'],
        dresses: ['Floral maxi dress', 'Embroidered midi dress'],
        outerwear: ['Fringed kimono', 'Denim jacket'],
        accessories: ['Woven tote', 'Statement earrings', 'Layered necklaces']
      }
    },
    {
      primaryStyle: 'Classic',
      secondaryStyle: 'Preppy',
      colorPalette: ['navy', 'cream', 'burgundy', 'green'],
      occasions: ['work', 'formal', 'evening'],
      recommendations: {
        tops: ['Striped button-down', 'Cashmere sweater', 'Silk blouse'],
        bottoms: ['Tailored chinos', 'Pencil skirt', 'Dark wash jeans'],
        dresses: ['Wrap dress', 'Sheath dress'],
        outerwear: ['Navy blazer', 'Wool peacoat'],
        accessories: ['Leather satchel', 'Pearl earrings', 'Silk scarf']
      }
    },
    {
      primaryStyle: 'Streetwear',
      secondaryStyle: 'Sporty',
      colorPalette: ['black', 'white', 'red', 'gray'],
      occasions: ['casual', 'athletic', 'evening'],
      recommendations: {
        tops: ['Graphic tee', 'Hoodie', 'Crop top'],
        bottoms: ['Track pants', 'High-waisted jeans', 'Joggers'],
        dresses: ['T-shirt dress', 'Sporty mini dress'],
        outerwear: ['Bomber jacket', 'Puffer coat'],
        accessories: ['Backpack', 'Chunky sneakers', 'Baseball cap']
      }
    },
    {
      primaryStyle: 'Romantic',
      secondaryStyle: 'Feminine',
      colorPalette: ['blush', 'lavender', 'sky blue', 'cream'],
      occasions: ['formal', 'evening', 'work'],
      recommendations: {
        tops: ['Ruffled blouse', 'Lace camisole', 'Puff sleeve top'],
        bottoms: ['Pleated skirt', 'Wide-leg trousers', 'Cigarette pants'],
        dresses: ['Floral midi dress', 'Fit and flare dress'],
        outerwear: ['Cropped cardigan', 'Pastel coat'],
        accessories: ['Structured handbag', 'Delicate jewelry', 'Silk scarf']
      }
    }
  ];
  
  return { styleProfile: styleProfiles[timeBasedIndex] };
};

export default {
  getQuestions,
  getResults
};