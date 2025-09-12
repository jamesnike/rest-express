import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupJWTAuth, requireAuth, optionalAuth } from "./jwtAuth";
import { insertEventSchema, externalEventSchema, insertRsvpSchema, insertChatMessageSchema, chatMessages, users, type EventWithOrganizer } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { userCache, eventCache, messageCache, invalidateUserCaches, invalidateEventCaches } from "./cache";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth setup
  await setupJWTAuth(app);

  // Auth routes
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Event routes
  // Browse events route - shows events for next 7 days without filtering skipped ones (must be before /api/events/:id)
  app.get('/api/events/browse', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const timeFilter = req.query.timeFilter as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const timezoneOffset = req.query.timezoneOffset ? parseInt(req.query.timezoneOffset as string) : 0;
      
      // Handle pagination parameters
      let offset = 0;
      if (req.query.offset) {
        offset = parseInt(req.query.offset as string);
      } else if (req.query.page) {
        const page = parseInt(req.query.page as string);
        offset = (page - 1) * limit;
      }
      
      // Get today's date and 7 days from now
      const today = new Date();
      const startDate = today.toISOString().split('T')[0]; // Today in YYYY-MM-DD format
      
      const endDateObj = new Date(today);
      endDateObj.setDate(today.getDate() + 7);
      const endDate = endDateObj.toISOString().split('T')[0]; // 7 days from now in YYYY-MM-DD format
      
      // Get total count of events in date range
      const total = await storage.getEventCountByDateRange(startDate, endDate, category, timeFilter, timezoneOffset);
      
      // Get paginated events with date range filtering
      const events = await storage.getEventsByDateRange(startDate, endDate, category, timeFilter, limit, offset, timezoneOffset);
      
      // Calculate pagination metadata
      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.ceil(total / limit);
      const hasNext = offset + limit < total;
      const hasPrevious = offset > 0;
      
      // Return paginated response with metadata
      res.json({
        events,
        pagination: {
          total,
          limit,
          offset,
          currentPage,
          totalPages,
          hasNext,
          hasPrevious
        }
      });
    } catch (error) {
      console.error("Error fetching browse events:", error);
      res.status(500).json({ message: "Failed to fetch browse events" });
    }
  });

  app.get('/api/events', optionalAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const category = req.query.category as string | undefined;
      const timeFilter = req.query.timeFilter as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      // For Home page, exclude past events
      const events = await storage.getEvents(userId, category, timeFilter, limit, true);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/:id', optionalAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.get('/api/events/:id/attendees', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      const attendees = await storage.getEventAttendees(eventId);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching event attendees:", error);
      res.status(500).json({ message: "Failed to fetch event attendees" });
    }
  });

  app.post('/api/events', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eventData = insertEventSchema.parse({
        ...req.body,
        organizerId: userId,
      });
      
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // External API endpoint for web crawl - NO AUTHENTICATION REQUIRED
  app.post('/api/external/events', async (req, res) => {
    try {
      // Validate required fields using external event schema
      const eventData = externalEventSchema.omit({ organizerId: true }).parse(req.body);
      
      const event = await storage.createExternalEvent({
        ...eventData,
        latitude: eventData.latitude === null ? undefined : eventData.latitude,
        longitude: eventData.longitude === null ? undefined : eventData.longitude,
        price: eventData.price === null ? undefined : eventData.price,
        isFree: eventData.isFree === null ? undefined : eventData.isFree,
        subCategory: eventData.subCategory === null ? undefined : eventData.subCategory,
        maxAttendees: eventData.maxAttendees === null ? undefined : eventData.maxAttendees,
        capacity: eventData.capacity === null ? undefined : eventData.capacity,
        parkingInfo: eventData.parkingInfo === null ? undefined : eventData.parkingInfo,
        meetingPoint: eventData.meetingPoint === null ? undefined : eventData.meetingPoint,
        duration: eventData.duration === null ? undefined : eventData.duration,
        whatToBring: eventData.whatToBring === null ? undefined : eventData.whatToBring,
        specialNotes: eventData.specialNotes === null ? undefined : eventData.specialNotes,
        requirements: eventData.requirements === null ? undefined : eventData.requirements,
        contactInfo: eventData.contactInfo === null ? undefined : eventData.contactInfo,
        cancellationPolicy: eventData.cancellationPolicy === null ? undefined : eventData.cancellationPolicy,
        eventImageUrl: eventData.eventImageUrl === null ? undefined : eventData.eventImageUrl
      });
      res.status(201).json({ 
        success: true, 
        eventId: event.id,
        message: "Event created successfully",
        event: event
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid event data", 
          errors: error.errors 
        });
      }
      console.error("Error creating external event:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to create event" 
      });
    }
  });

  // Get individual event by ID
  app.get('/api/events/:id', async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      // Try to get user ID from auth, but don't require authentication
      const userId = (req.user as any)?.claims?.sub;
      
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.put('/api/events/:id', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user is the organizer
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent || existingEvent.organizerId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this event" });
      }
      
      const eventData = insertEventSchema.partial().parse(req.body);
      const updatedEvent = await storage.updateEvent(eventId, eventData);
      
      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user is the organizer
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent || existingEvent.organizerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
      }
      
      await storage.deleteEvent(eventId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // User events routes
  app.get('/api/users/:userId/events', requireAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const type = req.query.type as 'organized' | 'attending' || 'organized';
      const pastOnly = req.query.pastOnly === 'true';
      
      // Users can only view their own events
      if (userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Not authorized to view these events" });
      }
      
      const events = await storage.getUserEvents(userId, type, pastOnly);
      res.json(events);
    } catch (error) {
      console.error("Error fetching user events:", error);
      res.status(500).json({ message: "Failed to fetch user events" });
    }
  });

  // Group chats - events where user can participate in chat (hasn't left chat) + private chats
  app.get('/api/users/:userId/group-chats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      
      // Users can only view their own group chats
      if (userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Not authorized to view these events" });
      }
      
      // Get event IDs where user can participate in chat (regular events)
      const eventIds = await storage.getUserEventIds(userId);
      
      // Get full event details for regular events
      const regularEvents = await Promise.all(
        eventIds.map(eventId => storage.getEvent(eventId, userId))
      );
      
      // Get private chats for this user
      const privateChats = await storage.getUserPrivateChats(userId);
      console.log(`Private chats for user ${userId}:`, privateChats.length, privateChats.map(c => ({ id: c.id, title: c.title })));
      
      // Combine regular events and private chats
      const allEvents = [
        ...regularEvents.filter(event => event !== undefined),
        ...privateChats
      ] as EventWithOrganizer[];
      
      // Get most recent message timestamp for each event and sort by activity
      const eventsWithActivity = await Promise.all(
        allEvents.map(async (event) => {
          try {
            // Get the most recent message for this event
            const recentMessages = await storage.getChatMessages(event.id, 1);
            const lastMessageTime = recentMessages.length > 0 ? recentMessages[0].createdAt : event.createdAt;
            return { ...event, lastMessageTime };
          } catch (error) {
            console.error(`Error fetching recent message for event ${event.id}:`, error);
            return { ...event, lastMessageTime: event.createdAt };
          }
        })
      );
      
      // Sort by most recent activity (last message time), then by event creation date
      const sortedEvents = eventsWithActivity.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || a.createdAt || 0).getTime();
        const timeB = new Date(b.lastMessageTime || b.createdAt || 0).getTime();
        return timeB - timeA; // Most recent activity first
      });
      
      res.json(sortedEvents);
    } catch (error) {
      console.error("Error fetching group chats:", error);
      res.status(500).json({ message: "Failed to fetch group chats" });
    }
  });

  // RSVP routes
  app.post('/api/events/:id/rsvp', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { status } = req.body;
      
      if (!['going', 'maybe', 'not_going', 'attending'].includes(status)) {
        return res.status(400).json({ message: "Invalid RSVP status" });
      }
      
      // Check if RSVP already exists
      const existingRsvp = await storage.getUserRsvp(eventId, userId);
      
      let rsvp;
      if (existingRsvp) {
        rsvp = await storage.updateRsvp(eventId, userId, status);
      } else {
        const rsvpData = insertRsvpSchema.parse({
          eventId,
          userId,
          status,
        });
        rsvp = await storage.createRsvp(rsvpData);
      }
      
      res.json(rsvp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid RSVP data", errors: error.errors });
      }
      console.error("Error creating/updating RSVP:", error);
      res.status(500).json({ message: "Failed to RSVP to event" });
    }
  });

  app.delete('/api/events/:id/rsvp', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      await storage.deleteRsvp(eventId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting RSVP:", error);
      res.status(500).json({ message: "Failed to delete RSVP" });
    }
  });

  app.post('/api/events/:id/leave-chat', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      console.log(`API: User ${userId} attempting to leave chat for event ${eventId}`);
      await storage.leaveEventChat(eventId, userId);
      console.log(`API: User ${userId} successfully left chat for event ${eventId}`);
      res.status(204).send();
    } catch (error) {
      console.error("Error leaving event chat:", error);
      res.status(500).json({ message: "Failed to leave event chat" });
    }
  });

  app.post('/api/events/:id/rejoin-chat', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      console.log(`API: User ${userId} attempting to rejoin chat for event ${eventId}`);
      await storage.rejoinEventChat(eventId, userId);
      console.log(`API: User ${userId} successfully rejoined chat for event ${eventId}`);
      
      res.json({ message: "Successfully rejoined chat" });
    } catch (error) {
      console.error("Error rejoining event chat:", error);
      res.status(500).json({ message: "Failed to rejoin event chat" });
    }
  });

  // Get user's RSVP status for an event including hasLeftChat
  app.get('/api/events/:id/rsvp-status', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if user is the organizer
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const isOrganizer = event.organizerId === userId;
      
      const userRsvp = await storage.getUserRsvp(eventId, userId);
      
      // If user is organizer and has no RSVP, create a virtual RSVP status
      if (isOrganizer && !userRsvp) {
        return res.json({
          id: null,
          eventId: eventId,
          userId: userId,
          status: 'organizing',
          hasLeftChat: false,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      if (!userRsvp) {
        return res.status(404).json({ message: "No RSVP found" });
      }
      
      res.json(userRsvp);
    } catch (error) {
      console.error("Error getting RSVP status:", error);
      res.status(500).json({ message: "Failed to get RSVP status" });
    }
  });

  // Update user profile
  app.put('/api/users/profile', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { location, interests, personality } = req.body;
      
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
        location,
        interests,
        personality,
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Generate AI signature based on user's interests and personality
  app.post('/api/users/generate-signature', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Get user's selected interests and personality traits
      const interests = user.interests || [];
      const personality = user.personality || [];

      if (interests.length === 0 && personality.length === 0) {
        return res.status(400).json({ message: "Please select some interests and personality traits first" });
      }

      try {
        // Create a prompt to generate a personal signature
        const prompt = `Create an abstract, funny signature/bio for someone with these characteristics:

Interests: ${interests.join(', ')}
Personality: ${personality.join(', ')}

The signature should be:
- Maximum 10 words
- Abstract and cryptic
- Hilariously weird
- Unexpected combinations
- Metaphorical or surreal
- Makes people go "huh?" then laugh

Please respond with just the signature text, nothing else.`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          max_tokens: 30,
          temperature: 0.9,
        });

        let signature = response.choices[0].message.content?.trim();
        
        if (!signature) {
          throw new Error("Empty response from OpenAI");
        }

        // Ensure signature is 10 words or less
        const words = signature.split(' ');
        if (words.length > 10) {
          signature = words.slice(0, 10).join(' ');
        }

        // Save the signature to the database
        await storage.upsertUser({
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          location: user.location,
          interests: user.interests,
          personality: user.personality,
          aiSignature: signature,
        });

        res.json({ signature });
      } catch (openaiError) {
        console.error("OpenAI error:", openaiError);
        
        // Fallback: Generate a simple signature based on interests and personality
        const allTraits = [...interests, ...personality];
        const shuffledTraits = allTraits.sort(() => 0.5 - Math.random());
        const selectedTraits = shuffledTraits.slice(0, 3);
        
        const templates = [
          `Quantum ${selectedTraits[0]} entity seeking parallel universe friends.`,
          `Professional overthinker, amateur ${selectedTraits[0]} whisperer.`,
          `${selectedTraits[0]} powered chaos generator with WiFi.`,
          `Part human, part ${selectedTraits[0]}, all confusion.`,
          `Collecting ${selectedTraits[0]} vibes and existential dread.`,
          `${selectedTraits[0]} prophet preaching to houseplants.`,
          `Sentient ${selectedTraits[0]} energy trapped in human form.`,
          `${selectedTraits[0]} wizard disguised as functioning adult.`,
          `Accidentally became ${selectedTraits[0]} overlord, send help.`,
          `${selectedTraits[0]} archaeologist excavating childhood dreams.`,
        ];
        
        const fallbackSignature = templates[Math.floor(Math.random() * templates.length)];
        
        // Save the fallback signature to the database
        await storage.upsertUser({
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          location: user.location,
          interests: user.interests,
          personality: user.personality,
          aiSignature: fallbackSignature,
        });
        
        // Return fallback signature with a note about AI generation
        return res.status(503).json({ 
          signature: fallbackSignature,
          message: "AI signature service temporarily unavailable. Here's a personalized signature based on your profile!" 
        });
      }
    } catch (error) {
      console.error("Error generating signature:", error);
      
      // Handle specific OpenAI errors
      if (error instanceof Error && 'status' in error) {
        const apiError = error as any;
        if (apiError.status === 429) {
          return res.status(429).json({ 
            message: "OpenAI API quota exceeded. Please check your OpenAI billing and usage limits." 
          });
        }
        
        if (apiError.status === 401) {
          return res.status(401).json({ 
            message: "OpenAI API key is invalid. Please check your API key configuration." 
          });
        }
      }
      
      res.status(500).json({ message: "Failed to generate signature. Please try again later." });
    }
  });

  // Private Chat routes
  app.post('/api/private-chats', requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const { otherUserId } = req.body;
      
      if (!otherUserId) {
        return res.status(400).json({ message: "Other user ID is required" });
      }
      
      if (currentUserId === otherUserId) {
        return res.status(400).json({ message: "Cannot create private chat with yourself" });
      }
      
      // Check if the other user exists
      const otherUser = await storage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create or get existing private chat
      const privateChat = await storage.createPrivateChat(currentUserId, otherUserId);
      
      res.json(privateChat);
    } catch (error) {
      console.error("Error creating private chat:", error);
      res.status(500).json({ message: "Failed to create private chat" });
    }
  });

  app.get('/api/private-chats/:otherUserId', requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const otherUserId = req.params.otherUserId;
      
      if (!otherUserId) {
        return res.status(400).json({ message: "Other user ID is required" });
      }
      
      if (currentUserId === otherUserId) {
        return res.status(400).json({ message: "Cannot get private chat with yourself" });
      }
      
      const privateChat = await storage.getPrivateChat(currentUserId, otherUserId);
      
      if (!privateChat) {
        return res.status(404).json({ message: "Private chat not found" });
      }
      
      res.json(privateChat);
    } catch (error) {
      console.error("Error fetching private chat:", error);
      res.status(500).json({ message: "Failed to fetch private chat" });
    }
  });

  // Chat routes
  app.get('/api/events/:id/messages', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000;
      
      // Check if event exists
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const messages = await storage.getChatMessages(eventId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post('/api/events/:id/messages', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { message, quotedMessageId } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      if (message.length > 3000) {
        return res.status(400).json({ message: "Message too long. Maximum 3000 characters." });
      }
      
      // Check if event exists
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const messageData = insertChatMessageSchema.parse({
        eventId,
        userId,
        message: message.trim(),
        quotedMessageId: quotedMessageId || null,
      });
      
      const newMessage = await storage.createChatMessage(messageData);
      
      // Get message with user data - get the most recent message
      const messagesWithUser = await storage.getChatMessages(eventId, 1);
      const messageWithUser = messagesWithUser[0]; // Get the first (most recent) message
      
      // Debugging removed - system working correctly
      
      // Broadcast new message to all connected clients in this event room
      if (eventConnections.has(eventId) && eventConnections.get(eventId)!.size > 0) {
        const connections = eventConnections.get(eventId)!;
        if (messageWithUser) {
          const broadcastMessage = {
            type: 'newMessage',
            eventId,
            message: messageWithUser
          };
          
          connections.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(broadcastMessage));
            }
          });
        }
      }
      
      // Broadcast notification to all users subscribed to notifications
      const eventData = await storage.getEvent(eventId);
      const senderUser = await storage.getUser(userId);
      
      // Get all user IDs who should receive notifications for this event
      const userEventIds = await storage.getUserEventIds(userId);
      
      // Broadcast to notification subscribers (excluding the sender to avoid self-notifications)
      notificationSubscribers.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          const subscriberUserId = (client as any).userId;
          
          // Send notification only to OTHER users who are part of this event (not the sender)
          if (subscriberUserId && subscriberUserId !== userId && userEventIds.includes(eventId)) {
            client.send(JSON.stringify({
              type: 'new_message_notification',
              eventId,
              eventTitle: eventData?.title,
              senderName: senderUser ? `${senderUser.firstName} ${senderUser.lastName}` : 'Someone',
              message: message.trim(),
              senderId: userId
            }));
          }
        }
      });
      
      res.status(201).json(messageWithUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      console.error("Error creating chat message:", error);
      res.status(500).json({ message: "Failed to create chat message" });
    }
  });

  app.delete('/api/events/:eventId/messages/:messageId', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.claims.sub;
      
      // Check if user has access to this event and owns the message
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      await storage.deleteChatMessage(messageId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting chat message:", error);
      res.status(500).json({ message: "Failed to delete chat message" });
    }
  });

  // Favorite message routes
  app.get('/api/events/:id/favorites', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if event exists and user has access
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const favoriteMessages = await storage.getFavoriteMessages(eventId, userId);
      res.json(favoriteMessages);
    } catch (error) {
      console.error("Error fetching favorite messages:", error);
      res.status(500).json({ message: "Failed to fetch favorite messages" });
    }
  });

  app.post('/api/events/:eventId/messages/:messageId/favorite', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.claims.sub;
      
      // Check if event exists and user has access
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if message exists
      const messages = await storage.getChatMessages(eventId, 1000);
      const messageExists = messages.some(msg => msg.id === messageId);
      if (!messageExists) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Check if already favorited
      const isAlreadyFavorited = await storage.checkMessageFavorite(userId, messageId);
      if (isAlreadyFavorited) {
        return res.status(400).json({ message: "Message already favorited" });
      }
      
      await storage.addFavoriteMessage(userId, messageId);
      res.status(201).json({ message: "Message favorited successfully" });
    } catch (error) {
      console.error("Error favoriting message:", error);
      res.status(500).json({ message: "Failed to favorite message" });
    }
  });

  app.delete('/api/events/:eventId/messages/:messageId/favorite', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const messageId = parseInt(req.params.messageId);
      const userId = req.user.claims.sub;
      
      // Check if event exists and user has access
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      await storage.removeFavoriteMessage(userId, messageId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing favorite message:", error);
      res.status(500).json({ message: "Failed to remove favorite message" });
    }
  });

  // Saved events routes
  app.get('/api/users/:userId/saved-events', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestedUserId = req.params.userId;
      
      // Users can only access their own saved events
      if (userId !== requestedUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const savedEvents = await storage.getSavedEvents(userId);
      res.json(savedEvents);
    } catch (error) {
      console.error("Error fetching saved events:", error);
      res.status(500).json({ message: "Failed to fetch saved events" });
    }
  });

  app.get('/api/saved-events', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const savedEvents = await storage.getSavedEvents(userId);
      res.json(savedEvents);
    } catch (error) {
      console.error("Error fetching saved events:", error);
      res.status(500).json({ message: "Failed to fetch saved events" });
    }
  });

  app.post('/api/events/:eventId/save', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user.claims.sub;
      
      // Check if event exists
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if already saved
      const isAlreadySaved = await storage.checkEventSaved(userId, eventId);
      if (isAlreadySaved) {
        return res.status(400).json({ message: "Event already saved" });
      }
      
      await storage.addSavedEvent(userId, eventId);
      res.status(201).json({ message: "Event saved successfully" });
    } catch (error) {
      console.error("Error saving event:", error);
      res.status(500).json({ message: "Failed to save event" });
    }
  });

  app.delete('/api/events/:eventId/save', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user.claims.sub;
      
      // Check if event exists
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      await storage.removeSavedEvent(userId, eventId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing saved event:", error);
      res.status(500).json({ message: "Failed to remove saved event" });
    }
  });

  app.get('/api/events/:eventId/saved-status', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user.claims.sub;
      
      // Check if event exists
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const isSaved = await storage.checkEventSaved(userId, eventId);
      res.json({ isSaved });
    } catch (error) {
      console.error("Error checking saved status:", error);
      res.status(500).json({ message: "Failed to check saved status" });
    }
  });

  // Notification endpoints
  app.get('/api/notifications/unread', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadCounts = await storage.getUnreadCounts(userId);
      res.json(unreadCounts);
    } catch (error) {
      console.error("Error fetching unread counts:", error);
      res.status(500).json({ message: "Failed to fetch unread counts" });
    }
  });

  app.post('/api/events/:id/mark-read', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if event exists
      const event = await storage.getEvent(eventId, userId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const userRsvp = await storage.getUserRsvp(eventId, userId);
      const isOrganizer = event.organizerId === userId;
      
      if (!isOrganizer && !userRsvp) {
        return res.status(403).json({ message: "Not authorized to mark this event as read" });
      }
      
      await storage.markEventAsRead(eventId, userId);
      res.status(200).json({ message: "Event marked as read" });
    } catch (error) {
      console.error("Error marking event as read:", error);
      res.status(500).json({ message: "Failed to mark event as read" });
    }
  });

  // Avatar generation and update routes
  app.post('/api/generate-avatar', requireAuth, async (req: any, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Use a constant reference avatar style for consistency
      const referenceAvatarUrl = "https://api.dicebear.com/7.x/adventurer/svg?seed=anime-reference&size=512";
      
      // Use OpenAI DALL-E to generate anime-style avatar based on description with style reference
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Create an anime-style avatar portrait based on this description: "${prompt}". 

                CRITICAL REQUIREMENTS:
                - BACKGROUND MUST BE COMPLETELY SOLID WHITE (#FFFFFF) with no patterns, textures, gradients, or decorative elements
                - Simple, clean cartoon anime style with flat colors
                - Minimalist design with no complex shading or lighting effects
                - Bold, clean line art without heavy details
                - Headshot portrait format (shoulders up)
                - Professional mobile app avatar appearance
                - No background objects, scenery, or decorative elements whatsoever
                
                STYLE: Clean, geometric, simplified anime features similar to mobile app avatars. The character should have clean edges against a pure white background.
                
                FORBIDDEN: Any background elements, patterns, textures, gradients, scenery, objects, or decorative elements. Keep it extremely simple and clean.`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "b64_json",
      });

      // Get base64 data directly from OpenAI (faster than downloading)
      const base64Data = imageResponse.data?.[0]?.b64_json;
      if (!base64Data) {
        throw new Error("No base64 data received from OpenAI");
      }
      
      console.log("Received base64 data from OpenAI, size:", base64Data.length);
      
      // Convert base64 to buffer for compression
      const sharp = (await import('sharp')).default;
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      // Fast compression with optimized settings
      const compressedBuffer = await sharp(imageBuffer)
        .resize(256, 256, { fit: 'cover' })
        .png({ quality: 70, compressionLevel: 6, palette: true })
        .toBuffer();
      
      const base64Image = `data:image/png;base64,${compressedBuffer.toString('base64')}`;
      
      console.log("Original image size:", imageBuffer.length);
      console.log("Compressed image size:", compressedBuffer.length);
      console.log("Base64 size:", base64Image.length);
      
      res.json({ url: base64Image });
    } catch (error) {
      console.error("Error generating avatar:", error);
      res.status(500).json({ message: "Failed to generate avatar" });
    }
  });

  app.post('/api/update-avatar', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { customAvatarUrl } = req.body;
      
      if (!customAvatarUrl || typeof customAvatarUrl !== 'string') {
        return res.status(400).json({ message: "Custom avatar data is required" });
      }

      // Validate base64 data format
      if (!customAvatarUrl.startsWith('data:image/')) {
        return res.status(400).json({ message: "Invalid avatar data format" });
      }

      // Update user's custom avatar in database with base64 data
      await db.update(users)
        .set({ customAvatarUrl })
        .where(eq(users.id, userId));
      
      console.log("Avatar updated successfully for user:", userId);
      res.json({ message: "Avatar updated successfully" });
    } catch (error) {
      console.error("Error updating avatar:", error);
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  // AI Customer Service endpoint
  app.post('/api/ai/customer-service', requireAuth, async (req: any, res) => {
    try {
      const { message, eventId, eventData, includeVoice } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }
      
      if (!eventId || !eventData) {
        return res.status(400).json({ message: "Event ID and event data are required" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Create a comprehensive prompt with event information
      const eventInfo = `
Event Details:
- Title: ${eventData.title}
- Description: ${eventData.description}
- Date: ${eventData.date}
- Time: ${eventData.time}
- Location: ${eventData.location}
- Category: ${eventData.category}
- Subcategory: ${eventData.subCategory}
- Price: ${eventData.isFree ? 'Free' : `$${eventData.price}`}
- Organizer: ${eventData.organizer?.firstName || ''} ${eventData.organizer?.lastName || 'Anonymous'}
- RSVP Count: ${eventData.rsvpCount} people attending
- Event Image: ${eventData.eventImageUrl ? 'Available' : 'Not provided'}
`;

      const systemPrompt = `You are an AI assistant for EventConnect, helping users with questions about a specific event. 

You have access to the following event information:
${eventInfo}

Your role is to:
1. Answer questions about this specific event based on the provided information
2. Be helpful, friendly, and informative
3. If asked about information not provided, politely say you don't have that specific detail
4. Provide helpful suggestions related to the event
5. Keep responses concise but informative (max 100 words for voice responses)
6. Maintain a conversational, enthusiastic tone about the event

User's question: ${message}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: includeVoice ? 200 : 500, // Shorter responses for voice
        temperature: 0.7,
      });

      const aiResponse = response.choices[0].message.content?.trim();
      
      if (!aiResponse) {
        throw new Error("Empty response from OpenAI");
      }

      let audioContent = null;

      // Generate TTS audio if voice is requested and Inworld API key is available
      if (includeVoice && process.env.INWORLD_API_KEY) {
        try {
          const fetch = (await import('node-fetch')).default;
          
          console.log("Generating TTS audio with Inworld API...");
          
          const ttsResponse = await fetch('https://api.inworld.ai/tts/v1/voice', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${process.env.INWORLD_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: aiResponse,
              voiceId: "Ashley",
              modelId: "inworld-tts-1"
            })
          });

          if (ttsResponse.ok) {
            const ttsResult = await ttsResponse.json() as { audioContent?: string };
            audioContent = ttsResult.audioContent;
            console.log("Successfully generated TTS audio for customer service response");
          } else {
            const errorText = await ttsResponse.text();
            console.error("TTS generation failed:", ttsResponse.status, errorText);
          }
        } catch (ttsError) {
          console.error("Error generating TTS:", ttsError);
          // Continue without audio if TTS fails
        }
      } else if (includeVoice) {
        console.log("Voice requested but INWORLD_API_KEY not available");
      }

      res.json({ 
        response: aiResponse,
        audioContent: audioContent
      });
    } catch (error) {
      console.error("Error in AI customer service:", error);
      res.status(500).json({ message: "Failed to process your question. Please try again." });
    }
  });

  // Skipped events routes
  app.post('/api/events/:id/skip', requireAuth, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      await storage.addSkippedEvent(userId, eventId);
      res.status(200).json({ message: "Event skipped" });
    } catch (error) {
      console.error("Error skipping event:", error);
      res.status(500).json({ message: "Failed to skip event" });
    }
  });

  app.post('/api/events/increment-shown', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      await storage.incrementEventsShown(userId);
      res.status(200).json({ message: "Events shown counter incremented" });
    } catch (error) {
      console.error("Error incrementing events shown:", error);
      res.status(500).json({ message: "Failed to increment events shown" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time chat with optimized settings
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: {
      zlibDeflateOptions: {
        level: 1, // Fast compression
        memLevel: 8,
        strategy: 0,
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true,
      serverNoContextTakeover: true,
      serverMaxWindowBits: 10,
      concurrencyLimit: 10,
      threshold: 1024, // Only compress messages larger than 1KB
    },
    maxPayload: 10 * 1024 * 1024 // 10MB max message size
  });
  
  // Store WebSocket connections by event ID with enhanced metadata
  const eventConnections = new Map<number, Set<WebSocket>>();
  
  // Store notification subscribers (users listening for all their events)
  const notificationSubscribers = new Set<WebSocket>();
  
  // Message buffer for temporarily disconnected clients
  const messageBuffer = new Map<string, Array<{message: any, timestamp: number}>>();
  const BUFFER_TIMEOUT = 30000; // Keep messages for 30 seconds
  
  // Heartbeat mechanism to keep connections alive
  const HEARTBEAT_INTERVAL = 15000; // 15 seconds
  const PONG_TIMEOUT = 5000; // 5 seconds to respond to ping
  
  // Track connection health
  const connectionHealth = new WeakMap<WebSocket, {
    isAlive: boolean;
    lastActivity: number;
    userId?: string;
    clientId?: string;
  }>();
  
  // Heartbeat function
  function heartbeat(this: WebSocket) {
    const health = connectionHealth.get(this);
    if (health) {
      health.isAlive = true;
      health.lastActivity = Date.now();
    }
  }
  
  // Start heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const health = connectionHealth.get(ws);
      if (health) {
        if (!health.isAlive) {
          // Connection is dead, terminate it
          console.log('Terminating dead WebSocket connection');
          ws.terminate();
          return;
        }
        
        // Mark as not alive and send ping
        health.isAlive = false;
        ws.ping();
      }
    });
  }, HEARTBEAT_INTERVAL);
  
  // Clean up old buffered messages periodically
  setInterval(() => {
    const now = Date.now();
    Array.from(messageBuffer.entries()).forEach(([clientId, messages]) => {
      const filtered = messages.filter((m: {message: any, timestamp: number}) => now - m.timestamp < BUFFER_TIMEOUT);
      if (filtered.length === 0) {
        messageBuffer.delete(clientId);
      } else {
        messageBuffer.set(clientId, filtered);
      }
    });
  }, 10000);
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');
    
    // Initialize connection health tracking
    connectionHealth.set(ws, {
      isAlive: true,
      lastActivity: Date.now()
    });
    
    // Set up ping/pong handlers
    ws.on('pong', heartbeat);
    
    // Send immediate ping to verify connection
    ws.ping();
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'join') {
          const { eventId, userId, clientId } = message;
          
          // Update connection health with user info
          const health = connectionHealth.get(ws);
          if (health) {
            health.userId = userId;
            health.clientId = clientId || `${userId}_${Date.now()}`;
          }
          
          // Quick verify event exists (non-blocking with cache)
          const cachedEvent = eventCache.get(eventId.toString());
          if (cachedEvent === null) {
            // We know for sure the event doesn't exist
            ws.send(JSON.stringify({ type: 'error', message: 'Event not found' }));
            return;
          } else if (!cachedEvent) {
            // Not in cache, fetch asynchronously
            storage.getEvent(eventId, userId).then(event => {
              eventCache.set(eventId.toString(), event || null);
              if (!event) {
                ws.send(JSON.stringify({ type: 'error', message: 'Event not found' }));
                return;
              }
            }).catch(error => {
              console.error('Error verifying event:', error);
            });
          }
          
          // Add connection to event room immediately
          if (!eventConnections.has(eventId)) {
            eventConnections.set(eventId, new Set());
          }
          eventConnections.get(eventId)!.add(ws);
          
          // Store event ID on WebSocket for cleanup
          (ws as any).eventId = eventId;
          (ws as any).userId = userId;
          (ws as any).clientId = clientId || `${userId}_${Date.now()}`;
          
          // Send joined confirmation immediately
          ws.send(JSON.stringify({ type: 'joined', eventId }));
          
          // Check and send any buffered messages for this client
          const bufferedKey = `${userId}_${eventId}`;
          if (messageBuffer.has(bufferedKey)) {
            const messages = messageBuffer.get(bufferedKey)!;
            console.log(`Sending ${messages.length} buffered messages to reconnected client`);
            messages.forEach(({ message }) => {
              ws.send(JSON.stringify(message));
            });
            messageBuffer.delete(bufferedKey);
          }
        } else if (message.type === 'subscribe_notifications') {
          const { userId } = message;
          
          // Add to notification subscribers
          notificationSubscribers.add(ws);
          
          // Store user ID on the WebSocket for filtering
          (ws as any).userId = userId;
          
          ws.send(JSON.stringify({ type: 'subscribed_notifications', userId }));
        } else if (message.type === 'ackRead') {
          const { eventId, userId, timestamp } = message;
          
          try {
            // Mark all messages before this timestamp as read for this user/event
            await storage.markMessagesAsReadBeforeTime(eventId, userId, timestamp);
            console.log(`Acknowledged read for event ${eventId}, user ${userId} before ${timestamp}`);
            // No response needed - just update database
          } catch (error) {
            console.error('Failed to acknowledge read via WebSocket:', error);
          }
        }
        
        if (message.type === 'message') {
          const { eventId, userId, content } = message;
          
          // Verify event exists
          const event = await storage.getEvent(eventId, userId);
          if (!event) {
            ws.send(JSON.stringify({ type: 'error', message: 'Event not found' }));
            return;
          }
          
          // Save message to database asynchronously for better performance
          const messageData = insertChatMessageSchema.parse({
            eventId,
            userId,
            message: content.trim(),
          });
          
          // Create message and get with user data in parallel
          const [newMessage, messagesWithUser] = await Promise.all([
            storage.createChatMessage(messageData),
            storage.getChatMessages(eventId, 1)
          ]);
          const messageWithUser = messagesWithUser[0]; // Get the first (most recent) message
          
          console.log('Created message:', newMessage);
          console.log('Retrieved message with user:', messageWithUser);
          console.log('Event connections for', eventId, ':', eventConnections.get(eventId)?.size || 0);
          
          // Broadcast to all connected clients in this event
          const connections = eventConnections.get(eventId);
          if (connections && connections.size > 0) {
            if (messageWithUser) {
              const broadcastData = JSON.stringify({
                type: 'newMessage',
                eventId: eventId,
                message: messageWithUser
              });
              
              console.log(`Broadcasting message to ${connections.size} clients in event ${eventId}:`, messageWithUser);
              connections.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                  // Send immediately without logging for performance
                  client.send(broadcastData);
                } else {
                  // Buffer message for disconnected clients
                  const clientUserId = (client as any).userId;
                  const clientEventId = (client as any).eventId;
                  if (clientUserId && clientEventId) {
                    const bufferedKey = `${clientUserId}_${clientEventId}`;
                    if (!messageBuffer.has(bufferedKey)) {
                      messageBuffer.set(bufferedKey, []);
                    }
                    messageBuffer.get(bufferedKey)!.push({
                      message: {
                        type: 'newMessage',
                        eventId: eventId,
                        message: messageWithUser
                      },
                      timestamp: Date.now()
                    });
                    console.log(`Buffered message for disconnected client ${clientUserId}`);
                  }
                }
              });
            } else {
              console.error('messageWithUser is null after retrieval');
            }
          } else {
            console.error('No connections found for event:', eventId, connections?.size || 0);
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      // Clean up connection from event rooms
      const eventId = (ws as any).eventId;
      const userId = (ws as any).userId;
      
      console.log(`WebSocket closed for user ${userId} in event ${eventId}`);
      
      // Remove from notification subscribers
      notificationSubscribers.delete(ws);
      if (eventId && eventConnections.has(eventId)) {
        eventConnections.get(eventId)!.delete(ws);
        if (eventConnections.get(eventId)!.size === 0) {
          eventConnections.delete(eventId);
        }
      }
      
      // Clean up connection health tracking
      connectionHealth.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Clean up on server shutdown
  process.on('SIGTERM', () => {
    clearInterval(heartbeatInterval);
    wss.close();
  });
  
  return httpServer;
}
