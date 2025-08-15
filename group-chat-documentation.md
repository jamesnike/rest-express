# EventConnect Group Chat Implementation Summary

## Architecture Overview

The Group Chat system is built on a **unified messaging architecture** where both group chats (event-based) and private chats (1-on-1) use the same underlying infrastructure, with `events` serving as chat containers and `chatMessages` storing all messages.

## Database Schema

### Core Tables
```sql
-- Events table (serves as chat containers)
events {
  id: serial (primary key)
  title: varchar(255) 
  isPrivateChat: boolean (default: false) -- Distinguishes 1-on-1 vs group chats
  organizerId: varchar (references users.id)
  isActive: boolean (default: true)
  // ... other event fields
}

-- Chat messages for all chats (group & private)
chatMessages {
  id: serial (primary key)
  eventId: integer (references events.id)
  userId: text (references users.id)  
  message: text
  quotedMessageId: integer (optional, for replies)
  createdAt: timestamp
  updatedAt: timestamp
}

-- RSVP tracking (includes chat participation)
eventRsvps {
  id: serial (primary key)
  eventId: integer (references events.id)
  userId: varchar (references users.id)
  status: varchar ('going', 'maybe', 'not_going')
  hasLeftChat: boolean (default: false) -- Track if user left chat
  createdAt: timestamp
}

-- Message read tracking for unread counts
messageReads {
  userId: text (references users.id)
  eventId: integer (references events.id) 
  lastReadAt: timestamp
}

-- Message favorites/reactions
messageFavorites {
  userId: text (references users.id)
  messageId: integer (references chatMessages.id)
  createdAt: timestamp
}
```

## Backend API Endpoints

### Group Chat Management
```typescript
// Get all group chats and private chats for user (sorted by activity)
GET /api/users/{userId}/group-chats
Headers: Authorization: Bearer <jwt-token>
Response: EventWithOrganizer[] // Array of chat containers

// Leave group chat
POST /api/events/{eventId}/leave-chat  
Headers: Authorization: Bearer <jwt-token>
```

### Private Chat Management
```typescript
// Create or get existing private chat
POST /api/private-chats
Headers: Authorization: Bearer <jwt-token>
Body: { "otherUserId": "user_123" }
Response: EventWithOrganizer // Private chat container

// Get specific private chat
GET /api/private-chats/{otherUserId}
Headers: Authorization: Bearer <jwt-token>
Response: EventWithOrganizer // Private chat container
```

### Message Operations
```typescript
// Get messages for any chat (group or private)
GET /api/events/{eventId}/messages?limit=1000
Headers: Authorization: Bearer <jwt-token>
Response: ChatMessageWithUser[] // Messages with user details and quoted messages

// Send message to any chat
POST /api/events/{eventId}/messages
Headers: Authorization: Bearer <jwt-token>
Body: {
  "message": "Hello world",
  "quotedMessageId": 123 // Optional for replies
}
Response: ChatMessageWithUser // New message with user data

// Favorite/unfavorite message
POST /api/messages/{messageId}/favorite
DELETE /api/messages/{messageId}/favorite
Headers: Authorization: Bearer <jwt-token>
```

### Notification & Read Status
```typescript
// Get unread message counts
GET /api/notifications/unread
Headers: Authorization: Bearer <jwt-token>
Response: {
  "totalUnread": 5,
  "unreadByEvent": {
    "141": 3,
    "142": 2
  }
}

// Mark messages as read (via WebSocket)
WebSocket Message: {
  "type": "ackRead",
  "eventId": 141,
  "userId": "user_123",
  "timestamp": "2025-08-14T22:30:00Z"
}
```

## WebSocket Real-time Communication

### Connection Setup
```typescript
// Connect to WebSocket
const ws = new WebSocket('wss://your-domain.com/ws');

// Join specific chat room
ws.send(JSON.stringify({
  type: 'join',
  eventId: 141,
  userId: 'user_123'
}));

// Subscribe to all notifications
ws.send(JSON.stringify({
  type: 'subscribe_notifications', 
  userId: 'user_123'
}));
```

