/**
 * Demo Flows
 * 
 * This module defines structured demo flows to showcase the Stylist widget's
 * features for different user scenarios. Each flow contains step-by-step
 * guidance, expected outcomes, and tips for presenters.
 */

export type DemoStep = {
  id: string;
  title: string;
  description: string;
  action: string;
  expectedOutcome: string;
  tips?: string;
  fallbackAction?: string;
  screenshot?: string;
};

export type DemoFlow = {
  id: string;
  name: string;
  description: string;
  duration: string;
  targetAudience: string;
  setup: string[];
  steps: DemoStep[];
  successCriteria: string[];
};

/**
 * New User Onboarding Flow
 * 
 * This flow demonstrates the journey of a first-time user
 * from initial widget activation through the style quiz and
 * first purchase recommendation.
 */
export const newUserFlow: DemoFlow = {
  id: 'new-user',
  name: 'New User Onboarding',
  description: 'Showcase the full onboarding experience for a first-time user, including the style quiz and first personalized recommendation.',
  duration: '5-7 minutes',
  targetAudience: 'Retailers interested in user acquisition and onboarding',
  setup: [
    'Use a fresh browser session or incognito window',
    'Ensure the demo retailer has multiple product categories loaded',
    'Reset any previous user data from localStorage if needed'
  ],
  steps: [
    {
      id: 'nu-1',
      title: 'Widget Activation',
      description: 'Show how users discover the widget on a retail site',
      action: 'Navigate to the demo page and point out the floating widget button in the corner',
      expectedOutcome: 'Floating button is visible and pulses briefly to draw attention',
      tips: 'Mention that the button can be customized with the retailer\'s branding'
    },
    {
      id: 'nu-2',
      title: 'Initial Engagement',
      description: 'Demonstrate the initial widget expansion',
      action: 'Click the floating button to expand the widget',
      expectedOutcome: 'Widget expands smoothly with a welcome message and sign-up prompt',
      tips: 'Point out the smooth animation and responsive design'
    },
    {
      id: 'nu-3',
      title: 'User Registration',
      description: 'Show the streamlined registration process',
      action: 'Click "Sign Up" and complete the simple registration form',
      expectedOutcome: 'Registration form appears with email/password fields and completes quickly',
      tips: 'Emphasize that registration is optional but enables personalized recommendations'
    },
    {
      id: 'nu-4',
      title: 'Style Quiz Introduction',
      description: 'Introduce the style quiz concept',
      action: 'Click "Start Style Quiz" from the welcome message or menu',
      expectedOutcome: 'Style quiz introduction appears with overview and benefits',
      tips: 'Highlight that the quiz takes only 2-3 minutes but dramatically improves recommendations'
    },
    {
      id: 'nu-5',
      title: 'Style Quiz Completion',
      description: 'Complete the style quiz to establish preferences',
      action: 'Answer all quiz questions, showing how different question types work',
      expectedOutcome: 'Quiz progresses through multiple question types with visual progress indicator',
      tips: 'Show different question types (image selection, sliders, multiple choice) and point out the progress bar'
    },
    {
      id: 'nu-6',
      title: 'Style Profile Results',
      description: 'Review the user\'s style profile summary',
      action: 'Complete the quiz and view the results summary',
      expectedOutcome: 'Style profile summary displayed with key style attributes and preferences',
      tips: 'Explain how the style profile influences all future recommendations'
    },
    {
      id: 'nu-7',
      title: 'Initial Recommendations',
      description: 'Show the first personalized recommendations',
      action: 'View the initial recommended items based on style profile',
      expectedOutcome: 'Grid of recommended products appears with clear relevance to style profile',
      tips: 'Point out the "match reasons" that explain why each item was recommended'
    },
    {
      id: 'nu-8',
      title: 'Product Interaction',
      description: 'Demonstrate interaction with recommended products',
      action: 'Click on a recommended item to view details and options',
      expectedOutcome: 'Product details panel appears with size selection, add to cart, and try-on options',
      tips: 'Show hover states and quick action buttons'
    },
    {
      id: 'nu-9',
      title: 'Adding to Cart',
      description: 'Complete the purchase flow',
      action: 'Select a size and add the item to cart',
      expectedOutcome: 'Smooth add-to-cart animation with confirmation and cart preview',
      tips: 'Point out the non-disruptive nature of the flow that keeps users in the shopping experience'
    }
  ],
  successCriteria: [
    'User completes registration without friction',
    'Style quiz is engaging and intuitive',
    'Initial recommendations clearly reflect quiz answers',
    'Add to cart process is smooth and intuitive'
  ]
};

