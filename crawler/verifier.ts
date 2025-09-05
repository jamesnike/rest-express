import { db } from '../server/db';
import { events } from '../shared/schema';
import { eq, and, or } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface EventToVerify {
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

export class EventVerifier {
  
  async verifyAndCreateEvent(eventData: EventToVerify): Promise<{ success: boolean; message: string; eventId?: number }> {
    try {
      // Step 1: Validate required fields
      const validation = this.validateEventData(eventData);
      if (!validation.isValid) {
        return { success: false, message: `Validation failed: ${validation.errors.join(', ')}` };
      }
      
      // Step 2: Check for duplicates
      const isDuplicate = await this.checkDuplicate(eventData);
      if (isDuplicate) {
        return { success: false, message: 'Duplicate event detected' };
      }
      
      // Step 3: Enhance event data with AI
      const enhancedData = await this.enhanceEventData(eventData);
      
      // Step 4: Create event in database
      const newEvent = await this.createEvent(enhancedData);
      
      return { 
        success: true, 
        message: 'Event created successfully', 
        eventId: newEvent.id 
      };
      
    } catch (error) {
      console.error('Error verifying and creating event:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }
  
  private validateEventData(data: EventToVerify): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!data.title || data.title.length < 3) {
      errors.push('Title must be at least 3 characters');
    }
    
    if (!data.description || data.description.length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    
    if (!data.date || !this.isValidDate(data.date)) {
      errors.push('Invalid date format');
    }
    
    if (!data.time || !this.isValidTime(data.time)) {
      errors.push('Invalid time format');
    }
    
    if (!data.location || data.location.length < 3) {
      errors.push('Location must be provided');
    }
    
    const validCategories = ['Music', 'Sports', 'Arts', 'Food', 'Tech', 'Community', 'Business', 'Education', 'Health', 'Entertainment', 'Outdoor', 'Family', 'Lifestyle'];
    if (!data.category || !validCategories.includes(data.category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }
    
    // Check date is in the future
    const eventDate = new Date(`${data.date}T${data.time}`);
    if (eventDate < new Date()) {
      errors.push('Event date must be in the future');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private async checkDuplicate(data: EventToVerify): Promise<boolean> {
    try {
      // Check for exact title match on same date
      const exactMatch = await db.select()
        .from(events)
        .where(
          and(
            eq(events.title, data.title),
            eq(events.date, data.date)
          )
        )
        .limit(1);
      
      if (exactMatch.length > 0) {
        return true;
      }
      
      // Use AI to check for semantic duplicates
      const recentEvents = await db.select()
        .from(events)
        .where(
          and(
            eq(events.date, data.date),
            or(
              eq(events.location, data.location),
              eq(events.time, data.time)
            )
          )
        );
      
      if (recentEvents.length > 0) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Compare events and determine if they are duplicates. Return JSON with 'isDuplicate': true/false and 'confidence': 0-1"
            },
            {
              role: "user",
              content: `New event: ${JSON.stringify(data)}\n\nExisting events: ${JSON.stringify(recentEvents)}`
            }
          ],
          response_format: { type: "json_object" }
        });
        
        const result = JSON.parse(response.choices[0].message.content || '{"isDuplicate": false}');
        return result.isDuplicate && result.confidence > 0.8;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      // Be conservative - don't create if we can't check
      return true;
    }
  }
  
  private async enhanceEventData(data: EventToVerify): Promise<any> {
    try {
      // Use AI to enhance and standardize event data
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Enhance event data by adding missing details, improving descriptions, and ensuring consistency. Return complete event data in JSON format with all original fields plus: maxAttendees (number), requirements (string or null), tags (array of strings), subcategory (string or null)."
          },
          {
            role: "user",
            content: JSON.stringify(data)
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const enhanced = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        title: enhanced.title || data.title,
        description: enhanced.description || data.description,
        date: data.date,
        time: data.time,
        location: enhanced.location || data.location,
        category: data.category,
        subcategory: enhanced.subcategory || null,
        price: enhanced.price || data.price || 'Free',
        maxAttendees: enhanced.maxAttendees || 100,
        requirements: enhanced.requirements || null,
        organizerId: 'crawler_bot',
        organizerName: data.organizerName || 'Community Events',
        organizerEmail: 'events@eventconnect.app',
        tags: enhanced.tags || [],
        imageUrl: data.imageUrl || null,
        sourceUrl: data.sourceUrl
      };
    } catch (error) {
      console.error('Error enhancing data:', error);
      // Return original data if enhancement fails
      return {
        ...data,
        organizerId: 'crawler_bot',
        organizerEmail: 'events@eventconnect.app',
        maxAttendees: 100
      };
    }
  }
  
  private async createEvent(data: any): Promise<any> {
    const [newEvent] = await db.insert(events).values({
      title: data.title,
      description: data.description,
      date: data.date,
      time: data.time,
      location: data.location,
      category: data.category,
      subcategory: data.subcategory,
      price: data.price,
      maxAttendees: data.maxAttendees,
      requirements: data.requirements,
      organizerId: data.organizerId,
      organizerName: data.organizerName,
      organizerEmail: data.organizerEmail,
      imageUrl: data.imageUrl,
      contactEmail: data.organizerEmail,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log(`Created event: ${newEvent.title} (ID: ${newEvent.id})`);
    return newEvent;
  }
  
  private isValidDate(date: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    
    const d = new Date(date);
    return !isNaN(d.getTime());
  }
  
  private isValidTime(time: string): boolean {
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
  }
  
  async verifyBatch(events: EventToVerify[]): Promise<{ created: number; duplicates: number; errors: number }> {
    const results = {
      created: 0,
      duplicates: 0,
      errors: 0
    };
    
    for (const event of events) {
      const result = await this.verifyAndCreateEvent(event);
      
      if (result.success) {
        results.created++;
      } else if (result.message.includes('Duplicate')) {
        results.duplicates++;
      } else {
        results.errors++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}