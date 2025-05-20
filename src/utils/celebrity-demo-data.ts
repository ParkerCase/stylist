// celebrity-demo-data.ts
// Demo data for the social proof celebrity content

import { Recommendation } from '@/types';

export interface Celebrity {
  id: string;
  name: string;
  imageUrl: string;
  latestLook: string;
  event: string;
  description: string;
  timestamp: string;
  tags: string[];
  matchedProducts: Recommendation.RecommendationItem[];
}

// Create 20 celebrity entries for the 2x10 grid
const celebrities: Celebrity[] = [
  {
    id: 'celeb-001',
    name: 'Emma Watson',
    imageUrl: 'https://via.placeholder.com/500x700?text=Emma+Watson',
    latestLook: 'Sustainable Chic Gown',
    event: 'Met Gala 2023',
    description: 'Emma wore a stunning eco-friendly gown made from recycled materials, showcasing her commitment to sustainable fashion while maintaining her signature elegant style.',
    timestamp: '2023-05-01T20:00:00Z',
    tags: ['sustainable', 'gown', 'designer', 'red carpet', 'eco-friendly'],
    matchedProducts: [
      {
        id: 'prod-watson-001',
        retailerId: 'sustainable_fashion',
        name: 'Eco Satin Evening Gown',
        brand: 'Green Couture',
        category: 'dresses',
        price: 899.99,
        colors: ['ivory', 'silver'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Eco+Gown'],
        url: '#',
        matchScore: 95,
        matchReasons: ['Sustainable materials', 'Similar silhouette', 'Evening wear'],
        inStock: true,
        description: 'Elegant evening gown made from recycled satin with a flattering silhouette.'
      },
      {
        id: 'prod-watson-002',
        retailerId: 'sustainable_fashion',
        name: 'Recycled Sequin Dress',
        brand: 'Terra Glam',
        category: 'dresses',
        price: 659.99,
        colors: ['silver'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Sequin+Dress'],
        url: '#',
        matchScore: 87,
        matchReasons: ['Eco-friendly materials', 'Formal style', 'Similar aesthetic'],
        inStock: true,
        description: 'Shimmering evening dress made with recycled sequins and eco-friendly lining.'
      }
    ]
  },
  {
    id: 'celeb-002',
    name: 'Zendaya',
    imageUrl: 'https://via.placeholder.com/500x700?text=Zendaya',
    latestLook: 'Bold Statement Suit',
    event: 'Film Premiere',
    description: 'Zendaya stunned in a tailored power suit with architectural details, challenging traditional red carpet norms with her bold fashion choices.',
    timestamp: '2023-06-15T19:30:00Z',
    tags: ['power suit', 'tailored', 'androgynous', 'statement'],
    matchedProducts: [
      {
        id: 'prod-zendaya-001',
        retailerId: 'luxury_retailer',
        name: 'Architectural Blazer',
        brand: 'Avant Couture',
        category: 'blazers',
        price: 1250.00,
        colors: ['black'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Statement+Blazer'],
        url: '#',
        matchScore: 92,
        matchReasons: ['Architectural details', 'Tailored fit', 'Statement piece'],
        inStock: true,
        description: 'Bold blazer with architectural shoulders and clean lines for a powerful silhouette.'
      },
      {
        id: 'prod-zendaya-002',
        retailerId: 'luxury_retailer',
        name: 'High-Waisted Tailored Pants',
        brand: 'Avant Couture',
        category: 'pants',
        price: 850.00,
        colors: ['black'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Tailored+Pants'],
        url: '#',
        matchScore: 89,
        matchReasons: ['Perfect match to blazer', 'High-waisted cut', 'Tailored fit'],
        inStock: true,
        description: 'Tailored pants with a high waist and straight leg to complete a power suit look.'
      }
    ]
  },
  {
    id: 'celeb-003',
    name: 'Rihanna',
    imageUrl: 'https://via.placeholder.com/500x700?text=Rihanna',
    latestLook: 'Street Style Statement',
    event: 'Fashion Week',
    description: 'Rihanna showcased her iconic street style with an oversized vintage coat paired with modern accessories, creating the perfect high-low mix.',
    timestamp: '2023-09-22T14:00:00Z',
    tags: ['street style', 'vintage', 'oversized', 'layered'],
    matchedProducts: [
      {
        id: 'prod-rihanna-001',
        retailerId: 'urban_fashion',
        name: 'Oversized Vintage-Inspired Coat',
        brand: 'Street Couture',
        category: 'outerwear',
        price: 479.99,
        salePrice: 379.99,
        colors: ['camel'],
        sizes: ['S', 'M', 'L', 'XL'],
        imageUrls: [
          'https://via.placeholder.com/300x400?text=Oversized+Coat',
          'https://via.placeholder.com/300x400?text=Coat+Back+View'
        ],
        url: '#',
        matchScore: 90,
        matchReasons: ['Oversized fit', 'Vintage-inspired', 'Street style essential'],
        inStock: true,
        description: 'Statement oversized coat with vintage-inspired details for the ultimate street style look.'
      }
    ]
  },
  {
    id: 'celeb-004',
    name: 'Timothée Chalamet',
    imageUrl: 'https://via.placeholder.com/500x700?text=Timothee+Chalamet',
    latestLook: 'Modern Velvet Suit',
    event: 'Awards Ceremony',
    description: 'Timothée continued his reign as a fashion icon with a modern take on the classic velvet suit, featuring subtle texture and a slim cut.',
    timestamp: '2023-02-26T18:30:00Z',
    tags: ['velvet', 'suit', 'modern', 'slim fit', 'textured'],
    matchedProducts: [
      {
        id: 'prod-chalamet-001',
        retailerId: 'menswear_luxury',
        name: 'Burgundy Velvet Blazer',
        brand: 'Modern Gent',
        category: 'blazers',
        price: 695.00,
        colors: ['burgundy'],
        sizes: ['36', '38', '40', '42', '44'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Velvet+Blazer'],
        url: '#',
        matchScore: 96,
        matchReasons: ['Velvet material', 'Slim cut', 'Formal style'],
        inStock: true,
        description: 'Luxurious velvet blazer with a modern slim cut for a sophisticated evening look.'
      },
      {
        id: 'prod-chalamet-002',
        retailerId: 'menswear_luxury',
        name: 'Tailored Velvet Trousers',
        brand: 'Modern Gent',
        category: 'pants',
        price: 425.00,
        colors: ['burgundy'],
        sizes: ['28', '30', '32', '34', '36'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Velvet+Trousers'],
        url: '#',
        matchScore: 95,
        matchReasons: ['Matching velvet material', 'Tailored cut', 'Evening wear'],
        inStock: true,
        description: 'Perfectly tailored velvet trousers to complete a sophisticated suit ensemble.'
      }
    ]
  },
  {
    id: 'celeb-005',
    name: 'Lizzo',
    imageUrl: 'https://via.placeholder.com/500x700?text=Lizzo',
    latestLook: 'Bold Pattern Dress',
    event: 'Music Awards',
    description: 'Lizzo stunned in a vibrant patterned dress that celebrates body positivity and showcases her fearless approach to fashion.',
    timestamp: '2023-08-10T20:00:00Z',
    tags: ['pattern', 'vibrant', 'statement', 'curve-friendly'],
    matchedProducts: [
      {
        id: 'prod-lizzo-001',
        retailerId: 'inclusive_fashion',
        name: 'Bold Floral Maxi Dress',
        brand: 'Curve Couture',
        category: 'dresses',
        price: 259.99,
        colors: ['multicolor'],
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Floral+Maxi+Dress'],
        url: '#',
        matchScore: 88,
        matchReasons: ['Bold pattern', 'Inclusive sizing', 'Statement piece'],
        inStock: true,
        description: 'A stunning maxi dress with a vibrant floral pattern designed to flatter all body types.'
      }
    ]
  },
  {
    id: 'celeb-006',
    name: 'Harry Styles',
    imageUrl: 'https://via.placeholder.com/500x700?text=Harry+Styles',
    latestLook: 'Gender-Fluid Fashion',
    event: 'Magazine Cover Shoot',
    description: 'Harry continued to redefine menswear with a gender-fluid ensemble featuring a pleated skirt and tailored jacket, challenging fashion norms.',
    timestamp: '2023-07-18T09:00:00Z',
    tags: ['gender-fluid', 'pleated', 'tailored', 'high-fashion'],
    matchedProducts: [
      {
        id: 'prod-styles-001',
        retailerId: 'designer_fashion',
        name: 'Pleated Skirt Trouser',
        brand: 'Gender Neutral',
        category: 'bottoms',
        price: 550.00,
        colors: ['navy'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Pleated+Skirt'],
        url: '#',
        matchScore: 93,
        matchReasons: ['Pleated design', 'Gender-neutral', 'High fashion'],
        inStock: true,
        description: 'Avant-garde pleated skirt trouser that blends masculine and feminine elements.'
      },
      {
        id: 'prod-styles-002',
        retailerId: 'designer_fashion',
        name: 'Structured Tailored Jacket',
        brand: 'Avantgarde',
        category: 'jackets',
        price: 890.00,
        colors: ['navy'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Tailored+Jacket'],
        url: '#',
        matchScore: 89,
        matchReasons: ['Tailored fit', 'Structured shoulders', 'Statement piece'],
        inStock: true,
        description: 'Expertly tailored structured jacket that redefines traditional menswear.'
      }
    ]
  },
  {
    id: 'celeb-007',
    name: 'Lupita Nyong\'o',
    imageUrl: 'https://via.placeholder.com/500x700?text=Lupita+Nyongo',
    latestLook: 'Vibrant Red Carpet Gown',
    event: 'Hollywood Premiere',
    description: 'Lupita dazzled in a vibrant gown with intricate beadwork that celebrated her heritage while making a striking red carpet statement.',
    timestamp: '2023-04-30T19:00:00Z',
    tags: ['beaded', 'vibrant', 'cultural', 'gown', 'statement'],
    matchedProducts: [
      {
        id: 'prod-nyongo-001',
        retailerId: 'global_fashion',
        name: 'Beaded Statement Gown',
        brand: 'Cultural Couture',
        category: 'dresses',
        price: 1895.00,
        colors: ['turquoise', 'gold'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Beaded+Gown'],
        url: '#',
        matchScore: 94,
        matchReasons: ['Intricate beadwork', 'Vibrant color palette', 'Statement piece'],
        inStock: true,
        description: 'Hand-beaded gown featuring vibrant colors and cultural-inspired patterns.'
      }
    ]
  },
  {
    id: 'celeb-008',
    name: 'Dua Lipa',
    imageUrl: 'https://via.placeholder.com/500x700?text=Dua+Lipa',
    latestLook: 'Y2K Revival',
    event: 'Music Festival',
    description: 'Dua embraced the Y2K fashion revival with a modern twist, sporting low-rise pants and a crop top paired with futuristic accessories.',
    timestamp: '2023-06-12T21:00:00Z',
    tags: ['Y2K', 'low-rise', 'crop top', 'retro', 'festival'],
    matchedProducts: [
      {
        id: 'prod-dualipa-001',
        retailerId: 'trend_fashion',
        name: 'Y2K Low-Rise Cargo Pants',
        brand: 'Retro Revival',
        category: 'pants',
        price: 89.99,
        colors: ['silver'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Low+Rise+Pants'],
        url: '#',
        matchScore: 97,
        matchReasons: ['Y2K style', 'Low-rise cut', 'Festival fashion'],
        inStock: true,
        description: 'Throwback low-rise cargo pants with a metallic finish for the ultimate Y2K look.'
      },
      {
        id: 'prod-dualipa-002',
        retailerId: 'trend_fashion',
        name: 'Metallic Crop Top',
        brand: 'Retro Revival',
        category: 'tops',
        price: 45.99,
        colors: ['silver'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Metallic+Crop+Top'],
        url: '#',
        matchScore: 96,
        matchReasons: ['Y2K aesthetic', 'Crop style', 'Metallic finish'],
        inStock: true,
        description: 'Shimmering metallic crop top inspired by early 2000s fashion trends.'
      }
    ]
  },
  {
    id: 'celeb-009',
    name: 'Chadwick Boseman',
    imageUrl: 'https://via.placeholder.com/500x700?text=Chadwick+Boseman',
    latestLook: 'Embroidered Formal Suit',
    event: 'Legacy Tribute',
    description: 'In tribute to Chadwick\'s impeccable style, this look showcases his preference for suits with cultural elements and detailed embroidery.',
    timestamp: '2023-04-15T18:00:00Z',
    tags: ['embroidered', 'suit', 'cultural', 'formal', 'legacy'],
    matchedProducts: [
      {
        id: 'prod-boseman-001',
        retailerId: 'luxury_menswear',
        name: 'Cultural Embroidered Suit',
        brand: 'Heritage Luxury',
        category: 'suits',
        price: 1750.00,
        colors: ['black', 'gold'],
        sizes: ['38', '40', '42', '44', '46'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Embroidered+Suit'],
        url: '#',
        matchScore: 91,
        matchReasons: ['Detailed embroidery', 'Cultural elements', 'Formal attire'],
        inStock: true,
        description: 'Exquisitely tailored suit featuring hand-embroidered details that celebrate cultural heritage.'
      }
    ]
  },
  {
    id: 'celeb-010',
    name: 'Billie Eilish',
    imageUrl: 'https://via.placeholder.com/500x700?text=Billie+Eilish',
    latestLook: 'Oversized Monochrome',
    event: 'Album Release Party',
    description: 'Billie stayed true to her signature style with an oversized monochrome ensemble that balances comfort and high fashion.',
    timestamp: '2023-09-05T20:30:00Z',
    tags: ['oversized', 'monochrome', 'streetwear', 'layered'],
    matchedProducts: [
      {
        id: 'prod-eilish-001',
        retailerId: 'streetwear_brand',
        name: 'Oversized Graphic Hoodie',
        brand: 'Street Culture',
        category: 'hoodies',
        price: 129.99,
        colors: ['black'],
        sizes: ['S', 'M', 'L', 'XL', '2XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Oversized+Hoodie'],
        url: '#',
        matchScore: 98,
        matchReasons: ['Oversized fit', 'Monochrome palette', 'Streetwear aesthetic'],
        inStock: true,
        description: 'Ultra-oversized hoodie with graphic details, perfect for a statement streetwear look.'
      },
      {
        id: 'prod-eilish-002',
        retailerId: 'streetwear_brand',
        name: 'Wide-Leg Cargo Pants',
        brand: 'Street Culture',
        category: 'pants',
        price: 149.99,
        colors: ['black'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Cargo+Pants'],
        url: '#',
        matchScore: 96,
        matchReasons: ['Oversized silhouette', 'Matching monochrome', 'Utility details'],
        inStock: true,
        description: 'Relaxed-fit cargo pants with multiple pockets for an authentic streetwear vibe.'
      }
    ]
  },
  {
    id: 'celeb-011',
    name: 'Blake Lively',
    imageUrl: 'https://via.placeholder.com/500x700?text=Blake+Lively',
    latestLook: 'Elegant Pantsuit',
    event: 'Charity Gala',
    description: 'Blake stunned in a tailored pantsuit with feminine details, showcasing her ability to blend sophistication with modern trends.',
    timestamp: '2023-05-22T19:00:00Z',
    tags: ['pantsuit', 'tailored', 'feminine', 'elegant'],
    matchedProducts: [
      {
        id: 'prod-lively-001',
        retailerId: 'womens_luxury',
        name: 'Tailored Satin-Trim Blazer',
        brand: 'Feminine Power',
        category: 'blazers',
        price: 595.00,
        colors: ['cream'],
        sizes: ['0', '2', '4', '6', '8', '10', '12'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Satin+Blazer'],
        url: '#',
        matchScore: 93,
        matchReasons: ['Feminine details', 'Tailored fit', 'Elegant design'],
        inStock: true,
        description: 'Expertly tailored blazer with satin lapels for a feminine take on traditional suiting.'
      },
      {
        id: 'prod-lively-002',
        retailerId: 'womens_luxury',
        name: 'Wide-Leg Dress Pants',
        brand: 'Feminine Power',
        category: 'pants',
        price: 375.00,
        colors: ['cream'],
        sizes: ['0', '2', '4', '6', '8', '10', '12'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Wide+Leg+Pants'],
        url: '#',
        matchScore: 92,
        matchReasons: ['Matching color', 'Elegant silhouette', 'Formal attire'],
        inStock: true,
        description: 'Flowing wide-leg pants that move beautifully and add drama to a formal ensemble.'
      }
    ]
  },
  {
    id: 'celeb-012',
    name: 'A$AP Rocky',
    imageUrl: 'https://via.placeholder.com/500x700?text=ASAP+Rocky',
    latestLook: 'High-Fashion Streetwear',
    event: 'Fashion Collaboration Launch',
    description: 'A$AP Rocky showcased his signature blend of high fashion and streetwear with vintage pieces mixed with luxury labels.',
    timestamp: '2023-07-08T16:00:00Z',
    tags: ['streetwear', 'vintage', 'luxury', 'layered'],
    matchedProducts: [
      {
        id: 'prod-rocky-001',
        retailerId: 'luxury_streetwear',
        name: 'Vintage-Inspired Jacket',
        brand: 'Street Luxury',
        category: 'jackets',
        price: 890.00,
        colors: ['brown', 'beige'],
        sizes: ['S', 'M', 'L', 'XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Vintage+Jacket'],
        url: '#',
        matchScore: 89,
        matchReasons: ['Vintage aesthetic', 'Luxury craftsmanship', 'Streetwear staple'],
        inStock: true,
        description: 'Premium vintage-inspired jacket that blends high fashion with street culture.'
      },
      {
        id: 'prod-rocky-002',
        retailerId: 'luxury_streetwear',
        name: 'Relaxed Luxury Jeans',
        brand: 'Street Luxury',
        category: 'jeans',
        price: 450.00,
        colors: ['indigo'],
        sizes: ['28', '30', '32', '34', '36'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Luxury+Jeans'],
        url: '#',
        matchScore: 86,
        matchReasons: ['Relaxed fit', 'Premium denim', 'Luxury details'],
        inStock: true,
        description: 'High-end relaxed jeans made from premium denim with unique distressed details.'
      }
    ]
  },
  {
    id: 'celeb-013',
    name: 'Zoe Kravitz',
    imageUrl: 'https://via.placeholder.com/500x700?text=Zoe+Kravitz',
    latestLook: 'Minimalist Chic',
    event: 'Film Festival',
    description: 'Zoe embodied minimalist chic with a sleek column dress, proving that simplicity can make the most powerful statement.',
    timestamp: '2023-08-28T17:30:00Z',
    tags: ['minimalist', 'column dress', 'sleek', 'monochrome'],
    matchedProducts: [
      {
        id: 'prod-kravitz-001',
        retailerId: 'minimalist_brand',
        name: 'Sleek Column Maxi Dress',
        brand: 'Pure Minimal',
        category: 'dresses',
        price: 495.00,
        colors: ['black'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Column+Dress'],
        url: '#',
        matchScore: 95,
        matchReasons: ['Minimalist design', 'Column silhouette', 'Sleek aesthetic'],
        inStock: true,
        description: 'Elegantly simple column dress with clean lines and a perfect fit.'
      }
    ]
  },
  {
    id: 'celeb-014',
    name: 'BTS',
    imageUrl: 'https://via.placeholder.com/500x700?text=BTS',
    latestLook: 'Coordinated Group Style',
    event: 'Award Show Performance',
    description: 'The BTS members showcased their signature coordinated style with individual touches, balancing unity and personal expression.',
    timestamp: '2023-10-02T20:00:00Z',
    tags: ['coordinated', 'K-pop', 'tailored', 'modern'],
    matchedProducts: [
      {
        id: 'prod-bts-001',
        retailerId: 'kpop_fashion',
        name: 'Modern Tailored Blazer',
        brand: 'Seoul Style',
        category: 'blazers',
        price: 329.99,
        colors: ['black', 'white'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Modern+Blazer'],
        url: '#',
        matchScore: 90,
        matchReasons: ['Modern tailoring', 'Stage-ready style', 'Versatile design'],
        inStock: true,
        description: 'Contemporary blazer with clean lines, perfect for creating a coordinated group look.'
      },
      {
        id: 'prod-bts-002',
        retailerId: 'kpop_fashion',
        name: 'Slim Fit Performance Pants',
        brand: 'Seoul Style',
        category: 'pants',
        price: 189.99,
        colors: ['black'],
        sizes: ['28', '30', '32', '34', '36'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Performance+Pants'],
        url: '#',
        matchScore: 88,
        matchReasons: ['Performance-ready', 'Sleek silhouette', 'Coordinated style'],
        inStock: true,
        description: 'Specially designed pants that allow movement while maintaining a sleek appearance.'
      }
    ]
  },
  {
    id: 'celeb-015',
    name: 'Florence Pugh',
    imageUrl: 'https://via.placeholder.com/500x700?text=Florence+Pugh',
    latestLook: 'Romantic Modern Gown',
    event: 'Hollywood Premiere',
    description: 'Florence wore a stunning gown with romantic elements balanced by modern design, showcasing her bold fashion choices.',
    timestamp: '2023-09-18T19:00:00Z',
    tags: ['romantic', 'gown', 'modern', 'bold'],
    matchedProducts: [
      {
        id: 'prod-pugh-001',
        retailerId: 'designer_fashion',
        name: 'Modern Romantic Gown',
        brand: 'New Romance',
        category: 'dresses',
        price: 1295.00,
        colors: ['blush', 'gold'],
        sizes: ['2', '4', '6', '8', '10'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Romantic+Gown'],
        url: '#',
        matchScore: 91,
        matchReasons: ['Romantic elements', 'Modern silhouette', 'Statement design'],
        inStock: true,
        description: 'A striking gown that balances romantic details with contemporary structure.'
      }
    ]
  },
  {
    id: 'celeb-016',
    name: 'Hailey Bieber',
    imageUrl: 'https://via.placeholder.com/500x700?text=Hailey+Bieber',
    latestLook: 'Elevated Casual',
    event: 'Street Style Moment',
    description: 'Hailey demonstrated her knack for elevated casual style with perfectly oversized basics paired with luxury accessories.',
    timestamp: '2023-08-05T13:00:00Z',
    tags: ['casual', 'oversized', 'basics', 'luxury'],
    matchedProducts: [
      {
        id: 'prod-bieber-001',
        retailerId: 'premium_basics',
        name: 'Oversized Premium T-shirt',
        brand: 'Elevated Casual',
        category: 'tops',
        price: 95.00,
        colors: ['white'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Premium+Tshirt'],
        url: '#',
        matchScore: 94,
        matchReasons: ['Elevated basic', 'Oversized fit', 'Premium quality'],
        inStock: true,
        description: 'The perfect oversized t-shirt made from luxurious cotton with an impeccable fit.'
      },
      {
        id: 'prod-bieber-002',
        retailerId: 'premium_basics',
        name: 'Wide-Leg Jeans',
        brand: 'Elevated Casual',
        category: 'jeans',
        price: 220.00,
        colors: ['light blue'],
        sizes: ['24', '25', '26', '27', '28', '29', '30'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Wide+Leg+Jeans'],
        url: '#',
        matchScore: 92,
        matchReasons: ['Trendy silhouette', 'Premium denim', 'Versatile styling'],
        inStock: true,
        description: 'High-waisted wide-leg jeans in premium denim that elevate any casual look.'
      }
    ]
  },
  {
    id: 'celeb-017',
    name: 'Bad Bunny',
    imageUrl: 'https://via.placeholder.com/500x700?text=Bad+Bunny',
    latestLook: 'Bold Gender-Fluid Style',
    event: 'Music Video Shoot',
    description: 'Bad Bunny pushed fashion boundaries with a gender-fluid look featuring bold colors and unexpected silhouettes.',
    timestamp: '2023-07-30T14:30:00Z',
    tags: ['gender-fluid', 'bold', 'colorful', 'avant-garde'],
    matchedProducts: [
      {
        id: 'prod-badbunny-001',
        retailerId: 'avant_garde',
        name: 'Vibrant Oversized Shirt',
        brand: 'No Boundaries',
        category: 'shirts',
        price: 180.00,
        colors: ['multi'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Vibrant+Shirt'],
        url: '#',
        matchScore: 95,
        matchReasons: ['Bold color palette', 'Gender-neutral design', 'Statement piece'],
        inStock: true,
        description: 'A boundary-pushing oversized shirt in vibrant colors that defies traditional gender norms.'
      }
    ]
  },
  {
    id: 'celeb-018',
    name: 'Janelle Monáe',
    imageUrl: 'https://via.placeholder.com/500x700?text=Janelle+Monae',
    latestLook: 'Structured Avant-Garde',
    event: 'Album Release Party',
    description: 'Janelle showcased her unique style with a structured avant-garde ensemble featuring geometric elements and bold contrasts.',
    timestamp: '2023-09-12T21:00:00Z',
    tags: ['avant-garde', 'structured', 'geometric', 'monochrome'],
    matchedProducts: [
      {
        id: 'prod-monae-001',
        retailerId: 'avant_garde',
        name: 'Geometric Structured Dress',
        brand: 'Future Fashion',
        category: 'dresses',
        price: 850.00,
        colors: ['black', 'white'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Geometric+Dress'],
        url: '#',
        matchScore: 97,
        matchReasons: ['Geometric details', 'Structured silhouette', 'Bold contrast'],
        inStock: true,
        description: 'A showstopping dress with architectural elements and striking geometric patterns.'
      }
    ]
  },
  {
    id: 'celeb-019',
    name: 'Robert Pattinson',
    imageUrl: 'https://via.placeholder.com/500x700?text=Robert+Pattinson',
    latestLook: 'Modern Grunge Formal',
    event: 'Fashion Campaign',
    description: 'Robert put his distinctive spin on formal wear with a grunge-inspired suit that blends high fashion with an effortless attitude.',
    timestamp: '2023-06-20T17:00:00Z',
    tags: ['grunge', 'suit', 'effortless', 'modern'],
    matchedProducts: [
      {
        id: 'prod-pattinson-001',
        retailerId: 'menswear_luxury',
        name: 'Deconstructed Suit Jacket',
        brand: 'Modern Rebel',
        category: 'blazers',
        price: 795.00,
        colors: ['charcoal'],
        sizes: ['36', '38', '40', '42', '44'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Deconstructed+Jacket'],
        url: '#',
        matchScore: 90,
        matchReasons: ['Grunge elements', 'Unconventional tailoring', 'Effortless style'],
        inStock: true,
        description: 'A deconstructed suit jacket that brings edge to formal dressing with strategic distressing and unconventional details.'
      },
      {
        id: 'prod-pattinson-002',
        retailerId: 'menswear_luxury',
        name: 'Slim Fit Textured Trousers',
        brand: 'Modern Rebel',
        category: 'pants',
        price: 395.00,
        colors: ['charcoal'],
        sizes: ['28', '30', '32', '34', '36'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Textured+Trousers'],
        url: '#',
        matchScore: 88,
        matchReasons: ['Textured fabric', 'Slim silhouette', 'Modern formal'],
        inStock: true,
        description: 'Slim-fitting trousers with subtle texture that add dimension to a modern formal look.'
      }
    ]
  },
  {
    id: 'celeb-020',
    name: 'Blackpink',
    imageUrl: 'https://via.placeholder.com/500x700?text=Blackpink',
    latestLook: 'High Fashion K-Pop',
    event: 'Global Brand Ambassador',
    description: 'The Blackpink members showcased their signature blend of K-pop style and high fashion, setting trends with their coordinated yet individual looks.',
    timestamp: '2023-05-15T18:30:00Z',
    tags: ['K-pop', 'high fashion', 'coordinated', 'trendsetting'],
    matchedProducts: [
      {
        id: 'prod-blackpink-001',
        retailerId: 'global_fashion',
        name: 'Statement Mini Dress',
        brand: 'Seoul Meets Paris',
        category: 'dresses',
        price: 690.00,
        colors: ['pink', 'black'],
        sizes: ['XS', 'S', 'M', 'L'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Statement+Dress'],
        url: '#',
        matchScore: 93,
        matchReasons: ['K-pop influence', 'High fashion elements', 'Statement piece'],
        inStock: true,
        description: 'A head-turning mini dress that blends K-pop energy with high fashion sophistication.'
      },
      {
        id: 'prod-blackpink-002',
        retailerId: 'global_fashion',
        name: 'Platform Combat Boots',
        brand: 'Seoul Meets Paris',
        category: 'shoes',
        price: 495.00,
        colors: ['black'],
        sizes: ['35', '36', '37', '38', '39', '40'],
        imageUrls: ['https://via.placeholder.com/300x400?text=Platform+Boots'],
        url: '#',
        matchScore: 90,
        matchReasons: ['Edgy style', 'Stage-ready', 'Versatile pairing'],
        inStock: true,
        description: 'Edgy platform combat boots that add attitude to any outfit while being comfortable enough for performers.'
      }
    ]
  }
];

// Function to get latest celebrities
export function getCelebrities(count?: number): Celebrity[] {
  if (count) {
    return celebrities.slice(0, count);
  }
  return celebrities;
}

// Function to find a celebrity by ID
export function getCelebrityById(id: string): Celebrity | undefined {
  return celebrities.find(celebrity => celebrity.id === id);
}

export default celebrities;