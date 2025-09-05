import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessageWithUser } from '@shared/schema';

interface WebSocketMessage {
  type: 'joined' | 'newMessage' | 'error';
  eventId?: number;
  message?: ChatMessageWithUser;
}

export function useWebSocket(eventId: number | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessageWithUser[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const currentEventId = useRef<number | null>(null);

  const connect = () => {
    if (!user || !eventId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Join the event room
      ws.current?.send(JSON.stringify({
        type: 'join',
        eventId,
        userId: user.id
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket received data:', data);
        
        if (data.type === 'joined') {
          console.log('Joined event room:', data.eventId);
        } else if (data.type === 'newMessage') {
          console.log('Received WebSocket newMessage event:', data);
          
          if (!data.message) {
            console.error('WebSocket newMessage missing message data:', data);
            return;
          }
          
          console.log('Processing new message via WebSocket for event:', data.eventId, data.message);
          
          // Only process message if it's for the current event
          if (data.eventId === currentEventId.current) {
            // Add message to local state for immediate display
            setMessages(prev => {
              // Check if message already exists to avoid duplicates
              const messageExists = prev.some(msg => msg.id === data.message!.id);
              if (messageExists) {
                console.log('Message already exists, skipping duplicate');
                return prev;
              }
              console.log('Adding new message to WebSocket state');
              return [...prev, data.message!];
            });
            
            // If user is actively viewing the chat and it's NOT their own message, 
            // immediately send acknowledgment with timestamp to prevent unread notifications
            if (data.eventId && data.message.userId !== user?.id && ws.current) {
              console.log('AUTO-READ: Sending read acknowledgment since user is actively viewing this chat');
              console.log('AUTO-READ: Message details:', { 
                eventId: data.eventId, 
                messageUserId: data.message.userId, 
                currentUserId: user.id, 
                timestamp: data.message.createdAt 
              });
              
              ws.current.send(JSON.stringify({
                type: 'ackRead',
                eventId: data.eventId,
                userId: user.id,
                timestamp: data.message.createdAt
              }));
            } else {
              console.log('AUTO-READ: Not sending ack because:', {
                isCurrentEvent: data.eventId === currentEventId.current,
                isOtherUser: data.message.userId !== user?.id,
                hasWebSocket: !!ws.current,
                messageUserId: data.message.userId,
                currentUserId: user?.id
              });
            }
            
            // Invalidate queries to refresh UI and notifications
            queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'messages'] });
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
            queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "group-chats"] });
          } else {
            console.log('Ignoring message for different event:', data.eventId, 'current:', currentEventId.current);
          }
          
        } else if (data.type === 'error') {
          console.error('WebSocket error:', data.message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 3 seconds
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      reconnectTimeout.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const disconnect = () => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  };

  const sendMessage = (content: string) => {
    if (!ws.current || !user || !eventId) return;

    ws.current.send(JSON.stringify({
      type: 'message',
      eventId,
      userId: user.id,
      content
    }));
  };

  useEffect(() => {
    // Clear messages when event changes
    if (currentEventId.current !== eventId) {
      console.log('Event changed from', currentEventId.current, 'to', eventId, '- clearing messages');
      setMessages([]);
      currentEventId.current = eventId;
    }

    if (eventId && user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [eventId, user]);

  // Stabilize setMessages function to prevent infinite loops
  const stableSetMessages = useCallback((messages: ChatMessageWithUser[] | ((prev: ChatMessageWithUser[]) => ChatMessageWithUser[])) => {
    setMessages(messages);
  }, []);

  return {
    isConnected,
    messages,
    sendMessage,
    setMessages: stableSetMessages // Allow external setting of messages (for initial load)
  };
}