/**
 * Returning User Flow
 * 
 * This flow demonstrates a returning user's experience,
 * leveraging their existing closet data to build outfits
 * and discover trending items.
 */
export const returningUserFlow: DemoFlow = {
  id: 'returning',
  name: 'Returning User Experience',
  description: 'Demonstrate the enhanced experience for returning users, focusing on My Closet, Trending Items, and outfit building.',
  duration: '4-6 minutes',
  targetAudience: 'Retailers focused on customer retention and repeat purchases',
  setup: [
    'Log in as a returning user with existing closet items',
    'Ensure the demo account has several items in My Closet',
    'Verify that Trending Items data is populated'
  ],
  steps: [
    {
      id: 'ru-1',
      title: 'Returning User Recognition',
      description: 'Show how the widget recognizes returning users',
      action: 'Open the widget as a logged-in user',
      expectedOutcome: 'Widget opens with personalized greeting and highlights recent activity',
      tips: 'Point out any notifications about new trending items or updates since last visit'
    },
    {
      id: 'ru-2',
      title: 'My Closet Access',
      description: 'Access the digital closet with previously saved items',
      action: 'Navigate to the My Closet section',
      expectedOutcome: 'My Closet loads with previously saved items organized by category',
      tips: 'Highlight how the closet preserves customer purchase history across sessions'
    },
    {
      id: 'ru-3',
      title: 'Closet Organization',
      description: 'Show the organization and filtering capabilities of the closet',
      action: 'Filter closet items by category or occasion',
      expectedOutcome: 'Items filter instantly based on selected criteria',
      tips: 'Emphasize how organization helps users rediscover their own items'
    },
    {
      id: 'ru-4',
      title: 'Trending Items Discovery',
      description: 'Explore personalized trending items',
      action: 'Navigate to the Trending Items section',
      expectedOutcome: 'Curated grid of trending items appears, influenced by user preferences',
      tips: 'Explain how the trending algorithm balances personal style with current trends'
    },
    {
      id: 'ru-5',
      title: 'Outfit Building Initiation',
      description: 'Start the outfit building process',
      action: 'Select an item from My Closet and click "Build Outfit"',
      expectedOutcome: 'Outfit builder interface appears with selected item as the base',
      tips: 'Point out how users can start with items they already own'
    },
    {
      id: 'ru-6',
      title: 'Outfit Recommendations',
      description: 'Show complementary item recommendations',
      action: 'View recommended items that pair well with the selected piece',
      expectedOutcome: 'Grid of complementary items appears with clear match explanations',
      tips: 'Highlight how recommendations span both the user\'s closet and store inventory'
    },
    {
      id: 'ru-7',
      title: 'Complete Outfit Creation',
      description: 'Finalize an outfit with multiple pieces',
      action: 'Add several items to complete an outfit',
      expectedOutcome: 'Full outfit visualized together with harmonious style',
      tips: 'Show how the system ensures style coherence and color coordination'
    },
    {
      id: 'ru-8',
      title: 'Outfit Saving',
      description: 'Save the created outfit for future reference',
      action: 'Save the outfit with a custom name',
      expectedOutcome: 'Outfit saved to My Outfits with confirmation animation',
      tips: 'Explain how saved outfits can be referenced for future shopping or daily decisions'
    }
  ],
  successCriteria: [
    'User\'s previous data is seamlessly accessible',
    'Trending items feel personally relevant',
    'Outfit builder provides genuinely complementary items',
    'Experience feels cohesive across sessions'
  ]
};

