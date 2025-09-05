import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import EventCard from "@/components/EventCard";
import CategoryFilter from "@/components/CategoryFilter";
import EventDetail from "@/components/EventDetail";
import CreateEvent from "@/components/CreateEvent";
import BottomNav from "@/components/BottomNav";
import { EventWithOrganizer } from "@shared/schema";

export default function Browse() {
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return localStorage.getItem('browseTimeFilter') || "day1_morning";
  });
  const [selectedEvent, setSelectedEvent] = useState<EventWithOrganizer | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [, setLocation] = useLocation();

  const handleCategoryChange = (timeFilter: string) => {
    setSelectedCategory(timeFilter);
    localStorage.setItem('browseTimeFilter', timeFilter);
  };

  // Use the browse endpoint with server-side filtering
  const { data: filteredEvents, isLoading } = useQuery({
    queryKey: ["/api/events/browse", { timeFilter: selectedCategory }],
    queryFn: async () => {
      // Send user's timezone offset to server
      const timezoneOffset = new Date().getTimezoneOffset();
      const response = await fetch(`/api/events/browse?timeFilter=${selectedCategory}&limit=100&timezoneOffset=${timezoneOffset}`);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json() as Promise<EventWithOrganizer[]>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-sm mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="flex items-center justify-center p-4">
            <h1 className="text-xl text-gray-900">Browse Events in One Week</h1>
          </div>
          
          <CategoryFilter 
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
              <p className="text-gray-500">Try adjusting your time filter or check back later for new events.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onEventClick={() => setSelectedEvent(event)}
                />
              ))}
            </div>
          )}
        </div>

        <BottomNav currentPage="browse" onCreateEvent={() => setShowCreateEvent(true)} />
      </div>

      {/* EventDetail Modal Overlay */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50">
          <EventDetail
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onNavigateToContent={() => {
              // Navigate to EventContent page for group chat
              setLocation(`/event-content/${selectedEvent.id}?fromBrowse=true`);
            }}
            fromPage="browse"
          />
        </div>
      )}

      {/* Create Event Modal Overlay */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50">
          <CreateEvent onClose={() => setShowCreateEvent(false)} />
        </div>
      )}
    </div>
  );
}