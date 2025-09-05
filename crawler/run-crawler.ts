import cron from 'node-cron';
import { EventCrawler } from './crawler';
import { EventVerifier } from './verifier';

async function runCrawlAndVerify() {
  console.log(`[${new Date().toISOString()}] Starting event crawl...`);
  
  const crawler = new EventCrawler();
  const verifier = new EventVerifier();
  
  try {
    // Initialize browser for crawling
    await crawler.initialize();
    
    // Crawl all configured websites
    const crawledEvents = await crawler.crawlAllSites();
    console.log(`Total events crawled: ${crawledEvents.length}`);
    
    // Verify and create events in database
    const results = await verifier.verifyBatch(crawledEvents);
    
    console.log(`Crawl complete:
      - Created: ${results.created} events
      - Duplicates skipped: ${results.duplicates}
      - Errors: ${results.errors}
    `);
    
    // Cleanup
    await crawler.cleanup();
    
  } catch (error) {
    console.error('Error during crawl:', error);
    await crawler.cleanup();
  }
}

// Run immediately on start
console.log('Event Crawler Service Started');
console.log('Running initial crawl...');
runCrawlAndVerify();

// Schedule to run every 4 hours
cron.schedule('0 */4 * * *', () => {
  console.log('Running scheduled crawl...');
  runCrawlAndVerify();
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('Shutting down crawler...');
  process.exit(0);
});

console.log('Crawler scheduled to run every 4 hours');