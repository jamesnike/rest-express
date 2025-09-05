#!/usr/bin/env tsx

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ParsedEvent {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  price?: string;
  organizerName?: string;
  sourceUrl: string;
  imageUrl?: string;
}

export class EnhancedEventCrawler {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    console.log('Initializing enhanced crawler with AI extraction...');
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async extractEventsWithAI(pageContent: string, url: string): Promise<ParsedEvent[]> {
    try {
      console.log(`Using AI to extract events from ${url}...`);
      
      const prompt = `
        Extract ALL event information from this webpage content. Look for:
        - Event titles, dates, times, locations
        - Workshops, concerts, meetups, festivals, shows
        - Any activities with specific dates/times
        
        Return a JSON object with an "events" array. Each event should have:
        - title: event name
        - description: brief description (generate if not found)
        - date: in YYYY-MM-DD format (use 2025 for current year)
        - time: in HH:MM format (use 19:00 if not specified)
        - location: venue/address (use "San Carlos, CA" if not specified)
        - category: one of (Music, Sports, Arts, Food, Tech, Business, Education, Entertainment, Community, Outdoor, Family, Lifestyle)
        - price: ticket price or "Free"
        
        Only include REAL events found on the page, not examples or templates.
        If no events found, return {"events": []}
        
        Webpage URL: ${url}
        Content to analyze:
        ${pageContent.substring(0, 10000)}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at extracting event information from web pages. Always return valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"events":[]}');
      
      if (result.events && Array.isArray(result.events)) {
        console.log(`AI extracted ${result.events.length} events from ${url}`);
        return result.events.map((event: any) => ({
          title: event.title || 'Untitled Event',
          description: event.description || '',
          date: event.date || '2025-09-30',
          time: event.time || '19:00',
          location: event.location || 'San Carlos, CA',
          category: event.category || 'Community',
          price: event.price || 'Free',
          sourceUrl: url,
          organizerName: event.organizerName
        }));
      }
      
      return [];
    } catch (error) {
      console.error('AI extraction error:', error);
      return [];
    }
  }

  async crawlPage(url: string): Promise<ParsedEvent[]> {
    let events: ParsedEvent[] = [];
    let page: puppeteer.Page | null = null;
    
    try {
      console.log(`Crawling: ${url}`);
      page = await this.browser!.newPage();
      
      // Set headers to look like a real browser
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      });
      
      // Navigate to page
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to scroll to load more content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get all text content from the page
      const pageContent = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        // Get text content
        return document.body.innerText || document.body.textContent || '';
      });
      
      // Get structured data if available
      const structuredData = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const events: any[] = [];
        
        scripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent || '{}');
            if (data['@type'] === 'Event' || data['@type'] === 'EventSeries') {
              events.push(data);
            }
            if (Array.isArray(data)) {
              data.forEach(item => {
                if (item['@type'] === 'Event') events.push(item);
              });
            }
          } catch (e) {
            // Invalid JSON
          }
        });
        
        return events;
      });
      
      // Convert structured data to our format
      if (structuredData && structuredData.length > 0) {
        console.log(`Found ${structuredData.length} events in structured data`);
        structuredData.forEach((event: any) => {
          events.push({
            title: event.name || 'Untitled Event',
            description: event.description || '',
            date: this.parseDate(event.startDate) || '2025-09-30',
            time: this.extractTime(event.startDate) || '19:00',
            location: event.location?.name || event.location?.address?.addressLocality || 'San Carlos, CA',
            category: 'Community',
            price: event.offers?.price || event.offers?.lowPrice || 'Free',
            sourceUrl: url,
            imageUrl: event.image,
            organizerName: event.organizer?.name
          });
        });
      }
      
      // If no structured data found, use AI extraction
      if (events.length === 0 && pageContent && pageContent.length > 100) {
        events = await this.extractEventsWithAI(pageContent, url);
      }
      
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    } finally {
      if (page) {
        await page.close();
      }
    }
    
    return events;
  }

  parseDate(dateStr: string): string {
    if (!dateStr) return '2025-09-30';
    
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Invalid date
    }
    
    // Try to extract date patterns
    const patterns = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2}),?\s+(\d{4})/i
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern);
      if (match) {
        // Convert to YYYY-MM-DD format
        return '2025-09-30'; // Placeholder for now
      }
    }
    
    return '2025-09-30';
  }

  extractTime(dateStr: string): string {
    if (!dateStr) return '19:00';
    
    // Look for time patterns
    const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match = dateStr.match(timePattern);
    
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2];
      const period = match[3];
      
      if (period === 'PM' && hour < 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    }
    
    return '19:00';
  }

  async crawlAllSites(): Promise<ParsedEvent[]> {
    const sites = [
      'https://www.eventbrite.com/d/ca--san-carlos/events/',
      'https://sf.funcheap.com/',
      'https://www.sfstation.com/calendar/',
      'https://www.timeout.com/san-francisco/things-to-do'
    ];
    
    const allEvents: ParsedEvent[] = [];
    
    for (const site of sites) {
      const events = await this.crawlPage(site);
      allEvents.push(...events);
      
      // Delay between sites
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return allEvents;
  }
}

// Run the enhanced crawler
async function runEnhancedCrawler() {
  const crawler = new EnhancedEventCrawler();
  
  try {
    await crawler.initialize();
    console.log('🚀 Starting enhanced event discovery...\n');
    
    const events = await crawler.crawlAllSites();
    
    console.log('\n📊 Discovery Results:');
    console.log(`Total events found: ${events.length}`);
    
    if (events.length > 0) {
      console.log('\n📅 Discovered Events:');
      events.forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   Date: ${event.date} at ${event.time}`);
        console.log(`   Location: ${event.location}`);
        console.log(`   Category: ${event.category}`);
        console.log(`   Price: ${event.price}`);
        console.log(`   Source: ${event.sourceUrl}`);
      });
      
      // Submit events to the API
      console.log('\n🔄 Submitting events to EventConnect...');
      
      for (const event of events) {
        try {
          // Prepare data in the format expected by the API
          const eventPayload = {
            title: event.title,
            description: event.description || `Event: ${event.title}`,
            category: event.category,
            subCategory: 'General',
            date: event.date,
            time: event.time,
            location: event.location,
            price: event.price === 'Free' ? '0.00' : event.price?.replace(/[^\d.]/g, '') || '0.00',
            isFree: event.price === 'Free' || event.price?.toLowerCase() === 'free',
            eventImageUrl: event.imageUrl,
            organizerEmail: 'events@eventconnect.local',
            source: 'enhanced_crawler',
            sourceUrl: event.sourceUrl
          };
          
          console.log(`Submitting: ${event.title}`);
          
          const response = await fetch('https://local-event-connect.replit.app/api/external/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': 'eventconnect_external_api_key_2024'
            },
            body: JSON.stringify(eventPayload)
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Submitted: ${event.title} (ID: ${result.eventId})`);
          } else {
            const error = await response.text();
            console.log(`⚠️ Failed to submit: ${event.title}`);
            console.log(`   Error: ${error}`);
          }
        } catch (error) {
          console.error(`Error submitting event: ${error}`);
        }
        
        // Delay between submissions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log('\nNo events found. This could be due to:');
      console.log('- Anti-scraping measures on the target websites');
      console.log('- Dynamic content that requires more sophisticated extraction');
      console.log('- Changed website structures');
      console.log('\nThe AI extraction system is ready to parse events when content is available.');
    }
    
  } catch (error) {
    console.error('Crawler error:', error);
  } finally {
    await crawler.cleanup();
    console.log('\n✨ Enhanced crawler completed');
  }
}

// Run the enhanced crawler
runEnhancedCrawler().catch(console.error);