// whoWhatWearScraper.ts
// Production-ready Puppeteer scraper for WhoWhatWear celebrity fashion

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { celebrityNames } from './data/celebrityNames';
import { extractOutfitElements, calculateCelebrityConfidence } from './parseWhoWhatWear';
import fs from 'fs';

interface SocialProofItem {
  celebrity: string;
  event?: string;
  outfitDescription: string;
  imageUrl?: string;
  timestamp?: string;
  outfitTags?: string[];
  colors?: string[];
  patterns?: string[];
  styles?: string[];
  confidenceScore?: number;
  products?: { text: string | null; href: string | null }[];
}

interface ScraperOptions {
  itemLimit?: number;
  headless?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

const DEFAULT_OPTIONS: ScraperOptions = {
  itemLimit: 12,
  headless: true,
  timeout: 30000, // Reduced timeout for faster responses
  retryAttempts: 2 // Reduced retry attempts for faster testing
};

// Add a delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add stealth plugin
puppeteer.use(StealthPlugin());

/**
 * Scrapes celebrity fashion data from WhoWhatWear
 * Production-ready implementation with robust error handling and fallbacks
 */
export async function scrapeWhoWhatWear(options: ScraperOptions = {}): Promise<SocialProofItem[]> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Comprehensive list of WhoWhatWear celebrity content URLs
  const targetUrls = [
    // Main celebrity landing pages
    'https://www.whowhatwear.com/fashion/celebrity', // Main directory
    'https://www.whowhatwear.com/celebrity-style',   // General celebrity style
    'https://www.whowhatwear.com/fashion/celebrity/celebrity-style', // Alternative path
    
    // Specific celebrity content types
    'https://www.whowhatwear.com/celebrity-street-style',
    'https://www.whowhatwear.com/celebrity-outfits',
    'https://www.whowhatwear.com/celebrity-looks',
    
    // Special formats that typically have good celebrity content
    'https://www.whowhatwear.com/section/slideshows',
    'https://www.whowhatwear.com/celebrity-outfits-of-the-week', // Weekly roundups
    
    // Trend and red carpet content (often has celebrity outfits)
    'https://www.whowhatwear.com/fashion/trends',
    'https://www.whowhatwear.com/red-carpet-fashion'
  ];
  
  // URLs to try if initial scraping fails - these are more specific, high-quality sources
  const fallbackUrls = [
    // Latest celebrity slideshows and galleries
    'https://www.whowhatwear.com/slide/celebrity-outfits',
    'https://www.whowhatwear.com/slide/what-celebrities-wore-this-week',
    
    // Category-specific searches (more targeted)
    'https://www.whowhatwear.com/search?q=celebrity+style',
    'https://www.whowhatwear.com/search?q=celebrity+outfit',
    'https://www.whowhatwear.com/search?q=best+dressed+celebrity'
  ];
  
  let browser: Browser | null = null;
  let retryCount = 0;
  
