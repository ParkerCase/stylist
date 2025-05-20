// Comprehensive mock data for demo mode
import { 
  RecommendationItem, 
  Outfit, 
  UserProfile, 
  SocialProofItem, 
  SocialProofMatch
} from '../types';

// Product category data
const CATEGORIES = {
  TOPS: 'Tops',
  BOTTOMS: 'Bottoms',
  DRESSES: 'Dresses',
  OUTERWEAR: 'Outerwear',
  ACCESSORIES: 'Accessories',
  FOOTWEAR: 'Footwear',
  BAGS: 'Bags',
  JEWELRY: 'Jewelry'
};

// Array of colors with hex codes for visual consistency
const COLORS = [
  { name: 'black', hex: '#000000' },
  { name: 'white', hex: '#FFFFFF' },
  { name: 'navy', hex: '#000080' },
  { name: 'gray', hex: '#808080' },
  { name: 'beige', hex: '#F5F5DC' },
  { name: 'brown', hex: '#A52A2A' },
  { name: 'red', hex: '#FF0000' },
  { name: 'maroon', hex: '#800000' },
  { name: 'pink', hex: '#FFC0CB' },
  { name: 'purple', hex: '#800080' },
  { name: 'blue', hex: '#0000FF' },
  { name: 'light blue', hex: '#ADD8E6' },
  { name: 'green', hex: '#008000' },
  { name: 'olive', hex: '#808000' },
  { name: 'yellow', hex: '#FFFF00' },
  { name: 'orange', hex: '#FFA500' },
  { name: 'teal', hex: '#008080' },
  { name: 'cyan', hex: '#00FFFF' }
];

// Standard size ranges
const SIZES = {
  TOPS_NUMERIC: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  TOPS_LETTER: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  BOTTOMS_PANTS: ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '36', '38', '40', '42'],
  BOTTOMS_JEANS: ['00', '0', '2', '4', '6', '8', '10', '12', '14', '16', '18'],
  DRESSES: ['0', '2', '4', '6', '8', '10', '12', '14', '16'],
  SHOES_US: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '11', '12']
};

// Patterns and materials
const PATTERNS = [
  'solid', 'striped', 'checked', 'plaid', 'floral', 'polka dot', 
  'geometric', 'animal print', 'abstract', 'camouflage', 'paisley',
  'herringbone', 'houndstooth', 'chevron', 'argyle'
];

const MATERIALS = [
  'cotton', 'polyester', 'linen', 'silk', 'leather', 'wool',
  'cashmere', 'denim', 'suede', 'velvet', 'satin', 'nylon',
  'chiffon', 'jersey', 'tweed', 'twill', 'corduroy'
];

// Top brands
const BRANDS = [
  'LuxeStyle', 'UrbanFlair', 'EcoChic', 'ModernEssentials', 'CoastalBreeze',
  'NordicMinimal', 'VintageRevival', 'MetroEdge', 'ClassicCouture', 'AthleticPrime',
  'EleganceNoir', 'ArtisanLeather', 'PremiumBlends', 'StreetSmart', 'SustainableFashion',
  'FrenchRiviera', 'ItalianCraft', 'JapaneseMinimal', 'ScandinavianSimple', 'CaliforniaCozy'
];

// Retailers for demo purposes
const RETAILERS = [
  'demoshop', 'stylist_demo', 'fashionretailer', 'styleoutlet', 'demoboutique'
];

// Price ranges with distribution
const PRICE_RANGES = {
  BUDGET: { min: 19.99, max: 79.99 },
  MIDRANGE: { min: 79.99, max: 199.99 },
  PREMIUM: { min: 199.99, max: 499.99 },
  LUXURY: { min: 499.99, max: 1999.99 }
};

// Generate a price within a given range
const generatePrice = (range: 'BUDGET' | 'MIDRANGE' | 'PREMIUM' | 'LUXURY'): number => {
  const { min, max } = PRICE_RANGES[range];
  const price = min + Math.random() * (max - min);
  return Math.round(price * 100) / 100; // Round to 2 decimal places
};

// Function to generate a sale price lower than the original price
const generateSalePrice = (originalPrice: number): number | undefined => {
  if (Math.random() > 0.7) { // 30% chance of having a sale price
    const discountPercent = 0.1 + Math.random() * 0.4; // 10% to 50% discount
    return Math.round((originalPrice * (1 - discountPercent)) * 100) / 100;
  }
  return undefined;
};