### Message Broadcasting
```typescript
// Real-time message events
{
  "type": "newMessage",
  "eventId": 141,
  "message": {
    "id": 456,
    "eventId": 141,
    "userId": "user_456",
    "message": "Hello everyone!",
    "quotedMessageId": null,
    "createdAt": "2025-08-14T22:30:00Z",
    "user": {
      "id": "user_456",
      "firstName": "John",
      "lastName": "Doe",
      "profileImageUrl": "https://...",
      // ... complete user object
    },
    "quotedMessage": null, // Or quoted message object
    "favorites": [], // Array of users who favorited
    "favoritesCount": 0
  }
}

// Notification events
{
  "type": "new_message_notification",
  "eventId": 141,
  "eventTitle": "Summer Music Festival",
  "senderName": "John Doe", 
  "message": "Hello everyone!",
  "senderId": "user_456"
}
```

## Key Features Implemented

### 1. **Unified Chat System**
- Group chats are event-based discussions
- Private chats are special events with `isPrivateChat: true`
- Same message API works for both types

### 2. **Message Features**
- **Text Messages**: Up to 3000 characters
- **Message Quoting**: Reply to specific messages with `quotedMessageId`
- **Message Favorites**: Users can favorite/react to messages
- **Rich User Data**: Every message includes full user profile

### 3. **Real-time Communication**
- **WebSocket Rooms**: Each chat has its own room
- **Live Message Broadcasting**: Instant message delivery
- **Connection Management**: Auto-reconnection and cleanup
- **Presence**: Join/leave room notifications

### 4. **Chat Management**
- **Leave Chat**: Users can exit group chats (`hasLeftChat` flag)
- **Chat Reactivation**: Rejoining resets the leave status
- **Activity Sorting**: Chats sorted by most recent message
- **Mixed Chat Lists**: Group and private chats in unified list

### 5. **Notification System**
- **Unread Tracking**: Per-chat unread message counts
- **Read Receipts**: Mark messages read with timestamps
- **Push Notifications**: Real-time notification events
- **Smart Filtering**: No self-notifications

## Mobile Integration Guide

### 1. **Authentication Setup**
```typescript
// Configure API client with JWT
const apiClient = axios.create({
  baseURL: 'https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### 2. **Chat List Implementation**
```typescript
// Fetch all chats for user
const getUserChats = async (userId: string) => {
  const response = await apiClient.get(`/api/users/${userId}/group-chats`);
  return response.data; // Array of chats sorted by activity
};
```

### 3. **WebSocket Integration**
```typescript
const connectWebSocket = () => {
  const ws = new WebSocket('wss://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev/ws');
  
  ws.onopen = () => {
    // Subscribe to notifications
    ws.send(JSON.stringify({
      type: 'subscribe_notifications',
      userId: currentUserId
    }));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'newMessage') {
      updateChatMessages(data.eventId, data.message);
    }
  };
};
```

### 4. **Message Handling**
```typescript
// Send message
const sendMessage = async (chatId: number, message: string, quotedMessageId?: number) => {
  const response = await apiClient.post(`/api/events/${chatId}/messages`, {
    message,
    quotedMessageId
  });
  return response.data;
};

// Join chat room for real-time updates
const joinChatRoom = (chatId: number, userId: string) => {
  ws.send(JSON.stringify({
    type: 'join',
    eventId: chatId,
    userId
  }));
};
```

## Production Notes

### Performance Considerations
- **Message Pagination**: Default limit of 1000 messages, implement pagination for older messages
- **WebSocket Scaling**: Consider connection pooling for high-traffic scenarios
- **Database Indexing**: Ensure proper indexes on `eventId`, `userId`, and `createdAt` fields

### Security Features
- **JWT Authentication**: All endpoints require valid JWT tokens
- **User Authorization**: Users can only access chats they're part of
- **Message Validation**: 3000 character limit and content sanitization
- **Rate Limiting**: Consider implementing rate limits for message sending

### Mobile-Specific Considerations
- **Offline Support**: Cache messages locally for offline viewing
- **Push Notifications**: Integrate with platform-specific push services
- **Background Sync**: Handle message synchronization when app returns from background
- **Connection Management**: Graceful WebSocket reconnection on network changes

## Implementation Status

✅ **Complete Features:**
- Unified chat architecture (group + private)
- Real-time messaging with WebSocket
- Message quoting and favorites
- Unread message tracking
- JWT authentication
- Mobile-ready API endpoints

🔄 **Active Features:**
- User presence indicators
- Message delivery confirmations
- Advanced notification filtering
- File/image message support

This implementation provides a comprehensive, scalable chat system supporting both group and private conversations with real-time messaging, rich features, and mobile-friendly APIs.