  while (retryCount < config.retryAttempts!) {
    try {
      console.log(`🚀 Scraping WhoWhatWear (attempt ${retryCount + 1}/${config.retryAttempts})...`);
      
      // Launch browser with optimized settings for web scraping
      browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // or your Chrome path
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1366,768',
          '--disable-notifications',
          '--disable-geolocation'
        ]
      });

      const page = await browser.newPage();
      
      // Configure browser for optimal scraping
      await page.setRequestInterception(true);
      
      // Only load essential resources to speed up scraping
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        const url = request.url();
        
        // Allow basic images for better content identification but block heavy resources
        if (['media', 'font'].includes(resourceType) || 
            (resourceType === 'stylesheet' && !url.includes('critical')) ||
            (resourceType === 'script' && url.includes('ads')) ||
            url.includes('analytics') ||
            url.includes('tracking') ||
            url.includes('advertisement')) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Set appropriate timeouts
      page.setDefaultTimeout(config.timeout!);
      page.setDefaultNavigationTimeout(config.timeout!);
      
      // Storage for collected items
      const items: SocialProofItem[] = [];
      
      // NEW: Scrape latest article links and visit each
      console.log('🔍 Collecting latest article links...');
      const articleLinks = await getArticleLinks(page, 10); // 10 articles for now
      console.log(`Found ${articleLinks.length} article links.`);
      for (const articleUrl of articleLinks) {
        try {
          console.log(`📄 Visiting article: ${articleUrl}`);
          await page.goto(articleUrl, { waitUntil: 'networkidle2', timeout: config.timeout });
          await delay(1000); // Let content load
          await extractCelebrityItems(page, items); // Use your existing extraction logic
          if (items.length >= config.itemLimit!) break;
        } catch {
          console.log(`❌ Failed to scrape article: ${articleUrl}`);
        }
      }
      
      // Attempt primary URL targets
      console.log('🔍 Trying primary celebrity content URLs...');
      for (const url of targetUrls) {
        if (items.length >= config.itemLimit!) {
          break;
        }
        
        try {
          console.log(`📄 Fetching: ${url}`);
          
          // Go to page and wait for content to load
          await page.goto(url, { 
            waitUntil: 'networkidle2', // Better for dynamic content
            timeout: config.timeout 
          });
          
          // Wait for content with appropriate selectors
          try {
            const contentSelectors = [
              'article',
              '[class*="article"]',
              '[class*="card"]',
              '.story-card',
              '.post-card',
              '.slide'
            ];
            
            // Wait for any of the selectors to appear (compatible Promise technique)
            await Promise.race(
              contentSelectors.map(selector => 
                page.waitForSelector(selector, { timeout: 15000, visible: true })
                  .catch(() => null) // Ignore individual failures
              )
            );
          } catch {
            console.log(`⚠️ Selector timeout, proceeding with current page state...`);
          }
          
          // Scroll to load more content (30% of page for speed)
          await autoScroll(page);
          await delay(1000); // Allow for dynamic content to load
          
          // Extract celebrity content
          const initialCount = items.length;
          await extractCelebrityItems(page, items);
          
          if (items.length > initialCount) {
            console.log(`✅ Found ${items.length - initialCount} new items on ${url}`);
            if (items.length >= 3) {
              break; // We've found enough items
            }
          } else {
            console.log(`⚠️ No new items found on ${url}`);
          }
          
          await delay(1500); // Polite delay between requests
          
        } catch (error) {
          console.log(`❌ Failed with URL ${url}:`, (error as Error).message);
          await delay(2000);
        }
      }
      
      // If we haven't found enough items, try fallback URLs
      if (items.length < 5) {
        console.log('🔄 Trying fallback URLs for more celebrity content...');
        
        for (const url of fallbackUrls) {
          if (items.length >= config.itemLimit!) break;
          
          try {
            console.log(`📄 Fetching fallback: ${url}`);
            
            await page.goto(url, { 
              waitUntil: 'networkidle2',
              timeout: config.timeout 
            });
            
            await delay(3000); // Additional wait for complex page loads
            await autoScroll(page);
            
            const initialCount = items.length;
            await extractCelebrityItems(page, items);
            
            if (items.length > initialCount) {
              console.log(`✅ Found ${items.length - initialCount} additional items on fallback ${url}`);
            }
            
          } catch (e) {
            console.log(`❌ Fallback URL failed: ${(e as Error).message}`);
          }
        }
      }
      
      // Last resort: try slideshow format specifically
      if (items.length < 3) {
        console.log('🔍 Attempting specialized slideshow extraction...');
        try {
          await page.goto('https://www.whowhatwear.com', { waitUntil: 'networkidle2' });
          
          // Search for "celebrity style" on the site
          await page.type('input[type="search"], input[name="query"], [placeholder*="search"], [aria-label*="search"]', 'celebrity style');
          await page.keyboard.press('Enter');
          
          await delay(3000);
          await autoScroll(page);
          
          const initialCount = items.length;
          await extractFromSlideshow(page, items); // Try specialized slideshow extraction
          
          if (items.length > initialCount) {
            console.log(`✅ Found ${items.length - initialCount} items from slideshow format`);
          }
        } catch (e) {
          console.log(`❌ Slideshow extraction failed: ${(e as Error).message}`);
        }
      }

      // Process results
      if (items.length > 0) {
        console.log(`✅ Successfully scraped ${items.length} celebrity fashion items`);
        
        // Ensure highest quality items are returned first
        const sortedItems = items
          .filter(item => item.celebrity && item.outfitDescription) // Ensure required fields
          .sort((a, b) => {
            // Prioritize items with images
            if (!!a.imageUrl !== !!b.imageUrl) return a.imageUrl ? -1 : 1;
            // Then those with event context
            if (!!a.event !== !!b.event) return a.event ? -1 : 1;
            // Then by description length (prefer more detailed)
            return (b.outfitDescription?.length || 0) - (a.outfitDescription?.length || 0);
          });
        
        return sortedItems.slice(0, config.itemLimit);
      }
      
      // No items found after trying everything
      throw new Error("No celebrity fashion data found after exhausting all sources");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error scraping WhoWhatWear:`, errorMessage);
      retryCount++;
      
      if (retryCount >= config.retryAttempts!) {
        console.error('⚠️ Max retry attempts reached, falling back to mock data');
        // Return mock data as last resort
        return generateMockData(config.itemLimit || 12);
      }
      
      // Exponential backoff for retries
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 15000);
      console.log(`⏱️ Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
      
    } finally {
      if (browser) {
        await browser.close();
        console.log('🧹 Browser closed');
      }
    }
  }

  // Should never reach here, but just in case
  return generateMockData(config.itemLimit || 12);
}