// Generate a random match score between 0.7 and 1.0
const generateMatchScore = (): number => {
  return 0.7 + Math.random() * 0.3;
};

// Generate match reasons based on category and score
const generateMatchReasons = (category: string, score: number): string[] => {
  const allReasons = [
    'Matches your style profile',
    'Based on your preferences',
    'Popular in your size',
    'Complements your previous purchases',
    'Trending item',
    'Highly rated by users with similar tastes',
    'Versatile addition to your wardrobe',
    'Perfect for your selected occasions',
    'Matches colors in your style profile',
    'Similar to items you\'ve liked',
    'Recommended for your body type',
    'Good value for quality',
    'Sustainable and eco-friendly',
    'Seasonally appropriate'
  ];
  
  const categoryReasons: Record<string, string[]> = {
    [CATEGORIES.TOPS]: [
      'Flattering neckline for your body type',
      'Comfortable fit',
      'Versatile styling options',
      'Easy to layer'
    ],
    [CATEGORIES.BOTTOMS]: [
      'Flattering fit for your body type',
      'Comfortable waistband',
      'Versatile styling options',
      'Perfect length'
    ],
    [CATEGORIES.DRESSES]: [
      'Flattering silhouette',
      'Perfect for your events',
      'Comfortable fit',
      'Seasonally appropriate'
    ],
    [CATEGORIES.OUTERWEAR]: [
      'Good for your local climate',
      'Versatile layering piece',
      'Classic style that won\'t go out of fashion',
      'Weather-appropriate'
    ],
    [CATEGORIES.ACCESSORIES]: [
      'Complements many outfits',
      'Adds visual interest',
      'Trending accessory',
      'Versatile styling options'
    ],
    [CATEGORIES.FOOTWEAR]: [
      'Comfortable for all-day wear',
      'Matches multiple outfits',
      'Appropriate for your lifestyle',
      'Good arch support'
    ],
    [CATEGORIES.BAGS]: [
      'Practical storage options',
      'Versatile styling',
      'Perfect for your lifestyle',
      'Quality construction'
    ],
    [CATEGORIES.JEWELRY]: [
      'Complements your skin tone',
      'Versatile styling options',
      'Matches your other accessories',
      'Quality materials'
    ]
  };
  
  // Select 2-4 general reasons
  const numGeneralReasons = 2 + Math.floor(Math.random() * 3);
  const shuffledGeneral = [...allReasons].sort(() => 0.5 - Math.random());
  const selectedGeneral = shuffledGeneral.slice(0, numGeneralReasons);
  
  // Add 1-2 category-specific reasons if available
  const specificReasons = categoryReasons[category] || [];
  const numSpecificReasons = Math.min(1 + Math.floor(Math.random() * 2), specificReasons.length);
  const shuffledSpecific = [...specificReasons].sort(() => 0.5 - Math.random());
  const selectedSpecific = shuffledSpecific.slice(0, numSpecificReasons);
  
  // If match score is high, add a confidence reason
  const reasons = [...selectedGeneral, ...selectedSpecific];
  if (score > 0.9) {
    reasons.unshift('Perfect match for your style');
  } else if (score > 0.85) {
    reasons.unshift('Great match for your style');
  }
  
  return reasons;
};

// Function to generate a unique ID with prefix
const generateId = (prefix: string): string => {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
};

