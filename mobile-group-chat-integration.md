# Mobile Group Chat Integration Guide for EventConnect

This document provides step-by-step instructions for integrating your mobile app with the EventConnect Replit server's Group Chat functionality.

## Server Configuration

### Base API URL
```
Primary: https://local-event-connect.replit.app
WebSocket: wss://local-event-connect.replit.app/ws
Fallback: https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev
```

### Authentication
All chat endpoints require JWT authentication via Bearer token in the Authorization header.

## Step 1: Initial Setup

### 1.1 Configure API Client
```typescript
import axios from 'axios';

const API_BASE_URL = 'https://local-event-connect.replit.app';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add JWT token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token'); // or AsyncStorage for React Native
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('auth_token');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);
```

### 1.2 WebSocket Connection Setup
```typescript
class ChatWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
    this.connect();
  }
  
  private connect() {
    const wsUrl = 'wss://local-event-connect.replit.app/ws';
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Subscribe to notifications for all user's chats
      this.send({
        type: 'subscribe_notifications',
        userId: this.userId
      });
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
  
  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
  
  joinChatRoom(chatId: number) {
    this.send({
      type: 'join',
      eventId: chatId,
      userId: this.userId
    });
  }
  
  markAsRead(chatId: number, timestamp: string) {
    this.send({
      type: 'ackRead',
      eventId: chatId,
      userId: this.userId,
      timestamp: timestamp
    });
  }
  
  private handleMessage(data: any) {
    switch (data.type) {
      case 'subscribed_notifications':
        console.log('Subscribed to notifications');
        break;
      case 'joined':
        console.log(`Joined chat room ${data.eventId}`);
        break;
      case 'newMessage':
        this.onNewMessage(data);
        break;
      case 'new_message_notification':
        this.onNotification(data);
        break;
    }
  }
  
  onNewMessage: (data: any) => void = () => {};
  onNotification: (data: any) => void = () => {};
}
```

## Step 2: Chat List Implementation

### 2.1 Fetch User's Chats
```typescript
interface Chat {
  id: number;
  title: string;
  isPrivateChat: boolean;
  organizerId: string;
  lastMessageTime?: string;
  rsvpCount: number;
  date: string;
  time: string;
  // ... other event fields
}

const getChatList = async (userId: string): Promise<Chat[]> => {
  try {
    const response = await apiClient.get(`/api/users/${userId}/group-chats`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch chat list:', error);
    throw error;
  }
};

// Note: Group chats are automatically available for:
// 1. Events you've RSVP'd to with status 'attending' or 'going'
// 2. Events you've organized
// 3. Private chats you've joined
```

### 2.2 Chat List UI Component
```typescript
// React Native example
import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity } from 'react-native';

const ChatListScreen = ({ userId, navigation }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadChats();
  }, [userId]);
  
  const loadChats = async () => {
    try {
      const chatList = await getChatList(userId);
      setChats(chatList);
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Chat', { chatId: item.id })}
      style={styles.chatItem}
    >
      <View>
        <Text style={styles.chatTitle}>{item.title}</Text>
        <Text style={styles.chatType}>
          {item.isPrivateChat ? 'Private Chat' : 'Group Chat'}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  return (
    <FlatList
      data={chats}
      renderItem={renderChatItem}
      keyExtractor={(item) => item.id.toString()}
      refreshing={loading}
      onRefresh={loadChats}
    />
  );
};
```

## Step 3: Chat Screen Implementation

### 3.1 Message Data Types
```typescript
interface ChatMessage {
  id: number;
  eventId: number;
  userId: string;
  message: string;
  quotedMessageId?: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    // ... other user fields
  };
  quotedMessage?: ChatMessage;
  favorites: Array<{
    id: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  favoritesCount: number;
}
```

### 3.2 Message Operations
```typescript
const getMessages = async (chatId: number, limit = 1000): Promise<ChatMessage[]> => {
  try {
    const response = await apiClient.get(`/api/events/${chatId}/messages`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    throw error;
  }
};

const sendMessage = async (
  chatId: number, 
  message: string, 
  quotedMessageId?: number
): Promise<ChatMessage> => {
  try {
    const response = await apiClient.post(`/api/events/${chatId}/messages`, {
      message,
      quotedMessageId
    });
    return response.data;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
};

const favoriteMessage = async (messageId: number): Promise<void> => {
  try {
    await apiClient.post(`/api/messages/${messageId}/favorite`);
  } catch (error) {
    console.error('Failed to favorite message:', error);
    throw error;
  }
};

const unfavoriteMessage = async (messageId: number): Promise<void> => {
  try {
    await apiClient.delete(`/api/messages/${messageId}/favorite`);
  } catch (error) {
    console.error('Failed to unfavorite message:', error);
    throw error;
  }
};
```

