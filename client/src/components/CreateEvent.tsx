import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Camera, Calendar, Clock, MapPin, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface CreateEventProps {
  onClose: () => void;
}

const createEventSchema = insertEventSchema.extend({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  isFree: z.boolean().default(true),
  price: z.string().optional(),
  capacity: z.number().optional(),
  maxAttendees: z.number().optional(),
  parkingInfo: z.string().optional(),
  meetingPoint: z.string().optional(),
  duration: z.string().optional(),
  whatToBring: z.string().optional(),
  specialNotes: z.string().optional(),
  requirements: z.string().optional(),
  contactInfo: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  subCategory: z.string().optional(),
});

type CreateEventFormData = z.infer<typeof createEventSchema>;

export default function CreateEvent({ onClose }: CreateEventProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState(false);

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      subCategory: "",
      date: "",
      time: "",
      location: "",
      isFree: true,
      price: "0.00",
      eventImageUrl: "",
      organizerId: user?.id || "",
      capacity: undefined,
      maxAttendees: undefined,
      parkingInfo: "",
      meetingPoint: "",
      duration: "",
      whatToBring: "",
      specialNotes: "",
      requirements: "",
      contactInfo: "",
      cancellationPolicy: "",
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CreateEventFormData) => {
      const eventData = {
        ...data,
        price: data.isFree ? "0.00" : data.price || "0.00",
        organizerId: user?.id || "",
      };
      await apiRequest('/api/events', { 
        method: 'POST',
        body: JSON.stringify(eventData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Event Created",
        description: "Your event has been created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "organized"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "events", "group-chats"] });
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
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const onSubmit = (data: CreateEventFormData) => {
    createEventMutation.mutate(data);
  };

  const isFree = form.watch('isFree');
  const selectedCategory = form.watch('category');

  // Define subcategories for each main category
  const subcategories = {
    music: [
      "Live Concert", "DJ Set", "Open Mic", "Jazz Performance", "Classical Music", 
      "Rock Concert", "Hip Hop Event", "Electronic Music", "Acoustic Session", 
      "Music Festival", "Band Performance", "Solo Artist", "Karaoke Night"
    ],
    sports: [
      "Basketball", "Soccer", "Tennis", "Running", "Cycling", "Swimming", 
      "Hiking", "Rock Climbing", "Volleyball", "Baseball", "Football", 
      "Martial Arts", "Yoga", "Fitness Class", "Marathon", "Team Sports"
    ],
    arts: [
      "Art Exhibition", "Theater Performance", "Dance Show", "Comedy Show", 
      "Poetry Reading", "Film Screening", "Art Workshop", "Craft Fair", 
      "Gallery Opening", "Performance Art", "Musical Theater", "Stand-up Comedy"
    ],
    food: [
      "Food Festival", "Cooking Class", "Wine Tasting", "Restaurant Event", 
      "Street Food", "Baking Workshop", "Food Tour", "Potluck", "BBQ", 
      "Farmers Market", "Food Truck Event", "Culinary Competition"
    ],
    tech: [
      "Tech Conference", "Workshop", "Hackathon", "Networking Event", 
      "Product Launch", "Startup Pitch", "Coding Bootcamp", "Tech Talk", 
      "Developer Meetup", "AI/ML Event", "Web Development", "Mobile Development"
    ],
    business: [
      "Networking Event", "Conference", "Workshop", "Seminar", "Trade Show", 
      "Startup Pitch", "Business Meetup", "Panel Discussion", "Corporate Event", 
      "Professional Development", "Leadership Training", "Sales Workshop"
    ],
    education: [
      "Workshop", "Seminar", "Course", "Lecture", "Study Group", "Tutorial", 
      "Language Exchange", "Academic Conference", "Book Club", "Library Event", 
      "Educational Tour", "Skill Building", "Certification Program"
    ],
    health: [
      "Fitness Class", "Yoga", "Meditation", "Wellness Workshop", "Health Seminar", 
      "Mental Health Support", "Nutrition Class", "First Aid Training", "Therapy Session", 
      "Mindfulness Workshop", "Stress Management", "Health Screening"
    ],
    entertainment: [
      "Comedy Show", "Game Night", "Quiz Night", "Karaoke", "Dance Party", 
      "Movie Night", "Magic Show", "Trivia Night", "Talent Show", "Variety Show", 
      "Live Performance", "Interactive Entertainment"
    ],
    community: [
      "Volunteer Event", "Fundraiser", "Charity Drive", "Community Meeting", 
      "Neighborhood Event", "Social Gathering", "Cultural Celebration", "Religious Event", 
      "Support Group", "Civic Engagement", "Local Initiative", "Community Service"
    ],
    outdoor: [
      "Hiking", "Camping", "Beach Event", "Park Gathering", "Nature Walk", 
      "Outdoor Festival", "Gardening", "Fishing", "Picnic", "Outdoor Sports", 
      "Adventure Activity", "Environmental Cleanup", "Wildlife Watching"
    ],
    family: [
      "Family Fun Day", "Kids Event", "Parenting Workshop", "Family Game Night", 
      "Children's Activity", "Parent Meetup", "Family Outing", "Educational for Kids", 
      "Baby & Toddler", "Teen Activity", "Multi-generational Event"
    ],
    lifestyle: [
      "Fashion Show", "Beauty Workshop", "Home & Garden", "Travel Meetup", 
      "Photography Walk", "Craft Workshop", "DIY Project", "Shopping Event", 
      "Lifestyle Seminar", "Personal Development", "Hobby Group"
    ]
  };

  const currentSubcategories = selectedCategory ? subcategories[selectedCategory as keyof typeof subcategories] || [] : [];

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4`}>
      <div className={`bg-white rounded-lg shadow-xl max-w-sm w-full h-[85vh] overflow-hidden transform transition-transform duration-300 ${
        isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      }`}>
        <div className="relative h-full flex flex-col">
          <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button onClick={handleClose} className="text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">Create Event</h2>
            <button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={createEventMutation.isPending}
              className="text-primary font-medium disabled:opacity-50"
            >
              {createEventMutation.isPending ? 'Publishing...' : 'Publish'}
            </button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <FormLabel className="block text-sm font-medium text-gray-700 mb-2">
                  Event Photo
                </FormLabel>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">Add a photo to make your event stand out</p>
                  <FormField
                    control={form.control}
                    name="eventImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter image URL"
                            className="mt-2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Give your event a name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Reset subcategory when category changes
                      form.setValue('subCategory', '');
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="music">🎵 Music</SelectItem>
                        <SelectItem value="sports">🏃 Sports</SelectItem>
                        <SelectItem value="arts">🎨 Arts</SelectItem>
                        <SelectItem value="food">🍽️ Food</SelectItem>
                        <SelectItem value="tech">💻 Tech</SelectItem>
                        <SelectItem value="business">💼 Business</SelectItem>
                        <SelectItem value="education">📚 Education</SelectItem>
                        <SelectItem value="health">🏥 Health & Wellness</SelectItem>
                        <SelectItem value="entertainment">🎭 Entertainment</SelectItem>
                        <SelectItem value="community">🤝 Community</SelectItem>
                        <SelectItem value="outdoor">🌲 Outdoor</SelectItem>
                        <SelectItem value="family">👨‍👩‍👧‍👦 Family</SelectItem>
                        <SelectItem value="lifestyle">✨ Lifestyle</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subcategory - only show if category is selected */}
              {selectedCategory && currentSubcategories.length > 0 && (
                <FormField
                  control={form.control}
                  name="subCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subcategory (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currentSubcategories.map((subcategory) => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {subcategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Where will your event take place?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={4} 
                        placeholder="Tell people about your event..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormField
                  control={form.control}
                  name="isFree"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>This is a free event</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                
                {!isFree && (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem className="mt-2">
                        <FormLabel>Ticket Price</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Capacity and Attendee Limits */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Max capacity" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Attendees</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Attendee limit" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 2 hours, 3-4 hours, All day" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meeting Point */}
              <FormField
                control={form.control}
                name="meetingPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting Point</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={2} 
                        placeholder="Specific meeting location or entrance details..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parking Info */}
              <FormField
                control={form.control}
                name="parkingInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parking Information</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={2} 
                        placeholder="Parking availability, costs, or restrictions..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* What to Bring */}
              <FormField
                control={form.control}
                name="whatToBring"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What to Bring</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="What should attendees bring? (e.g., water bottle, comfortable shoes, ID)" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Requirements */}
              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requirements</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={2} 
                        placeholder="Age restrictions, skill level, or other requirements..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Special Notes */}
              <FormField
                control={form.control}
                name="specialNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="Any additional important information..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Info */}
              <FormField
                control={form.control}
                name="contactInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Information</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={2} 
                        placeholder="Phone number, email, or other contact details..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cancellation Policy */}
              <FormField
                control={form.control}
                name="cancellationPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Policy</FormLabel>
                    <FormControl>
                      <Textarea 
                        rows={3} 
                        placeholder="Refund policy, cancellation terms, or weather contingency..." 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </form>
          </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