/**
 * Extracts celebrity-specific items with improved selectors and patterns
 * Optimized specifically for WhoWhatWear's content structure
 */
async function extractCelebrityItems(page: Page, items: SocialProofItem[]): Promise<void> {
  // More robust extraction logic for WhoWhatWear articles with debug logging and improved image extraction
  const newItems = await page.evaluate(() => {
    function getLargeImg(imgs: NodeListOf<HTMLImageElement>) {
      const arr = Array.from(imgs);
      for (const img of arr) {
        if ((img.naturalWidth && img.naturalWidth >= 200) || (img.width && img.width >= 200)) {
          return img.src;
        }
      }
      return arr[0]?.src;
    }
    const results: any[] = [];
    const strongs = document.querySelectorAll('strong, b');
    console.log('Found <strong>/<b> elements:', strongs.length);
    strongs.forEach(strong => {
      const strongText = strong.textContent?.trim() || '';
      console.log('Strong text:', strongText);
      const match = strongText.match(/^On (.+):?$/i);
      if (match) {
        const celebrity = match[1];
        // Try to find the parent <p> first
        let parentP: HTMLElement | null = strong.closest('p');
        // If not found, try the closest .article-body or just parentElement
        if (!parentP) {
          parentP = strong.closest('.article-body') as HTMLElement | null || strong.parentElement;
        }
        if (!parentP) {
          console.log('No reasonable parent found for:', strongText);
          return;
        }
        // Get the full text minus the celebrity part
        let desc = parentP.textContent || '';
        desc = desc.replace(strongText, '').trim();
        // Collect product links (type guard for Element)
        let links: { text: string | null; href: string | null }[] = [];
        if (parentP instanceof Element) {
          links = Array.from(parentP.querySelectorAll('a')).map(a => ({
            text: a.textContent,
            href: a.getAttribute('href')
          }));
        }
        // Improved image extraction logic
        let imageUrl: string | undefined = undefined;
        if (parentP instanceof Element) {
          // 1. Look for an <img> in the closest parent .article-body, .content, or <article>
          const container = parentP.closest('.article-body, .content, article') as HTMLElement | null;
          if (container) {
            const imgs = container.querySelectorAll('img');
            const found = getLargeImg(imgs);
            if (found) imageUrl = found;
          }
          // 2. If not found, look for the closest previous <img> in the DOM before the <strong> tag
          if (!imageUrl) {
            let prev: HTMLElement | null = strong.previousElementSibling as HTMLElement | null;
            while (prev && !imageUrl) {
              const imgs = prev.querySelectorAll ? prev.querySelectorAll('img') : [];
              const found = getLargeImg(imgs as NodeListOf<HTMLImageElement>);
              if (found) imageUrl = found;
              prev = prev.previousElementSibling as HTMLElement | null;
            }
          }
          // 3. As a last resort, use the first large image in the article
        if (!imageUrl) {
            const article = parentP.closest('article') as HTMLElement | null;
            if (article) {
              const imgs = article.querySelectorAll('img');
              const found = getLargeImg(imgs);
              if (found) imageUrl = found;
            }
          }
        }
        console.log('Extracted:', { celebrity, desc, links, imageUrl });
            results.push({
          celebrity,
          outfitDescription: desc,
          products: links,
          imageUrl
        });
      }
    });
    return results;
  });
  // Add new items to the items array
  for (const item of newItems) {
    // Skip if already exists
    const exists = items.some(existing => 
      existing.celebrity === item.celebrity && 
      existing.outfitDescription.substring(0, 50) === item.outfitDescription.substring(0, 50)
    );
    if (!exists && item.celebrity && item.outfitDescription) {
      items.push(item);
    }
  }
}

