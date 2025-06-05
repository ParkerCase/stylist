export async function fetchCelebrityData(limit = 20) {
  const response = await fetch(`/api/celebrity-styles?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch celebrity data');
  const data = await response.json();
  // Map API data to UI shape
  return (data.items || []).map((item: any, idx: number) => ({
    id: item.id || `${(item.celebrity || '').replace(/:$/, '')}-${(item.outfitDescription || '').slice(0, 10)}-${idx}`,
    celebrity: (item.celebrity || '').replace(/:$/, ''),
    event: item.event || '',
    outfitTags: item.outfitTags || [],
    patterns: item.patterns || [],
    colors: item.colors || [],
    timestamp: item.timestamp || new Date().toISOString(),
    matchedProducts: (item.products || []).map((p: any, i: number) => ({
      id: p.href || `${item.celebrity}-product-${i}`,
      name: p.text || '',
      description: '',
      price: 0,
      brand: '',
      category: '',
      imageUrl: '',
      matchScore: 0.9,
      matchReasons: ['Scraped from article'],
    })),
    imageUrl: item.imageUrl || '',
  }));
} 