/**
 * Mock data generator for retailer API integration.
 * 
 * Provides realistic mock data for development, testing, and fallback scenarios.
 */

import { ItemDetails } from './api_manager';

// Sample data for generating realistic mock items
const BRANDS = [
  'Urban Thread', 'Northside', 'Echo Valley', 'Coastal Breeze',
  'Urban Pioneer', 'Summit Style', 'Harbor Bay', 'Metropolitan',
  'Woodland', 'Pacific Trend', 'Mountain Ridge', 'Riverside',
  'Altitude', 'Skyline', 'Horizon', 'Seascape', 'Evergreen',
  'Lakeside', 'Cascade', 'Bayshore', 'Wildwood', 'Ridgeline',
  'Sunset Boulevard', 'Downtown', 'Prairie', 'Bayside',
  'Golden Coast', 'Silver Creek', 'Redwood', 'Meadowbrook'
];

const CATEGORIES = [
  'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Accessories',
  'Footwear', 'Activewear', 'Intimates', 'Swimwear'
];

const SUBCATEGORIES: Record<string, string[]> = {
  'Tops': ['T-Shirts', 'Shirts', 'Blouses', 'Sweaters', 'Hoodies', 'Tank Tops', 'Polo Shirts'],
  'Bottoms': ['Jeans', 'Pants', 'Shorts', 'Skirts', 'Leggings'],
  'Dresses': ['Casual Dresses', 'Formal Dresses', 'Maxi Dresses', 'Mini Dresses', 'Midi Dresses'],
  'Outerwear': ['Jackets', 'Coats', 'Vests', 'Blazers', 'Cardigans'],
  'Accessories': ['Hats', 'Scarves', 'Gloves', 'Belts', 'Sunglasses', 'Jewelry', 'Bags'],
  'Footwear': ['Sneakers', 'Boots', 'Sandals', 'Flats', 'Heels', 'Loafers', 'Athletic Shoes'],
  'Activewear': ['Sports Bras', 'Athletic Shirts', 'Athletic Shorts', 'Athletic Pants', 'Swimsuits'],
  'Intimates': ['Bras', 'Underwear', 'Socks', 'Sleepwear', 'Loungewear'],
  'Swimwear': ['One-Piece Swimsuits', 'Bikinis', 'Swim Trunks', 'Swim Shorts', 'Cover-Ups']
};

const COLORS = [
  'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Brown',
  'Gray', 'Purple', 'Pink', 'Orange', 'Navy', 'Teal', 'Olive',
  'Maroon', 'Beige', 'Mint', 'Lavender', 'Mustard', 'Rust',
  'Coral', 'Turquoise', 'Emerald', 'Khaki', 'Burgundy'
];

const GENDERS = ['Men', 'Women', 'Unisex'];

const SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL',
  '00', '0', '2', '4', '6', '8', '10', '12', '14', '16', '18',
  '28', '29', '30', '31', '32', '33', '34', '35', '36', '38', '40', '42', '44',
  '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12', '13'
];

const TAGS = [
  'new', 'bestseller', 'sale', 'limited', 'exclusive', 'sustainable',
  'eco-friendly', 'organic', 'recycled', 'handmade', 'fair-trade',
  'vegan', 'premium', 'luxury', 'casual', 'formal', 'summer',
  'winter', 'spring', 'fall', 'holiday', 'seasonal', 'basic',
  'trending', 'classic', 'vintage', 'modern', 'athleisure',
  'workwear', 'streetwear', 'lounge', 'outdoor', 'performance'
];

// Helper functions for generating random data
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPrice(min: number = 9.99, max: number = 299.99): number {
  const price = (Math.random() * (max - min)) + min;
  return Math.round(price * 100) / 100; // Round to 2 decimal places
}

function getRandomId(prefix: string = 'item'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

function getRandomBoolean(trueChance: number = 0.5): boolean {
  return Math.random() < trueChance;
}

/**
 * Generate a single mock clothing item
 */
export function generateMockItem(id?: string): ItemDetails {
  const retailerId = 'mock';
  const category = getRandomElement(CATEGORIES);
  const subcategory = getRandomElement(SUBCATEGORIES[category] || []);
  const gender = getRandomElement(GENDERS);
  const brand = getRandomElement(BRANDS);
  const color = getRandomElement(COLORS);
  
  const productName = `${brand} ${subcategory} - ${color}`;
  const basePrice = getRandomPrice();
  const isOnSale = getRandomBoolean(0.3); // 30% chance to be on sale
  const salePrice = isOnSale ? basePrice * (1 - getRandomInt(10, 40) / 100) : undefined; // 10-40% discount
  
  // Generate sizes based on category
  const sizesCount = getRandomInt(3, 8);
  let availableSizes: string[] = [];
  
  if (category === 'Footwear') {
    // Shoe sizes
    availableSizes = getRandomElements(SIZES.filter(s => !isNaN(parseFloat(s))), sizesCount);
  } else if (['Accessories', 'Hats', 'Bags'].includes(subcategory)) {
    // Often one-size items
    availableSizes = getRandomBoolean(0.7) ? ['One Size'] : getRandomElements(['S', 'M', 'L'], 3);
  } else {
    // Clothing sizes
    availableSizes = getRandomElements(SIZES.filter(s => isNaN(parseFloat(s)) || parseInt(s) > 20), sizesCount);
  }
  
  // Select tags - some common, some category-specific
  const itemTags = [
    ...getRandomElements(TAGS, getRandomInt(2, 5)),
    category.toLowerCase(),
    subcategory.toLowerCase(),
    color.toLowerCase()
  ];
  
  // Add seasonal tags based on current month
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) itemTags.push('spring');
  if (month >= 5 && month <= 7) itemTags.push('summer');
  if (month >= 8 && month <= 10) itemTags.push('fall');
  if (month === 11 || month <= 1) itemTags.push('winter');
  
  // Add sale tag if on sale
  if (isOnSale) itemTags.push('sale');
  
  return {
    id: id || getRandomId(),
    retailerId,
    name: productName,
    description: `${gender}'s ${color} ${subcategory.toLowerCase()} from ${brand}. Perfect for any occasion.`,
    price: basePrice,
    salePrice,
    currency: 'USD',
    brand,
    category,
    subcategory,
    color,
    gender,
    image: `https://picsum.photos/seed/${productName.replace(/\s+/g, '-')}/400/600`,
    images: Array(getRandomInt(3, 8)).fill(0).map((_, i) => 
      `https://picsum.photos/seed/${productName.replace(/\s+/g, '-')}-${i}/400/600`
    ),
    url: `https://example.com/shop/${category.toLowerCase()}/${subcategory.toLowerCase().replace(/\s+/g, '-')}/${encodeURIComponent(productName.toLowerCase().replace(/\s+/g, '-'))}`,
    available: getRandomBoolean(0.9), // 90% chance to be available
    availableSizes,
    tags: itemTags,
    metadata: {
      weight: `${getRandomInt(1, 50) / 10} kg`,
      material: getRandomElement(['Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Denim', 'Leather', 'Canvas']),
      origin: getRandomElement(['USA', 'China', 'Italy', 'Vietnam', 'Bangladesh', 'India', 'Portugal', 'Turkey']),
      sustainabilityScore: getRandomInt(1, 10)
    }
  };
}

/**
 * Generate a collection of mock inventory items
 */
export function generateMockInventory(count: number = 100): ItemDetails[] {
  return Array(count).fill(0).map(() => generateMockItem());
}