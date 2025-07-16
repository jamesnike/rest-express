import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Share, Heart, MapPin, Clock, Check, MessageCircle, Music, Activity, Palette, UtensilsCrossed, Laptop, X, Trash2, Bookmark } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { EventWithOrganizer } from "@shared/schema";
import AnimeAvatar from "./AnimeAvatar";
import CelebrationAnimation from "./CelebrationAnimation";

interface EventDetailProps {
  event: EventWithOrganizer;
  onClose: () => void;
  showGroupChatButton?: boolean;
  onSkip?: () => void;
  onBack?: () => void;
  fromPage?: 'home' | 'browse' | 'my-events' | 'messages';
}

export default function EventDetail({ event, onClose, showGroupChatButton = false, onSkip, onBack, fromPage }: EventDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isClosing, setIsClosing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [localRsvpStatus, setLocalRsvpStatus] = useState<string | undefined>(event.userRsvpStatus);
  const [localRsvpCount, setLocalRsvpCount] = useState(event.rsvpCount);
  const [isSaved, setIsSaved] = useState(false);
  // Sync local state with event prop when event changes
  useEffect(() => {
    setLocalRsvpStatus(event.userRsvpStatus);
    setLocalRsvpCount(event.rsvpCount);
  }, [event.userRsvpStatus, event.rsvpCount]);

  const formatDate = (dateString: string) => {
    // Parse the date string as local time to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

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

  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest(`/api/events/${event.id}/rsvp`, { 
        method: 'POST',
        body: JSON.stringify({ status })
      });
    },
    onSuccess: (_, status) => {
      // Invalidate all relevant queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "attending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "organized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "group-chats"] });
      
      // Update local state for immediate UI feedback
      const wasAlreadyRsvped = localRsvpStatus === 'going' || localRsvpStatus === 'attending';
      setLocalRsvpStatus(status);
      if (!wasAlreadyRsvped && status === 'going') {
        setLocalRsvpCount(prev => prev + 1);
      }
      
      // If user is RSVPing "going", show celebration animation and navigate after delay
      if (status === 'going') {
        console.log('🎉 RSVP mutation success - showing celebration animation');
        setShowCelebration(true);
        
        // Store the RSVP'd event information for EventContent to use
        const eventData = {
          id: event.id,
          title: event.title,
          description: event.description,
          organizer: event.organizer,
          date: event.date,
          time: event.time,
          location: event.location,
          category: event.category,
          subCategory: event.subCategory,
          rsvpCount: event.rsvpCount,
          userRsvpStatus: 'going'
        };
        localStorage.setItem('rsvpedEvent', JSON.stringify(eventData));
        localStorage.setItem('fromHomeEventDetail', 'true');
        localStorage.setItem('forceEventId', event.id.toString());
        // Set flag to prevent Home page from advancing after RSVP
        localStorage.setItem('preventHomeAdvancement', 'true');
        
        console.log('🎉 RSVP mutation - storing event data for navigation');
        console.log('🎉 RSVP mutation - event ID:', event.id);
        console.log('🎉 RSVP mutation - event title:', event.title);
        console.log('🎉 RSVP mutation - forceEventId set to:', event.id.toString());
        
        // Navigate to EventContent within Home page context (celebration animation runs in background)
        console.log('🎉 RSVP mutation - navigating to EventContent within Home page context');
        
        // Store navigation state to show EventContent in Home page
        localStorage.setItem('showEventContent', 'true');
        localStorage.setItem('eventContentTab', 'chat');
        
        console.log('🎉 RSVP mutation - localStorage flags set:', {
          showEventContent: localStorage.getItem('showEventContent'),
          eventContentTab: localStorage.getItem('eventContentTab'),
          forceEventId: localStorage.getItem('forceEventId'),
          fromHomeEventDetail: localStorage.getItem('fromHomeEventDetail'),
          preventHomeAdvancement: localStorage.getItem('preventHomeAdvancement')
        });
        
        // Close the EventDetail modal
        handleClose();
      } else {
        toast({
          title: "RSVP Updated",
          description: "Your RSVP has been updated successfully.",
          duration: 2000,
        });
      }
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
        description: "Failed to update RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeRsvpMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/events/${event.id}/rsvp`, { 
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      // Invalidate all relevant queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "attending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "organized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "group-chats"] });
      
      // Update local state for immediate UI feedback
      setLocalRsvpStatus(undefined);
      setLocalRsvpCount(prev => Math.max(0, prev - 1));
      
      toast({
        title: "RSVP Removed",
        description: "Your RSVP has been removed successfully.",
        duration: 2000,
      });
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
        description: "Failed to remove RSVP. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/events/${event.id}`, { 
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/browse"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "attending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "organized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "group-chats"] });
      
      toast({
        title: "Event Canceled",
        description: "Your event has been canceled successfully.",
        duration: 2000,
      });
      
      // Close the modal after canceling
      handleClose();
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
        description: "Failed to cancel event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Query to check if event is saved
  const { data: savedStatus } = useQuery({
    queryKey: ["/api/events", event.id, "saved-status"],
    queryFn: async () => {
      const response = await apiRequest(`/api/events/${event.id}/saved-status`);
      return response.json();
    },
    enabled: !!user,
  });

  // Update local saved state when query data changes
  useEffect(() => {
    if (savedStatus) {
      setIsSaved(savedStatus.isSaved);
    }
  }, [savedStatus]);

  // Mutation to save event
  const saveEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/events/${event.id}/save`, { 
        method: 'POST'
      });
    },
    onSuccess: () => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "saved-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "saved-status"] });
      
      toast({
        title: "Event Saved",
        description: "Event has been saved to your collection.",
        duration: 2000,
      });
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
        description: "Failed to save event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to unsave event
  const unsaveEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/events/${event.id}/save`, { 
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      setIsSaved(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "saved-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "saved-status"] });
      
      toast({
        title: "Event Unsaved",
        description: "Event has been removed from your saved collection.",
        duration: 2000,
      });
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
        description: "Failed to unsave event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveToggle = () => {
    if (isSaved) {
      unsaveEventMutation.mutate();
    } else {
      saveEventMutation.mutate();
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onSkip) {
        onSkip();
      } else {
        onClose();
      }
    }, 300);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      handleClose();
    }
  };

  const handleRsvp = () => {
    if (!user) {
      toast({
        title: "Please Sign In",
        description: "You need to sign in to RSVP to events.",
        variant: "destructive",
      });
      return;
    }

    if (localRsvpStatus === 'going' || localRsvpStatus === 'attending') {
      // Remove RSVP
      console.log('🔄 handleRsvp - removing RSVP, current status:', localRsvpStatus);
      removeRsvpMutation.mutate();
    } else {
      // Add RSVP
      console.log('🔄 handleRsvp - adding RSVP, current status:', localRsvpStatus);
      console.log('🔄 handleRsvp - calling rsvpMutation.mutate with "going"');
      rsvpMutation.mutate('going');
    }
  };

  const handleButtonClick = () => {
    if (isOrganizer) {
      // If user is organizer, confirm before canceling the event
      const confirmMessage = `Are you sure you want to cancel "${event.title}"?\n\nThis action cannot be undone and will notify all attendees.`;
      
      if (window.confirm(confirmMessage)) {
        cancelEventMutation.mutate();
      }
    } else if (localRsvpStatus === 'going' || localRsvpStatus === 'attending') {
      // If user has RSVP'd (going or attending), confirm before removing RSVP
      const confirmMessage = `Are you sure you want to remove your RSVP for "${event.title}"?\n\nYou will no longer be attending this event.`;
      
      if (window.confirm(confirmMessage)) {
        handleRsvp();
      }
    } else {
      // If user is not organizer and hasn't RSVP'd, add RSVP (no confirmation needed)
      handleRsvp();
    }
  };

  const handleCelebrationComplete = useCallback(() => {
    console.log('🎊 CelebrationAnimation onComplete - hiding celebration');
    setShowCelebration(false);
  }, []);

  // Fetch fresh RSVP status when opened from Browse page (background update)
  const { data: freshRsvpStatus } = useQuery({
    queryKey: ['/api/events', event.id, 'rsvp-status'],
    queryFn: async () => {
      const response = await apiRequest(`/api/events/${event.id}/rsvp-status`);
      return response.json();
    },
    enabled: fromPage === 'browse', // Only fetch when coming from browse page
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Force refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Fetch fresh attendees (members) when opened from Browse page (background update)
  const { data: freshAttendees } = useQuery({
    queryKey: ['/api/events', event.id, 'attendees'],
    queryFn: async () => {
      const response = await apiRequest(`/api/events/${event.id}/attendees`);
      return response.json();
    },
    enabled: fromPage === 'browse', // Only fetch when coming from browse page
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true, // Force refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Use event data from props (no need to fetch full event data)
  const currentEvent = event;

  // Check if current user is the organizer of this event
  const isOrganizer = user?.id === currentEvent.organizerId;

  // Silently update local state when fresh RSVP status is available
  useEffect(() => {
    if (freshRsvpStatus && fromPage === 'browse') {
      setLocalRsvpStatus(freshRsvpStatus.status);
      console.log('EventDetail: Silently updated RSVP status from fresh data:', {
        eventId: event.id,
        freshRsvpStatus: freshRsvpStatus.status,
        fromPage
      });
    }
  }, [freshRsvpStatus, event.id, fromPage]);

  // Silently update local member count when fresh attendees are available
  useEffect(() => {
    if (freshAttendees && fromPage === 'browse') {
      setLocalRsvpCount(freshAttendees.length);
      console.log('EventDetail: Silently updated member count from fresh data:', {
        eventId: event.id,
        freshMemberCount: freshAttendees.length,
        fromPage
      });
    }
  }, [freshAttendees, event.id, fromPage]);

  // Sync with prop event changes for immediate updates when not from browse page
  useEffect(() => {
    if (fromPage !== 'browse') {
      setLocalRsvpStatus(event.userRsvpStatus);
      setLocalRsvpCount(event.rsvpCount);
    }
  }, [event.userRsvpStatus, event.rsvpCount, fromPage]);

  // Fetch user's RSVP details to check if they've left the chat - only when not from browse page
  const { data: userRsvp } = useQuery({
    queryKey: ['/api/events', event.id, 'rsvp', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await apiRequest(`/api/events/${event.id}/rsvp-status`);
      if (response.status === 404) return null;
      return response.json();
    },
    enabled: !!user?.id && fromPage !== 'browse', // Don't fetch if we already have fresh data from browse
    staleTime: 0, // Always fetch fresh RSVP data
    refetchOnMount: true,
  });

  // Sync userRsvp data with local state when it changes (only when not from browse page)
  useEffect(() => {
    if (userRsvp && userRsvp.status && userRsvp.status !== localRsvpStatus && fromPage !== 'browse') {
      setLocalRsvpStatus(userRsvp.status);
      console.log('EventDetail: Updated RSVP status from userRsvp query:', {
        eventId: event.id,
        userRsvpStatus: userRsvp.status,
        previousLocalStatus: localRsvpStatus,
        fromPage
      });
    }
  }, [userRsvp, localRsvpStatus, event.id, fromPage]);

  // Fetch actual attendees for the event - only when not from browse page
  const { data: attendees = [] } = useQuery({
    queryKey: ['/api/events', event.id, 'attendees'],
    queryFn: async () => {
      const response = await apiRequest(`/api/events/${event.id}/attendees`);
      return response.json();
    },
    enabled: fromPage !== 'browse', // Don't fetch if we already have fresh data from browse
    staleTime: 0, // Always fetch fresh attendee data
    refetchOnMount: true,
  });

  // Re-join chat mutation
  const rejoinChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/events/${event.id}/rejoin-chat`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to rejoin chat');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'group-chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id, 'rsvp', user?.id] });
      
      toast({
        title: "Rejoined Successfully!",
        description: "You can now access the group chat. Click the Group Chat button to join the conversation.",
        duration: 3000,
      });
    },
    onError: (error) => {
      console.error('Failed to rejoin chat:', error);
      toast({
        title: "Error",
        description: "Failed to rejoin chat. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Leave group chat mutation (for organizers)
  const leaveGroupChatMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'group-chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', event.id, 'rsvp', user?.id] });
      
      toast({
        title: "Left Group Chat",
        description: "You've left the group chat but are still organizing this event.",
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error('Failed to leave group chat:', error);
      toast({
        title: "Error",
        description: "Failed to leave group chat. Please try again.",
        variant: "destructive",
      });
    },
  });
  


  // Use the appropriate attendees data source based on page
  const currentAttendees = fromPage === 'browse' ? (freshAttendees || []) : attendees;

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

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4`}>
      <div className={`bg-white rounded-lg shadow-xl max-w-sm w-full h-[85vh] overflow-hidden transform transition-transform duration-300 ${
        isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        <div className="relative h-full flex flex-col">
          {/* No loading overlay - show immediately with cached data */}
          
          <button 
            onClick={handleBack}
            className="absolute top-2 left-2 z-10 bg-white rounded-full p-1.5 shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button className="absolute top-2 right-2 z-10 bg-white rounded-full p-1.5 shadow-md">
            <Share className="w-4 h-4 text-gray-700" />
          </button>
          
          <div className="h-48 relative">
          <img 
            src={currentEvent.eventImageUrl || `https://images.unsplash.com/photo-1459749411175-04bf5292ceea?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600`}
            alt={currentEvent.title}
            className="w-full h-full object-cover"
          />
        </div>
        
          <div className="px-4 py-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800 mb-2">{currentEvent.title}</h2>
              <div className="flex items-center text-gray-600 mb-1">
                <Clock className="w-4 h-4 mr-2" />
                <span>{formatDate(currentEvent.date)} • {formatTime(currentEvent.time)}</span>
              </div>
              <div className="flex items-center text-gray-600 mb-2">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{currentEvent.location}</span>
              </div>
              {/* Category and Subcategory */}
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="inline-block bg-primary text-white text-xs px-2 py-1 rounded-full font-medium">
                  {currentEvent.category}
                </span>
                {currentEvent.subCategory && (
                  <span className={`inline-block ${getSubCategoryColor(currentEvent.subCategory)} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                    {currentEvent.subCategory}
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={handleSaveToggle}
              disabled={saveEventMutation.isPending || unsaveEventMutation.isPending}
              className={`px-3 py-1.5 rounded-full font-medium ml-3 text-sm border-2 transition-all duration-200 ${
                isSaved 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white border-primary text-primary hover:bg-primary hover:text-white'
              } ${(saveEventMutation.isPending || unsaveEventMutation.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {(saveEventMutation.isPending || unsaveEventMutation.isPending) ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                  {isSaved ? 'Unsaving...' : 'Saving...'}
                </div>
              ) : (
                <>
                  <Bookmark className={`w-3 h-3 mr-1 inline ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </>
              )}
            </button>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">About this event</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
              {currentEvent.description}
            </p>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">
              Members
            </h3>
            <div className="flex items-center space-x-3">
              <div className="flex -space-x-2">
                {/* Show attendees (organizer already included in backend) */}
                {attendees.slice(0, 10).map((attendee, index) => (
                  <AnimeAvatar 
                    key={attendee.id}
                    seed={attendee.animeAvatarSeed} 
                    size="md"
                    customAvatarUrl={attendee.customAvatarUrl}
                    behavior="profile"
                    user={attendee}
                  />
                ))}
                {attendees.length === 0 && (
                  <AnimeAvatar 
                    seed={event.organizer.animeAvatarSeed} 
                    size="md"
                    customAvatarUrl={event.organizer.customAvatarUrl}
                    behavior="profile"
                    user={event.organizer}
                  />
                )}
              </div>
              {(localRsvpCount + 1) > 10 && (
                <span className="text-sm text-gray-600">+{(localRsvpCount + 1) - 10} more</span>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Organized by</h3>
            <div className="flex items-center space-x-3 mb-3">
              <AnimeAvatar 
                seed={currentEvent.organizer.animeAvatarSeed} 
                size="md"
                customAvatarUrl={currentEvent.organizer.customAvatarUrl}
                behavior="profile"
                user={currentEvent.organizer}
              />
              <div>
                <p className="font-medium text-gray-800">
                  {currentEvent.organizer.firstName || currentEvent.organizer.lastName 
                    ? `${currentEvent.organizer.firstName || ''} ${currentEvent.organizer.lastName || ''}`.trim()
                    : 'Anonymous Organizer'}
                </p>
                <p className="text-sm text-gray-600">{currentEvent.organizer.location}</p>
                {currentEvent.organizer.aiSignature && (
                  <p className="text-[10px] text-gray-500 italic mt-1">
                    "{currentEvent.organizer.aiSignature}"
                  </p>
                )}
              </div>
            </div>
            {currentEvent.organizer.interests && currentEvent.organizer.interests.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentEvent.organizer.interests.slice(0, 3).map((interest) => {
                  const interestData = availableInterests.find(i => i.id === interest);
                  const Icon = interestData?.icon || Activity;
                  
                  return (
                    <div key={interest} className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                      <Icon className="w-3 h-3" />
                      <span>{interestData?.name || interest}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex space-x-3 pb-4">
            <button 
              onClick={handleButtonClick}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              disabled={rsvpMutation.isPending || removeRsvpMutation.isPending || cancelEventMutation.isPending}
              className={`flex-1 py-3 rounded-lg font-medium transition-all duration-200 ${
                (rsvpMutation.isPending || removeRsvpMutation.isPending || cancelEventMutation.isPending) 
                  ? 'opacity-50 cursor-not-allowed'
                  : isHovering 
                  ? ((localRsvpStatus === 'going' || localRsvpStatus === 'attending') ? 'bg-red-500 text-white' : isOrganizer ? 'bg-red-500 text-white' : 'bg-primary text-white')
                  : ((localRsvpStatus === 'going' || localRsvpStatus === 'attending')
                    ? 'bg-success text-white hover:bg-red-500'
                    : isOrganizer 
                    ? 'bg-blue-500 text-white hover:bg-red-500'
                    : 'bg-primary text-white hover:bg-primary/90')
              }`}
            >
              {(rsvpMutation.isPending || removeRsvpMutation.isPending || cancelEventMutation.isPending) ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {cancelEventMutation.isPending ? 'Canceling...' : 'Updating...'}
                </div>
              ) : isHovering ? (
                <>
                  {isOrganizer ? (
                    <>
                      <X className="w-4 h-4 mr-2 inline" />
                      Cancel Event
                    </>
                  ) : (localRsvpStatus === 'going' || localRsvpStatus === 'attending') ? (
                    <>
                      <Trash2 className="w-4 h-4 mr-2 inline" />
                      Remove RSVP
                    </>
                  ) : (
                    <>
                      RSVP - {currentEvent.isFree ? 'Free' : `$${currentEvent.price}`}
                    </>
                  )}
                </>
              ) : (
                <>
                  {isOrganizer ? (
                    <>
                      <Check className="w-4 h-4 mr-2 inline" />
                      Organizing (click to Cancel)
                    </>
                  ) : (localRsvpStatus === 'going' || localRsvpStatus === 'attending') ? (
                    <>
                      <Check className="w-4 h-4 mr-2 inline" />
                      Going (click to Ungo)
                    </>
                  ) : (
                    <>
                      RSVP - {currentEvent.isFree ? 'Free' : `$${currentEvent.price}`}
                    </>
                  )}
                </>
              )}
            </button>
            {user && (isOrganizer || localRsvpStatus === 'going' || localRsvpStatus === 'attending') && (
              (userRsvp && userRsvp.hasLeftChat) ? (
                <button 
                  onClick={() => rejoinChatMutation.mutate()}
                  disabled={rejoinChatMutation.isPending}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg flex items-center space-x-2 font-medium disabled:opacity-50"
                >
                  {rejoinChatMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <MessageCircle className="w-5 h-5" />
                  )}
                  <span>{rejoinChatMutation.isPending ? 'Rejoining...' : 'Rejoin Chat'}</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button 
                    onClick={() => {
                      // Set flag for EventDetail modal navigation (different from EventDetailCard)
                      localStorage.setItem('fromEventDetailModal', 'true');
                      // Navigate directly to EventContent page like Messages tab does
                      console.log('Group chat navigation:', `/event/${event.id}?tab=chat`);
                      setLocation(`/event/${event.id}?tab=chat`);
                    }}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg flex items-center space-x-2 font-medium"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Group Chat</span>
                  </button>
                </div>
              )
            )}
          </div>
          </div>
          
          {/* Celebration Animation */}
          {showCelebration && (
            <CelebrationAnimation 
              isVisible={showCelebration}
              onComplete={handleCelebrationComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