// Function to generate a realistic product name
const generateProductName = (category: string): string => {
  const adjectives = [
    'Classic', 'Modern', 'Slim', 'Relaxed', 'Vintage', 'Contemporary', 
    'Essential', 'Premium', 'Signature', 'Deluxe', 'Everyday', 'Luxury',
    'Casual', 'Elegant', 'Trendy', 'Timeless', 'Comfort', 'Professional'
  ];
  
  const categoryItems: Record<string, string[]> = {
    [CATEGORIES.TOPS]: [
      'T-Shirt', 'Button-Down Shirt', 'Blouse', 'Sweater', 'Cardigan', 
      'Tank Top', 'Turtleneck', 'Polo Shirt', 'Tunic', 'Crop Top',
      'Henley', 'Sweatshirt', 'Hoodie', 'V-Neck Tee', 'Camisole'
    ],
    [CATEGORIES.BOTTOMS]: [
      'Jeans', 'Trousers', 'Pants', 'Shorts', 'Skirt', 'Chinos', 
      'Leggings', 'Joggers', 'Cargo Pants', 'Culottes', 'Dress Pants',
      'Khakis', 'Palazzo Pants', 'Capris', 'Jeggings'
    ],
    [CATEGORIES.DRESSES]: [
      'Maxi Dress', 'Midi Dress', 'Shift Dress', 'Wrap Dress', 'A-Line Dress',
      'Bodycon Dress', 'Slip Dress', 'Shirt Dress', 'Cocktail Dress', 'Sundress',
      'Sweater Dress', 'Sheath Dress', 'Evening Gown', 'Fit and Flare Dress', 'Tunic Dress'
    ],
    [CATEGORIES.OUTERWEAR]: [
      'Jacket', 'Coat', 'Blazer', 'Trench Coat', 'Parka', 'Windbreaker',
      'Peacoat', 'Cardigan', 'Denim Jacket', 'Leather Jacket', 'Bomber Jacket',
      'Puffer Jacket', 'Overcoat', 'Rain Jacket', 'Fleece Jacket'
    ],
    [CATEGORIES.ACCESSORIES]: [
      'Scarf', 'Hat', 'Belt', 'Gloves', 'Sunglasses', 'Tie', 'Headband',
      'Watch', 'Wallet', 'Hair Clip', 'Beanie', 'Beret', 'Fedora',
      'Bandana', 'Suspenders'
    ],
    [CATEGORIES.FOOTWEAR]: [
      'Sneakers', 'Boots', 'Loafers', 'Sandals', 'Heels', 'Flats',
      'Oxford Shoes', 'Ankle Boots', 'Espadrilles', 'Mules', 'Pumps',
      'Slippers', 'Athletic Shoes', 'Wedges', 'Boat Shoes'
    ],
    [CATEGORIES.BAGS]: [
      'Tote Bag', 'Crossbody Bag', 'Backpack', 'Handbag', 'Clutch',
      'Shoulder Bag', 'Wallet', 'Weekender Bag', 'Messenger Bag', 'Satchel',
      'Bucket Bag', 'Hobo Bag', 'Briefcase', 'Duffel Bag', 'Wristlet'
    ],
    [CATEGORIES.JEWELRY]: [
      'Necklace', 'Earrings', 'Bracelet', 'Ring', 'Pendant', 'Anklet',
      'Brooch', 'Cufflinks', 'Watch', 'Charm', 'Bangle', 'Choker',
      'Stud Earrings', 'Hoop Earrings', 'Statement Necklace'
    ]
  };
  
  const descriptors = [
    'with Pocket', 'with Button Detail', 'with Zipper', 'with Embroidery',
    'with Ruffle', 'with Sequins', 'with Beading', 'with Lace', 'with Fringe',
    'Printed', 'Textured', 'Striped', 'Patterned', 'Pleated', 'Distressed',
    'High-Waisted', 'Cropped', 'Oversized', 'Fitted', 'Tailored', 'Relaxed Fit'
  ];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const items = categoryItems[category] || ['Item'];
  const randomItem = items[Math.floor(Math.random() * items.length)];
  
  // 50% chance to add a descriptor
  const includeDescriptor = Math.random() > 0.5;
  const randomDescriptor = includeDescriptor 
    ? ' ' + descriptors[Math.floor(Math.random() * descriptors.length)]
    : '';
  
  return `${randomAdjective} ${randomItem}${randomDescriptor}`;
};

// Function to create an image URL
const createImageUrl = (category: string, id: string): string[] => {
  // In a real app, these would be unique URLs to actual product images
  // For this demo, we'll generate placeholder URLs with meaningful text
  const baseUrl = 'https://via.placeholder.com/300x400';
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
  
  // Create multiple image variations for the same product
  const urls = [];
  const mainUrl = `${baseUrl}?text=${categorySlug}-${id.split('_')[1]}`;
  urls.push(mainUrl);
  
  // Add additional views for some items (front, back, side)
  if (Math.random() > 0.5) {
    urls.push(`${mainUrl}-front`);
    urls.push(`${mainUrl}-back`);
    if (Math.random() > 0.7) {
      urls.push(`${mainUrl}-detail`);
    }
  }
  
  return urls;
};