### 3.3 Chat Screen Component
```typescript
const ChatScreen = ({ chatId, userId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [quotedMessage, setQuotedMessage] = useState<ChatMessage | null>(null);
  const [ws] = useState(() => new ChatWebSocket(userId));
  
  useEffect(() => {
    loadMessages();
    ws.joinChatRoom(chatId);
    
    // Set up message handlers
    ws.onNewMessage = handleNewMessage;
    ws.onNotification = handleNotification;
    
    return () => {
      // Cleanup WebSocket connection
    };
  }, [chatId]);
  
  const loadMessages = async () => {
    try {
      const messageList = await getMessages(chatId);
      setMessages(messageList.reverse()); // Reverse for chronological order
    } catch (error) {
      // Handle error
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const sentMessage = await sendMessage(
        chatId, 
        newMessage, 
        quotedMessage?.id
      );
      
      // Message will be added via WebSocket, but add immediately for UX
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      setQuotedMessage(null);
    } catch (error) {
      // Handle error
    }
  };
  
  const handleNewMessage = (data: any) => {
    if (data.eventId === chatId && data.message) {
      setMessages(prev => {
        // Check for duplicates
        const exists = prev.some(msg => msg.id === data.message.id);
        if (exists) return prev;
        return [...prev, data.message];
      });
      
      // Mark as read
      ws.markAsRead(chatId, new Date().toISOString());
    }
  };
  
  const handleQuoteMessage = (message: ChatMessage) => {
    setQuotedMessage(message);
  };
  
  const handleFavoriteToggle = async (message: ChatMessage) => {
    try {
      const isFavorited = message.favorites.some(fav => fav.user.id === userId);
      
      if (isFavorited) {
        await unfavoriteMessage(message.id);
      } else {
        await favoriteMessage(message.id);
      }
      
      // Refresh messages to get updated favorite count
      await loadMessages();
    } catch (error) {
      // Handle error
    }
  };
  
  // UI rendering code here...
};
```

## Step 4: Private Chat Creation

### 4.1 Create Private Chat
```typescript
const createPrivateChat = async (otherUserId: string): Promise<Chat> => {
  try {
    const response = await apiClient.post('/api/private-chats', {
      otherUserId
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create private chat:', error);
    throw error;
  }
};

const getPrivateChat = async (otherUserId: string): Promise<Chat> => {
  try {
    const response = await apiClient.get(`/api/private-chats/${otherUserId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      // Chat doesn't exist, create it
      return createPrivateChat(otherUserId);
    }
    throw error;
  }
};
```

## Step 5: Notifications & Unread Messages

### 5.1 Get Unread Counts
```typescript
interface UnreadInfo {
  totalUnread: number;
  unreadByEvent: { [chatId: string]: number };
}

const getUnreadCounts = async (): Promise<UnreadInfo> => {
  try {
    const response = await apiClient.get('/api/notifications/unread');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch unread counts:', error);
    throw error;
  }
};
```

### 5.2 Handle Push Notifications
```typescript
// Set up push notification handling
ws.onNotification = (data: any) => {
  if (data.type === 'new_message_notification') {
    // Show local notification
    showLocalNotification({
      title: data.eventTitle,
      body: `${data.senderName}: ${data.message}`,
      data: {
        chatId: data.eventId,
        senderId: data.senderId
      }
    });
  }
};
```

## Step 6: Error Handling & Offline Support

### 6.1 Network Error Handling
```typescript
const withRetry = async <T>(
  operation: () => Promise<T>,
  retries = 3
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};

// Usage
const messages = await withRetry(() => getMessages(chatId));
```

### 6.2 Offline Message Storage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAT_CACHE_KEY = 'cached_chats';
const MESSAGE_CACHE_KEY = (chatId: number) => `messages_${chatId}`;

const cacheMessages = async (chatId: number, messages: ChatMessage[]) => {
  try {
    await AsyncStorage.setItem(
      MESSAGE_CACHE_KEY(chatId),
      JSON.stringify(messages)
    );
  } catch (error) {
    console.error('Failed to cache messages:', error);
  }
};

const getCachedMessages = async (chatId: number): Promise<ChatMessage[]> => {
  try {
    const cached = await AsyncStorage.getItem(MESSAGE_CACHE_KEY(chatId));
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('Failed to get cached messages:', error);
    return [];
  }
};
```

## Testing & Validation

### Test User Accounts
Any email can be used for testing - the system automatically creates or retrieves users:
- `test@example.com`
- `demo@eventconnect.app`
- Or use any email - users are created automatically on first login

### Test Scenarios
1. **Login & Get Chats**: Verify JWT authentication and chat list retrieval
2. **RSVP to Event**: After RSVPing, verify the event appears in group chats
3. **Send Messages**: Test message sending and real-time updates
4. **Private Chat Creation**: Create 1-on-1 chats between test users
5. **WebSocket Connectivity**: Test real-time message delivery
6. **Offline Support**: Test app behavior when network is unavailable
7. **Error Recovery**: Test reconnection and error handling
8. **Save/Unsave Events**: Test event saving functionality
9. **My Events Tabs**: Test fetching attending, organized, and saved events

### cURL Testing Examples
```bash
# Login to get JWT token
curl -X POST https://local-event-connect.replit.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"external-1752201712140@eventconnect.app","firstName":"External","lastName":"Organizer"}'

# Get user's chats (replace <token> with actual token)
curl -H "Authorization: Bearer <token>" \
  https://local-event-connect.replit.app/api/users/<userId>/group-chats

# Send a message
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello from mobile!"}' \
  https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev/api/events/<chatId>/messages
```

This integration guide provides everything needed to connect your mobile app to the EventConnect group chat system on Replit.