/**
 * Influencer-Driven Shopping Flow
 * 
 * This flow demonstrates how users can discover products
 * through celebrity and influencer styles, then find matching
 * or similar items to purchase.
 */
export const influencerFlow: DemoFlow = {
  id: 'influencer',
  name: 'Celebrity & Influencer Matching',
  description: 'Showcase how users can find products similar to those worn by celebrities and influencers.',
  duration: '3-5 minutes',
  targetAudience: 'Fashion retailers looking to leverage social proof and influencer marketing',
  setup: [
    'Ensure celebrity database is loaded with recent examples',
    'Verify product matching is working correctly',
    'Have social sharing functionality enabled'
  ],
  steps: [
    {
      id: 'if-1',
      title: 'Celebrity Discovery',
      description: 'Browse the celebrity and influencer gallery',
      action: 'Navigate to the Social Proof or Celebrity section',
      expectedOutcome: 'Grid of celebrities and influencers appears with recent outfits',
      tips: 'Point out that this content updates regularly with current trends'
    },
    {
      id: 'if-2',
      title: 'Celebrity Style Selection',
      description: 'Select a specific celebrity look to explore',
      action: 'Click on a celebrity card to view their featured looks',
      expectedOutcome: 'Celebrity detail page appears with multiple outfit options',
      tips: 'Mention how featured looks are selected for relevance to the store\'s inventory'
    },
    {
      id: 'if-3',
      title: 'Outfit Detail View',
      description: 'Examine the components of a celebrity outfit',
      action: 'Select a specific outfit to see its details',
      expectedOutcome: 'Outfit breakdown appears showing individual pieces with labels',
      tips: 'Highlight how the system identifies individual garments from celebrity photos'
    },
    {
      id: 'if-4',
      title: 'Product Matching',
      description: 'Find exact matches for celebrity items in inventory',
      action: 'Click "Find this item" on a specific piece',
      expectedOutcome: 'Exact product match appears if available in inventory',
      tips: 'Explain that retailers can flag exact matches in their inventory for seamless discovery'
    },
    {
      id: 'if-5',
      title: 'Similar Items',
      description: 'Discover similar alternatives when exact matches aren\'t available',
      action: 'View similar items to a celebrity piece',
      expectedOutcome: 'Grid of similar items appears with similarity score and features',
      tips: 'Demonstrate how the similarity algorithm considers style, color, pattern, and silhouette'
    },
    {
      id: 'if-6',
      title: 'Match & Shop',
      description: 'Select and purchase a matching item',
      action: 'Choose a similar item and add to cart',
      expectedOutcome: 'Item added to cart with reference to the celebrity inspiration',
      tips: 'Emphasize how this creates a storytelling element in the purchase'
    },
    {
      id: 'if-7',
      title: 'Social Sharing',
      description: 'Share a discovered match on social media',
      action: 'Click the share button on a matched item',
      expectedOutcome: 'Social sharing options appear with pre-populated message',
      tips: 'Point out how sharing extends the retailer\'s reach through organic social content'
    }
  ],
  successCriteria: [
    'Celebrity content feels current and relevant',
    'Product matches are accurate and visually similar',
    'Social sharing is seamless and compelling',
    'Purchase path from celebrity inspiration is frictionless'
  ]
};

/**
 * Power User Multi-Feature Flow
 * 
 * This flow demonstrates advanced capabilities for power users,
 * including cross-category shopping, virtual try-on, and bulk actions.
 */