// Function to generate product URL
const generateProductUrl = (id: string, retailerId: string, name: string): string => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `https://example.com/shop/${retailerId}/products/${slug}-${id}`;
};

// Function to generate a single product
const generateProduct = (category?: string): RecommendationItem => {
  const productCategory = category || Object.values(CATEGORIES)[Math.floor(Math.random() * Object.values(CATEGORIES).length)];
  const id = generateId('item');
  const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
  const name = generateProductName(productCategory);
  
  // Determine price range based on category
  let priceRange: 'BUDGET' | 'MIDRANGE' | 'PREMIUM' | 'LUXURY' = 'MIDRANGE';
  if (productCategory === CATEGORIES.ACCESSORIES || productCategory === CATEGORIES.TOPS) {
    priceRange = Math.random() > 0.7 ? 'MIDRANGE' : 'BUDGET';
  } else if (productCategory === CATEGORIES.OUTERWEAR || productCategory === CATEGORIES.DRESSES) {
    priceRange = Math.random() > 0.6 ? 'PREMIUM' : 'MIDRANGE';
  } else if (productCategory === CATEGORIES.FOOTWEAR || productCategory === CATEGORIES.BAGS) {
    priceRange = Math.random() > 0.5 ? 'PREMIUM' : Math.random() > 0.5 ? 'MIDRANGE' : 'LUXURY';
  }
  
  const price = generatePrice(priceRange);
  const salePrice = generateSalePrice(price);
  const retailerId = RETAILERS[Math.floor(Math.random() * RETAILERS.length)];
  
  // Select 1-3 colors
  const numberOfColors = 1 + Math.floor(Math.random() * 3);
  const shuffledColors = [...COLORS].sort(() => 0.5 - Math.random());
  const selectedColors = shuffledColors.slice(0, numberOfColors).map(c => c.name);
  
  // Select sizes based on category
  let sizeArray: string[] = [];
  switch (productCategory) {
    case CATEGORIES.TOPS:
      sizeArray = SIZES.TOPS_LETTER;
      break;
    case CATEGORIES.BOTTOMS:
      sizeArray = Math.random() > 0.5 ? SIZES.BOTTOMS_PANTS : SIZES.BOTTOMS_JEANS;
      break;
    case CATEGORIES.DRESSES:
      sizeArray = SIZES.DRESSES;
      break;
    case CATEGORIES.FOOTWEAR:
      sizeArray = SIZES.SHOES_US;
      break;
    default:
      sizeArray = SIZES.TOPS_LETTER;
  }
  
  // Instead of all sizes, select a subset that's available
  const numberOfSizes = Math.max(3, Math.floor(Math.random() * sizeArray.length));
  const shuffledSizes = [...sizeArray].sort(() => 0.5 - Math.random());
  const selectedSizes = shuffledSizes.slice(0, numberOfSizes);
  
  // Generate match info
  const matchScore = generateMatchScore();
  
  // Create the product object
  return {
    id,
    name,
    brand,
    category: productCategory,
    price,
    salePrice,
    retailerId,
    colors: selectedColors,
    sizes: selectedSizes,
    imageUrls: createImageUrl(productCategory, id),
    url: generateProductUrl(id, retailerId, name),
    matchScore,
    matchReasons: generateMatchReasons(productCategory, matchScore),
    inStock: Math.random() > 0.1, // 90% of items are in stock
    materials: [MATERIALS[Math.floor(Math.random() * MATERIALS.length)]],
    patterns: Math.random() > 0.7 
      ? [PATTERNS[Math.floor(Math.random() * PATTERNS.length)]] 
      : ['solid']
  };
};

