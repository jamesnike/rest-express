import type { Express, Request, Response } from 'express';
import { EventVerifier } from '../crawler/verifier';

export function setupCrawlerAPI(app: Express) {
  const verifier = new EventVerifier();
  
  // POST endpoint for external systems to submit events for verification
  app.post('/api/crawler/verify-events', async (req: Request, res: Response) => {
    try {
      const { events, apiKey } = req.body;
      
      // Simple API key check (you can enhance this)
      if (apiKey !== process.env.CRAWLER_API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      if (!events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Events array required' });
      }
      
      console.log(`Received ${events.length} events for verification`);
      
      // Verify and create events
      const results = await verifier.verifyBatch(events);
      
      res.json({
        success: true,
        results: {
          created: results.created,
          duplicates: results.duplicates,
          errors: results.errors
        },
        message: `Processed ${events.length} events`
      });
      
    } catch (error) {
      console.error('Error in verify-events endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // GET endpoint to check crawler status
  app.get('/api/crawler/status', (req: Request, res: Response) => {
    res.json({
      status: 'active',
      message: 'Crawler API is running',
      endpoints: {
        verify: '/api/crawler/verify-events'
      }
    });
  });
}