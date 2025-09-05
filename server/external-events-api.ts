// External Events API - Simplified Event Post Verifier
import { Express } from 'express';
import { db } from './db';
import { events, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export function setupExternalEventsAPI(app: Express) {
  console.log('📮 External Events API initialized');
  
  // Test endpoint to verify the API is working
  app.get('/api/external/test', (req, res) => {
    res.json({ 
      message: 'External Events API is working!',
      timestamp: new Date().toISOString()
    });
  });
  
  // Main external events endpoint
  app.post('/api/external/events', async (req, res) => {
    console.log('\n=== EXTERNAL EVENTS ENDPOINT CALLED ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    try {
      // Step 1: Validate API key
      const apiKey = req.headers['x-api-key'];
      const expectedKey = process.env.EXTERNAL_API_KEY || 'eventconnect_external_api_key_2024';
      
      console.log('API Key Check:', { received: apiKey, expected: expectedKey });
      
      if (apiKey !== expectedKey) {
        console.log('❌ API key validation failed');
        return res.status(401).json({ 
          success: false, 
          message: "Invalid or missing API key",
          debug: { received: apiKey ? 'present' : 'missing' }
        });
      }
      
      console.log('✅ API key validated');
      
      // Step 2: Validate required fields
      const requiredFields = ['title', 'description', 'category', 'date', 'time', 'location'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        console.log('❌ Missing required fields:', missingFields);
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          missingFields,
          receivedFields: Object.keys(req.body)
        });
      }
      
      console.log('✅ All required fields present');
      
      // Step 3: Find or create default organizer
      console.log('🔍 Looking for default organizer...');
      
      let organizerId: string;
      const defaultEmail = 'external-events@eventconnect.local';
      
      try {
        const existingUsers = await db.select()
          .from(users)
          .where(eq(users.email, defaultEmail))
          .limit(1);
        
        console.log(`Found ${existingUsers.length} existing users with email ${defaultEmail}`);
        
        if (existingUsers.length > 0) {
          organizerId = existingUsers[0].id;
          console.log('✅ Using existing organizer:', organizerId);
        } else {
          console.log('📝 Creating new organizer...');
          const newUserId = `external_org_${Date.now()}`;
          
          const [newUser] = await db.insert(users)
            .values({
              id: newUserId,
              email: defaultEmail,
              firstName: 'External',
              lastName: 'Events',
              animeAvatarSeed: 'external_default',
              interests: ['Events'],
              personality: ['Organized'],
              aiSignature: 'External event organizer'
            })
            .returning();
          
          organizerId = newUser.id;
          console.log('✅ Created new organizer:', organizerId);
        }
      } catch (userError: any) {
        console.error('❌ Error with organizer:', userError);
        throw new Error(`Failed to find/create organizer: ${userError.message || userError}`);
      }
      
      // Step 4: Create the event
      console.log('📝 Creating event with data:', {
        title: req.body.title,
        category: req.body.category,
        date: req.body.date,
        time: req.body.time,
        organizerId
      });
      
      const eventData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        subCategory: req.body.subCategory || null,
        date: req.body.date,
        time: req.body.time,
        location: req.body.location,
        organizerId,
        price: req.body.price || "0.00",
        isFree: req.body.isFree !== undefined ? req.body.isFree : true,
        eventImageUrl: req.body.eventImageUrl || null,
        maxAttendees: req.body.maxAttendees || null,
        capacity: req.body.capacity || null,
        isActive: true
      };
      
      console.log('Event data prepared:', eventData);
      
      const [newEvent] = await db
        .insert(events)
        .values(eventData)
        .returning();
      
      console.log('✅ Event created successfully:', {
        id: newEvent.id,
        title: newEvent.title
      });
      
      res.status(201).json({ 
        success: true, 
        eventId: newEvent.id,
        message: "Event created successfully",
        event: newEvent
      });
      
    } catch (error: any) {
      console.error('❌ ERROR in external events endpoint:');
      console.error('Error type:', error?.constructor?.name || 'Unknown');
      console.error('Error message:', error?.message || error);
      console.error('Error stack:', error?.stack);
      
      res.status(500).json({ 
        success: false,
        message: error?.message || "Failed to create event",
        error: {
          type: error?.constructor?.name || 'Unknown',
          message: error?.message || String(error),
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }
      });
    }
  });
  
  // Endpoint to check event creation status
  app.get('/api/external/events/status', async (req, res) => {
    try {
      const recentEvents = await db.select()
        .from(events)
        .where(eq(events.organizerId, 'external_org'))
        .limit(5);
      
      res.json({
        success: true,
        totalExternalEvents: recentEvents.length,
        recentEvents: recentEvents.map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          createdAt: e.createdAt
        }))
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to get status",
        error: error?.message || String(error) 
      });
    }
  });
}