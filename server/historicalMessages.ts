import { db } from './db';
import { chatMessages, users } from '@shared/schema';
import { eq, and, lt, gt, desc, asc, sql } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';
import { chatCaches } from './chatCache';

// Types for cursor-based pagination
interface MessageCursor {
  id: number;
  createdAt: Date;
}

interface HistoricalMessageQuery {
  chatId: number;
  cursor?: MessageCursor;
  direction: 'before' | 'after';
  limit: number;
}

interface HistoricalMessageResult {
  messages: any[];
  hasMore: boolean;
  nextCursor?: MessageCursor;
  prevCursor?: MessageCursor;
}

// Cache for historical message pages (longer TTL since older messages don't change)
const historicalCache = new LRUCache<string, HistoricalMessageResult>({
  max: 200,
  ttl: 1000 * 60 * 5, // 5 minutes for historical data
  updateAgeOnGet: false,
});

// Generate cache key for historical queries
function getHistoricalCacheKey(query: HistoricalMessageQuery): string {
  const cursorStr = query.cursor ? `${query.cursor.id}_${query.cursor.createdAt.getTime()}` : 'start';
  return `hist:${query.chatId}:${query.direction}:${cursorStr}:${query.limit}`;
}

// Optimized historical message fetching with cursor-based pagination
export async function fetchHistoricalMessages(
  query: HistoricalMessageQuery
): Promise<HistoricalMessageResult> {
  // Check cache first
  const cacheKey = getHistoricalCacheKey(query);
  const cached = historicalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { chatId, cursor, direction, limit } = query;
  
  // Build the query with cursor-based pagination
  const conditions = [eq(chatMessages.eventId, chatId)];
  
  if (cursor) {
    if (direction === 'before') {
      // Get messages before the cursor (older messages)
      // Use composite cursor for deterministic pagination
      conditions.push(
        sql`(${chatMessages.createdAt} < ${cursor.createdAt} OR 
            (${chatMessages.createdAt} = ${cursor.createdAt} AND ${chatMessages.id} < ${cursor.id}))`
      );
    } else {
      // Get messages after the cursor (newer messages)
      // Use composite cursor for deterministic pagination
      conditions.push(
        sql`(${chatMessages.createdAt} > ${cursor.createdAt} OR 
            (${chatMessages.createdAt} = ${cursor.createdAt} AND ${chatMessages.id} > ${cursor.id}))`
      );
    }
  }

  // Build and execute query based on direction
  const stmt = db
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
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        animeAvatarSeed: users.animeAvatarSeed,
        authProvider: users.authProvider,
        googleId: users.googleId,
        facebookId: users.facebookId,
      },
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.userId, users.id))
    .where(and(...conditions))
    .orderBy(
      direction === 'before' ? desc(chatMessages.createdAt) : asc(chatMessages.createdAt),
      direction === 'before' ? desc(chatMessages.id) : asc(chatMessages.id)
    )
    .limit(limit + 1);

  const results = await stmt;

  // Check if there are more messages
  const hasMore = results.length > limit;
  if (hasMore) {
    results.pop(); // Remove the extra item
  }

  // If fetching newer messages, reverse to maintain chronological order
  if (direction === 'after') {
    results.reverse();
  }

  // Determine cursors for next/previous pages
  const nextCursor = results.length > 0 && hasMore
    ? {
        id: results[results.length - 1].id,
        createdAt: results[results.length - 1].createdAt,
      }
    : undefined;

  const prevCursor = results.length > 0
    ? {
        id: results[0].id,
        createdAt: results[0].createdAt,
      }
    : undefined;

  const result: HistoricalMessageResult = {
    messages: results,
    hasMore,
    nextCursor,
    prevCursor,
  };

  // Cache the result
  historicalCache.set(cacheKey, result);

  return result;
}

