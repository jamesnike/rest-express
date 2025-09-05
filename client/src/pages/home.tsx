import { useState, useEffect, startTransition, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Bell, Music, Activity, Palette, UtensilsCrossed, Laptop, X, Heart, RotateCcw, ArrowRight, ArrowLeft, Edit, Navigation } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import SwipeCard from "@/components/SwipeCard";
import EventDetailCard from "@/components/EventDetailCard";
import EventContentCard from "@/components/EventContentCard";
import CelebrationAnimation from "@/components/CelebrationAnimation";
import SkipAnimation from "@/components/SkipAnimation";
import CreateEvent from "@/components/CreateEvent";
import EventDetail from "@/components/EventDetail";
import BottomNav from "@/components/BottomNav";
import AnimeAvatar from "@/components/AnimeAvatar";
import { EventWithOrganizer } from "@shared/schema";

// Helper functions for state persistence
const saveHomeState = (state: any) => {
  try {
    localStorage.setItem('homePageState', JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save home state:', error);
  }
};

const loadHomeState = () => {
  try {
    const saved = localStorage.getItem('homePageState');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load home state:', error);
    return null;
  }
};

const clearHomeState = () => {
  try {
    localStorage.removeItem('homePageState');
  } catch (error) {
    console.error('Failed to clear home state:', error);
  }
};

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { totalUnread } = useNotifications();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Initialize state - always start with Event Card page when refreshed
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithOrganizer | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(() => {
    // Check if coming from other pages with specific event
    const eventContentId = localStorage.getItem('eventContentId');
    if (eventContentId) {
      const saved = loadHomeState();
      return saved?.currentEventIndex || 0;
    }
    // Always start at 0 for fresh page loads
    return 0;
  });
  const [swipedEvents, setSwipedEvents] = useState<Set<number>>(() => {
    // Check if coming from other pages with specific event
    const eventContentId = localStorage.getItem('eventContentId');
    if (eventContentId) {
      const saved = loadHomeState();
      return saved?.swipedEvents ? new Set(saved.swipedEvents) : new Set();
    }
    // Always start fresh for page refreshes
    return new Set();
  });
  // Remove skipped events and counter from localStorage state - now handled by database
  const [showDetailCard, setShowDetailCard] = useState(false); // Always start with Event Card
  const [showContentCard, setShowContentCard] = useState(false); // Always start with Event Card
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSkipAnimation, setShowSkipAnimation] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Removed isSkippingInProgress - no need to block interactions during animation
  const [lastSkipTime, setLastSkipTime] = useState(0);
  const [skipQueue, setSkipQueue] = useState<Set<number>>(new Set());
  const [eventBeingSkipped, setEventBeingSkipped] = useState<number | null>(null);
  const [lastActiveTab, setLastActiveTab] = useState<'chat' | 'similar'>(() => {
    const saved = loadHomeState();
    return saved?.lastActiveTab || 'chat';
  });
  const [isFromMyEvents, setIsFromMyEvents] = useState(false);
  const [isFromBrowse, setIsFromBrowse] = useState(false);
  const [isFromMessagesTab, setIsFromMessagesTab] = useState(false);
  const [eventFromMyEvents, setEventFromMyEvents] = useState<EventWithOrganizer | null>(null);
  const [groupChatEvent, setGroupChatEvent] = useState<EventWithOrganizer | null>(null);
  // Location editing state
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const availableInterests = [
    { id: 'music', name: 'Music', icon: Music },
    { id: 'sports', name: 'Sports', icon: Activity },
    { id: 'arts', name: 'Arts', icon: Palette },
    { id: 'food', name: 'Food', icon: UtensilsCrossed },
    { id: 'tech', name: 'Tech', icon: Laptop },
    { id: 'photography', name: 'Photography', icon: Activity },
    { id: 'travel', name: 'Travel', icon: Activity },
    { id: 'fitness', name: 'Fitness', icon: Activity },
    { id: 'gaming', name: 'Gaming', icon: Activity },
    { id: 'reading', name: 'Reading', icon: Activity },
  ];

  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      // For home page swipe interface, show all events for broader discovery
      const response = await fetch("/api/events?limit=50");
      return response.json() as Promise<EventWithOrganizer[]>;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Reset to Event Card view when page is refreshed (unless coming from other pages)
  useEffect(() => {
    const eventContentId = localStorage.getItem('eventContentId');
    const fromMessagesTab = localStorage.getItem('fromMessagesTab');
    
    // If no specific event navigation, ensure we start with Event Card view
    if (!eventContentId) {
      setShowDetailCard(false);
      setShowContentCard(false);
      setSelectedEvent(null);
      setCurrentEventIndex(0);
      setSwipedEvents(new Set());
      clearHomeState();
    } else if (fromMessagesTab === 'true') {
      // For Messages tab navigation, ensure we start with correct state
      setShowDetailCard(false);
      setShowContentCard(false); // Will be set to true by handleEventNavigation
      setSelectedEvent(null);
    }
  }, []);  // Only run once on mount

  // Reset to main swipe interface when navigating to home page
  useEffect(() => {
    const handleHomeNavigation = () => {
      // Check if we're on the home page and there's no specific event navigation
      const eventContentId = localStorage.getItem('eventContentId');
      const fromMessagesTab = localStorage.getItem('fromMessagesTab');
      const fromMyEvents = localStorage.getItem('fromMyEvents');
      const fromBrowse = localStorage.getItem('fromBrowse');
      
      if (!eventContentId && !fromMessagesTab && !fromMyEvents && !fromBrowse && 
          window.location.pathname === '/') {
        // Reset to main swipe interface
        setShowDetailCard(false);
        setShowContentCard(false);
        setSelectedEvent(null);
        setIsFromMyEvents(false);
        setIsFromBrowse(false);
        setIsFromMessagesTab(false);
        setGroupChatEvent(null);
        setEventFromMyEvents(null);
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleHomeNavigation);
    
    // Check immediately when component mounts
    handleHomeNavigation();
    
    return () => {
      window.removeEventListener('popstate', handleHomeNavigation);
    };
  }, []);  // Only run once on mount

  // Check for event ID from localStorage (when navigating from other pages)
  useEffect(() => {
    const eventContentId = localStorage.getItem('eventContentId');
    const selectedEventId = localStorage.getItem('selectedEventId');
    const showEventDetail = localStorage.getItem('showEventDetail');
    const fromMyEvents = localStorage.getItem('fromMyEvents');
    const fromBrowse = localStorage.getItem('fromBrowse');
    const fromMessagesTab = localStorage.getItem('fromMessagesTab');
    const fromEventContent = localStorage.getItem('fromEventContent');
    const preferredTab = localStorage.getItem('preferredTab');
    const reopenEventDetailId = localStorage.getItem('reopenEventDetailId');
    const showEventContent = localStorage.getItem('showEventContent');
    const eventContentTab = localStorage.getItem('eventContentTab');
    const forceEventId = localStorage.getItem('forceEventId');
    
    // Handle EventDetail RSVP navigation to EventContent within Home page
    if (showEventContent === 'true' && forceEventId && events) {
      console.log('🏠 Home page - handling EventDetail RSVP navigation to EventContent');
      console.log('🏠 Home page - localStorage flags detected:', {
        showEventContent,
        eventContentTab,
        forceEventId,
        fromHomeEventDetail: localStorage.getItem('fromHomeEventDetail'),
        preventHomeAdvancement: localStorage.getItem('preventHomeAdvancement')
      });
      
      const eventId = parseInt(forceEventId);
      const eventIndex = events.findIndex(e => e.id === eventId);
      
      if (eventIndex !== -1) {
        const event = events[eventIndex];
        console.log('🏠 Home page - found event for EventContent:', event.title);
        
        // Set the event and show EventContent
        setCurrentEventIndex(eventIndex);
        setShowDetailCard(false);
        setShowContentCard(true);
        setSelectedEvent(null);
        
        // Set the active tab
        if (eventContentTab) {
          setLastActiveTab(eventContentTab as 'chat' | 'similar' | 'favorites');
        }
        
        console.log('🏠 Home page - showing EventContent for event:', event.id);
        console.log('🏠 Home page - showContentCard set to true, showDetailCard set to false');
      } else {
        console.log('🏠 Home page - event not found in events array for EventContent');
      }
      
      // Clear localStorage flags
      localStorage.removeItem('showEventContent');
      localStorage.removeItem('eventContentTab');
    }
    // Handle EventDetail navigation from EventContent
    else if (selectedEventId && showEventDetail === 'true' && events) {
      const eventId = parseInt(selectedEventId);
      const eventIndex = events.findIndex(e => e.id === eventId);
      
      if (eventIndex !== -1) {
        const event = events[eventIndex];
        // Show EventDetail for the selected event
        setSelectedEvent(event);
        setShowDetailCard(true);
        setShowContentCard(false);
        setCurrentEventIndex(eventIndex);
      } else {
        // Event not found in home page events, fetch it separately for EventDetail
        fetchSpecificEventForDetail(eventId);
      }
      
      // Clear localStorage
      localStorage.removeItem('selectedEventId');
      localStorage.removeItem('showEventDetail');
      localStorage.removeItem('fromEventContent');
    }
    // Handle EventDetail modal reopening when coming back from EventContent
    else if (reopenEventDetailId && events) {
      const eventId = parseInt(reopenEventDetailId);
      const eventIndex = events.findIndex(e => e.id === eventId);
      
      if (eventIndex !== -1) {
        const event = events[eventIndex];
        // Show EventDetail modal for the selected event
        setSelectedEvent(event);
        setShowDetailCard(true);
        setShowContentCard(false);
        setCurrentEventIndex(eventIndex);
        // This came from Attending tab, so set the flag
        setIsFromMyEvents(true);
      } else {
        // Event not found in home page events, fetch it separately for EventDetail
        fetchSpecificEventForDetail(eventId);
        // This came from Attending tab, so set the flag
        setIsFromMyEvents(true);
      }
      
      // Clear localStorage
      localStorage.removeItem('reopenEventDetailId');
    }
    // Handle EventContent navigation from other pages
    else if (eventContentId && events) {
      const eventId = parseInt(eventContentId);
      const eventIndex = events.findIndex(e => e.id === eventId);
      
      if (eventIndex !== -1) {
        const event = events[eventIndex];
        handleEventNavigation(event, eventId, fromMyEvents, fromBrowse, fromMessagesTab, preferredTab);
      } else {
        // Event not found in home page events, fetch it separately
        fetchSpecificEvent(eventId, fromMyEvents, fromBrowse, fromMessagesTab, preferredTab);
      }
    }
  }, [events]);

  // Helper function to fetch a specific event when it's not in the home page events
  const fetchSpecificEvent = async (eventId: number, fromMyEvents: string | null, fromBrowse: string | null, fromMessagesTab: string | null, preferredTab: string | null) => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      const event = await response.json() as EventWithOrganizer;
      handleEventNavigation(event, eventId, fromMyEvents, fromBrowse, fromMessagesTab, preferredTab);
    } catch (error) {
      console.error('Error fetching specific event:', error);
      toast({
        title: "Error",
        description: "Failed to load the event. Please try again.",
        variant: "destructive",
      });
      // Clear the localStorage on error
      localStorage.removeItem('eventContentId');
      localStorage.removeItem('fromMyEvents');
      localStorage.removeItem('fromBrowse');
      localStorage.removeItem('fromMessagesTab');
      localStorage.removeItem('preferredTab');
    }
  };

  // Helper function to fetch a specific event for EventDetail
  const fetchSpecificEventForDetail = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch event');
      }
      const event = await response.json() as EventWithOrganizer;
      // Show EventDetail for the fetched event
      setSelectedEvent(event);
      setShowDetailCard(true);
      setShowContentCard(false);
      setCurrentEventIndex(0);
      // Set the flag if this was triggered by EventContent back navigation
      if (localStorage.getItem('reopenEventDetailId')) {
        setIsFromMyEvents(true);
      }
    } catch (error) {
      console.error('Error fetching specific event for detail:', error);
      toast({
        title: "Error",
        description: "Failed to load the event. Please try again.",
        variant: "destructive",
      });
      // Clear the localStorage on error
      localStorage.removeItem('selectedEventId');
      localStorage.removeItem('showEventDetail');
      localStorage.removeItem('fromEventContent');
      localStorage.removeItem('reopenEventDetailId');
    }
  };

  // Helper function to handle event navigation logic
  const handleEventNavigation = (event: EventWithOrganizer, eventId: number, fromMyEvents: string | null, fromBrowse: string | null, fromMessagesTab: string | null, preferredTab: string | null) => {
    // Check if this is a group chat navigation (user is attending/organizing this event)
    const isGroupChatNavigation = event.userRsvpStatus === 'going' || 
                                event.userRsvpStatus === 'attending' || 
                                event.organizerId === user?.id;
    
    // For Messages tab navigation, always go directly to EventContent
    if (fromMessagesTab === 'true') {
      // Use startTransition to batch all state updates for instant navigation
      startTransition(() => {
        setGroupChatEvent(event);
        setCurrentEventIndex(0);
        setShowContentCard(true);
        setShowDetailCard(false);
        setSelectedEvent(null); // Ensure no modal is shown
      });
    } else if (isGroupChatNavigation) {
      // For group chat navigation, we need to temporarily show this event
      // even though it's not in the normal swipe flow
      
      // Set the group chat event and show EventContent
      setGroupChatEvent(event);
      setCurrentEventIndex(0);
      setShowContentCard(true);
      setShowDetailCard(false);
    } else {
      // Normal navigation for events in swipe flow
      // Remove from swipedEvents to ensure it's available
      setSwipedEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      
      // Calculate the correct index in availableEvents after removing from swipedEvents
      const updatedAvailableEvents = events ? events.filter(e => 
        (!swipedEvents.has(e.id) || e.id === eventId) && 
        e.organizerId !== user?.id && 
        e.userRsvpStatus !== 'going' && 
        e.userRsvpStatus !== 'attending'
      ) : [];
      const availableEventIndex = updatedAvailableEvents.findIndex(e => e.id === eventId);
      
      // Set up the interface to show EventContent for this event
      setCurrentEventIndex(availableEventIndex >= 0 ? availableEventIndex : 0);
      setShowContentCard(true);
      setShowDetailCard(false);
    }
    
    // Set the preferred tab if specified
    if (preferredTab === 'chat' || preferredTab === 'similar') {
      setLastActiveTab(preferredTab);
    }
    
    // Check if coming from My Events
    if (fromMyEvents === 'true') {
      setIsFromMyEvents(true);
      setEventFromMyEvents(event); // Store the event for back navigation
    }
    
    // Check if coming from Browse page
    if (fromBrowse === 'true') {
      setIsFromBrowse(true);
    }
    
    // Check if coming from Messages tab specifically
    if (fromMessagesTab === 'true') {
      setIsFromMessagesTab(true);
    }
    
    // Clear the localStorage
    localStorage.removeItem('eventContentId');
    localStorage.removeItem('fromMyEvents');
    localStorage.removeItem('fromBrowse');
    localStorage.removeItem('fromMessagesTab');
    localStorage.removeItem('preferredTab');
  };

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: number; status: string }) => {
      await apiRequest(`/api/events/${eventId}/rsvp`, { 
        method: 'POST',
        body: JSON.stringify({ status })
      });
    },
    onSuccess: (_, { eventId, status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "attending"] });
      
      // If user is RSVPing "attending" from Home page swipe, navigate to EventContent
      if (status === 'attending') {
        console.log('🏠 Home page RSVP mutation success - showing celebration animation');
        
        // Find the event that was RSVP'd
        const rsvpedEvent = events?.find(e => e.id === eventId);
        if (rsvpedEvent) {
          // Store the RSVP'd event information for EventContent to use
          const eventData = {
            id: rsvpedEvent.id,
            title: rsvpedEvent.title,
            description: rsvpedEvent.description,
            organizer: rsvpedEvent.organizer,
            date: rsvpedEvent.date,
            time: rsvpedEvent.time,
            location: rsvpedEvent.location,
            category: rsvpedEvent.category,
            subCategory: rsvpedEvent.subCategory,
            rsvpCount: rsvpedEvent.rsvpCount,
            userRsvpStatus: 'attending'
          };
          localStorage.setItem('rsvpedEvent', JSON.stringify(eventData));
          localStorage.setItem('fromHomeEventDetail', 'true');
          localStorage.setItem('forceEventId', rsvpedEvent.id.toString());
          // Set flag to prevent Home page from advancing after RSVP
          localStorage.setItem('preventHomeAdvancement', 'true');
          
          console.log('🏠 Home page RSVP mutation - storing event data for navigation');
          console.log('🏠 Home page RSVP mutation - event ID:', rsvpedEvent.id);
          console.log('🏠 Home page RSVP mutation - event title:', rsvpedEvent.title);
          console.log('🏠 Home page RSVP mutation - forceEventId set to:', rsvpedEvent.id.toString());
          
          // Navigate to EventContent after celebration animation completes
          setTimeout(() => {
            console.log('🏠 Home page RSVP mutation - navigating to EventContent:', `/event/${rsvpedEvent.id}?tab=chat`);
            setLocation(`/event/${rsvpedEvent.id}?tab=chat`);
          }, 3000);
        }
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Sign In",
          description: "You need to sign in to RSVP to events.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Location update mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      await apiRequest('/api/users/profile', { 
        method: 'PUT',
        body: JSON.stringify({
          location,
          interests: user?.interests || [],
          personality: user?.personality || []
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Location Updated",
        description: "Your location has been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingLocation(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Location detection function
  const detectLocation = async () => {
    setIsDetectingLocation(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Use reverse geocoding to get location name
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const data = await response.json();
      
      const city = data.address?.city || data.address?.town || data.address?.village;
      const state = data.address?.state;
      const country = data.address?.country;
      
      let locationName = '';
      if (city && state) {
        locationName = `${city}, ${state}`;
      } else if (city && country) {
        locationName = `${city}, ${country}`;
      } else if (state && country) {
        locationName = `${state}, ${country}`;
      } else {
        locationName = country || 'Location detected';
      }
      
      setLocationInput(locationName);
      updateLocationMutation.mutate(locationName);
    } catch (error) {
      toast({
        title: "Location Detection Failed",
        description: "Unable to detect your location. Please enter it manually.",
        variant: "destructive",
      });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Location handler functions
  const handleEditLocation = () => {
    setEditingLocation(true);
    setLocationInput(user?.location || '');
  };

  const handleSaveLocation = () => {
    if (locationInput.trim()) {
      updateLocationMutation.mutate(locationInput.trim());
    }
  };

  // Initialize location input when user data changes
  useEffect(() => {
    if (user?.location) {
      setLocationInput(user.location);
    }
  }, [user?.location]);

  // Save state whenever key state changes (removed skipped events - now handled by database)
  useEffect(() => {
    const stateToSave = {
      currentEventIndex,
      swipedEvents: Array.from(swipedEvents),
      showDetailCard,
      showContentCard,
      lastActiveTab,
    };
    saveHomeState(stateToSave);
  }, [currentEventIndex, swipedEvents, showDetailCard, showContentCard, lastActiveTab]);

  const availableEvents = events?.filter(event => 
    !swipedEvents.has(event.id) && 
    event.organizerId !== user?.id && 
    event.userRsvpStatus !== 'going' && 
    event.userRsvpStatus !== 'attending'
  ) || [];
  
  // Use group chat event if in group chat mode, otherwise use available events
  const currentEvent = groupChatEvent || availableEvents[currentEventIndex];

  // Memoize button states to prevent unnecessary re-renders
  const buttonStates = useMemo(() => {
    return {
      skipDisabled: !currentEvent || isTransitioning,
      detailsDisabled: !currentEvent || isTransitioning,
      detailsClassName: `flex items-center justify-center w-20 h-20 ${showDetailCard ? 'bg-green-500/80 hover:bg-green-600/80' : 'bg-blue-500/80 hover:bg-blue-600/80'} text-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`,
      detailsIcon: showDetailCard ? 'heart' : 'arrow'
    };
  }, [currentEvent, isTransitioning, showDetailCard]);

  // Reset local state when events data changes due to RSVPs/skips from other pages
  // DISABLED: This was causing the double-skip issue by resetting currentEventIndex
  // when events query refreshed after skipping
  /*
  useEffect(() => {
    if (!events) return;
    
    // Check if any previously swiped events now have RSVP status or should be excluded
    const shouldResetState = Array.from(swipedEvents).some(eventId => {
      const event = events.find(e => e.id === eventId);
      return event && (
        event.userRsvpStatus === 'going' || 
        event.userRsvpStatus === 'attending' ||
        event.organizerId === user?.id
      );
    });
    
    if (shouldResetState) {
      console.log('Resetting Home page state due to RSVP changes from other pages');
      setSwipedEvents(new Set());
      setCurrentEventIndex(0);
      setShowDetailCard(false);
      setShowContentCard(false);
      clearHomeState();
    }
  }, [events, user?.id]);
  */

  // Clear state when user has swiped through all events
  useEffect(() => {
    if (events && events.length > 0 && availableEvents.length === 0 && swipedEvents.size > 0) {
      // User has swiped through all events, reset state
      setCurrentEventIndex(0);
      setSwipedEvents(new Set());
      setShowDetailCard(false);
      setShowContentCard(false);
      clearHomeState();
    }
  }, [events, availableEvents.length, swipedEvents.size]);

  const handleSwipeLeft = async () => {
    if (!currentEvent || isTransitioning) return;
    
    // Debounce mechanism: prevent rapid consecutive skips
    const currentTime = Date.now();
    if (currentTime - lastSkipTime < 2000) { // 2 second debounce
      return;
    }
    
    if (showContentCard) {
      // From content card, go back to main and move to next event
      setSwipedEvents(prev => new Set(prev).add(currentEvent.id));
      setCurrentEventIndex(prev => prev + 1);
      
      // Increment events shown counter in database
      if (user) {
        try {
          await apiRequest('/api/events/increment-shown', { method: 'POST' });
        } catch (error) {
          console.error('Error incrementing events shown:', error);
        }
      }
      
      setShowContentCard(false);
      setIsFromMyEvents(false); // Reset flag
      setEventFromMyEvents(null); // Clear stored event
      setGroupChatEvent(null); // Clear group chat event
    } else if (showDetailCard) {
      // From detail card, skip to next event
      if (currentEvent) {
        setEventBeingSkipped(currentEvent.id);
        setShowSkipAnimation(true);
        setShowDetailCard(false);
        setLastSkipTime(currentTime);
        
        // Do the database skip operation in the background
        if (user) {
          fetch(`/api/events/${currentEvent.id}/skip`, { 
            method: 'POST',
            credentials: 'include'
          })
          .catch(error => {
            console.error('Error skipping event in background:', error);
          });
        }
      }
    } else {
      // From main card, skip this event with animation
      if (currentEvent) {
        setEventBeingSkipped(currentEvent.id);
        setShowSkipAnimation(true);
        setLastSkipTime(currentTime);
        
        // Do the database skip operation in the background
        if (user) {
          fetch(`/api/events/${currentEvent.id}/skip`, { 
            method: 'POST',
            credentials: 'include'
          })
          .catch(error => {
            console.error('Error skipping event in background:', error);
          });
        }
      }
    }
  };

  const handleBackToEventDetail = () => {
    if (eventFromMyEvents) {
      setSelectedEvent(eventFromMyEvents);
      setShowContentCard(false);
      // Don't reset isFromMyEvents here - keep it true to show Group Chat button
      setEventFromMyEvents(null);
    }
  };

  const handleSkipAnimationComplete = () => {
    setShowSkipAnimation(false);
    
    // Use the captured event ID instead of current event
    if (eventBeingSkipped) {
      const eventIdToSkip = eventBeingSkipped;
      
      // Add to local swiped events and move to next event
      startTransition(() => {
        setSwipedEvents(prev => new Set(prev).add(eventIdToSkip));
        setCurrentEventIndex(prev => prev + 1);
      });
    }
    
    // Reset the event being skipped
    setEventBeingSkipped(null);
  };

  const handleContentSwipeRight = async () => {
    // From content card, move to next event
    setSwipedEvents(prev => new Set(prev).add(currentEvent.id));
    setCurrentEventIndex(prev => prev + 1);
    
    // Increment events shown counter in database
    if (user) {
      try {
        await apiRequest('/api/events/increment-shown', { method: 'POST' });
      } catch (error) {
        console.error('Error incrementing events shown:', error);
      }
    }
    
    setShowContentCard(false);
    setGroupChatEvent(null); // Clear group chat event
  };

  const handleSwipeRight = async () => {
    if (!currentEvent || isTransitioning) return;
    if (showDetailCard) {
      // From detail card, RSVP and show celebration
      if (user) {
        try {
          await rsvpMutation.mutateAsync({ eventId: currentEvent.id, status: 'attending' });
          setShowCelebration(true);
          setShowDetailCard(false);
        } catch (error) {
          console.error('Error during RSVP:', error);
        }
      }
    } else {
      // From main card, show detail card
      setIsTransitioning(true);
      setTimeout(() => {
        setShowDetailCard(true);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleCelebrationComplete = async () => {
    setShowCelebration(false);
    
    // Check if we should prevent home advancement (RSVP from EventDetail modal)
    const preventAdvancement = localStorage.getItem('preventHomeAdvancement');
    if (preventAdvancement === 'true') {
      console.log('🏠 Home page - preventing advancement due to EventDetail RSVP');
      localStorage.removeItem('preventHomeAdvancement');
      // Don't show content card or advance to next event
      return;
    }
    
    setShowContentCard(true);
    
    // Increment events shown counter in database
    if (user) {
      try {
        await apiRequest('/api/events/increment-shown', { method: 'POST' });
        // Force cache invalidation to ensure RSVP'd event is removed from future queries
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      } catch (error) {
        console.error('Error incrementing events shown:', error);
      }
    }
  };

  const handleUndo = () => {
    if (isTransitioning) return;
    if (showDetailCard) {
      // If in detail view, go back to main card
      setIsTransitioning(true);
      setTimeout(() => {
        setShowDetailCard(false);
        setIsTransitioning(false);
      }, 150);
      return;
    }
    if (swipedEvents.size === 0) return;
    const lastSwipedEvent = Array.from(swipedEvents).pop();
    if (lastSwipedEvent) {
      setSwipedEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(lastSwipedEvent);
        return newSet;
      });
      setCurrentEventIndex(prev => Math.max(0, prev - 1));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex-shrink-0" data-testid="home-header">
        <div className="flex items-center justify-between">
          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <AnimeAvatar 
              seed={user?.animeAvatarSeed || user?.id || "default"} 
              size="sm" 
              customAvatarUrl={user?.customAvatarUrl}
              behavior="navigate"
            />
            
            {/* User Signature */}
            <div className="flex items-center space-x-1">
              {user?.aiSignature ? (
                <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-[10px] italic leading-tight">
                  "{user.aiSignature}"
                </div>
              ) : (
                <span className="text-xs text-gray-500">Set signature</span>
              )}
            </div>
          </div>
          
          {/* Location and Notifications */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleEditLocation}
              className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
            >
              <MapPin className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-gray-600">
                {user?.location || "Set location"}
              </span>
            </button>
            <button 
              onClick={() => setLocation('/my-events?tab=messages')}
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {totalUnread > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Swipe Area */}
      <div className="flex-1 relative bg-gray-50 overflow-hidden">
        {availableEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">All caught up!</h3>
              <p className="text-gray-600">No more events to discover right now.</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Main Event Card */}
            <div className={`absolute inset-0 ${
              isFromMessagesTab ? 'transition-none' : 'transition-all duration-300 ease-in-out'
            } ${
              showDetailCard || showContentCard ? 'transform -translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'
            }`}>
              <div className="relative w-full h-full">
                {/* Render current and next event cards */}
                {availableEvents.slice(currentEventIndex, currentEventIndex + 2).map((event, index) => (
                  <SwipeCard
                    key={event.id}
                    event={event}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                    onInfoClick={() => setSelectedEvent(event)}
                    isActive={index === 0}
                  />
                ))}
              </div>
            </div>

            {/* Detail Card */}
            <div className={`absolute inset-0 ${
              isFromMessagesTab ? 'transition-none' : 'transition-all duration-300 ease-in-out'
            } ${
              showDetailCard && !showContentCard ? 'transform translate-x-0 opacity-100' : 'transform translate-x-full opacity-0'
            }`}>
              <div className="flex items-center justify-center h-full">
                {currentEvent ? (
                  <EventDetailCard
                    event={currentEvent}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                    isActive={showDetailCard}
                  />
                ) : (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-gray-500 text-sm mt-2">Loading event...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Content Card */}
            <div className={`absolute inset-0 ${
              isFromMessagesTab ? 'transition-none' : 'transition-all duration-300 ease-in-out'
            } ${
              showContentCard ? 'transform translate-x-0 opacity-100' : 'transform translate-x-full opacity-0'
            }`}>
              <div className="w-full h-full">
                {currentEvent ? (
                  <EventContentCard
                    event={currentEvent}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleContentSwipeRight}
                    isActive={showContentCard}
                    similarEvents={availableEvents.filter(e => e.id !== currentEvent?.id && e.category === currentEvent?.category).slice(0, 3)}
                    onSimilarEventClick={(event) => {
                      console.log('onSimilarEventClick called with event:', event.title, event.id);
                      setSelectedEvent(event);
                    }}
                    initialTab={lastActiveTab}
                    onTabChange={setLastActiveTab}
                    showBackButton={isFromMyEvents || isFromBrowse || isFromMessagesTab}
                    showKeepExploring={!isFromMyEvents && !isFromBrowse && !isFromMessagesTab}
                    onBackClick={() => {
                      if (isFromMessagesTab) {
                        // Go back to My Events page with Messages tab active
                        setIsFromMessagesTab(false); // Reset flag
                        setLocation('/my-events?tab=messages');
                      } else if (isFromMyEvents) {
                        // Go back to EventDetail for this event (came from EventDetail in My Events)
                        setSelectedEvent(currentEvent);
                        setShowContentCard(false);
                      } else if (isFromBrowse) {
                        // Go back to Browse page
                        setLocation('/browse');
                      } else {
                        // Default: just close the content card and return to main swipe interface
                        setShowContentCard(false);
                        setShowDetailCard(false);
                        setGroupChatEvent(null); // Clear group chat event
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-gray-500 text-sm mt-2">Loading event...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Hidden when EventContent is active */}
      {!showContentCard && (
        <div className="absolute bottom-16 left-0 right-0 px-4 flex-shrink-0 z-20">
          <div className="flex justify-center space-x-16">
            <button
              onClick={handleSwipeLeft}
              disabled={buttonStates.skipDisabled}
              className="flex items-center justify-center bg-red-500/80 text-white rounded-full w-20 h-20 shadow-lg hover:bg-red-600/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <X className="w-8 h-8" />
            </button>
            
            <button
              onClick={handleSwipeRight}
              disabled={buttonStates.detailsDisabled}
              className={buttonStates.detailsClassName}
            >
              {buttonStates.detailsIcon === 'heart' ? (
                <Heart className="w-8 h-8" />
              ) : (
                <ArrowRight className="w-8 h-8" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav 
        currentPage="home" 
        onCreateEvent={() => setShowCreateEvent(true)}
      />

      {/* Celebration Animation */}
      {!selectedEvent && (
        <CelebrationAnimation 
          isVisible={showCelebration} 
          onComplete={handleCelebrationComplete}
        />
      )}

      {/* Skip Animation */}
      <SkipAnimation 
        isVisible={showSkipAnimation} 
        onComplete={handleSkipAnimationComplete}
      />

      {/* Modals */}
      {showCreateEvent && (
        <CreateEvent onClose={() => setShowCreateEvent(false)} />
      )}
      
      {selectedEvent && (
        <EventDetail 
          event={selectedEvent} 
          onClose={() => {
            setSelectedEvent(null);
            setIsFromMyEvents(false);
            setEventFromMyEvents(null);
          }} 
          onSkip={() => {
            // Skip to next event when not from My Events
            if (!isFromMyEvents) {
              handleSwipeLeft();
            }
            setSelectedEvent(null);
            setIsFromMyEvents(false);
            setEventFromMyEvents(null);
          }}
          fromPage="home"
          onBack={() => {
            if (isFromMyEvents) {
              // Go back to My Events with correct tab
              const returnTab = localStorage.getItem('returnToMyEventsTab') || 'attending';
              localStorage.removeItem('returnToMyEventsTab');
              localStorage.removeItem('fromMyEvents');
              setSelectedEvent(null);
              setIsFromMyEvents(false);
              setEventFromMyEvents(null);
              setLocation(`/my-events?tab=${returnTab}`);
            } else {
              setSelectedEvent(null);
              setIsFromMyEvents(false);
              setEventFromMyEvents(null);
            }
          }}
          showGroupChatButton={isFromMyEvents}
        />
      )}

      {/* Location Edit Popup */}
      {editingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Location</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Location
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Enter your location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <button
                onClick={detectLocation}
                disabled={isDetectingLocation}
                className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDetectingLocation ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-gray-400 border-t-gray-600 border-[1px]"></div>
                    <span>Detecting...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span>Detect Current Location</span>
                  </>
                )}
              </button>
              
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleSaveLocation}
                  disabled={updateLocationMutation.isPending || !locationInput.trim()}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateLocationMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingLocation(false);
                    setLocationInput(user?.location || '');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}