// Function to generate a collection of products
const generateProducts = (count: number): RecommendationItem[] => {
  const products: RecommendationItem[] = [];
  
  // Ensure we have a good distribution of categories
  const categoryDistribution = {
    [CATEGORIES.TOPS]: Math.ceil(count * 0.25),
    [CATEGORIES.BOTTOMS]: Math.ceil(count * 0.2),
    [CATEGORIES.DRESSES]: Math.ceil(count * 0.1),
    [CATEGORIES.OUTERWEAR]: Math.ceil(count * 0.1),
    [CATEGORIES.ACCESSORIES]: Math.ceil(count * 0.1),
    [CATEGORIES.FOOTWEAR]: Math.ceil(count * 0.1),
    [CATEGORIES.BAGS]: Math.ceil(count * 0.1),
    [CATEGORIES.JEWELRY]: Math.ceil(count * 0.05)
  };
  
  // Generate products for each category
  Object.entries(categoryDistribution).forEach(([category, categoryCount]) => {
    for (let i = 0; i < categoryCount; i++) {
      products.push(generateProduct(category));
    }
  });
  
  // If we haven't reached the desired count, add random products
  const remaining = count - products.length;
  for (let i = 0; i < remaining; i++) {
    products.push(generateProduct());
  }
  
  return products;
};

// Function to generate outfit name
const generateOutfitName = (occasion?: string): string => {
  const prefixes = [
    'Classic', 'Modern', 'Elegant', 'Casual', 'Trendy', 'Chic', 'Urban',
    'Professional', 'Relaxed', 'Bold', 'Minimalist', 'Sophisticated',
    'Effortless', 'Contemporary', 'Playful', 'Structured', 'Refined'
  ];
  
  const outfitTypes = [
    'Look', 'Ensemble', 'Outfit', 'Style', 'Attire', 'Combination', 'Set'
  ];
  
  const occasionDescriptors: Record<string, string[]> = {
    'casual': ['Weekend', 'Everyday', 'Daytime', 'Relaxed', 'Brunch', 'Coffee Run'],
    'work': ['Office', 'Business', 'Professional', 'Corporate', 'Meeting'],
    'evening': ['Dinner', 'Date Night', 'Cocktail', 'Evening', 'Party'],
    'formal': ['Formal', 'Upscale', 'Elegant', 'Black Tie', 'Gala'],
    'vacation': ['Vacation', 'Resort', 'Beach', 'Getaway', 'Cruise'],
    'active': ['Active', 'Workout', 'Athleisure', 'Sporty', 'Fitness']
  };
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const outfitType = outfitTypes[Math.floor(Math.random() * outfitTypes.length)];
  
  if (occasion && occasionDescriptors[occasion.toLowerCase()]) {
    const occasionPrefix = occasionDescriptors[occasion.toLowerCase()][
      Math.floor(Math.random() * occasionDescriptors[occasion.toLowerCase()].length)
    ];
    return `${prefix} ${occasionPrefix} ${outfitType}`;
  }
  
  return `${prefix} ${outfitType}`;
};

// Generate occasions
const OCCASIONS = [
  'casual', 'work', 'evening', 'formal', 'vacation', 'active'
];

