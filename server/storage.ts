import {
  users,
  events,
  eventRsvps,
  chatMessages,
  messageReads,
  messageFavorites,
  savedEvents,
  friendships,
  type User,
  type UpsertUser,
  type Event,
  type EventWithOrganizer,
  type InsertEvent,
  type EventRsvp,
  type InsertRsvp,
  type ChatMessage,
  type ChatMessageWithUser,
  type InsertChatMessage,
  type MessageRead,
  type InsertMessageRead,
  type Friendship,
  type InsertFriendship,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, ne, sql, desc, asc, gte, lte, between, gt, inArray } from "drizzle-orm";
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Interface for storage operations
export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Event operations
  getEvents(userId?: string, category?: string, timeFilter?: string, limit?: number, offset?: number, excludePastEvents?: boolean, timezoneOffset?: number, excludeRsvpedEvents?: boolean): Promise<{ events: EventWithOrganizer[], total: number }>;
  getEventsByDateRange(startDate: string, endDate: string, category?: string, timeFilter?: string, timePeriod?: string, limit?: number, offset?: number, timezoneOffset?: number): Promise<EventWithOrganizer[]>;
  getEventCountByDateRange(startDate: string, endDate: string, category?: string, timeFilter?: string, timePeriod?: string, timezoneOffset?: number): Promise<number>;
  // Optimized method that gets events and count in single query
  getEventsByDateRangeWithCount(startDate: string, endDate: string, category?: string, timeFilter?: string, timePeriod?: string, limit?: number, offset?: number, timezoneOffset?: number): Promise<{ events: EventWithOrganizer[], total: number }>;
  // Optimized slim projection for list views
  getEventsByDateRangeSlim(startDate: string, endDate: string, category?: string, timeFilter?: string, timePeriod?: string, limit?: number, offset?: number, timezoneOffset?: number): Promise<{ events: any[], total: number }>;
  getEvent(id: number, userId?: string): Promise<EventWithOrganizer | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  createExternalEvent(event: { title: string; description: string; category: string; date: string; time: string; location: string; organizerEmail?: string; source?: string; sourceUrl?: string; latitude?: string; longitude?: string; price?: string; isFree?: boolean; eventImageUrl?: string; [key: string]: any }): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  getUserEvents(userId: string, type: 'organized' | 'attending', pastOnly?: boolean): Promise<EventWithOrganizer[]>;
  
  // RSVP operations
  createRsvp(rsvp: InsertRsvp): Promise<EventRsvp>;
  updateRsvp(eventId: number, userId: string, status: string): Promise<EventRsvp>;
  deleteRsvp(eventId: number, userId: string): Promise<void>;
  getUserRsvp(eventId: number, userId: string): Promise<EventRsvp | undefined>;
  leaveEventChat(eventId: number, userId: string): Promise<void>;
  
  // Chat operations
  getChatMessages(eventId: number, limit?: number): Promise<ChatMessageWithUser[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  deleteChatMessage(messageId: number, userId: string): Promise<void>;
  
  // Notification operations
  getUnreadCounts(userId: string): Promise<{totalUnread: number, unreadByEvent: Array<{eventId: number, eventTitle: string, unreadCount: number}>}>;
  markEventAsRead(eventId: number, userId: string): Promise<void>;
  markMessagesAsReadBeforeTime(eventId: number, userId: string, timestamp: string): Promise<void>;
  getUserEventIds(userId: string): Promise<number[]>;
  
  // Skipped events operations
  addSkippedEvent(userId: string, eventId: number): Promise<void>;
  incrementEventsShown(userId: string): Promise<void>;
  resetSkippedEvents(userId: string): Promise<void>;
  
  // Attendee operations
  getEventAttendees(eventId: number): Promise<User[]>;
  
  // Favorite message operations
  getFavoriteMessages(eventId: number, userId: string): Promise<ChatMessageWithUser[]>;
  addFavoriteMessage(userId: string, messageId: number): Promise<void>;
  removeFavoriteMessage(userId: string, messageId: number): Promise<void>;
  checkMessageFavorite(userId: string, messageId: number): Promise<boolean>;
  
  // Saved event operations
  getSavedEvents(userId: string): Promise<EventWithOrganizer[]>;
  addSavedEvent(userId: string, eventId: number): Promise<void>;
  removeSavedEvent(userId: string, eventId: number): Promise<void>;
  checkEventSaved(userId: string, eventId: number): Promise<boolean>;
  
  // Private chat operations
  createPrivateChat(user1Id: string, user2Id: string): Promise<Event>;
  getPrivateChat(user1Id: string, user2Id: string): Promise<EventWithOrganizer | undefined>;
  getUserPrivateChats(userId: string): Promise<EventWithOrganizer[]>;
  
  // Friend operations
  sendFriendRequest(userId: string, friendId: string): Promise<Friendship>;
  acceptFriendRequest(userId: string, friendId: string): Promise<Friendship>;
  rejectFriendRequest(userId: string, friendId: string): Promise<Friendship>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  getFriends(userId: string): Promise<User[]>;
  getPendingFriendRequests(userId: string): Promise<Array<Friendship & { user: User }>>;
  getSentFriendRequests(userId: string): Promise<Array<Friendship & { friend: User }>>;
  checkFriendshipStatus(userId: string, friendId: string): Promise<string | null>;
  
  // Helper to get user's RSVP'd event IDs
  getUserRsvpEventIds(userId: string): Promise<number[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        animeAvatarSeed: userData.animeAvatarSeed || `seed_${userData.id}`,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Helper function to parse time filter and get date/time conditions
  private getTimeFilterConditions(timeFilter: string, timezoneOffset: number = 0) {
    if (!timeFilter) return undefined;
    
    // Parse the time filter format: "today_morning", "day1_afternoon", etc.
    const [dayPart, timePart] = timeFilter.split('_');
    
    // Calculate the target date using user's local timezone
    let dayOffset = 0;
    if (dayPart === 'today') dayOffset = 0;
    else if (dayPart === 'tomorrow') dayOffset = 1;
    else if (dayPart === 'day1') dayOffset = 1;
    else if (dayPart === 'day2') dayOffset = 2;
    else if (dayPart.startsWith('day')) dayOffset = parseInt(dayPart.substring(3));
    
    // Calculate date in user's timezone
    // timezoneOffset is in minutes, positive for timezones behind UTC
    const now = new Date();
    const userNow = new Date(now.getTime() - (timezoneOffset * 60 * 1000));
    const targetDate = new Date(userNow.getFullYear(), userNow.getMonth(), userNow.getDate() + dayOffset);
    const dateString = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    

    
    // Define time ranges based on time period - matching client expectations
    let startTime: string, endTime: string;
    switch (timePart) {
      case 'morning':
        startTime = '06:00:00';  // 6:00am to 11:59am
        endTime = '11:59:59';
        break;
      case 'afternoon':
        startTime = '12:00:00';  // 12:00pm to 5:59pm
        endTime = '17:59:59';
        break;
      case 'evening':
      case 'night':  // Support both 'evening' and 'night' from client
        startTime = '18:00:00';  // 6:00pm to 11:59pm
        endTime = '23:59:59';
        break;
      default:
        return undefined;
    }
    
    return {
      date: dateString,
      startTime,
      endTime
    };
  }

  // Helper function to get WHERE conditions for time filtering
  private getTimeFilterWhere(timeFilter: string, timezoneOffset: number = 0) {
    const conditions = this.getTimeFilterConditions(timeFilter, timezoneOffset);
    if (!conditions) return [];
    
    return [
      eq(events.date, conditions.date),
      gte(events.time, conditions.startTime),
      lte(events.time, conditions.endTime)
    ];
  }

  // Helper function to get WHERE conditions for time period filtering (AM/PM/Night)
  private getTimePeriodWhere(timePeriod: string) {
    let startTime: string, endTime: string;
    
    switch (timePeriod.toUpperCase()) {
      case 'AM':
        startTime = '06:00:00';  // 6:00am to 11:59am
        endTime = '11:59:59';
        break;
      case 'PM':
        startTime = '12:00:00';  // 12:00pm to 5:59pm
        endTime = '17:59:59';
        break;
      case 'NIGHT':
        startTime = '18:00:00';  // 6:00pm to 11:59pm
        endTime = '23:59:59';
        break;
      default:
        return [];
    }
    
    return [
      gte(events.time, startTime),
      lte(events.time, endTime)
    ];
  }

  // Event operations
  async getEvents(userId?: string, category?: string, timeFilter?: string, limit = 20, offset = 0, excludePastEvents = false, timezoneOffset = 0, excludeRsvpedEvents = false): Promise<{ events: EventWithOrganizer[], total: number }> {
    // Get user's skipped events and RSVP'd events if userId is provided
    let userSkippedEvents: number[] = [];
    let userRsvpedEvents: number[] = [];
    if (userId) {
      const [user] = await db.select({ 
        skippedEvents: users.skippedEvents,
        eventsShownSinceSkip: users.eventsShownSinceSkip 
      }).from(users).where(eq(users.id, userId));
      userSkippedEvents = user?.skippedEvents || [];
      console.log(`User ${userId} skipped events:`, userSkippedEvents);
      
      // Get RSVP'd events if we need to exclude them
      if (excludeRsvpedEvents) {
        userRsvpedEvents = await this.getUserRsvpEventIds(userId);
        console.log(`User ${userId} RSVP'd events to exclude:`, userRsvpedEvents);
      }
    }

    // Build WHERE conditions
    const whereConditions = [
      eq(events.isActive, true),
      // Always exclude private chats from public event listings
      or(
        eq(events.isPrivateChat, false),
        sql`${events.isPrivateChat} IS NULL`
      ),
      category ? eq(events.category, category) : undefined,
      ...(timeFilter ? this.getTimeFilterWhere(timeFilter, timezoneOffset) : []),
    ].filter(Boolean);

    // Add past events filtering if requested
    if (excludePastEvents) {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
      
      // Filter out past events - event must be today with future time or future date
      whereConditions.push(sql`(${events.date} > ${currentDate} OR (${events.date} = ${currentDate} AND ${events.time} > ${currentTime}))`);
    }

    // Add skipped events exclusion if there are any
    if (userSkippedEvents.length > 0) {
      console.log(`Filtering out skipped events for user ${userId}:`, userSkippedEvents);
      whereConditions.push(sql`${events.id} NOT IN (${sql.raw(userSkippedEvents.map(id => `${id}`).join(', '))})`);
    } else {
      console.log(`No skipped events to filter for user ${userId}`);
    }
    
    // Add RSVP'd events exclusion if requested
    if (excludeRsvpedEvents && userRsvpedEvents.length > 0) {
      console.log(`Filtering out RSVP'd events for user ${userId}:`, userRsvpedEvents);
      whereConditions.push(sql`${events.id} NOT IN (${sql.raw(userRsvpedEvents.map(id => `${id}`).join(', '))})`);
    }

    // Single query to get both events and total count using window functions
    const results = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        category: events.category,
        subCategory: events.subCategory,
        date: events.date,
        time: events.time,
        timezone: events.timezone,
        utcDateTime: events.utcDateTime,
        location: events.location,
        latitude: events.latitude,
        longitude: events.longitude,
        price: events.price,
        isFree: events.isFree,
        eventImageUrl: events.eventImageUrl,
        organizerId: events.organizerId,
        maxAttendees: events.maxAttendees,
        capacity: events.capacity,
        parkingInfo: events.parkingInfo,
        meetingPoint: events.meetingPoint,
        duration: events.duration,
        whatToBring: events.whatToBring,
        specialNotes: events.specialNotes,
        requirements: events.requirements,
        contactInfo: events.contactInfo,
        cancellationPolicy: events.cancellationPolicy,
        isActive: events.isActive,
        isPrivateChat: events.isPrivateChat,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        organizer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        rsvpCount: sql<number>`COUNT(${eventRsvps.id})::int`,
        userRsvpStatus: userId ? sql<string>`MAX(CASE WHEN ${eventRsvps.userId} = ${userId} THEN ${eventRsvps.status} END)` : sql<string>`NULL`,
        // Total count using window function
        totalCount: sql<number>`CAST(COUNT(*) OVER() AS INTEGER)`
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .leftJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
      .where(and(...whereConditions))
      .groupBy(events.id, users.id)
      .orderBy(asc(events.date), asc(events.time))
      .limit(limit)
      .offset(offset);

    if (results.length === 0) {
      return { events: [], total: 0 };
    }

    // Extract total from first result
    const total = results[0].totalCount || 0;

    // Map results removing totalCount from each item and formatting
    const eventsList = results.map(({ totalCount, ...result }) => ({
      ...result,
      organizer: result.organizer!,
      rsvpCount: result.rsvpCount || 0,
      userRsvpStatus: result.userRsvpStatus || undefined,
      isPrivateChat: result.isPrivateChat ? true : undefined,
    }) as any);

    return { events: eventsList, total };
  }

  async getEventsByDateRange(startDate: string, endDate: string, category?: string, timeFilter?: string, timePeriod?: string, limit = 100, offset = 0, timezoneOffset = 0): Promise<EventWithOrganizer[]> {
    // Build WHERE conditions for date range filtering
    const whereConditions = [
      eq(events.isActive, true),
      // Always exclude private chats from public event listings
      or(
        eq(events.isPrivateChat, false),
        sql`${events.isPrivateChat} IS NULL`
      ),
      // Date range filtering - events between startDate and endDate (inclusive)
      gte(events.date, startDate),
      lte(events.date, endDate),
      category ? eq(events.category, category) : undefined,
      ...(timeFilter ? this.getTimeFilterWhere(timeFilter, timezoneOffset) : []),
      ...(timePeriod ? this.getTimePeriodWhere(timePeriod) : []),
    ].filter(Boolean);

    const query = db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        category: events.category,
        subCategory: events.subCategory,
        date: events.date,
        time: events.time,
        timezone: events.timezone,
        utcDateTime: events.utcDateTime,
        location: events.location,
        latitude: events.latitude,
        longitude: events.longitude,
        price: events.price,
        isFree: events.isFree,
        eventImageUrl: events.eventImageUrl,
        organizerId: events.organizerId,
        maxAttendees: events.maxAttendees,
        capacity: events.capacity,
        parkingInfo: events.parkingInfo,
        meetingPoint: events.meetingPoint,
        duration: events.duration,
        whatToBring: events.whatToBring,
        specialNotes: events.specialNotes,
        requirements: events.requirements,
        contactInfo: events.contactInfo,
        cancellationPolicy: events.cancellationPolicy,
        isActive: events.isActive,
        isPrivateChat: events.isPrivateChat,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        organizer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        rsvpCount: sql<number>`COUNT(${eventRsvps.id})::int`,
        userRsvpStatus: sql<string>`NULL`,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .leftJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
      .where(and(...whereConditions))
      .groupBy(events.id, users.id)
      .orderBy(asc(events.date), asc(events.time), asc(events.id))
      .limit(limit)
      .offset(offset);

    const results = await query;
    return results.map(result => ({
      ...result,
      organizer: result.organizer!,
      rsvpCount: result.rsvpCount || 0,
      userRsvpStatus: result.userRsvpStatus || undefined,
      isPrivateChat: result.isPrivateChat ? true : undefined,
    }) as any);
  }

  async getEventCountByDateRange(startDate: string, endDate: string, category?: string, timeFilter?: string, timePeriod?: string, timezoneOffset = 0): Promise<number> {
    // Build WHERE conditions for date range filtering
    const whereConditions = [
      eq(events.isActive, true),
      // Always exclude private chats from public event listings
      or(
        eq(events.isPrivateChat, false),
        sql`${events.isPrivateChat} IS NULL`
      ),
      // Date range filtering - events between startDate and endDate (inclusive)
      gte(events.date, startDate),
      lte(events.date, endDate),
      category ? eq(events.category, category) : undefined,
      ...(timeFilter ? this.getTimeFilterWhere(timeFilter, timezoneOffset) : []),
      ...(timePeriod ? this.getTimePeriodWhere(timePeriod) : []),
    ].filter(Boolean);

    const result = await db
      .select({
        count: sql<number>`CAST(COUNT(*) AS INTEGER)`,
      })
      .from(events)
      .where(and(...whereConditions));
    
    return result[0]?.count || 0;
  }

  // Optimized method that gets both events and total count in a single query using window functions
  // Optimized slim projection for list views - returns only essential fields
  async getEventsByDateRangeSlim(startDate: string, endDate: string, category?: string, timeFilter?: string, timePeriod?: string, limit = 100, offset = 0, timezoneOffset = 0): Promise<{ events: any[], total: number }> {
    // Build WHERE conditions for date range filtering
    const whereConditions = [
      eq(events.isActive, true),
      // Always exclude private chats from public event listings
      or(
        eq(events.isPrivateChat, false),
        sql`${events.isPrivateChat} IS NULL`
      ),
      // Date range filtering - events between startDate and endDate (inclusive)
      gte(events.date, startDate),
      lte(events.date, endDate),
      category ? eq(events.category, category) : undefined,
      ...(timeFilter ? this.getTimeFilterWhere(timeFilter, timezoneOffset) : []),
      ...(timePeriod ? this.getTimePeriodWhere(timePeriod) : []),
    ].filter(Boolean);

    // Single query to get both events and total count using window functions
    // Only select essential fields for list views (reduced payload size)
    const results = await db
      .select({
        // Essential event fields only
        id: events.id,
        title: events.title,
        category: events.category,
        date: events.date,
        time: events.time,
        location: events.location,
        price: events.price,
        isFree: events.isFree,
        eventImageUrl: events.eventImageUrl,
        maxAttendees: events.maxAttendees,
        // Essential organizer info only
        organizerId: events.organizerId,
        organizerName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
        organizerImage: users.profileImageUrl,
        // RSVP count - using CAST for portability
        rsvpCount: sql<number>`CAST((SELECT COUNT(*) FROM event_rsvps WHERE event_id = ${events.id} AND status IN ('attending', 'going')) AS INTEGER)`,
        // Total count using window function - using CAST for portability
        totalCount: sql<number>`CAST(COUNT(*) OVER() AS INTEGER)`
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(events.date), desc(events.time))
      .limit(limit)
      .offset(offset);

    if (results.length === 0) {
      return { events: [], total: 0 };
    }

    // Extract total from first result
    const total = results[0].totalCount || 0;

    // Map results removing totalCount from each item
    const eventList = results.map(({ totalCount, ...event }) => event);

    return { events: eventList, total };
  }

  async getEventsByDateRangeWithCount(startDate: string, endDate: string, category?: string, timeFilter?: string, timePeriod?: string, limit = 100, offset = 0, timezoneOffset = 0): Promise<{ events: EventWithOrganizer[], total: number }> {
    // Build WHERE conditions for date range filtering
    const whereConditions = [
      eq(events.isActive, true),
      // Always exclude private chats from public event listings
      or(
        eq(events.isPrivateChat, false),
        sql`${events.isPrivateChat} IS NULL`
      ),
      // Date range filtering - events between startDate and endDate (inclusive)
      gte(events.date, startDate),
      lte(events.date, endDate),
      category ? eq(events.category, category) : undefined,
      ...(timeFilter ? this.getTimeFilterWhere(timeFilter, timezoneOffset) : []),
      ...(timePeriod ? this.getTimePeriodWhere(timePeriod) : []),
    ].filter(Boolean);

    // Single query to get both events and total count using window functions
    const results = await db
      .select({
        // All event fields
        id: events.id,
        title: events.title,
        description: events.description,
        category: events.category,
        subCategory: events.subCategory,
        date: events.date,
        time: events.time,
        timezone: events.timezone,
        utcDateTime: events.utcDateTime,
        location: events.location,
        latitude: events.latitude,
        longitude: events.longitude,
        price: events.price,
        isFree: events.isFree,
        eventImageUrl: events.eventImageUrl,
        organizerId: events.organizerId,
        maxAttendees: events.maxAttendees,
        capacity: events.capacity,
        parkingInfo: events.parkingInfo,
        meetingPoint: events.meetingPoint,
        duration: events.duration,
        whatToBring: events.whatToBring,
        specialNotes: events.specialNotes,
        requirements: events.requirements,
        contactInfo: events.contactInfo,
        cancellationPolicy: events.cancellationPolicy,
        isActive: events.isActive,
        isPrivateChat: events.isPrivateChat,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        // Organizer info - include all User fields to match type
        organizer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          authProvider: users.authProvider,
          googleId: users.googleId,
          facebookId: users.facebookId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        // Count using subquery for efficiency - using CAST for portability
        rsvpCount: sql<number>`CAST((SELECT COUNT(*) FROM event_rsvps WHERE event_id = ${events.id} AND status IN ('attending', 'going')) AS INTEGER)`,
        // Total count using window function - using CAST for portability
        totalCount: sql<number>`CAST(COUNT(*) OVER() AS INTEGER)`
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(events.date), desc(events.time))
      .limit(limit)
      .offset(offset);

    if (results.length === 0) {
      return { events: [], total: 0 };
    }

    // Extract total from first result (all rows have the same totalCount value)
    const total = results[0].totalCount || 0;

    // Map results to EventWithOrganizer format
    const eventList = results.map(result => ({
      ...result,
      organizer: result.organizer!,
      rsvpCount: result.rsvpCount || 0,
      isPrivateChat: result.isPrivateChat ? true : undefined,
    })) as EventWithOrganizer[];

    return { events: eventList, total };
  }

  async getEvent(id: number, userId?: string): Promise<EventWithOrganizer | undefined> {
    const query = db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        category: events.category,
        subCategory: events.subCategory,
        date: events.date,
        time: events.time,
        timezone: events.timezone,
        utcDateTime: events.utcDateTime,
        location: events.location,
        latitude: events.latitude,
        longitude: events.longitude,
        price: events.price,
        isFree: events.isFree,
        eventImageUrl: events.eventImageUrl,
        organizerId: events.organizerId,
        maxAttendees: events.maxAttendees,
        capacity: events.capacity,
        parkingInfo: events.parkingInfo,
        meetingPoint: events.meetingPoint,
        duration: events.duration,
        whatToBring: events.whatToBring,
        specialNotes: events.specialNotes,
        requirements: events.requirements,
        contactInfo: events.contactInfo,
        cancellationPolicy: events.cancellationPolicy,
        isActive: events.isActive,
        isPrivateChat: events.isPrivateChat,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        organizer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        rsvpCount: sql<number>`COUNT(${eventRsvps.id})::int`,
        userRsvpStatus: userId ? sql<string>`MAX(CASE WHEN ${eventRsvps.userId} = ${userId} THEN ${eventRsvps.status} END)` : sql<string>`NULL`,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .leftJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
      .where(eq(events.id, id))
      .groupBy(events.id, users.id);

    const [result] = await query;
    if (!result) return undefined;

    return {
      ...result,
      organizer: result.organizer!,
      rsvpCount: result.rsvpCount || 0,
      userRsvpStatus: result.userRsvpStatus || undefined,
      isPrivateChat: result.isPrivateChat ? true : undefined,
    } as any;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    // Calculate UTC datetime if date, time, and timezone are provided
    let utcDateTime: Date | null = null;
    if (event.date && event.time && event.timezone) {
      // Combine date and time into a datetime string
      const localDateTimeStr = `${event.date}T${event.time}`;
      // Convert local time to UTC using the event's timezone
      utcDateTime = fromZonedTime(localDateTimeStr, event.timezone);
    }

    const [newEvent] = await db
      .insert(events)
      .values({
        ...event,
        utcDateTime: utcDateTime || undefined,
      })
      .returning();
    return newEvent;
  }

  async createExternalEvent(eventData: { title: string; description: string; category: string; date: string; time: string; location: string; organizerEmail?: string; source?: string; sourceUrl?: string; latitude?: string; longitude?: string; price?: string; isFree?: boolean; eventImageUrl?: string; [key: string]: any }): Promise<Event> {
    // Find or create an organizer user
    let organizerId: string;
    
    if (eventData.organizerEmail) {
      // Try to find existing user by email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, eventData.organizerEmail))
        .limit(1);
      
      if (existingUser) {
        organizerId = existingUser.id;
      } else {
        // Create a new user for the organizer
        const [newUser] = await db
          .insert(users)
          .values({
            id: `external_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            email: eventData.organizerEmail,
            firstName: eventData.organizerEmail.split('@')[0],
            lastName: 'External',
            animeAvatarSeed: `external_${Date.now()}`,
            interests: ['Events'],
            personality: ['Organized'],
            aiSignature: `Event organizer from ${eventData.source || 'external source'}`,
          })
          .returning();
        organizerId = newUser.id;
      }
    } else {
      // Create a default external organizer
      const [defaultUser] = await db
        .insert(users)
        .values({
          id: `external_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          email: `external-${Date.now()}@eventconnect.app`,
          firstName: 'External',
          lastName: 'Organizer',
          animeAvatarSeed: `external_${Date.now()}`,
          interests: ['Events'],
          personality: ['Organized'],
          aiSignature: `Event organizer from ${eventData.source || 'external source'}`,
        })
        .returning();
      organizerId = defaultUser.id;
    }

    // Create the event with the organizer
    // Default to PST if no timezone provided (since current events are in PST)
    const timezone = eventData.timezone || "America/Los_Angeles";
    
    // Calculate UTC datetime
    let utcDateTime: Date | null = null;
    if (eventData.date && eventData.time) {
      const localDateTimeStr = `${eventData.date}T${eventData.time}`;
      utcDateTime = fromZonedTime(localDateTimeStr, timezone);
    }
    
    const eventToInsert = {
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      date: eventData.date,
      time: eventData.time,
      timezone,
      utcDateTime: utcDateTime || undefined,
      location: eventData.location,
      organizerId,
      latitude: eventData.latitude,
      longitude: eventData.longitude,
      price: eventData.price || "0.00",
      isFree: eventData.isFree ?? (eventData.price === "0.00" || !eventData.price),
      eventImageUrl: eventData.eventImageUrl,
      maxAttendees: eventData.maxAttendees,
      capacity: eventData.capacity,
      parkingInfo: eventData.parkingInfo,
      meetingPoint: eventData.meetingPoint,
      duration: eventData.duration,
      whatToBring: eventData.whatToBring,
      specialNotes: eventData.specialNotes ? `${eventData.specialNotes}${eventData.source ? `\n\nSource: ${eventData.source}` : ''}${eventData.sourceUrl ? `\nURL: ${eventData.sourceUrl}` : ''}` : `${eventData.source ? `Source: ${eventData.source}` : ''}${eventData.sourceUrl ? `\nURL: ${eventData.sourceUrl}` : ''}`,
      requirements: eventData.requirements,
      contactInfo: eventData.contactInfo,
      cancellationPolicy: eventData.cancellationPolicy,
      isActive: true,
    };

    const [newEvent] = await db
      .insert(events)
      .values(eventToInsert)
      .returning();
    return newEvent;
  }

  async updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event> {
    // If date, time, or timezone changed, recalculate UTC datetime
    let utcDateTime: Date | null = null;
    if ((event.date || event.time || event.timezone)) {
      // Get the existing event first to merge values
      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, id))
        .limit(1);
      
      if (existingEvent) {
        const date = event.date || existingEvent.date;
        const time = event.time || existingEvent.time;
        const timezone = event.timezone || existingEvent.timezone || "America/Los_Angeles";
        
        if (date && time) {
          const localDateTimeStr = `${date}T${time}`;
          utcDateTime = fromZonedTime(localDateTimeStr, timezone);
        }
      }
    }

    const updateData: any = {
      ...event,
      updatedAt: new Date()
    };
    
    if (utcDateTime) {
      updateData.utcDateTime = utcDateTime;
    }

    const [updatedEvent] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<void> {
    // Delete all RSVPs for this event first (to handle foreign key constraint)
    await db.delete(eventRsvps).where(eq(eventRsvps.eventId, id));
    // Then delete the event
    await db.delete(events).where(eq(events.id, id));
  }

  async getUserEvents(userId: string, type: 'organized' | 'attending', pastOnly = false): Promise<EventWithOrganizer[]> {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
    
    if (type === 'organized') {
      // Get organized events with optional past filtering
      const query = db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          category: events.category,
          subCategory: events.subCategory,
          date: events.date,
          time: events.time,
          timezone: events.timezone,
          utcDateTime: events.utcDateTime,
          location: events.location,
          latitude: events.latitude,
          longitude: events.longitude,
          price: events.price,
          isFree: events.isFree,
          eventImageUrl: events.eventImageUrl,
          organizerId: events.organizerId,
          maxAttendees: events.maxAttendees,
          capacity: events.capacity,
          parkingInfo: events.parkingInfo,
          meetingPoint: events.meetingPoint,
          duration: events.duration,
          whatToBring: events.whatToBring,
          specialNotes: events.specialNotes,
          requirements: events.requirements,
          contactInfo: events.contactInfo,
          cancellationPolicy: events.cancellationPolicy,
          isActive: events.isActive,
          isPrivateChat: events.isPrivateChat,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          organizer: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
            customAvatarUrl: users.customAvatarUrl,
            animeAvatarSeed: users.animeAvatarSeed,
            location: users.location,
            interests: users.interests,
            personality: users.personality,
            aiSignature: users.aiSignature,
            skippedEvents: users.skippedEvents,
            eventsShownSinceSkip: users.eventsShownSinceSkip,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          rsvpCount: sql<number>`COUNT(${eventRsvps.id})::int`,
          userRsvpStatus: sql<string>`NULL`,
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .leftJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
        .where(
          and(
            eq(events.isActive, true),
            eq(events.organizerId, userId),
            // Filter based on pastOnly parameter
            pastOnly === true
              ? sql`(${events.date} < ${currentDate} OR (${events.date} = ${currentDate} AND ${events.time} < ${currentTime}))`
              : pastOnly === false
              ? sql`(${events.date} > ${currentDate} OR (${events.date} = ${currentDate} AND ${events.time} >= ${currentTime}))`
              : undefined
          )
        )
        .groupBy(events.id, users.id)
        .orderBy(asc(events.date), asc(events.time));

      const results = await query;

      return results.map(result => ({
        ...result,
        organizer: result.organizer!,
        rsvpCount: result.rsvpCount || 0,
        userRsvpStatus: result.userRsvpStatus || undefined,
        isPrivateChat: result.isPrivateChat ? true : undefined,
      }) as any);
    } else {
      // Get attending events with optional past filtering
      const query = db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          category: events.category,
          subCategory: events.subCategory,
          date: events.date,
          time: events.time,
          timezone: events.timezone,
          utcDateTime: events.utcDateTime,
          location: events.location,
          latitude: events.latitude,
          longitude: events.longitude,
          price: events.price,
          isFree: events.isFree,
          eventImageUrl: events.eventImageUrl,
          organizerId: events.organizerId,
          maxAttendees: events.maxAttendees,
          capacity: events.capacity,
          parkingInfo: events.parkingInfo,
          meetingPoint: events.meetingPoint,
          duration: events.duration,
          whatToBring: events.whatToBring,
          specialNotes: events.specialNotes,
          requirements: events.requirements,
          contactInfo: events.contactInfo,
          cancellationPolicy: events.cancellationPolicy,
          isActive: events.isActive,
          isPrivateChat: events.isPrivateChat,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          organizer: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
            customAvatarUrl: users.customAvatarUrl,
            animeAvatarSeed: users.animeAvatarSeed,
            location: users.location,
            interests: users.interests,
            personality: users.personality,
            aiSignature: users.aiSignature,
            skippedEvents: users.skippedEvents,
            eventsShownSinceSkip: users.eventsShownSinceSkip,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          },
          rsvpCount: sql<number>`COUNT(rsvp2.id)::int`,
          userRsvpStatus: sql<string>`MAX(${eventRsvps.status})`,
        })
        .from(events)
        .leftJoin(users, eq(events.organizerId, users.id))
        .leftJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
        .leftJoin(
          sql`${eventRsvps} as rsvp2`,
          sql`${events.id} = rsvp2.event_id`
        )
        .where(
          and(
            eq(events.isActive, true),
            eq(eventRsvps.userId, userId),
            ne(events.organizerId, userId), // Exclude events organized by the user
            or(
              eq(eventRsvps.status, 'attending'),
              eq(eventRsvps.status, 'going'),
              eq(eventRsvps.status, 'maybe')
            ),
            // Filter based on pastOnly parameter
            pastOnly === true
              ? sql`(${events.date} < ${currentDate} OR (${events.date} = ${currentDate} AND ${events.time} < ${currentTime}))`
              : pastOnly === false
              ? sql`(${events.date} > ${currentDate} OR (${events.date} = ${currentDate} AND ${events.time} >= ${currentTime}))`
              : undefined
          )
        )
        .groupBy(events.id, users.id, eventRsvps.status)
        .orderBy(asc(events.date), asc(events.time));

      const results = await query;
      console.log(`getUserEvents attending query results for user ${userId}:`, results.length, "events");
      console.log("Event IDs:", results.map(r => r.id));
      return results.map(result => ({
        ...result,
        organizer: result.organizer!,
        rsvpCount: result.rsvpCount || 0,
        userRsvpStatus: result.userRsvpStatus || undefined,
        isPrivateChat: result.isPrivateChat ? true : undefined,
      }) as any);
    }
  }

  // RSVP operations
  async createRsvp(rsvp: InsertRsvp): Promise<EventRsvp> {
    const [newRsvp] = await db
      .insert(eventRsvps)
      .values(rsvp)
      .returning();
    return newRsvp;
  }

  async updateRsvp(eventId: number, userId: string, status: string): Promise<EventRsvp> {
    const [updatedRsvp] = await db
      .update(eventRsvps)
      .set({ 
        status,
        hasLeftChat: false  // Reset hasLeftChat when updating RSVP to allow re-joining
      })
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.userId, userId)
        )
      )
      .returning();
    return updatedRsvp;
  }

  async deleteRsvp(eventId: number, userId: string): Promise<void> {
    await db.delete(eventRsvps).where(
      and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.userId, userId)
      )
    );
  }

  async getUserRsvp(eventId: number, userId: string): Promise<EventRsvp | undefined> {
    const [rsvp] = await db
      .select()
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.userId, userId)
        )
      );
    return rsvp;
  }

  async leaveEventChat(eventId: number, userId: string): Promise<void> {
    // Check if user has an existing RSVP entry
    const existingRsvp = await this.getUserRsvp(eventId, userId);
    
    if (existingRsvp) {
      // Update existing RSVP to mark as left chat
      await db
        .update(eventRsvps)
        .set({ hasLeftChat: true })
        .where(
          and(
            eq(eventRsvps.eventId, eventId),
            eq(eventRsvps.userId, userId)
          )
        );
      console.log(`Updated existing RSVP for user ${userId} event ${eventId} - hasLeftChat: true`);
    } else {
      // Check if user is the organizer of this event
      const event = await this.getEvent(eventId);
      if (event && event.organizerId === userId) {
        // Create new RSVP entry for organizer with hasLeftChat: true
        await db
          .insert(eventRsvps)
          .values({
            eventId,
            userId,
            status: 'organizing', // Special status for organizer leaving chat
            hasLeftChat: true,
          });
        console.log(`Created new RSVP for organizer ${userId} event ${eventId} - hasLeftChat: true`);
      } else {
        // User is neither attendee nor organizer - should not be able to leave chat
        console.log(`User ${userId} attempted to leave chat for event ${eventId} but has no RSVP and is not organizer`);
        throw new Error('User is not authorized to leave this chat');
      }
    }
  }

  async rejoinEventChat(eventId: number, userId: string): Promise<void> {
    // Check if user has an existing RSVP entry
    const existingRsvp = await this.getUserRsvp(eventId, userId);
    
    if (existingRsvp) {
      // Update existing RSVP to mark as rejoined chat
      await db
        .update(eventRsvps)
        .set({ hasLeftChat: false })
        .where(
          and(
            eq(eventRsvps.eventId, eventId),
            eq(eventRsvps.userId, userId)
          )
        );
      console.log(`Updated existing RSVP for user ${userId} event ${eventId} - hasLeftChat: false`);
    } else {
      // Check if user is the organizer of this event
      const event = await this.getEvent(eventId);
      if (event && event.organizerId === userId) {
        // Create new RSVP entry for organizer with hasLeftChat: false
        await db
          .insert(eventRsvps)
          .values({
            eventId,
            userId,
            status: 'organizing', // Special status for organizer rejoining chat
            hasLeftChat: false,
          });
        console.log(`Created new RSVP for organizer ${userId} event ${eventId} - hasLeftChat: false`);
      } else {
        // User is neither attendee nor organizer - should not be able to rejoin chat
        console.log(`User ${userId} attempted to rejoin chat for event ${eventId} but has no RSVP and is not organizer`);
        throw new Error('User is not authorized to rejoin this chat');
      }
    }
  }

  // Chat operations - optimized with pagination support
  async getChatMessages(eventId: number, limit = 1000, offset = 0): Promise<ChatMessageWithUser[]> {
    const query = db
      .select({
        id: chatMessages.id,
        eventId: chatMessages.eventId,
        userId: chatMessages.userId,
        message: chatMessages.message,
        quotedMessageId: chatMessages.quotedMessageId,
        createdAt: chatMessages.createdAt,
        updatedAt: chatMessages.updatedAt,
        user: {
          id: users.id,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          authProvider: users.authProvider,
          googleId: users.googleId,
          facebookId: users.facebookId,
        },
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.eventId, eventId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);

    const results = await query;
    
    // For messages with quotedMessageId, fetch the quoted message details
    const messagesWithQuotes = await Promise.all(
      results.map(async (result) => {
        let quotedMessage = null;
        
        if (result.quotedMessageId) {
          // Fetch the quoted message with user details
          const [quotedResult] = await db
            .select({
              id: chatMessages.id,
              eventId: chatMessages.eventId,
              userId: chatMessages.userId,
              message: chatMessages.message,
              quotedMessageId: chatMessages.quotedMessageId,
              createdAt: chatMessages.createdAt,
              updatedAt: chatMessages.updatedAt,
              user: {
                id: users.id,
                customAvatarUrl: users.customAvatarUrl,
                animeAvatarSeed: users.animeAvatarSeed,
                location: users.location,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                profileImageUrl: users.profileImageUrl,
                interests: users.interests,
                personality: users.personality,
                aiSignature: users.aiSignature,
                skippedEvents: users.skippedEvents,
                eventsShownSinceSkip: users.eventsShownSinceSkip,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
              },
            })
            .from(chatMessages)
            .leftJoin(users, eq(chatMessages.userId, users.id))
            .where(eq(chatMessages.id, result.quotedMessageId));
          
          if (quotedResult) {
            quotedMessage = {
              ...quotedResult,
              user: quotedResult.user!,
            };
          }
        }
        
        // Fetch favorites for this message
        const favoritesQuery = await db
          .select({
            user: {
              id: users.id,
              customAvatarUrl: users.customAvatarUrl,
              animeAvatarSeed: users.animeAvatarSeed,
              location: users.location,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
              profileImageUrl: users.profileImageUrl,
              interests: users.interests,
              personality: users.personality,
              aiSignature: users.aiSignature,
              skippedEvents: users.skippedEvents,
              eventsShownSinceSkip: users.eventsShownSinceSkip,
              createdAt: users.createdAt,
              updatedAt: users.updatedAt,
            },
            createdAt: messageFavorites.createdAt,
          })
          .from(messageFavorites)
          .leftJoin(users, eq(messageFavorites.userId, users.id))
          .where(eq(messageFavorites.messageId, result.id))
          .orderBy(desc(messageFavorites.createdAt));
        
        const favorites = favoritesQuery.map(fav => ({
          user: fav.user!,
          createdAt: fav.createdAt.toISOString(),
        }));
        
        return {
          ...result,
          user: result.user!,
          quotedMessage: quotedMessage || undefined,
          favorites,
          favoritesCount: favorites.length,
        };
      })
    );
    
    // Return in ascending order for proper chat display (oldest first)
    return messagesWithQuotes.reverse();
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db
      .insert(chatMessages)
      .values(message)
      .returning();
    
    // Invalidate historical cache for this chat
    const { clearHistoricalCache } = await import('./historicalMessages');
    clearHistoricalCache(message.eventId);
    
    return newMessage;
  }

  async deleteChatMessage(messageId: number, userId: string): Promise<void> {
    // Get the eventId before deleting
    const message = await db.select({ eventId: chatMessages.eventId })
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);
    
    await db.delete(chatMessages).where(
      and(
        eq(chatMessages.id, messageId),
        eq(chatMessages.userId, userId)
      )
    );
    
    // Invalidate historical cache if message was deleted
    if (message[0]) {
      const { clearHistoricalCache } = await import('./historicalMessages');
      clearHistoricalCache(message[0].eventId);
    }
  }

  // Notification operations
  async getUnreadCounts(userId: string): Promise<{totalUnread: number, unreadByEvent: Array<{eventId: number, eventTitle: string, unreadCount: number}>}> {
    // Get all events user is attending or organizing
    const userEventIds = await this.getUserEventIds(userId);
    
    // Get private chat event IDs separately
    const privateChats = await this.getUserPrivateChats(userId);
    const privateChatIds = privateChats.map(chat => chat.id);
    
    // Combine regular event IDs and private chat IDs
    const allEventIds = [...userEventIds, ...privateChatIds];
    
    if (allEventIds.length === 0) {
      return { totalUnread: 0, unreadByEvent: [] };
    }
    
    // Get unread counts for each event
    const unreadByEvent = await Promise.all(
      allEventIds.map(async (eventId) => {
        // Get user's last read timestamp for this event
        const [lastRead] = await db
          .select()
          .from(messageReads)
          .where(
            and(
              eq(messageReads.userId, userId),
              eq(messageReads.eventId, eventId)
            )
          );
        
        // Count messages after last read timestamp, excluding messages sent by this user
        const unreadCountQuery = db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.eventId, eventId),
              ne(chatMessages.userId, userId), // Exclude messages sent by this user
              lastRead 
                ? gt(chatMessages.createdAt, lastRead.lastReadAt)
                : sql`TRUE` // If no read record, all messages are unread
            )
          );
        
        const [{ count }] = await unreadCountQuery;
        
        // Get event title
        const [event] = await db
          .select({ title: events.title })
          .from(events)
          .where(eq(events.id, eventId));
        
        return {
          eventId,
          eventTitle: event?.title || 'Unknown Event',
          unreadCount: count || 0,
        };
      })
    );
    
    const totalUnread = unreadByEvent.reduce((sum, event) => sum + event.unreadCount, 0);
    
    return {
      totalUnread,
      unreadByEvent: unreadByEvent.filter(event => event.unreadCount > 0),
    };
  }

  async markEventAsRead(eventId: number, userId: string): Promise<void> {
    await db
      .insert(messageReads)
      .values({
        userId,
        eventId,
        lastReadAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [messageReads.userId, messageReads.eventId],
        set: {
          lastReadAt: new Date(),
          updatedAt: new Date(),
        },
      });
  }

  async markMessagesAsReadBeforeTime(eventId: number, userId: string, timestamp: string): Promise<void> {
    // Parse the timestamp and mark all messages before this time as read
    const readTime = new Date(timestamp);
    
    await db
      .insert(messageReads)
      .values({
        userId,
        eventId,
        lastReadAt: readTime,
      })
      .onConflictDoUpdate({
        target: [messageReads.userId, messageReads.eventId],
        set: {
          lastReadAt: readTime,
          updatedAt: new Date(),
        },
      });
  }

  async getUserEventIds(userId: string): Promise<number[]> {
    // Get events where user has RSVPed but hasn't left the chat (EXCLUDE private chats)
    const rsvpEvents = await db
      .select({ eventId: eventRsvps.eventId })
      .from(eventRsvps)
      .innerJoin(events, eq(eventRsvps.eventId, events.id))
      .where(
        and(
          eq(eventRsvps.userId, userId),
          eq(events.isPrivateChat, false), // Exclude private chats to prevent duplication
          or(
            eq(eventRsvps.hasLeftChat, false),
            sql`${eventRsvps.hasLeftChat} IS NULL`
          )
        )
      );
    
    // Get events where user is organizer AND has not left the chat (EXCLUDE private chats)
    // Check if organizer has an RSVP entry and hasn't left chat
    const organizerEvents = await db
      .select({ id: events.id })
      .from(events)
      .leftJoin(eventRsvps, and(
        eq(events.id, eventRsvps.eventId),
        eq(eventRsvps.userId, userId)
      ))
      .where(
        and(
          eq(events.organizerId, userId),
          eq(events.isPrivateChat, false), // Exclude private chats to prevent duplication
          // Include organizer events only if:
          // 1. No RSVP entry exists (hasn't left chat yet), OR
          // 2. RSVP exists and hasLeftChat is false/null
          or(
            sql`${eventRsvps.eventId} IS NULL`, // No RSVP entry
            or(
              eq(eventRsvps.hasLeftChat, false),
              sql`${eventRsvps.hasLeftChat} IS NULL`
            )
          )
        )
      );
    
    const eventIds = new Set([
      ...organizerEvents.map(e => e.id),
      ...rsvpEvents.map(e => e.eventId),
    ]);
    
    // Debug: Uncomment to see event filtering details
    // console.log(`getUserEventIds for user ${userId}:`, {
    //   rsvpEvents: rsvpEvents.map(e => e.eventId),
    //   organizerEvents: organizerEvents.map(e => e.id),
    //   finalEventIds: Array.from(eventIds)
    // });
    
    return Array.from(eventIds);
  }

  // Skipped events operations
  async addSkippedEvent(userId: string, eventId: number): Promise<void> {
    // Get current user data
    const [user] = await db.select({ 
      skippedEvents: users.skippedEvents,
      eventsShownSinceSkip: users.eventsShownSinceSkip 
    }).from(users).where(eq(users.id, userId));
    
    if (!user) return;
    
    const currentSkippedEvents = user.skippedEvents || [];
    // Only add if not already skipped to avoid duplicates
    if (!currentSkippedEvents.includes(eventId)) {
      const updatedSkippedEvents = [...currentSkippedEvents, eventId];
      
      console.log(`Adding event ${eventId} to skipped list for user ${userId}. Current: ${currentSkippedEvents}, New: ${updatedSkippedEvents}`);
      
      await db
        .update(users)
        .set({ 
          skippedEvents: updatedSkippedEvents,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }
  }

  async incrementEventsShown(userId: string): Promise<void> {
    // Get current counter
    const [user] = await db.select({ 
      eventsShownSinceSkip: users.eventsShownSinceSkip,
      skippedEvents: users.skippedEvents 
    }).from(users).where(eq(users.id, userId));
    
    if (!user) return;
    
    const newCount = (user.eventsShownSinceSkip || 0) + 1;
    
    console.log(`Incrementing events shown for user ${userId}: ${user.eventsShownSinceSkip} -> ${newCount}`);
    
    // If we've shown 20 events, reset skipped events
    if (newCount >= 20 && user.skippedEvents && user.skippedEvents.length > 0) {
      console.log(`Resetting skipped events for user ${userId} after showing ${newCount} events`);
      await db
        .update(users)
        .set({ 
          eventsShownSinceSkip: 0,
          skippedEvents: [],
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } else {
      await db
        .update(users)
        .set({ 
          eventsShownSinceSkip: newCount,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }
  }

  async resetSkippedEvents(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        skippedEvents: [],
        eventsShownSinceSkip: 0,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  // Get actual attendees for an event
  async getEventAttendees(eventId: number): Promise<User[]> {
    // Get all users who have RSVPed to this event with 'attending' or 'going' status
    const attendees = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        customAvatarUrl: users.customAvatarUrl,
        animeAvatarSeed: users.animeAvatarSeed,
        location: users.location,
        interests: users.interests,
        personality: users.personality,
        aiSignature: users.aiSignature,
        skippedEvents: users.skippedEvents,
        eventsShownSinceSkip: users.eventsShownSinceSkip,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(eventRsvps, eq(users.id, eventRsvps.userId))
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          or(
            eq(eventRsvps.status, 'attending'),
            eq(eventRsvps.status, 'going')
          )
        )
      )
      .orderBy(eventRsvps.createdAt);
    
    // Get the organizer of the event
    const event = await db
      .select({
        organizerId: events.organizerId
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    
    if (event.length > 0) {
      const organizer = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, event[0].organizerId))
        .limit(1);
      
      if (organizer.length > 0) {
        // Add organizer at the beginning if not already in attendees
        const organizerExists = attendees.some(a => a.id === organizer[0].id);
        if (!organizerExists) {
          return [organizer[0], ...attendees];
        }
      }
    }
    
    return attendees;
  }

  // Private chat operations
  async createPrivateChat(user1Id: string, user2Id: string): Promise<Event> {
    // Check if private chat already exists between these users (including those where user has left)
    const existingChatQuery = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        category: events.category,
        subCategory: events.subCategory,
        date: events.date,
        time: events.time,
        timezone: events.timezone,
        utcDateTime: events.utcDateTime,
        location: events.location,
        latitude: events.latitude,
        longitude: events.longitude,
        price: events.price,
        isFree: events.isFree,
        eventImageUrl: events.eventImageUrl,
        organizerId: events.organizerId,
        maxAttendees: events.maxAttendees,
        capacity: events.capacity,
        parkingInfo: events.parkingInfo,
        meetingPoint: events.meetingPoint,
        duration: events.duration,
        whatToBring: events.whatToBring,
        specialNotes: events.specialNotes,
        requirements: events.requirements,
        contactInfo: events.contactInfo,
        cancellationPolicy: events.cancellationPolicy,
        isActive: events.isActive,
        isPrivateChat: events.isPrivateChat,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
      })
      .from(events)
      .innerJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
      .where(
        and(
          eq(events.isPrivateChat, true),
          eq(events.isActive, true),
          or(
            and(
              eq(events.organizerId, user1Id),
              eq(eventRsvps.userId, user2Id)
            ),
            and(
              eq(events.organizerId, user2Id),
              eq(eventRsvps.userId, user1Id)
            )
          )
        )
      )
      .groupBy(events.id)
      .limit(1);

    if (existingChatQuery.length > 0) {
      const existingChat = existingChatQuery[0];
      
      // Reactivate the chat for both users by setting hasLeftChat to false
      await db
        .update(eventRsvps)
        .set({ hasLeftChat: false })
        .where(
          and(
            eq(eventRsvps.eventId, existingChat.id),
            or(
              eq(eventRsvps.userId, user1Id),
              eq(eventRsvps.userId, user2Id)
            )
          )
        );
      
      console.log(`Reactivated existing private chat ${existingChat.id} for users ${user1Id} and ${user2Id}`);
      return existingChat;
    }

    // Get both users' names to create chat title
    const [user1, user2] = await Promise.all([
      this.getUser(user1Id),
      this.getUser(user2Id)
    ]);

    const user1Name = user1?.firstName || user1?.email || 'User';
    const user2Name = user2?.firstName || user2?.email || 'User';

    // Create a private chat "event" with minimal fields
    const chatEvent = {
      title: `${user1Name} & ${user2Name}`,
      description: `Private chat between ${user1Name} and ${user2Name}`,
      category: 'Private',
      subCategory: 'Chat',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      location: 'Private Chat',
      organizerId: user1Id,
      isPrivateChat: true,
      isActive: true,
      isFree: true,
      price: '0.00',
    };

    const newChat = await db
      .insert(events)
      .values(chatEvent)
      .returning();

    // Create RSVP for both users
    await Promise.all([
      db.insert(eventRsvps).values({
        eventId: newChat[0].id,
        userId: user1Id,
        status: 'going',
      }),
      db.insert(eventRsvps).values({
        eventId: newChat[0].id,
        userId: user2Id,
        status: 'going',
      })
    ]);

    return newChat[0];
  }

  async getPrivateChat(user1Id: string, user2Id: string): Promise<EventWithOrganizer | undefined> {
    // Find private chat between these two users
    const chats = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        category: events.category,
        subCategory: events.subCategory,
        date: events.date,
        time: events.time,
        timezone: events.timezone,
        utcDateTime: events.utcDateTime,
        location: events.location,
        latitude: events.latitude,
        longitude: events.longitude,
        price: events.price,
        isFree: events.isFree,
        eventImageUrl: events.eventImageUrl,
        organizerId: events.organizerId,
        maxAttendees: events.maxAttendees,
        capacity: events.capacity,
        parkingInfo: events.parkingInfo,
        meetingPoint: events.meetingPoint,
        duration: events.duration,
        whatToBring: events.whatToBring,
        specialNotes: events.specialNotes,
        requirements: events.requirements,
        contactInfo: events.contactInfo,
        cancellationPolicy: events.cancellationPolicy,
        isActive: events.isActive,
        isPrivateChat: events.isPrivateChat,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        organizer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        rsvpCount: sql<number>`2`, // Always 2 for private chats
        userRsvpStatus: sql<string>`'going'`, // Both users are always going
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .innerJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
      .where(
        and(
          eq(events.isPrivateChat, true),
          eq(events.isActive, true),
          or(
            and(
              eq(events.organizerId, user1Id),
              eq(eventRsvps.userId, user2Id)
            ),
            and(
              eq(events.organizerId, user2Id),
              eq(eventRsvps.userId, user1Id)
            )
          )
        )
      )
      .groupBy(events.id, users.id)
      .limit(1);

    if (chats.length === 0) {
      return undefined;
    }

    const chat = chats[0];
    return {
      ...chat,
      organizer: chat.organizer!,
      rsvpCount: 2,
      userRsvpStatus: 'going',
      isPrivateChat: true,
    } as any;
  }

  async getUserPrivateChats(userId: string): Promise<EventWithOrganizer[]> {
    console.log(`getUserPrivateChats called for user ${userId}`);
    
    // First, get all private chat event IDs where the user is involved and hasn't left the chat
    const userEventIds = await db
      .selectDistinct({
        eventId: events.id,
      })
      .from(events)
      .innerJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
      .where(
        and(
          eq(events.isPrivateChat, true),
          eq(events.isActive, true),
          eq(eventRsvps.userId, userId),
          // Exclude chats where user has left
          or(
            eq(eventRsvps.hasLeftChat, false),
            sql`${eventRsvps.hasLeftChat} IS NULL`
          )
        )
      );

    if (userEventIds.length === 0) {
      return [];
    }

    // Now get the full event details for those IDs with most recent message timestamp
    const chats = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        date: events.date,
        time: events.time,
        timezone: events.timezone,
        utcDateTime: events.utcDateTime,
        location: events.location,
        category: events.category,
        subCategory: events.subCategory,
        organizerId: events.organizerId,
        price: events.price,
        isFree: events.isFree,
        eventImageUrl: events.eventImageUrl,
        latitude: events.latitude,
        longitude: events.longitude,
        maxAttendees: events.maxAttendees,
        capacity: events.capacity,
        parkingInfo: events.parkingInfo,
        meetingPoint: events.meetingPoint,
        duration: events.duration,
        whatToBring: events.whatToBring,
        specialNotes: events.specialNotes,
        requirements: events.requirements,
        contactInfo: events.contactInfo,
        cancellationPolicy: events.cancellationPolicy,
        isActive: events.isActive,
        isPrivateChat: events.isPrivateChat,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        organizer: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        rsvpCount: sql<number>`2`, // Always 2 for private chats
        userRsvpStatus: sql<string>`'going'`, // Both users are always going
        lastMessageTime: sql<Date>`(
          SELECT MAX(created_at)
          FROM chat_messages
          WHERE event_id = ${events.id}
        )`,
      })
      .from(events)
      .leftJoin(users, eq(events.organizerId, users.id))
      .where(
        inArray(events.id, userEventIds.map(e => e.eventId))
      )
      .orderBy(desc(sql`(
        SELECT MAX(created_at)
        FROM chat_messages
        WHERE event_id = ${events.id}
      )`), desc(events.createdAt));

    console.log(`Private chats for user ${userId}:`, chats.length, chats.map(c => ({ id: c.id, title: c.title })));

    return chats.map(chat => ({
      ...chat,
      organizer: chat.organizer!,
      rsvpCount: 2,
      userRsvpStatus: 'going',
      isPrivateChat: true,
    }) as any);
  }
  
  // Favorite message operations
  async getFavoriteMessages(eventId: number, userId: string): Promise<ChatMessageWithUser[]> {
    // Get all messages that have been favorited by any user in this event
    const favoriteMessages = await db
      .select({
        id: chatMessages.id,
        eventId: chatMessages.eventId,
        userId: chatMessages.userId,
        message: chatMessages.message,
        quotedMessageId: chatMessages.quotedMessageId,
        createdAt: chatMessages.createdAt,
        updatedAt: chatMessages.updatedAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          customAvatarUrl: users.customAvatarUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          location: users.location,
          interests: users.interests,
          personality: users.personality,
          aiSignature: users.aiSignature,
          skippedEvents: users.skippedEvents,
          eventsShownSinceSkip: users.eventsShownSinceSkip,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(messageFavorites)
      .innerJoin(chatMessages, eq(messageFavorites.messageId, chatMessages.id))
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.eventId, eventId))
      .groupBy(chatMessages.id, users.id, chatMessages.eventId, chatMessages.userId, chatMessages.message, chatMessages.quotedMessageId, chatMessages.createdAt, chatMessages.updatedAt)
      .orderBy(desc(chatMessages.createdAt));
    
    // Handle quoted messages and favorites information
    const messagesWithQuotesAndFavorites = await Promise.all(
      favoriteMessages.map(async (message) => {
        let quotedMessage = null;
        
        if (message.quotedMessageId) {
          const quotedResult = await db
            .select({
              id: chatMessages.id,
              eventId: chatMessages.eventId,
              userId: chatMessages.userId,
              message: chatMessages.message,
              quotedMessageId: chatMessages.quotedMessageId,
              createdAt: chatMessages.createdAt,
              updatedAt: chatMessages.updatedAt,
              user: {
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                profileImageUrl: users.profileImageUrl,
                customAvatarUrl: users.customAvatarUrl,
                animeAvatarSeed: users.animeAvatarSeed,
                location: users.location,
                interests: users.interests,
                personality: users.personality,
                aiSignature: users.aiSignature,
                skippedEvents: users.skippedEvents,
                eventsShownSinceSkip: users.eventsShownSinceSkip,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
              },
            })
            .from(chatMessages)
            .innerJoin(users, eq(chatMessages.userId, users.id))
            .where(eq(chatMessages.id, message.quotedMessageId))
            .limit(1);
          
          if (quotedResult.length > 0) {
            quotedMessage = {
              ...quotedResult[0],
              user: quotedResult[0].user!,
            };
          }
        }
        
        // Fetch favorites for this message
        const favoritesQuery = await db
          .select({
            user: {
              id: users.id,
              customAvatarUrl: users.customAvatarUrl,
              animeAvatarSeed: users.animeAvatarSeed,
              location: users.location,
              email: users.email,
              firstName: users.firstName,
              lastName: users.lastName,
              profileImageUrl: users.profileImageUrl,
              interests: users.interests,
              personality: users.personality,
              aiSignature: users.aiSignature,
              skippedEvents: users.skippedEvents,
              eventsShownSinceSkip: users.eventsShownSinceSkip,
              createdAt: users.createdAt,
              updatedAt: users.updatedAt,
            },
            createdAt: messageFavorites.createdAt,
          })
          .from(messageFavorites)
          .leftJoin(users, eq(messageFavorites.userId, users.id))
          .where(eq(messageFavorites.messageId, message.id))
          .orderBy(desc(messageFavorites.createdAt));
        
        const favorites = favoritesQuery.map(fav => ({
          user: fav.user!,
          createdAt: fav.createdAt.toISOString(),
        }));
        
        return {
          ...message,
          quotedMessage: quotedMessage || undefined,
          favorites,
          favoritesCount: favorites.length,
        };
      })
    );
    
    return messagesWithQuotesAndFavorites;
  }
  
  async addFavoriteMessage(userId: string, messageId: number): Promise<void> {
    await db.insert(messageFavorites).values({
      userId,
      messageId,
    });
  }
  
  async removeFavoriteMessage(userId: string, messageId: number): Promise<void> {
    await db.delete(messageFavorites)
      .where(and(
        eq(messageFavorites.userId, userId),
        eq(messageFavorites.messageId, messageId)
      ));
  }
  
  async checkMessageFavorite(userId: string, messageId: number): Promise<boolean> {
    const favorite = await db.select()
      .from(messageFavorites)
      .where(and(
        eq(messageFavorites.userId, userId),
        eq(messageFavorites.messageId, messageId)
      ))
      .limit(1);
    
    return favorite.length > 0;
  }

  async getSavedEvents(userId: string): Promise<EventWithOrganizer[]> {
    const savedEventsData = await db.select({
      id: events.id,
      title: events.title,
      description: events.description,
      category: events.category,
      subCategory: events.subCategory,
      date: events.date,
      time: events.time,
      location: events.location,
      latitude: events.latitude,
      longitude: events.longitude,
      price: events.price,
      isFree: events.isFree,
      eventImageUrl: events.eventImageUrl,
      organizerId: events.organizerId,
      maxAttendees: events.maxAttendees,
      capacity: events.capacity,
      parkingInfo: events.parkingInfo,
      meetingPoint: events.meetingPoint,
      duration: events.duration,
      whatToBring: events.whatToBring,
      specialNotes: events.specialNotes,
      requirements: events.requirements,
      contactInfo: events.contactInfo,
      cancellationPolicy: events.cancellationPolicy,
      isActive: events.isActive,
      isPrivateChat: events.isPrivateChat,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
      organizer: users,
      rsvpCount: sql<number>`COUNT(DISTINCT ${eventRsvps.id})::int`,
    })
    .from(savedEvents)
    .leftJoin(events, eq(savedEvents.eventId, events.id))
    .leftJoin(users, eq(events.organizerId, users.id))
    .leftJoin(eventRsvps, eq(events.id, eventRsvps.eventId))
    .where(eq(savedEvents.userId, userId))
    .groupBy(events.id, users.id, savedEvents.id)
    .orderBy(desc(savedEvents.createdAt));

    return savedEventsData.filter(event => event.id != null).map(event => ({
      ...event,
      id: event.id!,
      organizer: event.organizer!,
      rsvpCount: event.rsvpCount || 0,
      date: event.date || '',
      time: event.time || '',
      location: event.location || '',
      title: event.title || '',
      description: event.description || '',
      category: event.category || '',
      organizerId: event.organizerId || '',
    })) as EventWithOrganizer[];
  }

  async addSavedEvent(userId: string, eventId: number): Promise<void> {
    await db.insert(savedEvents).values({
      userId,
      eventId,
    }).onConflictDoNothing();
  }

  async removeSavedEvent(userId: string, eventId: number): Promise<void> {
    await db.delete(savedEvents)
      .where(and(
        eq(savedEvents.userId, userId),
        eq(savedEvents.eventId, eventId)
      ));
  }

  async checkEventSaved(userId: string, eventId: number): Promise<boolean> {
    const saved = await db.select().from(savedEvents)
      .where(and(
        eq(savedEvents.userId, userId),
        eq(savedEvents.eventId, eventId)
      ))
      .limit(1);
    return saved.length > 0;
  }

  // Friend operations
  async sendFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    // Check if a friendship already exists in either direction
    const existingFriendship = await this.checkFriendshipStatus(userId, friendId);
    
    if (existingFriendship) {
      throw new Error(`Friendship already exists with status: ${existingFriendship}`);
    }
    
    const [friendship] = await db
      .insert(friendships)
      .values({
        userId,
        friendId,
        status: 'pending',
      })
      .returning();
    
    return friendship;
  }

  async acceptFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    // Find the pending friend request (where friendId sent request to userId)
    const [friendship] = await db
      .update(friendships)
      .set({
        status: 'accepted',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId),
          eq(friendships.status, 'pending')
        )
      )
      .returning();
    
    if (!friendship) {
      throw new Error('No pending friend request found');
    }
    
    return friendship;
  }

  async rejectFriendRequest(userId: string, friendId: string): Promise<Friendship> {
    // Find the pending friend request (where friendId sent request to userId)
    const [friendship] = await db
      .update(friendships)
      .set({
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId),
          eq(friendships.status, 'pending')
        )
      )
      .returning();
    
    if (!friendship) {
      throw new Error('No pending friend request found');
    }
    
    return friendship;
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    // Delete friendship in both directions
    await db
      .delete(friendships)
      .where(
        or(
          and(
            eq(friendships.userId, userId),
            eq(friendships.friendId, friendId)
          ),
          and(
            eq(friendships.userId, friendId),
            eq(friendships.friendId, userId)
          )
        )
      );
  }

  async getFriends(userId: string): Promise<User[]> {
    // Get all accepted friendships where user is either sender or receiver
    const friendsAsUser = await db
      .select({
        friend: users,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.status, 'accepted')
        )
      );
    
    const friendsAsFriend = await db
      .select({
        friend: users,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.userId, users.id))
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, 'accepted')
        )
      );
    
    // Combine both results
    const allFriends = [
      ...friendsAsUser.map(r => r.friend),
      ...friendsAsFriend.map(r => r.friend)
    ];
    
    return allFriends;
  }

  async getPendingFriendRequests(userId: string): Promise<Array<Friendship & { user: User }>> {
    // Get pending requests where current user is the recipient
    const requests = await db
      .select({
        friendship: friendships,
        user: users,
      })
      .from(friendships)
      .leftJoin(users, eq(friendships.userId, users.id))
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, 'pending')
        )
      );
    
    return requests
      .filter(r => r.user !== null)
      .map(r => ({
        ...r.friendship,
        user: r.user!,
      }));
  }

  async getSentFriendRequests(userId: string): Promise<Array<Friendship & { friend: User }>> {
    // Get pending requests sent by current user
    const requests = await db
      .select({
        friendship: friendships,
        friend: users,
      })
      .from(friendships)
      .leftJoin(users, eq(friendships.friendId, users.id))
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.status, 'pending')
        )
      );
    
    return requests
      .filter(r => r.friend !== null)
      .map(r => ({
        ...r.friendship,
        friend: r.friend!,
      }));
  }

  async checkFriendshipStatus(userId: string, friendId: string): Promise<string | null> {
    // Check if friendship exists in either direction
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.userId, userId),
            eq(friendships.friendId, friendId)
          ),
          and(
            eq(friendships.userId, friendId),
            eq(friendships.friendId, userId)
          )
        )
      )
      .limit(1);
    
    return friendship ? friendship.status : null;
  }
  
  async getUserRsvpEventIds(userId: string): Promise<number[]> {
    // Get all event IDs the user has RSVP'd to (attending, going, or maybe)
    const rsvps = await db
      .select({ eventId: eventRsvps.eventId })
      .from(eventRsvps)
      .where(
        and(
          eq(eventRsvps.userId, userId),
          or(
            eq(eventRsvps.status, 'attending'),
            eq(eventRsvps.status, 'going'), 
            eq(eventRsvps.status, 'maybe')
          )
        )
      );
    
    return rsvps.map(r => r.eventId);
  }
}

export const storage = new DatabaseStorage();
