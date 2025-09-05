// Simplified crawler API for manual event submission
import { Express } from 'express';
import { db } from './db';
import { events, users } from '@shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import OpenAI from 'openai';
import * as crypto from 'crypto';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate a simple API key for crawler authentication
const CRAWLER_API_KEY = process.env.CRAWLER_API_KEY || 'crawler_key_' + crypto.randomBytes(16).toString('hex');

export function setupSimplifiedCrawlerAPI(app: Express) {
  console.log('🤖 Crawler API initialized');
  console.log(`📝 Use this API key for event submission: ${CRAWLER_API_KEY}`);

  // External events endpoint for automated web crawler
  app.post('/api/external/events', async (req, res) => {
    console.log('📥 External events endpoint called');
    
    try {
      // Check API key
      const apiKey = req.headers['x-api-key'];
      const expectedKey = process.env.EXTERNAL_API_KEY || 'eventconnect_external_api_key_2024';
      
      if (apiKey !== expectedKey) {
        console.log('❌ Invalid API key:', apiKey);
        return res.status(401).json({ 
          success: false, 
          message: "Invalid or missing API key" 
        });
      }
      
      console.log('✅ API key valid');
      console.log('External event data received:', JSON.stringify(req.body, null, 2));
      
      // Simple validation
      if (!req.body.title || !req.body.description || !req.body.category || 
          !req.body.date || !req.body.time || !req.body.location) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          required: ["title", "description", "category", "date", "time", "location"]
        });
      }
      
      // Find or create organizer
      let organizerId: string;
      const organizerEmail = req.body.organizerEmail || `external-${Date.now()}@eventconnect.app`;
      
      // Check if we have a default external organizer
      const [existingOrganizer] = await db.select()
        .from(users)
        .where(eq(users.email, 'external-default@eventconnect.app'))
        .limit(1);
      
      if (existingOrganizer) {
        organizerId = existingOrganizer.id;
      } else {
        // Create a default external organizer
        const [newOrganizer] = await db.insert(users)
          .values({
            id: `external_default_${Date.now()}`,
            email: 'external-default@eventconnect.app',
            firstName: 'External',
            lastName: 'Event',
            animeAvatarSeed: 'external_default',
          })
          .returning();
        organizerId = newOrganizer.id;
      }
      
      // Create the event
      const [newEvent] = await db
        .insert(events)
        .values({
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          subCategory: req.body.subCategory,
          date: req.body.date,
          time: req.body.time,
          location: req.body.location,
          organizerId,
          price: req.body.price || "0.00",
          isFree: req.body.isFree ?? true,
          eventImageUrl: req.body.eventImageUrl,
        })
        .returning();
        
      console.log(`✅ External event created: ${newEvent.title} (ID: ${newEvent.id})`);
      res.status(201).json({ 
        success: true, 
        eventId: newEvent.id,
        message: "Event created successfully",
        event: newEvent
      });
    } catch (error) {
      console.error("Error creating external event:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Failed to create event" 
      });
    }
  });

  // Endpoint to manually submit events
  app.post('/api/crawler/submit-event', async (req, res) => {
    try {
      const apiKey = req.headers['x-crawler-api-key'];
      
      if (apiKey !== CRAWLER_API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const eventData = req.body;
      
      // Validate required fields
      if (!eventData.title || !eventData.date || !eventData.location) {
        return res.status(400).json({ 
          error: 'Missing required fields: title, date, location' 
        });
      }

      // Parse and validate event with OpenAI
      const validatedEvent = await validateEventWithAI(eventData);
      
      if (!validatedEvent) {
        return res.status(400).json({ error: 'Event validation failed' });
      }

      // Check for duplicates
      const existingEvents = await db.select()
        .from(events)
        .where(eq(events.title, validatedEvent.title))
        .limit(1);

      if (existingEvents.length > 0) {
        return res.status(409).json({ 
          error: 'Duplicate event', 
          existingEvent: existingEvents[0] 
        });
      }

      // Insert new event
      const [newEvent] = await db.insert(events).values({
        ...validatedEvent,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      console.log(`✅ New event added via crawler: ${newEvent.title}`);
      
      res.json({ 
        success: true, 
        event: newEvent,
        message: 'Event successfully added to database'
      });

    } catch (error) {
      console.error('Error in crawler submit:', error);
      res.status(500).json({ error: 'Failed to process event submission' });
    }
  });

  // Endpoint to get recent crawler-added events
  app.get('/api/crawler/events', async (req, res) => {
    try {
      const apiKey = req.headers['x-crawler-api-key'];
      
      if (apiKey !== CRAWLER_API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const recentEvents = await db.select()
        .from(events)
        .where(and(
          gte(events.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        ))
        .orderBy(desc(events.createdAt))
        .limit(20);

      res.json({
        count: recentEvents.length,
        events: recentEvents
      });

    } catch (error) {
      console.error('Error fetching crawler events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Health check endpoint
  app.get('/api/crawler/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      apiKeyConfigured: !!CRAWLER_API_KEY,
      timestamp: new Date().toISOString()
    });
  });
}

async function validateEventWithAI(eventData: any) {
  try {
    const prompt = `
      Validate and enhance this event data. Return a JSON object with these fields:
      - title: string (clean, proper title)
      - description: string (engaging description, 100-200 words)
      - date: string (YYYY-MM-DD format)
      - time: string (HH:MM format, 24-hour)
      - location: string (full address if possible)
      - address: string (street address)
      - city: string
      - state: string (2-letter code)
      - zipCode: string
      - category: string (one of: Music, Sports, Arts, Food, Tech, Business, Education, Health & Wellness, Entertainment, Community, Outdoor, Family, Lifestyle)
      - subcategory: string (specific type within category)
      - price: string (Free or amount like "$20")
      - capacity: number (estimated if not provided)
      - requirementsAge: string (e.g., "All ages", "21+")
      - requirementsDress: string (e.g., "Casual", "Business casual")
      - requirementsOther: string (any other requirements)
      - organizerName: string
      - organizerEmail: string (generate realistic if not provided)
      - organizerPhone: string (generate realistic if not provided)
      - organizerWebsite: string (if available)
      - imageUrl: string (keep if valid URL)
      - tags: array of strings (3-5 relevant tags)
      - source: string (set to "manual_submission")

      Event data to validate:
      ${JSON.stringify(eventData, null, 2)}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an event data validator. Always return valid JSON that matches the requested schema."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const validated = JSON.parse(response.choices[0].message.content || '{}');
    
    // Ensure required fields
    if (!validated.title || !validated.date || !validated.location) {
      return null;
    }

    return validated;

  } catch (error) {
    console.error('AI validation error:', error);
    return null;
  }
}