// Function to generate a well-balanced outfit
const generateOutfit = (products: RecommendationItem[], occasion?: string): Outfit => {
  const outfitOccasion = occasion || OCCASIONS[Math.floor(Math.random() * OCCASIONS.length)];
  const id = generateId('outfit');
  
  // We need to select items that make sense together
  // At minimum: top, bottom or dress, and footwear
  // Optionally: outerwear, accessories

  // Filter products by category
  const topItems = products.filter(p => p.category === CATEGORIES.TOPS);
  const bottomItems = products.filter(p => p.category === CATEGORIES.BOTTOMS);
  const dressItems = products.filter(p => p.category === CATEGORIES.DRESSES);
  const footwearItems = products.filter(p => p.category === CATEGORIES.FOOTWEAR);
  const outerwearItems = products.filter(p => p.category === CATEGORIES.OUTERWEAR);
  const accessoryItems = products.filter(p => p.category === CATEGORIES.ACCESSORIES);
  const bagItems = products.filter(p => p.category === CATEGORIES.BAGS);
  const jewelryItems = products.filter(p => p.category === CATEGORIES.JEWELRY);
  
  const selectedItems: RecommendationItem[] = [];
  
  // Decide if outfit is dress-based or separate-based
  const isDressBased = Math.random() > 0.6; // 40% chance for dress outfit
  
  if (isDressBased && dressItems.length > 0) {
    // Add a dress
    selectedItems.push(dressItems[Math.floor(Math.random() * dressItems.length)]);
  } else {
    // Add a top
    if (topItems.length > 0) {
      selectedItems.push(topItems[Math.floor(Math.random() * topItems.length)]);
    }
    
    // Add a bottom
    if (bottomItems.length > 0) {
      selectedItems.push(bottomItems[Math.floor(Math.random() * bottomItems.length)]);
    }
  }
  
  // Add footwear (always)
  if (footwearItems.length > 0) {
    selectedItems.push(footwearItems[Math.floor(Math.random() * footwearItems.length)]);
  }
  
  // Maybe add outerwear (30% chance)
  if (outerwearItems.length > 0 && Math.random() > 0.7) {
    selectedItems.push(outerwearItems[Math.floor(Math.random() * outerwearItems.length)]);
  }
  
  // Maybe add an accessory (50% chance)
  if (accessoryItems.length > 0 && Math.random() > 0.5) {
    selectedItems.push(accessoryItems[Math.floor(Math.random() * accessoryItems.length)]);
  }
  
  // Maybe add a bag (40% chance)
  if (bagItems.length > 0 && Math.random() > 0.6) {
    selectedItems.push(bagItems[Math.floor(Math.random() * bagItems.length)]);
  }
  
  // Maybe add jewelry (30% chance)
  if (jewelryItems.length > 0 && Math.random() > 0.7) {
    selectedItems.push(jewelryItems[Math.floor(Math.random() * jewelryItems.length)]);
  }
  
  // Calculate average match score for the outfit
  const totalMatchScore = selectedItems.reduce((sum, item) => sum + item.matchScore, 0);
  const avgMatchScore = totalMatchScore / selectedItems.length;
  
  // Generate outfit-specific match reasons
  const occasionAdjectives: Record<string, string[]> = {
    'casual': ['relaxed', 'comfortable', 'versatile', 'easy-going'],
    'work': ['professional', 'polished', 'sophisticated', 'structured'],
    'evening': ['elegant', 'refined', 'chic', 'elevated'],
    'formal': ['formal', 'luxurious', 'dressy', 'upscale'],
    'vacation': ['vibrant', 'relaxed', 'playful', 'easy'],
    'active': ['functional', 'comfortable', 'practical', 'sporty']
  };
  
  const adjective = occasionAdjectives[outfitOccasion]?.[
    Math.floor(Math.random() * (occasionAdjectives[outfitOccasion]?.length || 1))
  ] || 'stylish';
  
  const outfitMatchReasons = [
    `Perfect ${adjective} combination for ${outfitOccasion} occasions`,
    `Coordinates well for a cohesive look`,
    `Colors and styles complement each other`
  ];
  
  // If high match score, add confidence reason
  if (avgMatchScore > 0.9) {
    outfitMatchReasons.unshift('Perfect outfit match for your style profile');
  } else if (avgMatchScore > 0.85) {
    outfitMatchReasons.unshift('Great outfit match for your preferences');
  }
  
  return {
    id,
    name: generateOutfitName(outfitOccasion),
    occasion: outfitOccasion,
    items: selectedItems,
    matchScore: avgMatchScore,
    matchReasons: outfitMatchReasons
  };
};

// Function to generate outfits
const generateOutfits = (products: RecommendationItem[], count: number): Outfit[] => {
  const outfits: Outfit[] = [];
  
  // Ensure we have a good distribution of occasions
  const occasionDistribution = OCCASIONS.reduce<Record<string, number>>((acc, occasion) => {
    acc[occasion] = Math.max(1, Math.floor(count / OCCASIONS.length));
    return acc;
  }, {});
  
  // Generate outfits for each occasion
  Object.entries(occasionDistribution).forEach(([occasion, occasionCount]) => {
    for (let i = 0; i < occasionCount; i++) {
      outfits.push(generateOutfit(products, occasion));
    }
  });
  
  // If we haven't reached the desired count, add random outfits
  const remaining = count - outfits.length;
  for (let i = 0; i < remaining; i++) {
    outfits.push(generateOutfit(products));
  }
  
  return outfits;
};

