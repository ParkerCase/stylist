// demo.ts
// Complete demonstration of the celebrity fashion data pipeline

import { scrapeSocialProof, getDevSocialProof } from './scrapeSocialProof';
import * as fs from 'fs';
import * as path from 'path';

async function runDemo() {
  console.log('🚀 Celebrity Fashion Data Pipeline Demo\n');

  try {
    // 1. Development Mode - Quick and reliable
    console.log('1️⃣ Developer Mode (Mock Data)');
    console.log('================================');
    const devData = await getDevSocialProof();
    console.log(`✅ Retrieved ${devData.length} celebrity fashion items`);
    console.log('\nSample item:');
    console.log(JSON.stringify(devData[0], null, 2));
    
    // 2. Production Mode - Multiple fallbacks
    console.log('\n\n2️⃣ Production Mode (Multiple Sources)');
    console.log('================================');
    const prodData = await scrapeSocialProof({
      itemLimit: 5,
      sources: ['whowhatwear', 'alternatives']
    });
    console.log(`✅ Retrieved ${prodData.length} items`);
    
    // 3. Web Scraping Test - See what happens
    console.log('\n\n3️⃣ Web Scraping Test');
    console.log('================================');
    const scrapingData = await scrapeSocialProof({
      itemLimit: 3,
      headless: false, // See the browser
      sources: ['whowhatwear']
    });
    console.log(`✅ Retrieved ${scrapingData.length} items from web scraping`);
    
    // 4. Save results for inspection
    const outputDir = path.join(__dirname, 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'dev-data.json'),
      JSON.stringify(devData, null, 2)
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'prod-data.json'),
      JSON.stringify(prodData, null, 2)
    );
    
    console.log('\n\n📂 Results saved to outputs/ directory');
    console.log('✨ Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}