import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Users, Calendar, MapPin, Clock, DollarSign, Send, ArrowLeft, LogOut, X, Quote, Star, Heart } from "lucide-react";
import { EventWithOrganizer, ChatMessageWithUser } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNotifications } from "@/hooks/useNotifications";
import { apiRequest } from "@/lib/queryClient";
import { getEventImageUrl } from "@/lib/eventImages";
import { motion, AnimatePresence } from "framer-motion";
import AnimeAvatar from "./AnimeAvatar";
import EventDetail from "./EventDetail";

interface EventContentCardProps {
  event: EventWithOrganizer;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isActive: boolean;
  similarEvents?: EventWithOrganizer[];
  onSimilarEventClick?: (event: EventWithOrganizer) => void;
  initialTab?: 'chat' | 'similar' | 'favorites';
  onTabChange?: (tab: 'chat' | 'similar' | 'favorites') => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showKeepExploring?: boolean;
  hasHomeLayout?: boolean;
}

export default function EventContentCard({ 
  event, 
  onSwipeLeft, 
  onSwipeRight, 
  isActive, 
  similarEvents: propSimilarEvents = [],
  onSimilarEventClick,
  initialTab = 'chat',
  onTabChange,
  showBackButton = false,
  onBackClick,
  showKeepExploring = false,
  hasHomeLayout = false
}: EventContentCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { markEventAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<'chat' | 'similar' | 'favorites'>(initialTab);
  const [newMessage, setNewMessage] = useState('');
  const [isButtonClicked, setIsButtonClicked] = useState(false);
  const [messages, setMessagesState] = useState<ChatMessageWithUser[]>([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedSimilarEvent, setSelectedSimilarEvent] = useState<EventWithOrganizer | null>(null);
  const [quotedMessage, setQuotedMessage] = useState<ChatMessageWithUser | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Detect if Home page header and bottom nav are present using MutationObserver for better performance
  const [isHomeLayoutActive, setIsHomeLayoutActive] = useState(false);
  
  useEffect(() => {
    const detectHomeLayout = () => {
      const homeHeader = document.querySelector('[data-testid="home-header"]');
      const bottomNav = document.querySelector('[data-testid="bottom-nav"]');
      const hasHomeLayout = !!(homeHeader && bottomNav);
      
      setIsHomeLayoutActive(prev => {
        if (prev !== hasHomeLayout) {
          console.log('Home layout detection changed:', { 
            homeHeader: !!homeHeader, 
            bottomNav: !!bottomNav, 
            hasHomeLayout,
            previous: prev
          });
          return hasHomeLayout;
        }
        return prev;
      });
    };

    // Initial check
    detectHomeLayout();
    
    // Use MutationObserver to detect DOM changes
    const observer = new MutationObserver(() => {
      detectHomeLayout();
    });
    
    // Observe the body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => observer.disconnect();
  }, []); // Empty dependency array since we only need to detect DOM changes

  // Auto-scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Allow all users to access chat
  const hasChatAccess = user !== null;

  // Fetch event attendees for members modal
  const { data: attendees = [] } = useQuery({
    queryKey: ['/api/events', event.id, 'attendees'],
    queryFn: async () => {
      const response = await apiRequest(`/api/events/${event.id}/attendees`);
      return response.json();
    },
    enabled: hasChatAccess,
  });

  // Fetch similar events with matching category or sub-category (recent events only)
  const { data: fetchedSimilarEvents = [], error: similarEventsError, isLoading: isLoadingSimilarEvents } = useQuery({
    queryKey: ['/api/events', 'similar', event.category, event.subCategory, event.id],
    queryFn: async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      
      const response = await apiRequest(`/api/events?timeFilter=upcoming&limit=100`);
      const events = await response.json() as EventWithOrganizer[];
      
      // Filter for same category OR same sub-category, exclude current event, and only show future events
      const filtered = events.filter(e => 
        (e.category === event.category || e.subCategory === event.subCategory) && 
        e.id !== event.id &&
        e.date >= todayStr
      );
      
      // Sort by priority: exact sub-category matches first, then category matches
      const sorted = filtered.sort((a, b) => {
        const aSubCategoryMatch = a.subCategory === event.subCategory;
        const bSubCategoryMatch = b.subCategory === event.subCategory;
        
        if (aSubCategoryMatch && !bSubCategoryMatch) return -1;
        if (!aSubCategoryMatch && bSubCategoryMatch) return 1;
        
        // If both have same match type, sort by date
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      return sorted;
    },
    enabled: (!!event.category || !!event.subCategory) && activeTab === 'similar',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getSubCategoryColor = (subCategory: string) => {
    const colors = [
      'bg-pink-500', 'bg-indigo-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
      'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500',
      'bg-teal-500', 'bg-lime-500', 'bg-fuchsia-500', 'bg-sky-500', 'bg-slate-500',
      'bg-orange-400', 'bg-purple-400', 'bg-blue-400', 'bg-green-400', 'bg-red-400'
    ];
    
    // Create a simple hash from the subcategory string to ensure consistent colors
    let hash = 0;
    for (let i = 0; i < subCategory.length; i++) {
      hash = ((hash << 5) - hash) + subCategory.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Fetch chat messages - always fetch when chat is accessed
  const { data: chatMessages = [], isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/events', event.id, 'messages', 'v2'], // Added v2 to force cache invalidation
    queryFn: async () => {
      console.log('Fetching messages for event:', event.id);
      const response = await apiRequest(`/api/events/${event.id}/messages?limit=1000`);
      console.log('Messages fetch response:', response.status);
      const messages = await response.json() as ChatMessageWithUser[];
      console.log('Received messages for event', event.id, ':', messages.length, 'messages');
      return messages;
    },
    enabled: hasChatAccess,
    staleTime: 0, // Always refetch when needed
    refetchOnWindowFocus: false,
    refetchInterval: false, // Disable auto-refresh, rely on WebSocket for real-time updates
  });

  // WebSocket connection for real-time chat - always connect when component is active
  const { isConnected, messages: wsMessages, sendMessage, setMessages: setWsMessages } = useWebSocket(
    hasChatAccess && isActive ? event.id : null
  );

  // Fetch favorite messages
  const { data: favoriteMessages = [], isLoading: isLoadingFavorites, refetch: refetchFavorites } = useQuery({
    queryKey: ['/api/events', event.id, 'favorites'],
    queryFn: async () => {
      const response = await apiRequest(`/api/events/${event.id}/favorites`);
      const messages = await response.json() as ChatMessageWithUser[];
      return messages;
    },
    enabled: hasChatAccess,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });



  // Add favorite message mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest(`/api/events/${event.id}/messages/${messageId}/favorite`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to favorite message');
      }
      return response.json();
    },
    onSuccess: (_, messageId) => {
      // Invalidate messages cache to update favorites display
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id, 'favorites'] });
      refetchFavorites();
    },
    onError: (error) => {
      console.error('Failed to favorite message:', error);
    },
  });

  // Remove favorite message mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest(`/api/events/${event.id}/messages/${messageId}/favorite`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove favorite message');
      }
    },
    onSuccess: (_, messageId) => {
      // Invalidate messages cache to update favorites display
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id, 'favorites'] });
      refetchFavorites();
    },
    onError: (error) => {
      console.error('Failed to remove favorite message:', error);
    },
  });

  // Exit group chat mutation (leave chat but keep RSVP)
  const exitGroupChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/events/${event.id}/leave-chat`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to leave group chat');
      }
      return response;
    },
    onSuccess: () => {
      // Force remove cache to ensure fresh data
      queryClient.removeQueries({ queryKey: ['/api/users', user?.id, 'events'] });
      queryClient.removeQueries({ queryKey: ['/api/users', user?.id, 'group-chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      // Navigate back since user no longer has chat access
      if (onBackClick) {
        onBackClick();
      }
    },
    onError: (error) => {
      console.error('Failed to leave group chat:', error);
    },
  });

  // Quote message handler
  const handleQuoteMessage = (message: ChatMessageWithUser) => {
    setQuotedMessage(message);
    // Focus on the input field after setting quote
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 100);
  };

  // Clear quote handler
  const clearQuote = () => {
    setQuotedMessage(null);
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { message: string; quotedMessageId?: number }) => {
      console.log('Sending message:', messageData, 'to event:', event.id);
      // Always use HTTP API for reliability
      const response = await apiRequest(`/api/events/${event.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      console.log('Message sent response:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      // Check if response has content before parsing
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (text) {
          return JSON.parse(text) as ChatMessageWithUser;
        }
      }
      
      // If no JSON response, return null and trigger refetch
      return null;
    },
    onSuccess: (data) => {
      console.log('Message sent successfully:', data);
      // Clear quote after sending
      setQuotedMessage(null);
      // Invalidate notifications to update unread counts
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      // Invalidate group chats to refresh activity-based sorting when user sends a message
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'group-chats'] });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });

  // Use messages from React Query directly to avoid state management issues
  const allMessages = useMemo(() => {
    // Combine API messages with WebSocket messages
    const combined = [...(chatMessages || []), ...wsMessages];
    
    // Remove duplicates by message ID
    const uniqueMessages = combined.filter((msg, index, array) => 
      array.findIndex(m => m.id === msg.id) === index
    );
    
    // Sort by creation time
    return uniqueMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [chatMessages, wsMessages]);

  // Use fetched similar events if available, otherwise fall back to prop
  const similarEvents = fetchedSimilarEvents.length > 0 ? fetchedSimilarEvents : propSimilarEvents;
  


  // Scroll to bottom when new messages arrive or when entering chat
  useEffect(() => {
    if (activeTab === 'chat' && allMessages.length > 0) {
      // Use a small delay to ensure messages are rendered first
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [allMessages.length, activeTab, scrollToBottom]);

  // Reset tab and clear state when event changes
  useEffect(() => {
    console.log('EventContentCard: Event changed to', event.id);
    setActiveTab(initialTab);
    setNewMessage(''); // Clear any pending message
    // Don't reset favorited messages set - let the favorites query handle it
  }, [event.id, initialTab]);

  // Mark event as read when entering the component
  useEffect(() => {
    if (isActive && hasChatAccess) {
      markEventAsRead(event.id);
    }
  }, [isActive, event.id, hasChatAccess]); // Remove markEventAsRead from dependencies to prevent infinite loop



  // Notify parent when tab changes
  const handleTabChange = (tab: 'chat' | 'similar' | 'favorites') => {
    console.log('Tab changed to:', tab, 'for event:', event.id);
    setActiveTab(tab);
    onTabChange?.(tab);
    
    // Refetch messages and mark as read when switching to chat tab
    if (tab === 'chat' && hasChatAccess) {
      refetchMessages();
      // Mark event as read when actively opening chat
      markEventAsRead(event.id);
      // Scroll to bottom when entering chat - use longer delay to account for animation
      setTimeout(() => {
        scrollToBottom();
      }, 400);
    }
    
    // Refetch favorites when switching to favorites tab
    if (tab === 'favorites' && hasChatAccess) {
      refetchFavorites();
    }
  };

  const formatDateTime = (dateStr: string, timeStr: string) => {
    // Parse the date string as local time to avoid timezone issues
    const [year, month, day] = dateStr.split('-');
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      const messageData = {
        message: newMessage,
        quotedMessageId: quotedMessage?.id
      };
      // Clear quote immediately when sending
      setQuotedMessage(null);
      sendMessageMutation.mutate(messageData);
      setNewMessage('');
      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  };

  const handleKeepExploring = () => {
    setIsButtonClicked(true);
    setTimeout(() => {
      onSwipeRight();
      setIsButtonClicked(false);
    }, 800);
  };

  const handleExitGroupChat = () => {
    if (confirm('Are you sure you want to leave this group chat? You will no longer receive messages from this event.')) {
      exitGroupChatMutation.mutate();
    }
  };

  return (
    <div className="relative w-full h-full p-2">
      <div
        className={`bg-white overflow-hidden transform transition-all duration-300 rounded-2xl shadow-xl ${
          isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-50'
        }`}
        style={{
          height: '100%', // Full height for better screen utilization
          zIndex: isActive ? 10 : 1
        }}
      >
        {/* Top padding for better spacing */}
        <div className="h-6"></div>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-6 text-white mx-4 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBackClick}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h3 className="font-semibold text-lg">
                  {event.isPrivateChat ? 'Private Chat' : (
                    <button
                      onClick={() => setShowEventDetail(true)}
                      className="text-left hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      {event.title}
                    </button>
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  {!event.isPrivateChat && (
                    <button 
                      onClick={() => setShowMembersModal(true)}
                      className="text-sm opacity-90 hover:opacity-100 hover:underline cursor-pointer transition-opacity"
                    >
                      {event.rsvpCount + 1} members
                    </button>
                  )}
                  {event.isPrivateChat && (
                    <span className="text-sm opacity-90">1-on-1 chat</span>
                  )}
                  {event.subCategory && !event.isPrivateChat && (
                    <>
                      <span className="text-xs opacity-70">•</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getSubCategoryColor(event.subCategory)} text-white font-medium`}>
                        {event.subCategory}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {/* Exit Chat Button - For all chats (group and private) */}
            {hasChatAccess && (
              <button
                onClick={handleExitGroupChat}
                disabled={exitGroupChatMutation.isPending}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-colors border border-red-300/50 text-white"
                title={event.isPrivateChat ? "Leave private chat" : "Leave group chat"}
              >
                <div className="flex items-center space-x-1">
                  {exitGroupChatMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      <span className="text-xs font-medium">Exit</span>
                    </>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mx-4 mt-6">
          <button
            onClick={() => handleTabChange('chat')}
            className={`${event.isPrivateChat ? 'w-1/2' : 'flex-1'} py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 ${
              activeTab === 'chat' 
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{event.isPrivateChat ? 'Private Chat' : 'Group Chat'}</span>
          </button>
          <button
            onClick={() => handleTabChange('favorites')}
            className={`${event.isPrivateChat ? 'w-1/2' : 'flex-1'} py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 ${
              activeTab === 'favorites' 
                ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Favorites</span>
          </button>
          {!event.isPrivateChat && (
            <button
              onClick={() => handleTabChange('similar')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 ${
                activeTab === 'similar' 
                  ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Similar Events</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden mx-4" style={{ 
          height: 'calc(100vh - 220px)' // Optimized height for better screen utilization
        }}>
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
                onAnimationComplete={() => {
                  // Ensure scroll happens after animation completes
                  setTimeout(() => {
                    scrollToBottom();
                  }, 50);
                }}
              >
                {/* Messages */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto px-8 py-6 space-y-4"
                >
                  {isLoadingMessages ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="text-gray-500 text-sm mt-2">Loading messages...</p>
                    </div>
                  ) : allMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    allMessages.map((msg, index) => {
                      const isOwnMessage = msg.user.id === user?.id;
                      const currentTime = new Date(msg.createdAt);
                      const previousTime = index > 0 ? new Date(allMessages[index - 1].createdAt) : null;
                      
                      // Check if we should show timestamp (30+ minutes gap or first message)
                      const shouldShowTime = !previousTime || 
                        (currentTime.getTime() - previousTime.getTime()) >= 30 * 60 * 1000;
                      
                      return (
                        <div key={msg.id}>
                          {/* Timestamp separator */}
                          {shouldShowTime && (
                            <div className="flex justify-center mb-4">
                              <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                                {currentTime.toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                              </span>
                            </div>
                          )}
                          
                          {/* Message */}
                          <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                              {/* User name */}
                              <div className={`flex items-center mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                <span className="font-normal text-xs text-gray-500">
                                  {msg.user.firstName} {msg.user.lastName}
                                </span>
                              </div>
                              
                              {/* Avatar and message bubble */}
                              <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                                <AnimeAvatar 
                                  seed={msg.user.animeAvatarSeed} 
                                  size="sm"
                                  customAvatarUrl={msg.user.customAvatarUrl}
                                  clickable={msg.user.id !== user?.id}
                                  behavior="profile"
                                  user={msg.user}
                                />
                                <div className={`${isOwnMessage ? 'text-right' : 'text-left'} group relative min-w-0`}>
                                  <div className={`text-sm px-3 py-2 rounded-lg inline-block text-left min-w-0 ${
                                    isOwnMessage 
                                      ? 'bg-purple-500 text-white rounded-br-none' 
                                      : 'bg-gray-100 text-gray-700 rounded-bl-none'
                                  }`}>
                                    {/* Quoted message display */}
                                    {msg.quotedMessage && (
                                      <div className={`mb-2 p-2 border-l-2 rounded text-xs opacity-80 ${
                                        isOwnMessage 
                                          ? 'border-purple-200 bg-purple-400' 
                                          : 'border-gray-400 bg-gray-200 text-gray-600'
                                      }`}>
                                        <div className="break-words whitespace-pre-wrap">
                                          <span className="font-medium">
                                            {msg.quotedMessage.user.firstName} {msg.quotedMessage.user.lastName}:
                                          </span>
                                          {' '}
                                          <span className="break-words">{msg.quotedMessage.message}</span>
                                        </div>
                                      </div>
                                    )}
                                    <div className="break-words whitespace-pre-wrap overflow-wrap-anywhere force-word-wrap">
                                      {msg.message}
                                    </div>
                                    
                                    {/* Favorites display - show if message has favorites */}
                                    {msg.favorites && msg.favorites.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-200/50">
                                        <div className="flex items-center space-x-2">
                                          <div className="flex items-center space-x-1">
                                            <Heart className="w-3 h-3 text-red-500 fill-current" />
                                            <span className="text-xs text-gray-500">
                                              {msg.favorites.length} {msg.favorites.length === 1 ? 'favorite' : 'favorites'}
                                            </span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-500">by</span>
                                            <div className="flex items-center space-x-1">
                                              {msg.favorites.slice(0, 3).map((favorite, index) => (
                                                <span key={favorite.user.id} className="text-xs text-gray-600 font-medium">
                                                  {favorite.user.firstName}
                                                  {index < Math.min(msg.favorites!.length, 3) - 1 ? ',' : ''}
                                                </span>
                                              ))}
                                              {msg.favorites.length > 3 && (
                                                <span className="text-xs text-gray-500">
                                                  and {msg.favorites.length - 3} others
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Action buttons - show for all messages */}
                                  <div className={`absolute ${isOwnMessage ? '-left-16' : '-right-16'} top-1/2 transform -translate-y-1/2 flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} space-x-1`}>
                                    <button
                                      onClick={() => handleQuoteMessage(msg)}
                                      className={`p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}
                                      title="Quote this message"
                                    >
                                      <Quote className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const isCurrentlyFavorited = msg.favorites?.some(fav => fav.user.id === user?.id) || false;
                                        console.log('Heart button clicked for message', msg.id, 'is favorited:', isCurrentlyFavorited);
                                        if (isCurrentlyFavorited) {
                                          removeFavoriteMutation.mutate(msg.id);
                                        } else {
                                          addFavoriteMutation.mutate(msg.id);
                                        }
                                      }}
                                      disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                                      className={`p-1 hover:bg-gray-100 rounded-full transition-all duration-200 ${
                                        msg.favorites?.some(fav => fav.user.id === user?.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                      }`}
                                      title={msg.favorites?.some(fav => fav.user.id === user?.id) ? "Remove from favorites" : "Add to favorites"}
                                    >
                                      <Heart className={`w-4 h-4 transition-colors ${
                                        msg.favorites?.some(fav => fav.user.id === user?.id) 
                                          ? 'text-red-500 fill-current' 
                                          : 'text-gray-500 hover:text-red-500'
                                      }`} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Input - Always visible with proper padding */}
                <div className="border-t border-gray-200 bg-white shadow-lg mx-4 mb-4 rounded-xl">
                  {/* Quote preview */}
                  {quotedMessage && (
                    <div className="px-8 pt-5 pb-4 bg-blue-50 border-b border-blue-200 rounded-t-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-xs text-blue-600 font-medium mb-1">
                            Replying to {quotedMessage.user.firstName} {quotedMessage.user.lastName}
                          </div>
                          <div className="text-sm text-gray-700 bg-white px-3 py-2 rounded border-l-2 border-blue-400 break-words whitespace-pre-wrap">
                            {quotedMessage.message}
                          </div>
                        </div>
                        <button
                          onClick={clearQuote}
                          className="ml-2 p-1 hover:bg-blue-100 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="px-8 py-5">
                    <div className="flex items-start space-x-4">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder={quotedMessage ? "Reply to message..." : "Type a message..."}
                        className="flex-1 px-5 py-3 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 transition-colors resize-none overflow-hidden break-words whitespace-pre-wrap force-word-wrap"
                        style={{
                          minHeight: '48px',
                          maxHeight: '120px',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                        rows={1}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        className="px-5 py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      >
                        {sendMessageMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'similar' ? (
              <motion.div
                key="similar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto px-8 py-6"
              >
                <div className="space-y-4">
                  {similarEvents.length > 0 ? (
                    similarEvents.slice(0, 3).map((similarEvent) => (
                      <button
                        key={similarEvent.id}
                        onClick={() => setSelectedSimilarEvent(similarEvent)}
                        className="w-full border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                      >
                        <div className="flex space-x-3">
                          <img
                            src={getEventImageUrl(similarEvent)}
                            alt={similarEvent.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-800 text-sm hover:text-purple-600 transition-colors">{similarEvent.title}</h4>
                              {/* Match type indicator */}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                similarEvent.subCategory === event.subCategory 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {similarEvent.subCategory === event.subCategory ? 'Same type' : 'Same category'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDateTime(similarEvent.date, similarEvent.time)}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{similarEvent.location}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Users className="w-3 h-3" />
                                <span>{similarEvent.rsvpCount + 1} attending</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <DollarSign className="w-3 h-3" />
                                <span>
                                  {similarEvent.isFree || parseFloat(similarEvent.price) === 0 
                                    ? 'Free' 
                                    : `$${parseFloat(similarEvent.price).toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No similar events found</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : activeTab === 'favorites' ? (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                  {isLoadingFavorites ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="text-gray-500 text-sm mt-2">Loading favorites...</p>
                    </div>
                  ) : favoriteMessages.length > 0 ? (
                    favoriteMessages.map((message) => (
                      <div
                        key={message.id}
                        className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <AnimeAvatar 
                          seed={message.user.animeAvatarSeed} 
                          size="sm"
                          customAvatarUrl={message.user.customAvatarUrl}
                          behavior="profile"
                          user={message.user}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900 text-sm">
                              {message.user.firstName} {message.user.lastName}
                            </p>
                            <span className="text-xs text-gray-500">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Quoted message if exists */}
                          {message.quotedMessage && (
                            <div className="mt-2 p-2 bg-gray-200 rounded-lg text-sm">
                              <p className="text-gray-600">
                                <span className="font-medium">{message.quotedMessage.user.firstName}:</span> {message.quotedMessage.message}
                              </p>
                            </div>
                          )}
                          
                          <p className="text-gray-800 text-sm mt-1 break-words whitespace-pre-wrap overflow-wrap-anywhere">
                            {message.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <Heart className="w-4 h-4 text-red-500 fill-current" />
                              <span className="text-xs text-gray-500">
                                Favorited by {message.favorites?.length || 0} {message.favorites?.length === 1 ? 'person' : 'people'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {message.favorites?.slice(0, 3).map((favorite, index) => (
                                <span key={favorite.user.id} className="text-xs text-gray-600 font-medium">
                                  {favorite.user.firstName}
                                  {index < Math.min(message.favorites!.length, 3) - 1 ? ',' : ''}
                                </span>
                              ))}
                              {message.favorites && message.favorites.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{message.favorites.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No favorite messages yet</p>
                      <p className="text-gray-400 text-xs mt-2">
                        Messages favorited by any member will appear here
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">Select a tab to view content</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Keep Exploring Button - Bottom right with spacing */}
        {showKeepExploring && !isHomeLayoutActive && (
          <div className="absolute bottom-12 right-4 z-30">
            <button
              onClick={handleKeepExploring}
              className={`bg-blue-500 text-white px-10 py-5 rounded-full text-lg font-semibold shadow-lg hover:bg-blue-600 transition-all duration-700 ${
                isButtonClicked ? 'scale-125 rotate-12 bg-green-500' : 'hover:scale-105'
              }`}
            >
              {isButtonClicked ? '🚀' : 'Keep Exploring'}
            </button>
          </div>
        )}
      </div>

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Event Members</h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Show organizer first */}
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <AnimeAvatar 
                  seed={event.organizer.animeAvatarSeed} 
                  size="sm"
                  customAvatarUrl={event.organizer.customAvatarUrl}
                  behavior="profile"
                  user={event.organizer}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {event.organizer.firstName} {event.organizer.lastName}
                  </p>
                  <p className="text-sm text-blue-600">Organizer</p>
                </div>
              </div>

              {/* Show attendees */}
              {attendees.filter(attendee => attendee.id !== event.organizerId).map((attendee) => (
                <div key={attendee.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                  <AnimeAvatar 
                    seed={attendee.animeAvatarSeed} 
                    size="sm"
                    customAvatarUrl={attendee.customAvatarUrl}
                    behavior="profile"
                    user={attendee}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {attendee.firstName} {attendee.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Member</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                {event.rsvpCount + 1} total members
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EventDetail Modal for Similar Events */}
      {selectedSimilarEvent && (
        <EventDetail
          event={selectedSimilarEvent}
          onClose={() => setSelectedSimilarEvent(null)}
          fromPage="event-content"
        />
      )}

      {/* EventDetail Modal for Current Event (from title click) */}
      {showEventDetail && (
        <EventDetail
          event={event}
          onClose={() => setShowEventDetail(false)}
          fromPage="event-content"
          showActionButtons={false}
        />
      )}
    </div>
  );
}