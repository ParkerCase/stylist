// whoWhatWearScraper.ts
// Production-ready Puppeteer scraper for WhoWhatWear celebrity fashion

import puppeteer, { Browser, Page } from 'puppeteer';
import { celebrityNames } from './data/celebrityNames';
import { extractOutfitElements, calculateCelebrityConfidence } from './parseWhoWhatWear';

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
        headless: config.headless,
        defaultViewport: { width: 1366, height: 768 },
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1366,768',
          '--disable-notifications',
          '--disable-geolocation',
          // Improved user agent that's less likely to be flagged as a bot
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
      let items: SocialProofItem[] = [];
      let success = false;
      
      // Attempt primary URL targets
      console.log('🔍 Trying primary celebrity content URLs...');
      for (const url of targetUrls) {
        if (items.length >= config.itemLimit!) {
          success = true;
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
          } catch (e) {
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
              success = true;
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
      if (!success || items.length < 5) {
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
  // First try the main article extraction
  const newItems = await page.evaluate(() => {
    const results: any[] = [];
    
    // WhoWhatWear specific selectors based on their site structure
    const primarySelectors = [
      '.article-card',
      '.articleCard',
      '.story-card',
      '.post-card',
      'article[class*="card"]',
      'article[class*="celeb"]',
      '[data-test="ArticleCardComponent"]',
      '.celebrity-outfit'
    ];
    
    // Backup flexible selectors for different page structures
    const fallbackSelectors = [
      'article',
      '.post',
      '[class*="article"]',
      '[class*="post"]',
      '[data-element-id="Article"]',
      '.story-item',
      '.slideshow-slide',
      '[class*="card"]',
      '.article-body p',
      '.content-container'
    ];
    
    const allElements: Element[] = [];
    
    // Try primary selectors first
    primarySelectors.forEach(selector => {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
      }
      allElements.push(...elements);
    });
    
    // If no primary selectors found elements, try fallbacks
    if (allElements.length === 0) {
      fallbackSelectors.forEach(selector => {
        const elements = Array.from(document.querySelectorAll(selector));
        allElements.push(...elements);
      });
    }
    
    // Special case for the slide format they often use
    const slideElements = document.querySelectorAll('.slide, .slideshow-slide, .article-slide');
    if (slideElements.length > 0) {
      console.log(`Found ${slideElements.length} slide elements`);
      allElements.push(...Array.from(slideElements));
    }
    
    // Remove duplicates
    const uniqueElements = Array.from(new Set(allElements));
    console.log(`Processing ${uniqueElements.length} unique elements`);
    
    // Use imported comprehensive celebrity list
    const knownCelebrities = (window as any).celebrityNames || [
      // Fallback list if import fails
      'Taylor Swift', 'Jennifer Lopez', 'Rihanna', 'Beyoncé', 'Zendaya',
      'Kendall Jenner', 'Hailey Bieber', 'Dua Lipa', 'Kylie Jenner', 'Ariana Grande',
      'Margot Robbie', 'Florence Pugh', 'Timothée Chalamet', 'Brad Pitt', 'Leonardo DiCaprio',
      'Blake Lively', 'Sydney Sweeney', 'Selena Gomez', 'Emma Stone', 'Jennifer Lawrence',
      'Harry Styles', 'Gigi Hadid', 'Bella Hadid'
    ];
    
    uniqueElements.forEach(element => {
      try {
        const elementText = element.textContent?.toLowerCase() || '';
        
        // Look for celebrity indicators
        const hasCelebrityContent = 
          element.querySelector('h1, h2, h3')?.textContent?.toLowerCase()?.includes('celebrity') ||
          elementText.includes('celebrity') ||
          elementText.includes('wore') ||
          elementText.match(/\b(spotted|styles?|fashion|outfit|look|dress|dresses|wearing|donned)\b/) ||
          knownCelebrities.some((celeb: string) => elementText.toLowerCase().includes(celeb.toLowerCase()));
        
        if (!hasCelebrityContent) return;
        
        // Extract celebrity name using our helper function
        const celebrity = extractCelebrityName(element, elementText, knownCelebrities);
        
        // Skip if we couldn't determine a celebrity
        if (!celebrity) return;
        
        // Extract event context
        const eventKeywords = ['premiere', 'award', 'gala', 'festival', 'show', 'event', 'party', 'wedding', 'red carpet', 'fashion week', 'met gala'];
        let event = '';
        
        for (const keyword of eventKeywords) {
          // Try several patterns for event extraction
          const eventMatches = [
            elementText.match(new RegExp(`(at|for|during)\\s+the\\s+([^.]+${keyword}[^.]+)`, 'i')),
            elementText.match(new RegExp(`(at|for|during)\\s+([^.]+${keyword}[^.]+)`, 'i')),
            elementText.match(new RegExp(`${keyword}\\s+([^.]+)`, 'i')),
            elementText.match(new RegExp(`(${keyword})`, 'i'))
          ];
          
          for (const match of eventMatches) {
            if (match && (match[2] || match[1])) {
              event = match[2] || match[1];
              break;
            }
          }
          
          if (event) break;
        }
        
        // Extract outfit description with multiple strategies
        let outfitDescription = '';
        
        // Strategy 1: Look for paragraph with outfit details
        const paragraphs = Array.from(element.querySelectorAll('p'));
        for (const paragraph of paragraphs) {
          const paragraphText = paragraph.textContent || '';
          
          // Check if paragraph is about outfit
          const isOutfitDescription = /\b(wore|wearing|dressed in|outfit|look|style|fashion|ensemble|dressed|dress|dressed|dressed up|clothes|donned|sporting|rocked)\b/i.test(paragraphText);
          
          if (isOutfitDescription && paragraphText.length > outfitDescription.length) {
            outfitDescription = paragraphText;
          }
        }
        
        // Strategy 2: If no clear outfit paragraph, use the heading + first paragraph
        if (!outfitDescription) {
          const headingElement = element.querySelector('h1, h2, h3, .title, [class*="title"]');
          const headingText = headingElement?.textContent || '';
          
          const firstParagraph = element.querySelector('p')?.textContent || '';
          outfitDescription = `${headingText} ${firstParagraph}`.trim();
        }
        
        // Strategy 3: If still nothing good, use the element text if it's not too long
        if (!outfitDescription || outfitDescription.length < 20) {
          // Limit to reasonable length
          outfitDescription = elementText.substring(0, 500).trim();
        }
        
        // Extract high-quality image with multiple strategies
        let imageUrl = '';
        
        // Strategy 1: Look for figure or main image
        const figureElement = element.querySelector('figure, [class*="image-container"], [class*="media"], [class*="photo"]');
        if (figureElement) {
          const img = figureElement.querySelector('img');
          if (img) {
            // Try high-res version first
            imageUrl = img.getAttribute('data-src-lg') || 
                      img.getAttribute('data-high-res-src') || 
                      img.getAttribute('data-orig-file') ||
                      img.src;
          }
        }
        
        // Strategy 2: Try different image sources
        if (!imageUrl) {
          const imageElements = Array.from(element.querySelectorAll('img'));
          
          // Sort by size (prefer larger)
          const largestImage = imageElements.sort((a, b) => {
            const aWidth = a.naturalWidth || parseInt(a.getAttribute('width') || '0', 10);
            const bWidth = b.naturalWidth || parseInt(b.getAttribute('width') || '0', 10);
            return bWidth - aWidth;
          })[0];
          
          if (largestImage) {
            imageUrl = largestImage.getAttribute('data-src') || 
                       largestImage.getAttribute('data-lazy-src') || 
                       largestImage.getAttribute('srcset')?.split(',')[0]?.split(' ')[0] || 
                       largestImage.src;
          }
        }
        
        // Extract timestamp for freshness
        const timeElement = element.querySelector('time');
        let timestamp = timeElement?.getAttribute('datetime') || timeElement?.textContent || '';
        
        // Also look for a date class
        if (!timestamp) {
          const dateElement = element.querySelector('[class*="date"], [class*="time"], .publish-date, .posted-on');
          if (dateElement) {
            timestamp = dateElement.textContent || '';
          }
        }
        
        // Only add if we have meaningful data
        if (celebrity && outfitDescription && outfitDescription.length > 30) {
          // Clean up the data
          const cleanCelebrity = celebrity.trim();
          outfitDescription = outfitDescription.trim()
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, ' ');
          
          // Create a high-quality title if description is too long
          const shortDescription = outfitDescription.length > 100 
            ? outfitDescription.substring(0, 100) + '...' 
            : outfitDescription;
          
          // Calculate celebrity confidence score
          const confidenceScore = calculateCelebrityConfidence(
            cleanCelebrity, 
            (window as any).celebrityNames || celebrityNames,
            outfitDescription
          );
          
          // Only proceed with high-confidence celebrity matches (>0.6)
          if (confidenceScore > 0.6) {
            // Extract outfit elements using enhanced parsing
            const { garments, colors, patterns, styles } = extractOutfitElements(outfitDescription);
            
            results.push({
              celebrity: cleanCelebrity,
              event: event.trim(),
              outfitDescription,
              shortDescription, // Add a shorter version for UI
              imageUrl,
              timestamp: timestamp || new Date().toISOString(),
              outfitTags: garments,
              colors: colors,
              patterns: patterns,
              styles: styles,
              confidenceScore: confidenceScore
            });
          }
        }
      } catch (e) {
        console.warn('Error extracting item:', e);
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
      
      // Strategy 4: Try byline extraction (if it looks like it's about a celebrity, not author)
      if (!celebrity) {
        const bylineMatch = elementText.match(/by\s+([A-Z][a-z]+ [A-Z][a-z]+)/i);
        if (bylineMatch) {
          // Skip if it's just article author
          const authorIndicators = ['editor', 'writer', 'contributor', 'staff', 'journalist'];
          const isJustAuthor = authorIndicators.some(indicator => 
            lowerText.includes(indicator));
          
          if (!isJustAuthor) {
            const potentialName = bylineMatch[1];
            const matchedCeleb = findClosestCelebrityMatch(potentialName, celebrityList);
            if (matchedCeleb) {
              return matchedCeleb;
            }
            celebrity = potentialName;
          }
        }
      }
      
      // Strategy 5: Check for possessive patterns and other common formats
      if (!celebrity && (lowerText.includes('style') || lowerText.includes('outfit') || lowerText.includes('wearing'))) {
        const nameRegexps = [
          /([A-Z][a-z]+ [A-Z][a-z]+)'s outfit/i,
          /([A-Z][a-z]+ [A-Z][a-z]+)'s look/i,
          /([A-Z][a-z]+ [A-Z][a-z]+)'s style/i,
          /([A-Z][a-z]+ [A-Z][a-z]+) is wearing/i,
          /([A-Z][a-z]+ [A-Z][a-z]+) just wore/i,
          /([A-Z][a-z]+ [A-Z][a-z]+) in a /i
        ];
        
        for (const regex of nameRegexps) {
          const match = elementText.match(regex);
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
  
  // Inject the celebrityNames array into the page
  await page.evaluate((names) => {
    // @ts-ignore
    window.celebrityNames = names;
  }, celebrityNames);
  
  // Filter and add new items
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
  
  // If we still don't have items, try to extract from slideshow format
  if (items.length === 0) {
    await extractFromSlideshow(page, items);
  }
}

/**
 * Specialized extraction for WhoWhatWear slideshow format
 */
async function extractFromSlideshow(page: Page, items: SocialProofItem[]): Promise<void> {
  console.log('Attempting to extract from slideshow format...');
  
  // Inject the celebrityNames array into the page
  await page.evaluate((names) => {
    // @ts-ignore
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

export default {
  scrapeWhoWhatWear,
  extractCelebrityItems,
  extractFromSlideshow,
  autoScroll,
  generateMockData,
  delay
};