import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import OpenAI from 'openai';

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

export class EventCrawler {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async crawlEventbrite(url: string): Promise<ParsedEvent[]> {
    const events: ParsedEvent[] = [];
    
    try {
      const page = await this.browser!.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for event cards to load
      await page.waitForSelector('[data-testid="event-card"]', { timeout: 10000 }).catch(() => {});
      
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Parse Eventbrite event cards
      $('[data-testid="event-card"]').each((_, element) => {
        const $el = $(element);
        const title = $el.find('h3').text().trim();
        const date = $el.find('[data-testid="event-date"]').text().trim();
        const location = $el.find('[data-testid="event-location"]').text().trim();
        const price = $el.find('[data-testid="event-price"]').text().trim();
        const link = $el.find('a').attr('href');
        const imageUrl = $el.find('img').attr('src');
        
        if (title && date) {
          events.push({
            title,
            description: `Event from Eventbrite: ${title}`,
            date: this.parseDate(date),
            time: this.extractTime(date) || '19:00',
            location: location || 'San Carlos, CA',
            category: 'Community',
            price: price || 'Free',
            sourceUrl: link ? `https://www.eventbrite.com${link}` : url,
            imageUrl
          });
        }
      });
      
      await page.close();
    } catch (error) {
      console.error(`Error crawling Eventbrite: ${error}`);
    }
    
    return events;
  }

  async crawlSanCarlosEvents(url: string): Promise<ParsedEvent[]> {
    const events: ParsedEvent[] = [];
    
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Look for event listings on city website
      $('.event-item, .event-listing, .calendar-item').each((_, element) => {
        const $el = $(element);
        const title = $el.find('h2, h3, .event-title').text().trim();
        const date = $el.find('.event-date, .date').text().trim();
        const description = $el.find('.event-description, .description, p').first().text().trim();
        const location = $el.find('.event-location, .location').text().trim();
        
        if (title && date) {
          events.push({
            title,
            description: description || `Community event: ${title}`,
            date: this.parseDate(date),
            time: this.extractTime(date) || '14:00',
            location: location || 'San Carlos Community Center',
            category: 'Community',
            sourceUrl: url
          });
        }
      });
    } catch (error) {
      console.error(`Error crawling San Carlos events: ${error}`);
    }
    
    return events;
  }

  async crawlFunCheap(url: string): Promise<ParsedEvent[]> {
    const events: ParsedEvent[] = [];
    
    try {
      const page = await this.browser!.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Parse FunCheap event format
      $('.entry-event, article.event').each((_, element) => {
        const $el = $(element);
        const title = $el.find('h2, .entry-title').text().trim();
        const date = $el.find('.date-display, .event-date').text().trim();
        const description = $el.find('.entry-summary, .description').text().trim();
        const location = $el.find('.location, .venue').text().trim();
        const link = $el.find('a').attr('href');
        
        if (title && date) {
          events.push({
            title,
            description: description || `Fun & affordable event: ${title}`,
            date: this.parseDate(date),
            time: this.extractTime(date) || '18:00',
            location: location || 'San Francisco',
            category: 'Entertainment',
            price: 'Free or Low Cost',
            sourceUrl: link || url
          });
        }
      });
      
      await page.close();
    } catch (error) {
      console.error(`Error crawling FunCheap: ${error}`);
    }
    
    return events;
  }

  async crawlWithAI(url: string): Promise<ParsedEvent[]> {
    const events: ParsedEvent[] = [];
    
    try {
      const page = await this.browser!.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Get page text content
      const textContent = await page.evaluate(() => document.body.innerText);
      
      // Use OpenAI to extract events from unstructured text
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract event information from the provided text. Return a JSON array of events with fields: title, description, date (YYYY-MM-DD), time (HH:MM), location, category (Music/Sports/Arts/Food/Tech/Community/Business/Education/Health), price. Only extract real events, not examples or templates."
          },
          {
            role: "user",
            content: `Extract events from this webpage content (URL: ${url}):\n\n${textContent.substring(0, 8000)}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{"events":[]}');
      const extractedEvents = result.events || [];
      
      for (const event of extractedEvents) {
        if (event.title && event.date) {
          events.push({
            ...event,
            sourceUrl: url,
            date: this.parseDate(event.date),
            time: event.time || '19:00'
          });
        }
      }
      
      await page.close();
    } catch (error) {
      console.error(`Error with AI crawling ${url}: ${error}`);
    }
    
    return events;
  }

  async crawlAllSites(): Promise<ParsedEvent[]> {
    const allEvents: ParsedEvent[] = [];
    
    const sites = [
      { url: 'https://www.eventbrite.com/d/ca--san-carlos/events--today/', method: 'eventbrite' },
      { url: 'https://www.eventbrite.com/d/ca--san-carlos/events--this-week/', method: 'eventbrite' },
      { url: 'https://www.cityofsancarlos.org/city_hall/departments_and_divisions/parks_and_recreation/community_events.php', method: 'sancarlos' },
      { url: 'https://sf.funcheap.com/events/san-francisco/', method: 'funcheap' },
      { url: 'https://www.sfweekly.com/local-events/', method: 'ai' },
      { url: 'https://www.sftravel.com/things-to-do/events', method: 'ai' }
    ];
    
    for (const site of sites) {
      console.log(`Crawling ${site.url}...`);
      let events: ParsedEvent[] = [];
      
      switch (site.method) {
        case 'eventbrite':
          events = await this.crawlEventbrite(site.url);
          break;
        case 'sancarlos':
          events = await this.crawlSanCarlosEvents(site.url);
          break;
        case 'funcheap':
          events = await this.crawlFunCheap(site.url);
          break;
        case 'ai':
          events = await this.crawlWithAI(site.url);
          break;
      }
      
      console.log(`Found ${events.length} events from ${site.url}`);
      allEvents.push(...events);
    }
    
    return allEvents;
  }

  private parseDate(dateStr: string): string {
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    // Default to tomorrow if parsing fails
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  private extractTime(dateStr: string): string | null {
    // Extract time from date string if present
    const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const ampm = timeMatch[3];
      
      if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
      } else if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    return null;
  }
}