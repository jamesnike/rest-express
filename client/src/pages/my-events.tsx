import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, MapPin, MessageCircle, Clock, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import BottomNav from "@/components/BottomNav";
import EventCard from "@/components/EventCard";
import EventDetail from "@/components/EventDetail";
import CreateEvent from "@/components/CreateEvent";
import AnimeAvatar from "@/components/AnimeAvatar";
import { EventWithOrganizer } from "@shared/schema";

export default function MyEvents() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { unreadByEvent, markEventAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<'organized' | 'attending' | 'messages' | 'saved'>('messages');
  const [selectedEvent, setSelectedEvent] = useState<EventWithOrganizer | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [, setLocation] = useLocation();
  const [messagesTabFirstAccess, setMessagesTabFirstAccess] = useState(true);

  // Check URL for tab parameter and set active tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'messages' || tabParam === 'organized' || tabParam === 'attending' || tabParam === 'saved') {
      setActiveTab(tabParam as 'organized' | 'attending' | 'messages' | 'saved');
    }
  }, []);

  // Force refresh when component mounts to show latest data
  useEffect(() => {
    if (user?.id) {
      // Manually trigger refetch for all queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id, "events"] });
    }
  }, [user?.id]);

  const { data: organizedEvents, isLoading: isLoadingOrganized } = useQuery({
    queryKey: ["/api/users", user?.id, "events", "organized", "current"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/events?type=organized&pastOnly=false`);
      if (!response.ok) throw new Error('Failed to fetch organized events');
      return response.json() as Promise<EventWithOrganizer[]>;
    },
    enabled: !!user?.id,
    staleTime: 0, // Don't cache - always fetch fresh data
    gcTime: 0, // Don't keep in cache
    refetchOnMount: true, // Always refetch when mounting
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const { data: attendingEvents, isLoading: isLoadingAttending } = useQuery({
    queryKey: ["/api/users", user?.id, "events", "attending", "current"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/events?type=attending&pastOnly=false`);
      if (!response.ok) throw new Error('Failed to fetch attending events');
      return response.json() as Promise<EventWithOrganizer[]>;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true, // Always refetch when mounting
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Saved events query
  const { data: savedEvents, isLoading: isLoadingSaved } = useQuery({
    queryKey: ["/api/users", user?.id, "saved-events"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/saved-events`);
      if (!response.ok) throw new Error('Failed to fetch saved events');
      return response.json() as Promise<EventWithOrganizer[]>;
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnMount: true, // Always refetch when mounting
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Group chats are events where user can participate in chat (hasn't left chat)
  const { data: groupChats, isLoading: isLoadingGroupChats, refetch: refetchGroupChats } = useQuery({
    queryKey: ["/api/users", user?.id, "group-chats"],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const response = await apiRequest(`/api/users/${user.id}/group-chats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch group chats');
      }
      
      const events = await response.json() as EventWithOrganizer[];
      
      // Server already sorts by most recent activity, no need for client-side sorting
      return events;
    },
    enabled: !!user?.id,
    staleTime: 0, // Don't cache - always get fresh activity sorting
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnMount: false, // Don't refetch on mount - use cache first
    refetchOnWindowFocus: false, // Don't refetch on window focus - use cache first
    refetchInterval: activeTab === 'messages' ? 10000 : false, // Auto-refresh every 10 seconds when messages tab is active for real-time reordering
  });

  // Handle Messages tab access - trigger background refresh on first access
  useEffect(() => {
    if (activeTab === 'messages' && messagesTabFirstAccess && user?.id) {
      // Trigger background refresh without showing loading state
      setTimeout(() => {
        refetchGroupChats();
        setMessagesTabFirstAccess(false);
      }, 100); // Small delay to ensure cache is shown first
    }
  }, [activeTab, messagesTabFirstAccess, user?.id, refetchGroupChats]);

  // Fetch attendees for each group chat event (for avatar display)
  const { data: attendeesMap = {} } = useQuery({
    queryKey: ['/api/events', 'attendees', groupChats?.map(e => e.id)],
    queryFn: async () => {
      if (!groupChats || groupChats.length === 0) return {};
      
      const attendeesMap: Record<number, any[]> = {};
      
      // Fetch attendees for each event
      await Promise.all(
        groupChats.map(async (event) => {
          try {
            const response = await apiRequest(`/api/events/${event.id}/attendees`);
            attendeesMap[event.id] = await response.json();
          } catch (error) {
            console.error(`Failed to fetch attendees for event ${event.id}:`, error);
            attendeesMap[event.id] = [];
          }
        })
      );
      
      return attendeesMap;
    },
    enabled: !!groupChats && groupChats.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const removeRsvpMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest(`/api/events/${eventId}/rsvp`, { 
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "attending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "group-chats"] });
      toast({
        title: "Removed from attending",
        description: "You're no longer attending this event.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Sign In",
          description: "You need to sign in to remove events.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest(`/api/events/${eventId}`, { 
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "organized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "group-chats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Event Cancelled",
        description: "Your event has been cancelled successfully.",
        duration: 2000,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Sign In",
          description: "You need to sign in to manage your events.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to cancel event. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentEvents = activeTab === 'organized' ? organizedEvents : 
                       activeTab === 'attending' ? attendingEvents : 
                       activeTab === 'saved' ? savedEvents :
                       groupChats;

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 text-center relative">
        <h2 className="text-lg font-semibold">My Events</h2>
        {/* Subtle loading indicator when refetching (but not initial loading) */}
        {((activeTab === 'organized' && isLoadingOrganized && organizedEvents) || 
          (activeTab === 'attending' && isLoadingAttending && attendingEvents) ||
          (activeTab === 'saved' && isLoadingSaved && savedEvents) ||
          (activeTab === 'messages' && isLoadingGroupChats && groupChats)) && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 opacity-60"></div>
          </div>
        )}
      </header>
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button 
            onClick={() => {
              setActiveTab('messages');
              setSelectedEvent(null);
              // Reset first access flag to trigger background refresh
              if (activeTab !== 'messages') {
                setMessagesTabFirstAccess(true);
              }
            }}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'messages' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-600'
            }`}
          >
            Messages
          </button>
          <button 
            onClick={() => {
              setActiveTab('attending');
              setSelectedEvent(null);
            }}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'attending' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-600'
            }`}
          >
            Attending
          </button>
          <button 
            onClick={() => {
              setActiveTab('organized');
              setSelectedEvent(null);
            }}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'organized' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-600'
            }`}
          >Organizing</button>
          <button 
            onClick={() => {
              setActiveTab('saved');
              setSelectedEvent(null);
            }}
            className={`flex-1 py-3 text-center font-medium ${
              activeTab === 'saved' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-600'
            }`}
          >
            Saved
          </button>
        </div>
      </div>
      {/* Events List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'messages' ? (
          // Messages Tab Content
          (!groupChats || groupChats.length === 0 ? (
            // Only show loading for messages tab if no cached data and currently loading
            isLoadingGroupChats && !groupChats ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-500 text-sm mt-2">Loading group chats...</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  No Group Chats
                </h3>
                <p className="text-gray-600">
                  Join events or organize your own to start chatting with other attendees!
                </p>
              </div>
            )
          ) : (<div className="space-y-1">
            {groupChats.map((event) => (
              <div 
                key={event.id}
                onClick={() => {
                  // Mark event as read when user clicks on group chat
                  markEventAsRead(event.id);
                  
                  // Set navigation flag for Messages tab
                  localStorage.setItem('fromMessagesTab', 'true');
                  
                  // Navigate directly to EventContent page with chat tab active
                  setLocation(`/event/${event.id}?tab=chat`);
                }}
                className="flex items-center p-4 bg-white hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 mr-3">
                  {event.isPrivateChat ? (
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {event.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {/* Unread badge */}
                      {(() => {
                        const unreadCount = unreadByEvent.find(u => u.eventId === event.id)?.unreadCount || 0;
                        return unreadCount > 0 ? (
                          <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center font-medium">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        ) : null;
                      })()}
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center">
                      <div className="flex -space-x-1 mr-2">
                        {/* Show organizer first */}
                        <AnimeAvatar 
                          seed={event.organizer.animeAvatarSeed} 
                          size="xs" 
                          customAvatarUrl={event.organizer.customAvatarUrl} 
                        />
                        {/* Show attendee avatars (up to 5 more for total of 6), excluding organizer */}
                        {attendeesMap[event.id] && attendeesMap[event.id]
                          .filter(attendee => attendee.id !== event.organizerId)
                          .slice(0, 5)
                          .map((attendee, index) => (
                            <AnimeAvatar 
                              key={`${event.id}-${attendee.id}-${index}`}
                              seed={attendee.animeAvatarSeed} 
                              size="xs" 
                              customAvatarUrl={attendee.customAvatarUrl}
                            />
                          ))}
                        {/* Show count indicator if more than 6 members */}
                        {event.rsvpCount > 5 && (
                          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            +{event.rsvpCount - 5}
                          </div>
                        )}
                      </div>
                      {!event.isPrivateChat && (
                        <span className="text-xs text-gray-500">
                          {event.rsvpCount + 1} members
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {event.isPrivateChat ? (
                        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                          Private
                        </span>
                      ) : user?.id === event.organizerId ? (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {new Date(event.date + 'T' + event.time) < new Date() ? 'Organized' : 'Organizing'}
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {new Date(event.date + 'T' + event.time) < new Date() ? 'Attended' : 'Attending'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>))
        ) : (
          // Regular Events Tab Content
          (!currentEvents || currentEvents.length === 0 ? (
            // Only show loading if no cached data and currently loading
            (((activeTab === 'organized' && isLoadingOrganized) || 
              (activeTab === 'attending' && isLoadingAttending) ||
              (activeTab === 'saved' && isLoadingSaved) ||
              (activeTab === 'messages' && isLoadingGroupChats)) && !currentEvents) ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-500 text-sm mt-2">Loading events...</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {activeTab === 'organized' ? 'No Events Created' : 
                   activeTab === 'attending' ? 'No Events Attending' :
                   activeTab === 'saved' ? 'No Saved Events' :
                   'No Events'}
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'organized' 
                    ? 'Create your first event to get started!'
                    : activeTab === 'attending' 
                    ? 'Browse events and start attending some!'
                    : activeTab === 'saved'
                    ? 'Save events you want to attend later!'
                    : 'Start organizing or attending events!'
                  }
                </p>
              </div>
            )
          ) : (<div className="space-y-2">
            {currentEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onEventClick={() => setSelectedEvent(event)}
                showStatus={activeTab === 'organized' ? 'hosting' : 'attending'}
                onRemoveClick={activeTab === 'organized' ? () => cancelEventMutation.mutate(event.id) : 
                              activeTab === 'attending' ? () => removeRsvpMutation.mutate(event.id) : 
                              activeTab === 'saved' ? undefined : undefined}
              />
            ))}
          </div>))
        )}
      </div>
      {/* Bottom Navigation */}
      <BottomNav 
        currentPage="my-events" 
        onCreateEvent={() => setShowCreateEvent(true)}
      />
      {/* Modals */}
      {showCreateEvent && (
        <CreateEvent onClose={() => setShowCreateEvent(false)} />
      )}
      {selectedEvent && (
        <EventDetail 
          event={selectedEvent} 
          onClose={() => setSelectedEvent(null)} 
          showGroupChatButton={true}
          fromPage="my-events"
          onBack={() => setSelectedEvent(null)}
          onNavigateToContent={() => {
            // Navigate to Home page with the event content
            // Store the event ID in localStorage so Home page can pick it up
            localStorage.setItem('eventContentId', selectedEvent.id.toString());
            // Set preferred tab to chat for group chat access
            localStorage.setItem('preferredTab', 'chat');
            // Store flag to indicate coming from MyEvents for back button
            localStorage.setItem('fromMyEvents', 'true');
            // Store current tab to return to the correct tab
            localStorage.setItem('returnToMyEventsTab', activeTab);
            setLocation('/');
          }}
        />
      )}
    </div>
  );
}
