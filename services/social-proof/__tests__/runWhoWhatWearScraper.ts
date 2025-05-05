// runWhoWhatWearScraper.ts
// Production test runner for WhoWhatWear celebrity fashion scraper

import { scrapeWhoWhatWear } from '../whoWhatWearScraper';
import { extractCelebrityName, findClosestCelebrityMatch } from '../parseWhoWhatWear';
import { celebrityNames } from '../data/celebrityNames';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Runs a complete test of the WhoWhatWear scraper
 * Tests production scraping capability and data quality
 */
async function runTest() {
  console.log('🚀 Starting WhoWhatWear Celebrity Fashion Scraper Test\n');
  console.log('==================================================\n');
  
  // Create output directory for results and debugging
  const debugDir = path.join(__dirname, 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  try {
    // Test 1: Production scraping mode (focused, fast scraping)
    console.log('📊 TEST 1: Production Scraping Mode');
    console.log('----------------------------------');
    console.log('🔍 Looking for real celebrity fashion data with headless browser...');
    
    console.time('Production scrape time');
    const productionResults = await scrapeWhoWhatWear({
      itemLimit: 10,
      headless: true,
      timeout: 45000,  // Generous timeout for real data
      retryAttempts: 2  // Multiple attempts to find real data
    });
    console.timeEnd('Production scrape time');
    
    console.log(`\n✅ Retrieved ${productionResults.length} items in production mode`);
    
    if (productionResults.length > 0) {
      // Log a sample item
      console.log('\n📋 Sample celebrity fashion item:');
      printSampleItem(productionResults[0]);
      
      // Save full results for analysis
      const outputFile = path.join(debugDir, 'production-scrape-results.json');
      fs.writeFileSync(outputFile, JSON.stringify(productionResults, null, 2));
      console.log(`\n📄 Full results saved to: ${outputFile}`);
      
      // Check if we got real data or mock data
      const isMockData = isMock(productionResults);
      if (isMockData) {
        console.log('\n⚠️ WARNING: Production test returned mock data - real scraping failed');
      } else {
        console.log('\n🎉 SUCCESS: Production test returned real celebrity fashion data!');
      }
    }

    // Test 2: Visual debugging mode (visible browser for inspection)
    console.log('\n\n📊 TEST 2: Visual Debugging Mode');
    console.log('-----------------------------');
    console.log('🔎 This will open a browser window for visual inspection...');
    
    // Only run for 10 seconds to avoid long test times
    console.time('Visual debug scrape time');
    const debugResults = await scrapeWhoWhatWear({
      itemLimit: 3,
      headless: false,      // Visible browser
      timeout: 20000,       // Shorter timeout for debugging
      retryAttempts: 1      // Just one attempt
    });
    console.timeEnd('Visual debug scrape time');
    
    console.log(`\n✅ Visual test completed with ${debugResults.length} items`);

    // Data quality analysis
    console.log('\n\n📊 Data Quality Analysis');
    console.log('----------------------');
    const analysis = analyzeResults(productionResults);
    
    // Create a detailed quality report
    const qualityScore = calculateQualityScore(analysis);
    console.log(`\n🏆 Overall Data Quality Score: ${qualityScore}/100`);
    
    // Generate recommendations based on quality
    const recommendations = generateRecommendations(analysis);
    if (recommendations.length > 0) {
      console.log('\n📝 Recommendations for Improvement:');
      recommendations.forEach((rec, i) => {
        console.log(`   ${i+1}. ${rec}`);
      });
    }

    // Test 3: Celebrity name extraction validation
    console.log('\n\n📊 TEST 3: Celebrity Name Extraction Validation');
    console.log('------------------------------------------');
    testCelebrityNameExtraction();

    // Test 4: Mock Data Comparison
    console.log('\n\n📊 TEST 4: Mock Data Comparison');
    console.log('----------------------------');
    const mockSample = await scrapeWhoWhatWear({ 
      itemLimit: 5,
      retryAttempts: 0 // Force mock data
    });
    
    const mockFile = path.join(debugDir, 'mock-data-sample.json');
    fs.writeFileSync(mockFile, JSON.stringify(mockSample, null, 2));
    console.log(`📄 Mock data sample saved to: ${mockFile}`);
    
    // Compare real vs mock data
    console.log('\n📈 Real vs Mock Data Comparison:');
    compareRealVsMock(productionResults, mockSample);

    console.log('\n\n✨ All tests completed successfully!');
    
    return productionResults; // Return results for further processing

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

/**
 * Tests the enhanced celebrity name extraction function
 * Validates against real-world scenarios and edge cases
 */
function testCelebrityNameExtraction() {
  console.log('Testing enhanced celebrity name extraction...');
  
  // Test cases to validate the extraction function
  const testCases = [
    // Celebrity with action (should extract)
    { 
      text: 'Zendaya wore a stunning red gown at the premiere', 
      expectedCelebrity: 'Zendaya',
      description: 'Celebrity with action verb' 
    },
    // Celebrity possessive (should extract)
    { 
      text: "Rihanna's latest outfit features vintage pieces", 
      expectedCelebrity: 'Rihanna',
      description: 'Celebrity possessive form' 
    },
    // Generic product article (should reject)
    { 
      text: 'The Best Dresses to Shop for Summer 2023', 
      expectedCelebrity: '',
      description: 'Generic product article' 
    },
    // Celebrity name with product words (should still extract)
    { 
      text: 'Jennifer Lopez in the perfect summer dress', 
      expectedCelebrity: 'Jennifer Lopez',
      description: 'Celebrity with product reference' 
    },
    // Mixed product and celebrity content (should prioritize celebrity)
    { 
      text: "Shop Taylor Swift's favorite accessories and summer fashion trends", 
      expectedCelebrity: 'Taylor Swift',
      description: 'Mixed product and celebrity content' 
    },
    // Distinctive name with unusual formatting
    { 
      text: "ASAP Rocky demonstrated perfect streetwear style", 
      expectedCelebrity: 'A$AP Rocky',
      description: 'Distinctive name with special characters' 
    },
    // Similar but non-matching name
    { 
      text: "Jennifer Lawrence Aniston spotted at event", 
      expectedCelebrity: 'Jennifer Lawrence',
      description: 'Similar but non-matching name' 
    },
    // Product list that should be rejected
    { 
      text: "10 Editor's Picks for Summer Fashion Trends", 
      expectedCelebrity: '',
      description: 'Product list with no celebrity' 
    }
  ];
  
  // Create a mock Element for testing
  class MockElement {
    private _text: string;
    private _querySelector: MockElement | null = null;
    
    constructor(text: string, headingText?: string) {
      this._text = text;
      if (headingText) {
        this._querySelector = new MockElement(headingText);
      }
    }
    
    get textContent(): string {
      return this._text;
    }
    
    querySelector(): MockElement | null {
      return this._querySelector;
    }
  }
  
  // Run test cases
  let passCount = 0;
  for (const testCase of testCases) {
    const mockElement = new MockElement(testCase.text, testCase.text);
    const extractedName = extractCelebrityName(mockElement as any, testCase.text, celebrityNames);
    
    if (extractedName === testCase.expectedCelebrity) {
      console.log(`✅ PASS: ${testCase.description}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${testCase.description}`);
      console.error(`  Expected: ${testCase.expectedCelebrity || '(empty string)'}`);
      console.error(`  Got: ${extractedName || '(empty string)'}`);
    }
  }
  
  console.log(`\nTest Results: ${passCount}/${testCases.length} tests passed`);
}

/**
 * Prints a formatted sample item for console output
 */
function printSampleItem(item: any) {
  console.log('---------------------------------------');
  console.log(`🌟 Celebrity: ${item.celebrity}`);
  console.log(`🎭 Event: ${item.event || 'N/A'}`);
  console.log(`👗 Outfit: ${item.outfitDescription.substring(0, 100)}${item.outfitDescription.length > 100 ? '...' : ''}`);
  console.log(`🖼️ Image: ${item.imageUrl ? '✓ Available' : '✗ Not available'}`);
  console.log(`📅 Date: ${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'N/A'}`);
  console.log('---------------------------------------');
}

/**
 * Analyzes the quality and completeness of scraped results
 */
function analyzeResults(results: any[]) {
  if (results.length === 0) {
    console.log('⚠️ No results to analyze');
    return {
      totalItems: 0,
      withImages: 0,
      withEvents: 0,
      withTimestamps: 0,
      uniqueCelebrities: 0,
      averageDescriptionLength: 0,
      imageQuality: 0,
      dataCompleteness: 0,
      nameExtractionConfidence: 0
    };
  }

  // New: Estimate confidence in name extraction
  const nameExtractionConfidence = estimateNameConfidence(results);

  const analysis = {
    totalItems: results.length,
    withImages: results.filter(r => r.imageUrl).length,
    withEvents: results.filter(r => r.event && r.event.length > 3).length,
    withTimestamps: results.filter(r => r.timestamp).length,
    uniqueCelebrities: new Set(results.map(r => r.celebrity)).size,
    averageDescriptionLength: results.reduce((acc, r) => acc + (r.outfitDescription?.length || 0), 0) / results.length,
    imageQuality: calculateImageQuality(results),
    dataCompleteness: calculateCompleteness(results),
    nameExtractionConfidence
  };

  console.log(`📋 Total items: ${analysis.totalItems}`);
  console.log(`🌟 Name extraction confidence: ${Math.round(nameExtractionConfidence * 100)}%`);
  console.log(`🖼️ Items with images: ${analysis.withImages}/${analysis.totalItems} (${Math.round(analysis.withImages/analysis.totalItems*100)}%)`);
  console.log(`🎭 Items with events: ${analysis.withEvents}/${analysis.totalItems} (${Math.round(analysis.withEvents/analysis.totalItems*100)}%)`);
  console.log(`📅 Items with timestamps: ${analysis.withTimestamps}/${analysis.totalItems} (${Math.round(analysis.withTimestamps/analysis.totalItems*100)}%)`);
  console.log(`👥 Unique celebrities: ${analysis.uniqueCelebrities}`);
  console.log(`📏 Average description length: ${Math.round(analysis.averageDescriptionLength)} characters`);
  console.log(`📊 Data completeness score: ${analysis.dataCompleteness}/10`);

  // Show sample of celebrities found
  const celebrities = [...new Set(results.map(r => r.celebrity))].slice(0, 5);
  console.log(`\n🌟 Sample celebrities found: ${celebrities.join(', ')}`);
  
  return analysis;
}

/**
 * Estimates confidence in name extraction based on verification against our list
 */
function estimateNameConfidence(results: any[]): number {
  if (results.length === 0) return 0;
  
  // Count how many extracted names are in our celebrity list
  const verifiedNames = results.filter(r => 
    r.celebrity && celebrityNames.includes(r.celebrity)
  ).length;
  
  return verifiedNames / results.length;
}

/**
 * Calculate a quality score for image URLs
 */
function calculateImageQuality(results: any[]): number {
  const withImages = results.filter(r => r.imageUrl);
  if (withImages.length === 0) return 0;
  
  // Check for high-quality image indicators
  const highResCount = withImages.filter(item => {
    const url = item.imageUrl.toLowerCase();
    return url.includes('high') || 
           url.includes('original') || 
           url.includes('large') ||
           url.includes('full') ||
           url.includes('1080') ||
           url.includes('1024') ||
           !url.includes('thumb');
  }).length;
  
  return Math.round((highResCount / withImages.length) * 10);
}

/**
 * Calculate overall data completeness score
 */
function calculateCompleteness(results: any[]): number {
  if (results.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const item of results) {
    let itemScore = 0;
    
    // Celebrity name (required)
    if (item.celebrity && item.celebrity.length > 3) {
      itemScore += 2;
      // Extra point if the celebrity is in our verified list
      if (celebrityNames.includes(item.celebrity)) {
        itemScore += 1;
      }
    }
    
    // Outfit description
    if (item.outfitDescription) {
      if (item.outfitDescription.length > 100) itemScore += 3;
      else if (item.outfitDescription.length > 50) itemScore += 2;
      else itemScore += 1;
    }
    
    // Image
    if (item.imageUrl) itemScore += 2;
    
    // Event context
    if (item.event && item.event.length > 3) itemScore += 2;
    
    // Timestamp
    if (item.timestamp) itemScore += 1;
    
    totalScore += Math.min(itemScore, 10); // Cap at 10 points per item
  }
  
  return Math.round(totalScore / results.length);
}

/**
 * Calculate overall quality score based on analysis
 */
function calculateQualityScore(analysis: any): number {
  if (!analysis || analysis.totalItems === 0) return 0;
  
  // Different aspects contribute to overall quality
  const imageScore = (analysis.withImages / analysis.totalItems) * 20;
  const eventScore = (analysis.withEvents / analysis.totalItems) * 15;
  const descriptionScore = Math.min(analysis.averageDescriptionLength / 100, 1) * 20;
  const uniquenessScore = Math.min(analysis.uniqueCelebrities / analysis.totalItems, 1) * 15;
  const completenessScore = analysis.dataCompleteness * 2;
  const nameConfidenceScore = (analysis.nameExtractionConfidence || 0) * 20; // New metric
  
  return Math.round(imageScore + eventScore + descriptionScore + uniquenessScore + completenessScore + nameConfidenceScore);
}

/**
 * Generate improvement recommendations based on analysis
 */
function generateRecommendations(analysis: any): string[] {
  const recommendations: string[] = [];
  
  if (!analysis || analysis.totalItems === 0) {
    recommendations.push('Fix scraping to retrieve actual celebrity fashion data');
    return recommendations;
  }
  
  // Name extraction confidence
  if ((analysis.nameExtractionConfidence || 0) < 0.7) {
    recommendations.push('Improve celebrity name extraction by refining detection algorithms');
  }
  
  if (analysis.withImages / analysis.totalItems < 0.8) {
    recommendations.push('Improve image extraction to increase percentage of items with images');
  }
  
  if (analysis.withEvents / analysis.totalItems < 0.5) {
    recommendations.push('Enhance event detection to provide more context for celebrity outfits');
  }
  
  if (analysis.uniqueCelebrities < 3) {
    recommendations.push('Increase variety of celebrity data by scraping more diverse sources');
  }
  
  if (analysis.averageDescriptionLength < 50) {
    recommendations.push('Extract longer, more detailed outfit descriptions for better quality');
  }
  
  if (analysis.dataCompleteness < 6) {
    recommendations.push('Improve overall data completeness with more comprehensive extraction');
  }
  
  return recommendations;
}

/**
 * Determine if the data appears to be mock data
 */
function isMock(results: any[]): boolean {
  if (results.length === 0) return true;
  
  // Check for tell-tale signs of mock data
  const mockIndicators = [
    // Check for Lorem ipsum
    results.some(r => r.outfitDescription?.includes('Lorem ipsum')),
    
    // Check for placeholder image URLs
    results.some(r => r.imageUrl?.includes('picsum.photos')),
    
    // Check for repeated outfit descriptions from our mock data
    results.some(r => r.outfitDescription?.includes('channeled old Hollywood glamour')),
    results.some(r => r.outfitDescription?.includes('rocked a classic pantsuit')),
    
    // Check for generic events
    (results.filter(r => r.event?.includes('Met Gala') || r.event?.includes('Fashion Week')).length === results.length),
    
    // All celebrities are in our test list
    results.every(r => ['Taylor Swift', 'Jennifer Lopez', 'Rihanna', 'Beyoncé', 'Zendaya'].includes(r.celebrity))
  ];
  
  // If any of these are true, it's likely mock data
  return mockIndicators.some(indicator => indicator === true);
}

/**
 * Compare real scraped data with mock data
 */
function compareRealVsMock(realData: any[], mockData: any[]) {
  if (realData.length === 0 || mockData.length === 0) {
    console.log('⚠️ Insufficient data for comparison');
    return;
  }
  
  const realAnalysis = analyzeResults([]);
  const mockAnalysis = analyzeResults([]);
  
  // Don't print duplicate analysis, just calculate
  realAnalysis.totalItems = realData.length;
  realAnalysis.withImages = realData.filter(r => r.imageUrl).length;
  realAnalysis.withEvents = realData.filter(r => r.event && r.event.length > 3).length;
  realAnalysis.withTimestamps = realData.filter(r => r.timestamp).length;
  realAnalysis.uniqueCelebrities = new Set(realData.map(r => r.celebrity)).size;
  realAnalysis.averageDescriptionLength = realData.reduce((acc, r) => acc + (r.outfitDescription?.length || 0), 0) / realData.length;
  realAnalysis.nameExtractionConfidence = estimateNameConfidence(realData);
  
  mockAnalysis.totalItems = mockData.length;
  mockAnalysis.withImages = mockData.filter(r => r.imageUrl).length;
  mockAnalysis.withEvents = mockData.filter(r => r.event && r.event.length > 3).length;
  mockAnalysis.withTimestamps = mockData.filter(r => r.timestamp).length;
  mockAnalysis.uniqueCelebrities = new Set(mockData.map(r => r.celebrity)).size;
  mockAnalysis.averageDescriptionLength = mockData.reduce((acc, r) => acc + (r.outfitDescription?.length || 0), 0) / mockData.length;
  mockAnalysis.nameExtractionConfidence = estimateNameConfidence(mockData);
  
  // Compare metrics
  console.log(`Images: Real ${Math.round(realAnalysis.withImages/realAnalysis.totalItems*100)}% vs Mock ${Math.round(mockAnalysis.withImages/mockAnalysis.totalItems*100)}%`);
  console.log(`Events: Real ${Math.round(realAnalysis.withEvents/realAnalysis.totalItems*100)}% vs Mock ${Math.round(mockAnalysis.withEvents/mockAnalysis.totalItems*100)}%`);
  console.log(`Unique celebrities: Real ${realAnalysis.uniqueCelebrities} vs Mock ${mockAnalysis.uniqueCelebrities}`);
  console.log(`Avg description length: Real ${Math.round(realAnalysis.averageDescriptionLength)} vs Mock ${Math.round(mockAnalysis.averageDescriptionLength)}`);
  console.log(`Name extraction confidence: Real ${Math.round(realAnalysis.nameExtractionConfidence*100)}% vs Mock 100%`);
  
  // Final determination
  if (isMock(realData)) {
    console.log('\n⚠️ RESULT: Data appears to be mock data, not real scraped content');
  } else {
    console.log('\n✅ RESULT: Data appears to be real scraped content');
  }
}

// Run the test when executed directly
if (require.main === module) {
  runTest().catch(console.error);
}

export default {
  runTest,
  analyzeResults,
  calculateQualityScore,
  generateRecommendations,
  testCelebrityNameExtraction
};