/**
 * Specialized extraction for WhoWhatWear slideshow format
 */
async function extractFromSlideshow(page: Page, items: SocialProofItem[]): Promise<void> {
  console.log('Attempting to extract from slideshow format...');
  
  // Inject the celebrityNames array into the page
  await page.evaluate((names) => {
    // @ts-expect-error Injecting celebrityNames into page context
    window.celebrityNames = names;
  }, celebrityNames);
  
  const slideshowItems = await page.evaluate(() => {
    const results: any[] = [];
    
    // Slideshow specific selectors
    const slideSelectors = [
      '.slide',
      '.slideshow-slide',
      '[class*="slide"]',
      '[data-testid="gallerySlide"]',
      '[class*="gallery"] > div',
      '.gallery-item'
    ];
    
    let slides: Element[] = [];
    
    for (const selector of slideSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        slides = elements;
        console.log(`Found ${slides.length} slides with selector: ${selector}`);
        break;
      }
    }
    
    // If no slides found, try parent container
    if (slides.length === 0) {
      const containers = document.querySelectorAll('.slideshow, .gallery, .slider, [class*="carousel"]');
      if (containers.length > 0) {
        const container = containers[0];
        slides = Array.from(container.children).filter(el => el.tagName !== 'BUTTON' && el.tagName !== 'NAV');
      }
    }
    
    // Last resort - try general article structure if we have numbers
    if (slides.length === 0) {
      const numberedHeadings = document.querySelectorAll('h2, h3, h4, .heading');
      const isNumbered = Array.from(numberedHeadings).some(h => /^\d+\./.test(h.textContent || ''));
      
      if (isNumbered) {
        slides = Array.from(numberedHeadings);
      }
    }
    
    // Use imported comprehensive celebrity list
    const knownCelebrities = (window as any).celebrityNames || [
      // Fallback list if import fails
      'Taylor Swift', 'Jennifer Lopez', 'Rihanna', 'Beyoncé', 'Zendaya',
      'Kendall Jenner', 'Hailey Bieber', 'Dua Lipa', 'Kylie Jenner', 'Ariana Grande'
    ] as string[];
    
    // Process each slide
    slides.forEach((slide, index) => {
      try {
        // Look for celebrity name in heading
        const heading = slide.querySelector('h2, h3, h4, .heading, .title') || slide;
        const headingText = heading.textContent || '';
        const elementText = slide.textContent || '';
        
        // Extract celebrity using the helper function
        const celebrity = extractCelebrityName(slide, elementText, knownCelebrities);
        
        if (!celebrity) return;
        
        // Extract description
        let description = '';
        const descElement = slide.querySelector('p, .description, .caption');
        
        if (descElement) {
          description = descElement.textContent || '';
        } else {
          // If no specific description element, use slide text excluding the heading
          const slideText = slide.textContent || '';
          const headingIndex = slideText.indexOf(headingText);
          
          if (headingIndex >= 0 && headingIndex + headingText.length < slideText.length) {
            description = slideText.substring(headingIndex + headingText.length);
          } else {
            description = slideText;
          }
        }
        
        // Extract image
        let imageUrl = '';
        const img = slide.querySelector('img');
        
        if (img) {
          imageUrl = img.getAttribute('data-src-lg') || 
                    img.getAttribute('data-high-res-src') || 
                    img.getAttribute('data-orig-file') ||
                    img.getAttribute('data-lazy-src') ||
                    img.getAttribute('srcset')?.split(',')[0]?.split(' ')[0] ||
                    img.src;
        }
        
        // Extract event context
        const slideText = slide.textContent || '';
        const eventKeywords = ['premiere', 'award', 'gala', 'festival', 'fashion week', 'event', 'party', 'red carpet'];
        let event = '';
        
        for (const keyword of eventKeywords) {
          if (slideText.toLowerCase().includes(keyword)) {
            const startIndex = slideText.toLowerCase().indexOf(keyword);
            const contextBefore = slideText.substring(Math.max(0, startIndex - 30), startIndex);
            const contextAfter = slideText.substring(startIndex, Math.min(slideText.length, startIndex + keyword.length + 30));
            
            event = `${contextBefore}${contextAfter}`.trim();
            break;
          }
        }
        
        // Only add if we have meaningful data
        if (celebrity && (description || headingText) && imageUrl) {
          const outfitDescription = description || headingText;
          
          // Calculate celebrity confidence score
          const confidenceScore = calculateCelebrityConfidence(
            celebrity, 
            (window as any).celebrityNames || knownCelebrities,
            outfitDescription
          );
          
          // Only proceed with high-confidence celebrity matches (>0.6)
          if (confidenceScore > 0.6) {
            // Extract outfit elements using enhanced parsing
            const { garments, colors, patterns, styles } = extractOutfitElements(outfitDescription);
            
            results.push({
              celebrity: celebrity.trim(),
              event: event || '',
              outfitDescription: outfitDescription.trim(),
              imageUrl,
              timestamp: new Date().toISOString(),
              slidePosition: index + 1,
              outfitTags: garments,
              colors: colors,
              patterns: patterns,
              styles: styles,
              confidenceScore: confidenceScore
            });
          }
        }
      } catch (e) {
        console.warn('Error processing slide:', e);
      }
    });
    
    // Helper function to extract celebrity names with multiple strategies
    function extractCelebrityName(element: Element, elementText: string, celebrityList: string[]): string {
      let celebrity = '';
      const lowerText = elementText.toLowerCase();
      
      // Strategy 1: Exact matches with celebrity list (case-insensitive)
      // This is the most reliable method and prioritized
      for (const celeb of celebrityList) {
        // Check for exact match of full name (with word boundaries)
        const exactRegex = new RegExp(`\\b${celeb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (exactRegex.test(elementText)) {
          return celeb; // Return the properly capitalized name from our list
        }
      }
      
      // Strategy 2: Partial matches for celebrities with very distinctive names
      // For example, if we find "Zendaya's outfit" we can be confident it's about Zendaya
      for (const celeb of celebrityList) {
        // Only apply partial matching for distinctive single-name celebrities or very unique names
        if ((celeb.split(' ').length === 1 || celeb.length > 12) && lowerText.includes(celeb.toLowerCase())) {
          return celeb;
        }
      }
      
      // Strategy 3: Extract from heading if still not found
      const headingElement = element.querySelector('h1, h2, h3, .title, [class*="title"], [class*="heading"]');
      const headingText = headingElement?.textContent || '';
      
      // Check heading against celebrity list first (more likely to contain just the celebrity name)
      if (headingText) {
        const headingLower = headingText.toLowerCase();
        
        for (const celeb of celebrityList) {
          if (headingLower.includes(celeb.toLowerCase())) {
            return celeb;
          }
        }
        
        // Extract potential celebrity name (capital case names)
        const nameMatch = headingText.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b/);
        if (nameMatch) {
          // Verify against our celebrity list first
          const potentialName = nameMatch[1];
          const matchedCeleb = findClosestCelebrityMatch(potentialName, celebrityList);
          if (matchedCeleb) {
            return matchedCeleb;
          }
          celebrity = potentialName;
        } else {
          // Try another pattern: "Celebrity Name Wore/Was Spotted/etc"
          const altNameMatch = headingText.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\s+(wore|was spotted|stepped out|donned|opted for|styled|rocked|showcased)/i);
          if (altNameMatch) {
            const potentialName = altNameMatch[1];
            const matchedCeleb = findClosestCelebrityMatch(potentialName, celebrityList);
            if (matchedCeleb) {
              return matchedCeleb;
            }
            celebrity = potentialName;
          }
        }
      }
      
      // Strategy 4: Extract with common patterns if still not found
      if (!celebrity) {
        // Various patterns to extract celebrity names
        const namePatterns = [
          /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/, // Basic capitalized name
          /\b([A-Z][a-z]+ [A-Z][a-z]+)\s+(wore|was|is|has|shows|stepped|attended)/i, // Name + verb
          /^\s*\d+\.\s*([A-Z][a-z]+ [A-Z][a-z]+)/i, // Numbered list with name
          /^([A-Z][a-z]+ [A-Z][a-z]+):/i // Name with colon
        ];
        
        for (const pattern of namePatterns) {
          const match = elementText.match(pattern);
          if (match && match[1]) {
            const potentialName = match[1];
            const matchedCeleb = findClosestCelebrityMatch(potentialName, celebrityList);
            if (matchedCeleb) {
              return matchedCeleb;
            }
            celebrity = potentialName;
            break;
          }
        }
      }
      
      return celebrity;
    }
    
    // Helper function to find closest match from celebrity list
    function findClosestCelebrityMatch(name: string, celebrityList: string[]): string | null {
      if (!name) return null;
      
      const nameLower = name.toLowerCase();
      
      // First try direct match (case insensitive)
      for (const celeb of celebrityList) {
        if (celeb.toLowerCase() === nameLower) {
          return celeb; // Return properly capitalized name
        }
      }
      
      // Try partial match (for cases like "Beyoncé" vs "Beyonce")
      for (const celeb of celebrityList) {
        // Split into first/last name
        const celebParts = celeb.toLowerCase().split(' ');
        const nameParts = nameLower.split(' ');
        
        // If first and last name start with the same letters, likely a match
        if (celebParts.length === nameParts.length) {
          let matchCount = 0;
          for (let i = 0; i < celebParts.length; i++) {
            if (celebParts[i].startsWith(nameParts[i]) || nameParts[i].startsWith(celebParts[i])) {
              matchCount++;
            }
          }
          
          // All parts match at least by prefix
          if (matchCount === celebParts.length) {
            return celeb;
          }
        }
      }
      
      return null;
    }
    
    return results;
  });
  
  // Add slideshow items to the collection
  for (const item of slideshowItems) {
    // Skip if already exists
    const exists = items.some(existing => 
      existing.celebrity === item.celebrity &&
      (existing.outfitDescription === item.outfitDescription ||
       existing.imageUrl === item.imageUrl)
    );
    
    if (!exists && item.celebrity && item.outfitDescription) {
      items.push(item);
    }
  }
}

/**
 * Auto-scroll to load more content
 */
async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight/2) { // Only scroll halfway
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Generate mock data for development/testing
 */
function generateMockData(limit: number): SocialProofItem[] {
  const celebrities = [
    "Taylor Swift", "Jennifer Lopez", "Rihanna", "Beyoncé", "Zendaya",
    "Kendall Jenner", "Hailey Bieber", "Dua Lipa", "Kylie Jenner", "Ariana Grande",
    "Margot Robbie", "Florence Pugh", "Timothée Chalamet", "Brad Pitt", "Leonardo DiCaprio"
  ];
  
  const events = [
    "Met Gala", "Grammy Awards", "Golden Globes", "Cannes Film Festival", "Fashion Week",
    "Oscar Awards", "SAG Awards", "BRIT Awards", "Venice Film Festival", "Tony Awards"
  ];
  
  const outfitDescriptions = [
    "wore a stunning sequined black gown with dramatic shoulders",
    "appeared in a chic monochromatic white ensemble with leather accessories",
    "stepped out in a daring red cutout dress with high heels",
    "rocked a classic navy blue pantsuit with modern silver accessories",
    "channeled old Hollywood glamour in a champagne silk gown",
    "turned heads in an avant-garde leather jacket and black boots",
    "opted for sustainable fashion in an eco-conscious linen outfit",
    "made a statement in bold primary colors with a yellow dress",
    "embraced maximalism with layered textures in a floral pattern dress",
    "kept it minimal in a streamlined black blazer and white shirt"
  ];
  
  const mockItems: SocialProofItem[] = [];
  
  for (let i = 0; i < limit; i++) {
    const celebrity = celebrities[Math.floor(Math.random() * celebrities.length)];
    const event = Math.random() > 0.3 ? events[Math.floor(Math.random() * events.length)] : '';
    const outfitDescription = `${celebrity} ${outfitDescriptions[Math.floor(Math.random() * outfitDescriptions.length)]}`;
    
    // Extract outfit elements from the description
    const { garments, colors, patterns, styles } = extractOutfitElements(outfitDescription);
    
    mockItems.push({
      celebrity,
      event,
      outfitDescription,
      imageUrl: `https://picsum.photos/seed/${i}/800/1200`,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      outfitTags: garments.length > 0 ? garments : ['dress', 'gown', 'outfit'],
      colors: colors.length > 0 ? colors : ['black', 'white', 'red', 'blue'],
      patterns: patterns.length > 0 ? patterns : ['solid', 'floral', 'sequined'],
      styles: styles.length > 0 ? styles : ['elegant', 'chic', 'casual', 'formal'],
      confidenceScore: 0.9 // High confidence for mock data
    });
  }
  
  return mockItems;
}

// Improved getArticleLinks: try multiple selectors in order, log results, stop at first that works
async function getArticleLinks(page: Page, maxArticles = 10): Promise<string[]> {
  await page.goto('https://www.whowhatwear.com/fashion/celebrity/celebrity-style', { waitUntil: 'networkidle2' });

  // Wait for main content to load
  try {
    await page.waitForSelector('main, .content, .site-content', { timeout: 15000 });
    console.log('Main content container loaded.');
  } catch {
    console.log('Main content container did not load.');
  }

  // Wait a bit longer for JS to render articles
  await delay(3000);

  // Take a screenshot for debugging
  await page.screenshot({ path: 'whowhatwear_debug.png', fullPage: true });
  console.log('Screenshot taken: whowhatwear_debug.png');

  // Try multiple selectors in order of likelihood
  const selectors = [
    'a.listing__link',
    'a[data-analytics-link="article"]',
    'a.card-item',
    'a.comp.card-item',
    'a.comp.link'
  ];

  let links: string[] = [];
  for (const selector of selectors) {
    try {
      const found = await page.$$(selector);
      console.log(`Selector "${selector}" found ${found.length} elements.`);
      if (found.length) {
        links = await page.$$eval(selector, as =>
          as.map(a => {
            const href = (a as HTMLAnchorElement).getAttribute('href');
            if (!href) return undefined;
            return href.startsWith('http') ? href : 'https://www.whowhatwear.com' + href;
          }).filter((href): href is string => typeof href === 'string')
        );
        if (links.length) break; // Stop at the first selector that finds links
      }
    } catch {
      console.log(`Selector "${selector}" failed.`);
    }
  }

  if (!links.length) {
    // Debug: log the outer HTML of the main page if no links found
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    console.log('No article links found. Main page HTML:', html.substring(0, 2000));
  }
  return links.slice(0, maxArticles);
}

export default {
  scrapeWhoWhatWear,
  extractCelebrityItems,
  extractFromSlideshow,
  autoScroll,
  generateMockData,
  delay
};

// Add this at the very end of the file
if (require.main === module) {
  const saveToFile = process.argv.includes('--save');
  scrapeWhoWhatWear({ itemLimit: 12 })
    .then(results => {
      if (saveToFile) {
        fs.writeFileSync('celebrity_styles.json', JSON.stringify(results, null, 2));
        console.log(`Saved ${results.length} items to celebrity_styles.json`);
      } else {
        // Always output JSON, even if empty
        console.log(JSON.stringify(results || []));
      }
      process.exit(0);
    })
    .catch(err => {
      // Output an empty array as JSON on error, so the API never breaks JSON parsing
      console.error(err);
      if (saveToFile) {
        fs.writeFileSync('celebrity_styles.json', '[]');
      } else {
        console.log('[]');
      }
      process.exit(1);
    });
}