// Celebrity names for social proof
const CELEBRITIES = [
  'Emma Watson', 'Zendaya', 'Timothée Chalamet', 'Harry Styles', 'Rihanna',
  'Beyoncé', 'Taylor Swift', 'BTS', 'Billie Eilish', 'Dua Lipa',
  'Bad Bunny', 'Bella Hadid', 'Tom Holland', 'Florence Pugh', 'Ryan Reynolds',
  'Blake Lively', 'Kendall Jenner', 'Hailey Bieber', 'Lizzo', 'Lil Nas X',
  'Cardi B', 'A$AP Rocky', 'Olivia Rodrigo', 'Sydney Sweeney', 'Zoë Kravitz',
  'Robert Pattinson', 'Anya Taylor-Joy', 'Chris Hemsworth', 'Zoe Saldana', 'Pedro Pascal'
];

// Events for celebrity appearances
const EVENTS = [
  'Met Gala', 'Fashion Week', 'Award Show', 'Movie Premiere', 'Talk Show Appearance',
  'Magazine Cover Shoot', 'Music Video', 'Charity Gala', 'Red Carpet Event', 'Street Style',
  'Music Festival', 'Brand Campaign', 'Social Media Post', 'Late Night Show', 'Concert',
  'Product Launch', 'Interview', 'Press Tour', 'Brand Ambassador Event', 'Vacation Paparazzi'
];

// Generate random date in the past year
const generateRecentDate = (): Date => {
  const now = new Date();
  const pastYear = new Date();
  pastYear.setFullYear(now.getFullYear() - 1);
  
  return new Date(pastYear.getTime() + Math.random() * (now.getTime() - pastYear.getTime()));
};

// Generate social proof item
const generateSocialProofItem = (products: RecommendationItem[]): SocialProofItem => {
  const id = generateId('social');
  const celebrity = CELEBRITIES[Math.floor(Math.random() * CELEBRITIES.length)];
  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const year = new Date().getFullYear();
  const eventWithYear = `${event} ${year}`;
  
  // Generate random outfit tags
  const allTags = [
    'gown', 'suit', 'dress', 'casual', 'streetwear', 'formal', 'athleisure',
    'vintage', 'minimalist', 'bohemian', 'glamorous', 'edgy', 'preppy',
    'monochrome', 'colorful', 'layered', 'oversized', 'fitted', 'textured',
    'sustainable', 'custom', 'designer'
  ];
  
  // Add some designer names
  const designers = [
    'Gucci', 'Prada', 'Louis Vuitton', 'Dior', 'Chanel', 'Versace',
    'Balenciaga', 'Valentino', 'Fendi', 'Calvin Klein', 'YSL', 'Balmain'
  ];
  
  // Select 2-5 random tags
  const numTags = 2 + Math.floor(Math.random() * 4);
  const shuffledTags = [...allTags].sort(() => 0.5 - Math.random());
  const outfitTags = shuffledTags.slice(0, numTags);
  
  // Add a designer 80% of the time
  if (Math.random() > 0.2) {
    const designer = designers[Math.floor(Math.random() * designers.length)];
    outfitTags.push(designer);
  }
  
  // Select patterns
  const numPatterns = 1 + Math.floor(Math.random() * 2);
  const shuffledPatterns = [...PATTERNS].sort(() => 0.5 - Math.random());
  const patterns = shuffledPatterns.slice(0, numPatterns);
  
  // Select colors
  const numColors = 1 + Math.floor(Math.random() * 3);
  const shuffledColors = [...COLORS].sort(() => 0.5 - Math.random());
  const colors = shuffledColors.slice(0, numColors).map(c => c.name);
  
  // Select matched products (1-3)
  const numProducts = 1 + Math.floor(Math.random() * 3);
  const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
  const matchedProducts = shuffledProducts.slice(0, numProducts).map(product => {
    // Generate a match score for this specific social proof match
    const matchScore = 0.8 + Math.random() * 0.15;
    
    // Generate match reasons
    const matchReasons = [
      `Similar style to ${celebrity}'s ${outfitTags.join(', ')} look`,
      `Matches the ${colors.join('/')} color palette`,
      `${product.category} as seen on ${celebrity}`
    ];
    
    // Add pattern reason if applicable
    if (patterns.includes('solid') && product.patterns?.includes('solid')) {
      matchReasons.push('Solid pattern like the celebrity look');
    } else if (patterns.some(p => product.patterns?.includes(p))) {
      const pattern = patterns.find(p => product.patterns?.includes(p));
      matchReasons.push(`${pattern} pattern matches celebrity outfit`);
    }
    
    return {
      id: product.id,
      name: product.name,
      description: `${product.brand} ${product.name}`,
      price: product.price,
      brand: product.brand,
      category: product.category,
      imageUrl: product.imageUrls[0],
      matchScore,
      matchReasons: matchReasons.slice(0, 3)
    } as SocialProofMatch;
  });
  
  return {
    id,
    celebrity,
    event: eventWithYear,
    outfitTags,
    patterns,
    colors,
    timestamp: generateRecentDate().toISOString(),
    matchedProducts
  };
};