// Batch fetch historical messages for multiple date ranges
export async function fetchHistoricalMessageBatch(
  chatId: number,
  dateRanges: Array<{ start: Date; end: Date }>,
  limit = 100
): Promise<Map<string, any[]>> {
  const results = new Map<string, any[]>();

  // Use Promise.all for parallel fetching
  const batchQueries = dateRanges.map(async (range) => {
    const rangeKey = `${range.start.toISOString()}_${range.end.toISOString()}`;
    
    // Check if we have this range cached
    const cacheKey = `batch:${chatId}:${rangeKey}`;
    const cached = historicalCache.get(cacheKey);
    if (cached) {
      return { key: rangeKey, messages: cached.messages };
    }

    // Fetch messages for this date range
    const messages = await db
      .select({
        id: chatMessages.id,
        eventId: chatMessages.eventId,
        userId: chatMessages.userId,
        message: chatMessages.message,
        quotedMessageId: chatMessages.quotedMessageId,
        createdAt: chatMessages.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          animeAvatarSeed: users.animeAvatarSeed,
          authProvider: users.authProvider,
          googleId: users.googleId,
          facebookId: users.facebookId,
        },
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .where(
        and(
          eq(chatMessages.eventId, chatId),
          gt(chatMessages.createdAt, range.start),
          lt(chatMessages.createdAt, range.end)
        )
      )
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    // Cache this batch
    historicalCache.set(cacheKey, { messages, hasMore: messages.length === limit });

    return { key: rangeKey, messages };
  });

  const batchResults = await Promise.all(batchQueries);
  
  // Populate the results map
  batchResults.forEach(({ key, messages }) => {
    results.set(key, messages);
  });

  return results;
}

// Search historical messages with full-text search
export async function searchHistoricalMessages(
  chatId: number,
  searchTerm: string,
  options: {
    cursor?: MessageCursor;
    limit?: number;
    dateRange?: { start: Date; end: Date };
  } = {}
): Promise<HistoricalMessageResult> {
  const { cursor, limit = 50, dateRange } = options;
  
  // Create search cache key with composite cursor
  const cacheKey = `search:${chatId}:${searchTerm}:${cursor ? `${cursor.id}_${cursor.createdAt.getTime()}` : 'start'}:${limit}`;
  const cached = historicalCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Build search query
  const conditions = [
    eq(chatMessages.eventId, chatId),
    sql`${chatMessages.message} ILIKE ${'%' + searchTerm + '%'}`,
  ];

  if (cursor) {
    conditions.push(lt(chatMessages.createdAt, cursor.createdAt));
  }

  if (dateRange) {
    conditions.push(
      gt(chatMessages.createdAt, dateRange.start),
      lt(chatMessages.createdAt, dateRange.end)
    );
  }

  const results = await db
    .select({
      id: chatMessages.id,
      eventId: chatMessages.eventId,
      userId: chatMessages.userId,
      message: chatMessages.message,
      quotedMessageId: chatMessages.quotedMessageId,
      createdAt: chatMessages.createdAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      },
      // Add relevance score for search results
      relevance: sql<number>`
        CASE 
          WHEN ${chatMessages.message} ILIKE ${searchTerm} THEN 3
          WHEN ${chatMessages.message} ILIKE ${'%' + searchTerm + '%'} THEN 2
          ELSE 1
        END
      `,
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.userId, users.id))
    .where(and(...conditions))
    .orderBy(
      sql`relevance DESC`,
      desc(chatMessages.createdAt)
    )
    .limit(limit + 1);

  const hasMore = results.length > limit;
  if (hasMore) {
    results.pop();
  }

  const nextCursor = results.length > 0 && hasMore
    ? {
        id: results[results.length - 1].id,
        createdAt: results[results.length - 1].createdAt,
      }
    : undefined;

  const result: HistoricalMessageResult = {
    messages: results,
    hasMore,
    nextCursor,
  };

  // Cache the search result
  historicalCache.set(cacheKey, result);

  return result;
}

// Preload historical messages around important dates
export async function preloadHistoricalContext(
  chatId: number,
  importantDates: Date[]
): Promise<void> {
  // For each important date, preload messages around it
  const preloadPromises = importantDates.map(async (date) => {
    const beforeDate = new Date(date);
    beforeDate.setHours(beforeDate.getHours() - 1);
    
    const afterDate = new Date(date);
    afterDate.setHours(afterDate.getHours() + 1);

    // Fetch messages around this date
    await fetchHistoricalMessages({
      chatId,
      cursor: { id: 0, createdAt: date },
      direction: 'before',
      limit: 20,
    });

    await fetchHistoricalMessages({
      chatId,
      cursor: { id: 0, createdAt: date },
      direction: 'after',
      limit: 20,
    });
  });

  await Promise.all(preloadPromises);
}

// Clear historical cache for a specific chat
export function clearHistoricalCache(chatId?: number): void {
  if (chatId) {
    // Clear specific chat's historical data
    const keysToDelete: string[] = [];
    historicalCache.forEach((value, key) => {
      if (key.includes(`:${chatId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => historicalCache.delete(key));
  } else {
    // Clear all historical cache
    historicalCache.clear();
  }
}

// Get cache statistics
export function getHistoricalCacheStats() {
  return {
    size: historicalCache.size,
    calculatedSize: historicalCache.calculatedSize,
    maxSize: 200,
    ttl: '5 minutes',
  };
}

export default {
  fetchHistoricalMessages,
  fetchHistoricalMessageBatch,
  searchHistoricalMessages,
  preloadHistoricalContext,
  clearHistoricalCache,
  getHistoricalCacheStats,
};