export const powerUserFlow: DemoFlow = {
  id: 'power-user',
  name: 'Advanced Multi-Category & Try-On Flow',
  description: 'Demonstrate advanced features for power users including cross-category shopping, virtual try-on, and bulk actions.',
  duration: '5-8 minutes',
  targetAudience: 'Retailers with diverse inventory and tech-forward customers',
  setup: [
    'Ensure virtual try-on is fully configured',
    'Verify multiple product categories are available',
    'Have high-resolution product images loaded'
  ],
  steps: [
    {
      id: 'pu-1',
      title: 'Cross-Category Browse',
      description: 'Show how users can shop across multiple categories seamlessly',
      action: 'Navigate through different product categories in quick succession',
      expectedOutcome: 'Smooth transition between categories with persistent filtering options',
      tips: 'Highlight how the system maintains context between category switches'
    },
    {
      id: 'pu-2',
      title: 'Advanced Filtering',
      description: 'Demonstrate power-user filtering capabilities',
      action: 'Apply multiple detailed filters across categories (style, price, color, material)',
      expectedOutcome: 'Results update in real-time with combined filter logic',
      tips: 'Point out how filters are intelligently suggested based on inventory and user preferences'
    },
    {
      id: 'pu-3',
      title: 'Virtual Try-On Setup',
      description: 'Initialize the virtual try-on experience',
      action: 'Select an item and click "Try On" or navigate to Try-On section',
      expectedOutcome: 'Try-on interface appears with camera access request or photo upload option',
      tips: 'Explain privacy features and how images are processed locally when possible'
    },
    {
      id: 'pu-4',
      title: 'Camera/Photo Selection',
      description: 'Show both camera capture and photo upload options',
      action: 'Either activate camera or upload a photo',
      expectedOutcome: 'Image appears in try-on interface with body detection indicators',
      tips: 'Demonstrate both real-time and uploaded photo workflows if possible'
    },
    {
      id: 'pu-5',
      title: 'Virtual Garment Overlay',
      description: 'Demonstrate the virtual try-on technology',
      action: 'Position and adjust the selected garment on the photo',
      expectedOutcome: 'Garment realistically overlays on the user image with proper sizing and positioning',
      tips: 'Point out how the AI handles different body types and positions'
    },
    {
      id: 'pu-6',
      title: 'Multi-Item Try-On',
      description: 'Try on multiple items together',
      action: 'Add additional items to the try-on scene',
      expectedOutcome: 'Multiple items correctly layer and position together',
      tips: 'Show how the system handles layering and fabric interactions'
    },
    {
      id: 'pu-7',
      title: 'Color/Variant Switching',
      description: 'Switch between color options during try-on',
      action: 'Change the color/variant of an item while in try-on mode',
      expectedOutcome: 'Color changes apply instantly with realistic rendering',
      tips: 'Emphasize how this reduces the friction of trying multiple variants'
    },
    {
      id: 'pu-8',
      title: 'Bulk Actions',
      description: 'Perform actions on multiple items at once',
      action: 'Select multiple items and add to wishlist or cart',
      expectedOutcome: 'Bulk action applies to all selected items with unified confirmation',
      tips: 'Point out efficiency gains for serious shoppers'
    },
    {
      id: 'pu-9',
      title: 'Result Sharing',
      description: 'Save and share try-on results',
      action: 'Save the try-on result and share via social or email',
      expectedOutcome: 'Sharing options appear with preview and product links included',
      tips: 'Highlight how shared content includes direct shopping links'
    }
  ],
  successCriteria: [
    'Cross-category navigation feels seamless',
    'Virtual try-on renders garments realistically',
    'Multi-item interactions work smoothly',
    'Bulk actions are intuitive and efficient'
  ]
};

// Export all flows for use in the application
export const demoFlows = {
  newUser: newUserFlow,
  returning: returningUserFlow,
  influencer: influencerFlow,
  powerUser: powerUserFlow
};

export default demoFlows;