// Function to generate social proof items
const generateSocialProofItems = (products: RecommendationItem[], count: number): SocialProofItem[] => {
  const items: SocialProofItem[] = [];
  
  for (let i = 0; i < count; i++) {
    items.push(generateSocialProofItem(products));
  }
  
  return items;
};

// Generate user profiles
const generateUserProfile = (userId: string): UserProfile => {
  // Generate style preferences
  const stylePrefs = ['casual', 'minimalist', 'contemporary'].map(style => ({
    style,
    weight: 0.7 + Math.random() * 0.3
  }));
  
  // Generate color preferences
  const colorPrefs = COLORS.slice(0, 5 + Math.floor(Math.random() * 5))
    .map(c => ({
      color: c.name,
      weight: 0.7 + Math.random() * 0.3
    }));
  
  // Generate size preferences
  const sizePrefs = [
    { category: 'tops', size: 'M' },
    { category: 'tops', size: 'L' },
    { category: 'bottoms', size: '32' },
    { category: 'bottoms', size: '33' },
    { category: 'dresses', size: '12' },
    { category: 'shoes', size: '9' }
  ];
  
  return {
    userId,
    isAnonymous: false,
    preferences: {
      stylePreferences: stylePrefs,
      colorPreferences: colorPrefs,
      sizePreferences: sizePrefs,
      favoriteRetailers: RETAILERS.slice(0, 2),
      occasionPreferences: ['casual', 'work', 'evening'],
      // Also include the legacy format for backward compatibility
      sizes: {
        top: ['M', 'L'],
        bottom: ['32', '33'],
        dress: ['12'],
        shoe: ['9']
      },
      colors: COLORS.slice(0, 5 + Math.floor(Math.random() * 5)).map(c => c.name),
      styles: ['casual', 'minimalist', 'contemporary'],
      brands: BRANDS.slice(0, 3 + Math.floor(Math.random() * 5)),
      occasions: ['casual', 'work', 'evening'],
      priceRanges: ['BUDGET', 'MIDRANGE']
    },
    closet: [], // Empty closet
    feedback: {
      likedItems: [],
      dislikedItems: [],
      savedOutfits: [],
      viewedItems: [],
      lastInteraction: new Date()
    },
    createdAt: new Date(),
    lastActive: new Date()
  };
};

// Generate all the mock data
export const generateMockData = (productCount = 120, outfitCount = 30, socialProofCount = 25) => {
  // Generate products
  const products = generateProducts(productCount);
  
  // Generate outfits using those products
  const outfits = generateOutfits(products, outfitCount);
  
  // Generate social proof items
  const socialProofItems = generateSocialProofItems(products, socialProofCount);
  
  // Generate demo user profile
  const userProfile = generateUserProfile('demo_user');
  
  return {
    products,
    outfits,
    socialProofItems,
    userProfile,
    // Export constants for consistency
    categories: CATEGORIES,
    colors: COLORS,
    sizes: SIZES,
    patterns: PATTERNS,
    materials: MATERIALS,
    brands: BRANDS,
    occasions: OCCASIONS
  };
};

// Pre-generated data for import
export const mockData = generateMockData();

// For demo/production mode toggle
export const DATA_MODE = {
  DEMO: 'demo',
  PRODUCTION: 'production'
};

// Export the toggle helper
export const isMockDataEnabled = () => {
  // Read from localStorage or other configuration
  try {
    const storedMode = localStorage.getItem('STYLIST_DATA_MODE');
    return storedMode === DATA_MODE.DEMO;
  } catch (e) {
    // Default to false if localStorage isn't available
    return false;
  }
};

export const setDataMode = (mode: string) => {
  try {
    localStorage.setItem('STYLIST_DATA_MODE', mode);
    return true;
  } catch (e) {
    console.error('Failed to set data mode:', e);
    return false;
  }
};

export default mockData;