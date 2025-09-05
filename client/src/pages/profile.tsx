import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Bell, Shield, HelpCircle, Music, Activity, Palette, UtensilsCrossed, Laptop, Check, Sparkles, MapPin, Navigation } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import AnimeAvatar from "@/components/AnimeAvatar";
import BottomNav from "@/components/BottomNav";
import CreateEvent from "@/components/CreateEvent";
import { EventWithOrganizer } from "@shared/schema";

export default function Profile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showProfile, setShowProfile] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [editingPersonality, setEditingPersonality] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [aiSignature, setAiSignature] = useState<string>('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');

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
    { id: 'movies', name: 'Movies', icon: Activity },
    { id: 'cooking', name: 'Cooking', icon: UtensilsCrossed },
    { id: 'dancing', name: 'Dancing', icon: Activity },
    { id: 'hiking', name: 'Hiking', icon: Activity },
    { id: 'yoga', name: 'Yoga', icon: Activity },
    { id: 'meditation', name: 'Meditation', icon: Activity },
    { id: 'writing', name: 'Writing', icon: Activity },
    { id: 'podcasts', name: 'Podcasts', icon: Activity },
    { id: 'volunteering', name: 'Volunteering', icon: Activity },
    { id: 'networking', name: 'Networking', icon: Activity },
    { id: 'investing', name: 'Investing', icon: Activity },
    { id: 'entrepreneurship', name: 'Entrepreneurship', icon: Activity },
    { id: 'sustainability', name: 'Sustainability', icon: Activity },
    { id: 'mindfulness', name: 'Mindfulness', icon: Activity },
    { id: 'languages', name: 'Languages', icon: Activity },
    { id: 'history', name: 'History', icon: Activity },
    { id: 'science', name: 'Science', icon: Activity },
    { id: 'philosophy', name: 'Philosophy', icon: Activity },
    { id: 'psychology', name: 'Psychology', icon: Activity },
    { id: 'fashion', name: 'Fashion', icon: Activity },
    { id: 'design', name: 'Design', icon: Palette },
    { id: 'architecture', name: 'Architecture', icon: Activity },
    { id: 'gardening', name: 'Gardening', icon: Activity },
    { id: 'pets', name: 'Pets', icon: Activity },
    { id: 'chess', name: 'Chess', icon: Activity },
    { id: 'boardgames', name: 'Board Games', icon: Activity },
    { id: 'collectibles', name: 'Collectibles', icon: Activity },
    { id: 'crafts', name: 'Crafts', icon: Activity },
    { id: 'diy', name: 'DIY Projects', icon: Activity },
    { id: 'astronomy', name: 'Astronomy', icon: Activity },
    { id: 'nature', name: 'Nature', icon: Activity },
    { id: 'camping', name: 'Camping', icon: Activity },
    { id: 'cycling', name: 'Cycling', icon: Activity },
    { id: 'running', name: 'Running', icon: Activity },
    { id: 'swimming', name: 'Swimming', icon: Activity },
    { id: 'climbing', name: 'Climbing', icon: Activity },
    { id: 'skiing', name: 'Skiing', icon: Activity },
    { id: 'surfing', name: 'Surfing', icon: Activity },
    { id: 'martial_arts', name: 'Martial Arts', icon: Activity },
    { id: 'wine', name: 'Wine', icon: Activity },
    { id: 'coffee', name: 'Coffee', icon: Activity },
    { id: 'theater', name: 'Theater', icon: Activity },
    { id: 'comedy', name: 'Comedy', icon: Activity },
    { id: 'concerts', name: 'Concerts', icon: Music },
    { id: 'festivals', name: 'Festivals', icon: Activity },
    { id: 'museums', name: 'Museums', icon: Activity },
    { id: 'antiques', name: 'Antiques', icon: Activity },
    { id: 'vintage', name: 'Vintage', icon: Activity },
    { id: 'spirituality', name: 'Spirituality', icon: Activity },
    { id: 'wellness', name: 'Wellness', icon: Activity },
    { id: 'beauty', name: 'Beauty', icon: Activity },
    { id: 'skincare', name: 'Skincare', icon: Activity },
  ];

  const availablePersonalities = [
    { id: 'adventurous', name: 'Adventurous', emoji: '🌟' },
    { id: 'creative', name: 'Creative', emoji: '🎨' },
    { id: 'outgoing', name: 'Outgoing', emoji: '🎉' },
    { id: 'friendly', name: 'Friendly', emoji: '😊' },
    { id: 'calm', name: 'Calm', emoji: '😌' },
    { id: 'energetic', name: 'Energetic', emoji: '⚡' },
    { id: 'funny', name: 'Funny', emoji: '😄' },
    { id: 'thoughtful', name: 'Thoughtful', emoji: '🤔' },
    { id: 'spontaneous', name: 'Spontaneous', emoji: '🎲' },
    { id: 'organized', name: 'Organized', emoji: '📋' },
    { id: 'ambitious', name: 'Ambitious', emoji: '🎯' },
    { id: 'easygoing', name: 'Easy-going', emoji: '🌊' },
    { id: 'curious', name: 'Curious', emoji: '🔍' },
    { id: 'optimistic', name: 'Optimistic', emoji: '🌅' },
    { id: 'loyal', name: 'Loyal', emoji: '🤝' },
    { id: 'independent', name: 'Independent', emoji: '🦋' },
    { id: 'compassionate', name: 'Compassionate', emoji: '💜' },
    { id: 'confident', name: 'Confident', emoji: '💪' },
    { id: 'artistic', name: 'Artistic', emoji: '🖌️' },
    { id: 'analytical', name: 'Analytical', emoji: '📊' },
    { id: 'genuine', name: 'Genuine', emoji: '💎' },
    { id: 'playful', name: 'Playful', emoji: '🎭' },
    { id: 'determined', name: 'Determined', emoji: '🔥' },
    { id: 'empathetic', name: 'Empathetic', emoji: '🫂' },
    { id: 'introverted', name: 'Introverted', emoji: '📚' },
    { id: 'extraverted', name: 'Extraverted', emoji: '🗣️' },
    { id: 'patient', name: 'Patient', emoji: '🧘' },
    { id: 'passionate', name: 'Passionate', emoji: '🔥' },
    { id: 'intellectual', name: 'Intellectual', emoji: '🧠' },
    { id: 'humorous', name: 'Humorous', emoji: '😂' },
    { id: 'sensitive', name: 'Sensitive', emoji: '🌸' },
    { id: 'practical', name: 'Practical', emoji: '🔧' },
    { id: 'intuitive', name: 'Intuitive', emoji: '💫' },
    { id: 'reliable', name: 'Reliable', emoji: '🏆' },
    { id: 'flexible', name: 'Flexible', emoji: '🤸' },
    { id: 'focused', name: 'Focused', emoji: '🎯' },
    { id: 'romantic', name: 'Romantic', emoji: '💕' },
    { id: 'logical', name: 'Logical', emoji: '⚖️' },
    { id: 'generous', name: 'Generous', emoji: '🤗' },
    { id: 'wise', name: 'Wise', emoji: '🦉' },
    { id: 'innovative', name: 'Innovative', emoji: '💡' },
    { id: 'resilient', name: 'Resilient', emoji: '💪' },
    { id: 'charismatic', name: 'Charismatic', emoji: '✨' },
    { id: 'humble', name: 'Humble', emoji: '🙏' },
    { id: 'bold', name: 'Bold', emoji: '⚡' },
    { id: 'peaceful', name: 'Peaceful', emoji: '🕊️' },
    { id: 'witty', name: 'Witty', emoji: '🎪' },
    { id: 'sincere', name: 'Sincere', emoji: '💝' },
    { id: 'driven', name: 'Driven', emoji: '🚀' },
    { id: 'nurturing', name: 'Nurturing', emoji: '🌱' },
    { id: 'open_minded', name: 'Open-minded', emoji: '🌍' },
    { id: 'competitive', name: 'Competitive', emoji: '🏅' },
    { id: 'supportive', name: 'Supportive', emoji: '🤲' },
    { id: 'mysterious', name: 'Mysterious', emoji: '🎭' },
    { id: 'balanced', name: 'Balanced', emoji: '⚖️' },
    { id: 'inspiring', name: 'Inspiring', emoji: '🌟' },
    { id: 'disciplined', name: 'Disciplined', emoji: '🎖️' },
    { id: 'free_spirited', name: 'Free-spirited', emoji: '🦋' },
    { id: 'strategic', name: 'Strategic', emoji: '♟️' },
    { id: 'caring', name: 'Caring', emoji: '💖' },
    { id: 'mindful', name: 'Mindful', emoji: '🧘‍♀️' },
    { id: 'progressive', name: 'Progressive', emoji: '🌈' },
  ];

  const { data: userEvents } = useQuery({
    queryKey: ["/api/users", user?.id, "events", "organized", "past"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/events?type=organized&pastOnly=true`);
      if (!response.ok) throw new Error('Failed to fetch user events');
      return response.json() as Promise<EventWithOrganizer[]>;
    },
    enabled: !!user?.id,
  });

  const { data: attendingEvents } = useQuery({
    queryKey: ["/api/users", user?.id, "events", "attending", "past"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/events?type=attending&pastOnly=true`);
      if (!response.ok) throw new Error('Failed to fetch attending events');
      return response.json() as Promise<EventWithOrganizer[]>;
    },
    enabled: !!user?.id,
  });

  const updateInterestsMutation = useMutation({
    mutationFn: async (interests: string[]) => {
      await apiRequest('/api/users/profile', { 
        method: 'PUT',
        body: JSON.stringify({
          location: user?.location,
          interests,
          personality: user?.personality || []
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Interests Updated",
        description: "Your interests have been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingInterests(false);
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
        description: "Failed to update interests. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePersonalityMutation = useMutation({
    mutationFn: async (personality: string[]) => {
      await apiRequest('/api/users/profile', { 
        method: 'PUT',
        body: JSON.stringify({
          location: user?.location,
          interests: user?.interests || [],
          personality
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Personality Updated",
        description: "Your personality traits have been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingPersonality(false);
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
        description: "Failed to update personality. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateSignatureMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/generate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate signature');
      }
      
      return { data, status: response.status };
    },
    onSuccess: ({ data, status }) => {
      setAiSignature(data.signature);
      
      // Invalidate and refetch user data to get the updated signature from database
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      if (status === 503) {
        // Fallback signature was generated
        toast({
          title: "Signature Generated",
          description: data.message || "Here's a personalized signature for you!",
        });
      } else {
        // AI signature was generated successfully
        toast({
          title: "AI Signature Generated",
          description: "Your personalized signature is ready!",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const updateUsernameMutation = useMutation({
    mutationFn: async (names: { firstName: string; lastName: string }) => {
      await apiRequest('/api/users/profile', { 
        method: 'PUT',
        body: JSON.stringify({
          firstName: names.firstName,
          lastName: names.lastName,
          location: user?.location,
          interests: user?.interests || [],
          personality: user?.personality || []
        })
      });
    },
    onSuccess: () => {
      toast({
        title: "Username Updated",
        description: "Your username has been saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setEditingUsername(false);
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
        description: "Failed to update username. Please try again.",
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

  // Handler functions
  const handleEditLocation = () => {
    setEditingLocation(true);
    setLocationInput(user?.location || '');
  };

  const handleSaveLocation = () => {
    if (locationInput.trim()) {
      updateLocationMutation.mutate(locationInput.trim());
    }
  };

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
    
    if (user) {
      setShowProfile(true);
      setSelectedInterests(user.interests || []);
      setSelectedPersonality(user.personality || []);
      setAiSignature(user.aiSignature || '');
      setLocationInput(user.location || '');
      setFirstNameInput(user.firstName || '');
      setLastNameInput(user.lastName || '');
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else if (prev.length < 3) {
        return [...prev, interestId];
      }
      return prev;
    });
  };

  const handleSaveInterests = () => {
    updateInterestsMutation.mutate(selectedInterests);
  };

  const handleEditInterests = () => {
    setEditingInterests(true);
    setSelectedInterests(user?.interests || []);
  };

  const handlePersonalityToggle = (personalityId: string) => {
    setSelectedPersonality(prev => {
      if (prev.includes(personalityId)) {
        return prev.filter(id => id !== personalityId);
      } else if (prev.length < 5) {
        return [...prev, personalityId];
      }
      return prev;
    });
  };

  const handleSavePersonality = () => {
    updatePersonalityMutation.mutate(selectedPersonality);
  };

  const handleEditPersonality = () => {
    setEditingPersonality(true);
    setSelectedPersonality(user?.personality || []);
  };

  const handleEditUsername = () => {
    setEditingUsername(true);
    setFirstNameInput(user?.firstName || '');
    setLastNameInput(user?.lastName || '');
  };

  const handleSaveUsername = () => {
    updateUsernameMutation.mutate({
      firstName: firstNameInput.trim(),
      lastName: lastNameInput.trim()
    });
  };

  if (isLoading || !showProfile) {
    return (
      <div className="max-w-sm mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const categoryIcons = {
    music: Music,
    sports: Activity,
    arts: Palette,
    food: UtensilsCrossed,
    tech: Laptop,
  };

  const getEventIcon = (category: string) => {
    const IconComponent = categoryIcons[category.toLowerCase() as keyof typeof categoryIcons] || Music;
    return <IconComponent className="w-5 h-5 text-white" />;
  };

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-center">
        <h2 className="text-lg font-semibold">Profile</h2>
      </header>

      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary to-accent p-6 text-white">
        <div className="flex items-center space-x-4">
          <AnimeAvatar 
            seed={user?.animeAvatarSeed || user?.id || "default"} 
            size="lg" 
            customAvatarUrl={user?.customAvatarUrl}
            behavior="modal"
          />
          <div className="flex-1">
            {editingUsername ? (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={firstNameInput}
                    onChange={(e) => setFirstNameInput(e.target.value)}
                    placeholder="First name"
                    className="text-sm bg-white/20 text-white placeholder-white/60 px-2 py-1 rounded border-none outline-none flex-1"
                  />
                  <input
                    type="text"
                    value={lastNameInput}
                    onChange={(e) => setLastNameInput(e.target.value)}
                    placeholder="Last name"
                    className="text-sm bg-white/20 text-white placeholder-white/60 px-2 py-1 rounded border-none outline-none flex-1"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveUsername}
                    disabled={updateUsernameMutation.isPending}
                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                  >
                    {updateUsernameMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingUsername(false);
                      setFirstNameInput(user?.firstName || '');
                      setLastNameInput(user?.lastName || '');
                    }}
                    className="text-xs text-white/70 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-semibold">
                  {user?.firstName || user?.lastName 
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : 'Anonymous User'}
                </h3>
                <button
                  onClick={handleEditUsername}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            )}
            {editingLocation ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Enter your location"
                  className="text-sm bg-white/20 text-white placeholder-white/60 px-2 py-1 rounded border-none outline-none"
                />
                <button
                  onClick={handleSaveLocation}
                  disabled={updateLocationMutation.isPending}
                  className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                >
                  {updateLocationMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingLocation(false);
                    setLocationInput(user?.location || '');
                  }}
                  className="text-xs text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <p className="text-white/80 text-sm">{user?.location || "Location not set"}</p>
                <button
                  onClick={handleEditLocation}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="text-white/70 hover:text-white transition-colors"
                  title="Detect my location"
                >
                  {isDetectingLocation ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-white/50 border-t-white border-[1px]"></div>
                  ) : (
                    <Navigation className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* AI Signature Section */}
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          {(aiSignature || user?.aiSignature) ? (
            <div className="space-y-2">
              <p className="text-base text-white/90 italic leading-relaxed text-center">
                "{aiSignature || user?.aiSignature}"
              </p>
              <button
                onClick={() => generateSignatureMutation.mutate()}
                disabled={generateSignatureMutation.isPending}
                className="bg-white/20 hover:bg-white/30 hover:shadow-md text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed block mx-auto border border-white/30 hover:border-white/50"
              >
                {generateSignatureMutation.isPending ? 'Generating...' : '⭐ Generate New AI Signature'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-white/70 text-center">
                Generate a personalized signature based on your interests and personality
              </p>
              <button
                onClick={() => generateSignatureMutation.mutate()}
                disabled={generateSignatureMutation.isPending || (!user?.interests?.length && !user?.personality?.length)}
                className="bg-white/20 hover:bg-white/30 hover:shadow-md text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed block mx-auto border border-white/30 hover:border-white/50"
              >
                {generateSignatureMutation.isPending ? 'Generating...' : '🌟 Generate Signature'}
              </button>
              {!user?.interests?.length && !user?.personality?.length && (
                <p className="text-xs text-white/60 mt-1 text-center">
                  Add interests and personality traits first
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="p-4 space-y-6">
        {/* Event History */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Event History</h4>
          <div className="grid grid-cols-2 gap-1">
            {(() => {
              // Combine and sort all past events by date descending
              const allPastEvents = [
                ...(userEvents || []).map(event => ({ ...event, type: 'hosted' })),
                ...(attendingEvents || []).map(event => ({ ...event, type: 'attended' }))
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
              return allPastEvents.length > 0 ? (
                allPastEvents.slice(0, 6).map((event) => (
                  <div key={`${event.type}-${event.id}`} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      {getEventIcon(event.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-800 text-xs truncate">{event.title}</h5>
                      <p className="text-xs text-gray-600 truncate">{event.type === 'hosted' ? 'Hosted' : 'Attended'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-gray-500">
                  <p>No past events yet</p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Interests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">Interests</h4>
            {!editingInterests && (
              <button 
                onClick={handleEditInterests}
                className="text-primary text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>
          
          {editingInterests ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select up to 3 interests that represent you best:</p>
              <div className="max-h-60 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 pr-2">
                  {availableInterests.map((interest) => {
                    const Icon = interest.icon;
                    const isSelected = selectedInterests.includes(interest.id);
                    
                    return (
                      <button
                        key={interest.id}
                        onClick={() => handleInterestToggle(interest.id)}
                        disabled={!isSelected && selectedInterests.length >= 3}
                        className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors ${
                          isSelected 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        } ${!isSelected && selectedInterests.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span className="text-xs">{interest.name}</span>
                        {isSelected && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveInterests}
                  disabled={updateInterestsMutation.isPending}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                >
                  {updateInterestsMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingInterests(false);
                    setSelectedInterests(user?.interests || []);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user?.interests && user.interests.length > 0 ? (
                user.interests.slice(0, 3).map((interest) => {
                  const interestData = availableInterests.find(i => i.id === interest);
                  const Icon = interestData?.icon || Activity;
                  
                  return (
                    <div key={interest} className="flex items-center space-x-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                      <Icon className="w-3 h-3" />
                      <span>{interestData?.name || interest}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm">No interests selected yet</p>
              )}
            </div>
          )}
        </div>

        {/* Personality */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800">Personality</h4>
            {!editingPersonality && (
              <button 
                onClick={handleEditPersonality}
                className="text-primary text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>
          
          {editingPersonality ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Select up to 3 personality traits that describe you best:</p>
              <div className="max-h-64 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 pr-2">
                  {availablePersonalities.map((personality) => {
                    const isSelected = selectedPersonality.includes(personality.id);
                    
                    return (
                      <button
                        key={personality.id}
                        onClick={() => handlePersonalityToggle(personality.id)}
                        disabled={!isSelected && selectedPersonality.length >= 3}
                        className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                          isSelected 
                            ? 'bg-purple-50 border-purple-500 text-purple-700' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        } ${!isSelected && selectedPersonality.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-lg">{personality.emoji}</span>
                        <span className="text-sm">{personality.name}</span>
                        {isSelected && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSavePersonality}
                  disabled={updatePersonalityMutation.isPending}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50"
                >
                  {updatePersonalityMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingPersonality(false);
                    setSelectedPersonality(user?.personality || []);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user?.personality && user.personality.length > 0 ? (
                user.personality.slice(0, 3).map((personalityId) => {
                  const personalityData = availablePersonalities.find(p => p.id === personalityId);
                  
                  return (
                    <div key={personalityId} className="flex items-center space-x-1 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                      <span className="text-sm">{personalityData?.emoji}</span>
                      <span>{personalityData?.name || personalityId}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-sm">No personality traits selected yet</p>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Settings</h4>
          <div className="space-y-1">
            <button className="w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Notifications</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
            </button>
            <button className="w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Privacy</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
            </button>
            <button className="w-full text-left p-3 flex items-center justify-between hover:bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-5 h-5 text-gray-600" />
                <span className="text-gray-700">Help & Support</span>
              </div>
              <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-gray-200">
          <button 
            onClick={() => window.location.href = '/api/logout'}
            className="w-full text-left p-3 text-red-600 hover:bg-red-50 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav 
        currentPage="profile" 
        onCreateEvent={() => setShowCreateEvent(true)}
      />

      {/* Create Event Modal */}
      {showCreateEvent && (
        <CreateEvent onClose={() => setShowCreateEvent(false)} />
      )}
    </div>
  );
}
