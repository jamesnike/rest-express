import { LRUCache } from 'lru-cache';

// Chat-specific cache configuration
const CHAT_CACHE_CONFIG = {
  max: 1000, // More entries for chat data
  ttl: 1000 * 15, // 15 seconds for real-time data
  updateAgeOnGet: false,
  updateAgeOnHas: false,
};

// Chat cache TTLs
const CHAT_TTL = {
  MESSAGES: 15 * 1000, // 15 seconds for messages (real-time)
  CHAT_LIST: 30 * 1000, // 30 seconds for chat lists
  CHAT_META: 60 * 1000, // 1 minute for chat metadata
  UNREAD_COUNT: 10 * 1000, // 10 seconds for unread counts
  ACTIVE_USERS: 5 * 1000, // 5 seconds for active users
};

// Chat-specific caches
export const chatCaches = {
  // Messages cache - keyed by "eventId:offset:limit" or "chatId:offset:limit"
  messages: new LRUCache<string, any[]>({
    ...CHAT_CACHE_CONFIG,
    ttl: CHAT_TTL.MESSAGES,
    max: 500, // Cache last 500 message queries
  }),
  
  // Private chat list cache - keyed by userId
  privateChatList: new LRUCache<string, any[]>({
    ...CHAT_CACHE_CONFIG,
    ttl: CHAT_TTL.CHAT_LIST,
    max: 200,
  }),
  
  // Chat metadata cache - keyed by chatId or eventId
  chatMeta: new LRUCache<string, any>({
    ...CHAT_CACHE_CONFIG,
    ttl: CHAT_TTL.CHAT_META,
    max: 300,
  }),
  
  // Unread counts cache - keyed by "userId:eventId" or "userId:chatId"
  unreadCounts: new LRUCache<string, number>({
    ...CHAT_CACHE_CONFIG,
    ttl: CHAT_TTL.UNREAD_COUNT,
    max: 500,
  }),
  
  // Active users cache - keyed by eventId or chatId
  activeUsers: new LRUCache<string, string[]>({
    ...CHAT_CACHE_CONFIG,
    ttl: CHAT_TTL.ACTIVE_USERS,
    max: 100,
  }),
  
  // Last message cache - keyed by eventId or chatId
  lastMessage: new LRUCache<string, any>({
    ...CHAT_CACHE_CONFIG,
    ttl: CHAT_TTL.MESSAGES,
    max: 300,
  }),
};

// Chat cache key generators
export const chatCacheKeys = {
  messages: (chatType: 'event' | 'private', id: number, offset: number, limit: number) => 
    `${chatType}:${id}:${offset}:${limit}`,
  
  privateChatList: (userId: string) => `chatlist:${userId}`,
  
  chatMeta: (chatType: 'event' | 'private', id: number) => `meta:${chatType}:${id}`,
  
  unreadCount: (userId: string, chatType: 'event' | 'private', id: number) => 
    `unread:${userId}:${chatType}:${id}`,
  
  activeUsers: (chatType: 'event' | 'private', id: number) => `active:${chatType}:${id}`,
  
  lastMessage: (chatType: 'event' | 'private', id: number) => `lastmsg:${chatType}:${id}`,
  
  userTyping: (chatType: 'event' | 'private', id: number, userId: string) => 
    `typing:${chatType}:${id}:${userId}`,
};

// Chat cache operations
export const chatCacheOps = {
  // Get or set messages with cache
  async getMessages(
    key: string, 
    fetchFn: () => Promise<any[]>
  ): Promise<{ data: any[], cached: boolean }> {
    const cached = chatCaches.messages.get(key);
    if (cached) {
      return { data: cached, cached: true };
    }
    
    const data = await fetchFn();
    chatCaches.messages.set(key, data);
    return { data, cached: false };
  },
  
  // Invalidate message caches for a chat
  invalidateChat(chatType: 'event' | 'private', id: number) {
    // Clear all message pages for this chat
    const pattern = new RegExp(`^${chatType}:${id}:`);
    chatCaches.messages.forEach((value, key) => {
      if (pattern.test(key)) {
        chatCaches.messages.delete(key);
      }
    });
    
    // Clear metadata and last message
    chatCaches.chatMeta.delete(`meta:${chatType}:${id}`);
    chatCaches.lastMessage.delete(`lastmsg:${chatType}:${id}`);
    
    // Clear unread counts for all users in this chat
    const unreadPattern = new RegExp(`:${chatType}:${id}$`);
    chatCaches.unreadCounts.forEach((value, key) => {
      if (unreadPattern.test(key)) {
        chatCaches.unreadCounts.delete(key);
      }
    });
  },
  
  // Invalidate user's chat list
  invalidateUserChatList(userId: string) {
    chatCaches.privateChatList.delete(`chatlist:${userId}`);
  },
  
  // Update last message cache
  updateLastMessage(chatType: 'event' | 'private', id: number, message: any) {
    const key = `lastmsg:${chatType}:${id}`;
    chatCaches.lastMessage.set(key, message);
    
    // Also invalidate the first page of messages (most recent)
    const msgKey = `${chatType}:${id}:0:50`;
    chatCaches.messages.delete(msgKey);
  },
  
  // Clear all chat caches
  clearAll() {
    chatCaches.messages.clear();
    chatCaches.privateChatList.clear();
    chatCaches.chatMeta.clear();
    chatCaches.unreadCounts.clear();
    chatCaches.activeUsers.clear();
    chatCaches.lastMessage.clear();
  },
  
  // Get cache statistics
  getStats() {
    return {
      messages: {
        size: chatCaches.messages.size,
        calculatedSize: chatCaches.messages.calculatedSize,
      },
      privateChatList: {
        size: chatCaches.privateChatList.size,
        calculatedSize: chatCaches.privateChatList.calculatedSize,
      },
      chatMeta: {
        size: chatCaches.chatMeta.size,
        calculatedSize: chatCaches.chatMeta.calculatedSize,
      },
      unreadCounts: {
        size: chatCaches.unreadCounts.size,
        calculatedSize: chatCaches.unreadCounts.calculatedSize,
      },
      activeUsers: {
        size: chatCaches.activeUsers.size,
        calculatedSize: chatCaches.activeUsers.calculatedSize,
      },
      lastMessage: {
        size: chatCaches.lastMessage.size,
        calculatedSize: chatCaches.lastMessage.calculatedSize,
      },
    };
  },
};

// Preload cache for active chats (called periodically)
export async function preloadActiveChatCaches(
  getActiveChats: () => Promise<{ chatType: 'event' | 'private', id: number }[]>,
  getMessages: (chatType: string, id: number, limit: number) => Promise<any[]>
) {
  try {
    const activeChats = await getActiveChats();
    
    // Preload first page of messages for each active chat
    for (const chat of activeChats.slice(0, 20)) { // Limit to 20 most active
      const key = chatCacheKeys.messages(chat.chatType, chat.id, 0, 50);
      if (!chatCaches.messages.has(key)) {
        const messages = await getMessages(chat.chatType, chat.id, 50);
        chatCaches.messages.set(key, messages);
      }
    }
  } catch (error) {
    console.error('Error preloading chat caches:', error);
  }
}

export default chatCacheOps;