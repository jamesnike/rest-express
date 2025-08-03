import fetch from 'node-fetch';

// Sample events data for the coming month
const sampleEvents = [
  // Music Events
  {
    title: "Indie Rock Concert: The Midnight Revival",
    description: "Experience an electrifying night with The Midnight Revival, a local indie rock band known for their haunting melodies and powerful performances. This intimate venue concert will feature songs from their upcoming album 'City Lights' along with fan favorites. Special guest opener: Luna Echo.",
    category: "Music",
    subCategory: "Indie Rock",
    date: "2025-02-15",
    time: "20:00:00",
    location: "The Underground Music Hall, 425 Main Street, Downtown",
    latitude: "40.7589",
    longitude: "-73.9851",
    price: "25.00",
    isFree: false,
    maxAttendees: 150,
    capacity: 150,
    parkingInfo: "Street parking available. Paid garage 2 blocks away at City Center Garage ($15/night).",
    meetingPoint: "Main entrance lobby 30 minutes before show",
    duration: "3 hours (doors at 7 PM, show at 8 PM)",
    whatToBring: "Valid ID for bar service, comfortable shoes for standing",
    specialNotes: "All ages welcome. Full bar available for 21+. Photography allowed but no professional cameras.",
    requirements: "Must be 18+ to attend, minors with guardian welcome",
    contactInfo: "For questions: events@undergroundhall.com or (555) 123-4567",
    cancellationPolicy: "Refunds available up to 48 hours before event. No refunds day of show unless cancelled.",
    eventImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800"
  },
  {
    title: "Jazz & Wine Evening with Sarah Monroe Quartet",
    description: "Savor an elegant evening of smooth jazz and curated wines with the renowned Sarah Monroe Quartet. This sophisticated event features contemporary jazz interpretations of classic standards, paired with a selection of premium wines from local vineyards. Light appetizers included.",
    category: "Music",
    subCategory: "Jazz",
    date: "2025-02-22",
    time: "19:30:00",
    location: "Riverside Jazz Lounge, 890 Waterfront Drive",
    latitude: "40.7505",
    longitude: "-73.9934",
    price: "45.00",
    isFree: false,
    maxAttendees: 80,
    capacity: 80,
    parkingInfo: "Valet parking available ($20). Self-parking in adjacent lot ($10).",
    meetingPoint: "Host station at main entrance",
    duration: "3.5 hours (7:30 PM - 11 PM)",
    whatToBring: "Business casual attire recommended",
    specialNotes: "Wine tasting includes 5 selections. Non-alcoholic options available. Reserved seating.",
    requirements: "Must be 21+ to attend",
    contactInfo: "Reservations: reserve@riversidejazz.com or (555) 234-5678",
    cancellationPolicy: "Full refund if cancelled 72+ hours in advance. 50% refund 24-72 hours.",
    eventImageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800"
  },

  // Sports Events
  {
    title: "Weekend Warriors Basketball Tournament",
    description: "Join our exciting 3-on-3 basketball tournament open to all skill levels! Teams of 3 players compete in fast-paced games with prizes for winners. Registration includes team t-shirt, refreshments, and post-tournament barbecue. Great networking opportunity for local basketball enthusiasts.",
    category: "Sports",
    subCategory: "Basketball",
    date: "2025-02-08",
    time: "09:00:00",
    location: "Riverside Sports Complex, Courts 1-4, 1200 Athletic Drive",
    latitude: "40.7282",
    longitude: "-74.0776",
    price: "75.00",
    isFree: false,
    maxAttendees: 48,
    capacity: 48,
    parkingInfo: "Free parking in complex lot. Additional street parking available.",
    meetingPoint: "Registration table at Court 1",
    duration: "8 hours (9 AM - 5 PM including breaks)",
    whatToBring: "Athletic shoes, water bottle, team of 3 players (or register as individual for team placement)",
    specialNotes: "Prizes: 1st place $300, 2nd place $150, 3rd place $75. Team photos included.",
    requirements: "All participants must sign waiver. Teams need exactly 3 players.",
    contactInfo: "Tournament director: mike@riversideplex.com or (555) 345-6789",
    cancellationPolicy: "Full refund if tournament cancelled due to weather. No individual refunds.",
    eventImageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800"
  },
  {
    title: "Morning Yoga by the Lake",
    description: "Start your weekend with peaceful yoga practice overlooking Crystal Lake. This all-levels class focuses on breath work, gentle flowing movements, and meditation. Enjoy the sunrise while connecting with nature and fellow yoga enthusiasts. Mats and props provided.",
    category: "Sports",
    subCategory: "Yoga",
    date: "2025-02-09",
    time: "07:00:00",
    location: "Crystal Lake Park, Pavilion Area, 567 Lakeshore Road",
    latitude: "40.7831",
    longitude: "-73.9712",
    price: "0.00",
    isFree: true,
    maxAttendees: 25,
    capacity: 25,
    parkingInfo: "Free parking in park lot. Arrive early as lot fills quickly on weekends.",
    meetingPoint: "Large pavilion near the lake dock",
    duration: "1.5 hours (7 AM - 8:30 AM)",
    whatToBring: "Water bottle, towel, comfortable workout clothes. Mats provided but feel free to bring your own.",
    specialNotes: "Cancelled if raining. Check weather and our social media for updates.",
    requirements: "All fitness levels welcome. Under 16 must be accompanied by adult.",
    contactInfo: "Instructor Lisa: lisa.yoga.lake@gmail.com or (555) 456-7890",
    cancellationPolicy: "Free event - no cancellation needed, just don't show up if you can't make it.",
    eventImageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"
  },

  // Arts Events
  {
    title: "Watercolor Painting Workshop: Landscapes",
    description: "Discover the beauty of watercolor painting in this hands-on workshop focused on landscape techniques. Professional artist Emma Chen will guide you through color mixing, wet-on-wet techniques, and composition basics. All supplies included. Perfect for beginners and those looking to refresh their skills.",
    category: "Arts",
    subCategory: "Painting",
    date: "2025-02-16",
    time: "14:00:00",
    location: "Community Arts Center, Studio B, 789 Creative Avenue",
    latitude: "40.7614",
    longitude: "-73.9776",
    price: "65.00",
    isFree: false,
    maxAttendees: 12,
    capacity: 12,
    parkingInfo: "Free 2-hour street parking. Extended parking in municipal lot across street ($5/day).",
    meetingPoint: "Arts Center main lobby, then proceed to Studio B",
    duration: "3 hours (2 PM - 5 PM with 15-minute break)",
    whatToBring: "Apron or old clothes recommended. All art supplies provided including take-home materials.",
    specialNotes: "Light refreshments provided. Completed artwork can be taken home. Photography of work encouraged.",
    requirements: "No experience necessary. Ages 16+ (under 18 with adult supervision).",
    contactInfo: "Workshop coordinator: classes@communityarts.org or (555) 567-8901",
    cancellationPolicy: "Full refund 7+ days notice. 50% refund 3-7 days notice. No refund less than 3 days.",
    eventImageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800"
  },
  {
    title: "Poetry Open Mic Night",
    description: "Share your voice at our monthly poetry open mic! Whether you're a seasoned poet or trying it for the first time, all are welcome to perform or simply enjoy. Featured poet Sarah Williams will open with a 20-minute set. Sign-up starts at 7 PM, performances begin at 8 PM.",
    category: "Arts",
    subCategory: "Literature",
    date: "2025-02-20",
    time: "19:00:00",
    location: "The Reading Room Café, 432 Literature Lane",
    latitude: "40.7391",
    longitude: "-74.0020",
    price: "0.00",
    isFree: true,
    maxAttendees: 40,
    capacity: 40,
    parkingInfo: "Street parking available. Nearby parking garage at 5th & Main ($8 after 6 PM).",
    meetingPoint: "Café entrance - look for the poetry night banner",
    duration: "3 hours (7 PM - 10 PM)",
    whatToBring: "Your poems! Printed copies recommended. Purchasing drinks/food supports the venue.",
    specialNotes: "5-minute time limit per poet. Family-friendly content only. Snaps not claps for applause.",
    requirements: "All ages welcome. Must purchase at least one item from café if staying longer than 1 hour.",
    contactInfo: "Event host: poetry@readingroomcafe.com or (555) 678-9012",
    cancellationPolicy: "Free event - follow our social media for any weather-related cancellations.",
    eventImageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800"
  },

  // Food Events
  {
    title: "Artisan Pizza Making Class",
    description: "Learn the art of authentic Italian pizza making from Chef Marco Rossi! This hands-on class covers dough preparation, sauce making, cheese selection, and traditional wood-fired cooking techniques. Make and enjoy 2 personal pizzas plus take home dough for practice.",
    category: "Food",
    subCategory: "Cooking Class",
    date: "2025-02-14",
    time: "18:00:00",
    location: "Bella Cucina Cooking School, 1234 Culinary Street",
    latitude: "40.7505",
    longitude: "-73.9934",
    price: "85.00",
    isFree: false,
    maxAttendees: 16,
    capacity: 16,
    parkingInfo: "Validated parking in building garage. Street parking also available with meters free after 6 PM.",
    meetingPoint: "Cooking school lobby on 2nd floor",
    duration: "3 hours (6 PM - 9 PM)",
    whatToBring: "Apron provided. Comfortable closed-toe shoes required. Bring containers for leftovers.",
    specialNotes: "Wine pairing available for additional $20. Vegetarian and gluten-free options accommodated with advance notice.",
    requirements: "Ages 16+. Food allergies must be disclosed during registration.",
    contactInfo: "Chef Marco: classes@bellacucinacook.com or (555) 789-0123",
    cancellationPolicy: "Full refund 5+ days notice. 50% refund 2-5 days. No refund less than 48 hours.",
    eventImageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800"
  },
  {
    title: "Farmers Market & Local Food Festival",
    description: "Celebrate local agriculture and artisan food producers! Over 30 vendors featuring fresh produce, baked goods, preserves, honey, and prepared foods. Live cooking demonstrations every hour, kids' activities, and live acoustic music. Support your local food community while discovering new flavors.",
    category: "Food",
    subCategory: "Festival",
    date: "2025-02-23",
    time: "10:00:00",
    location: "Town Square Park, 100 Main Street",
    latitude: "40.7831",
    longitude: "-73.9712",
    price: "0.00",
    isFree: true,
    maxAttendees: 500,
    capacity: 500,
    parkingInfo: "Free parking in adjacent municipal lots. Bicycle parking available. Public transit recommended.",
    meetingPoint: "Information booth at park entrance",
    duration: "5 hours (10 AM - 3 PM)",
    whatToBring: "Reusable bags for purchases, cash (many vendors), appetite for sampling!",
    specialNotes: "Rain or shine event under covered pavilions. Dog-friendly. Live music 11 AM - 2 PM.",
    requirements: "Family-friendly event, all ages welcome.",
    contactInfo: "Market manager: info@townfarmersmarket.org or (555) 890-1234",
    cancellationPolicy: "Free event - check website for severe weather updates.",
    eventImageUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800"
  },

  // Tech Events
  {
    title: "AI in Healthcare: Future Innovations Workshop",
    description: "Explore cutting-edge applications of artificial intelligence in healthcare with industry experts. Topics include diagnostic imaging AI, drug discovery algorithms, and patient care optimization. Interactive demos, panel discussions, and networking with healthcare tech professionals.",
    category: "Tech",
    subCategory: "AI/Machine Learning",
    date: "2025-02-19",
    time: "09:00:00",
    location: "Innovation Hub Conference Center, 2000 Technology Drive",
    latitude: "40.7282",
    longitude: "-74.0776",
    price: "95.00",
    isFree: false,
    maxAttendees: 100,
    capacity: 100,
    parkingInfo: "Free parking in Innovation Hub garage. Visitor passes provided at registration.",
    meetingPoint: "Conference center lobby, registration desk",
    duration: "6 hours (9 AM - 3 PM with lunch break)",
    whatToBring: "Laptop optional for interactive sessions. Business cards for networking.",
    specialNotes: "Continental breakfast and lunch included. Recording not permitted. Slides shared post-event.",
    requirements: "Professional development event. College level understanding of technology preferred.",
    contactInfo: "Event coordinator: workshop@innovationhub.tech or (555) 901-2345",
    cancellationPolicy: "Full refund 2+ weeks notice. 50% refund 1-2 weeks. No refund less than 1 week.",
    eventImageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800"
  },
  {
    title: "Beginner Web Development Bootcamp",
    description: "Launch your coding journey! This intensive day covers HTML, CSS, and JavaScript basics. Build your first responsive website with hands-on coding exercises. Perfect for complete beginners interested in web development careers or hobbyists wanting to create their own sites.",
    category: "Tech",
    subCategory: "Web Development",
    date: "2025-02-25",
    time: "10:00:00",
    location: "CodeCraft Academy, 1500 Developer Road, Suite 300",
    latitude: "40.7614",
    longitude: "-73.9776",
    price: "120.00",
    isFree: false,
    maxAttendees: 20,
    capacity: 20,
    parkingInfo: "Free parking in building lot. Additional street parking with meters ($2/hour until 6 PM).",
    meetingPoint: "CodeCraft Academy reception on 3rd floor",
    duration: "6 hours (10 AM - 4 PM with lunch break)",
    whatToBring: "Laptop with charger (Mac or PC). We'll help with software installation.",
    specialNotes: "Lunch provided. Take home starter code and resources. Follow-up support via online community.",
    requirements: "No programming experience needed. Basic computer skills required.",
    contactInfo: "Instructor Jake: bootcamp@codecraftacademy.com or (555) 012-3456",
    cancellationPolicy: "Full refund 10+ days notice. 75% refund 5-10 days. 25% refund 2-5 days.",
    eventImageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"
  },

  // Community Events
  {
    title: "Neighborhood Cleanup & Tree Planting Day",
    description: "Join your neighbors in beautifying our community! We'll clean up Harbor Park and plant 50 new trees along the walking trails. All ages welcome for this environmental action day. Tools, gloves, and refreshments provided. Help make our neighborhood greener and cleaner!",
    category: "Community",
    subCategory: "Environmental",
    date: "2025-02-12",
    time: "08:00:00",
    location: "Harbor Park, Main Entrance, 800 Harbor View Drive",
    latitude: "40.7391",
    longitude: "-74.0020",
    price: "0.00",
    isFree: true,
    maxAttendees: 100,
    capacity: 100,
    parkingInfo: "Free parking in park lot and surrounding streets. Carpooling encouraged.",
    meetingPoint: "Park pavilion near main entrance",
    duration: "4 hours (8 AM - 12 PM)",
    whatToBring: "Wear old clothes and sturdy shoes. Work gloves provided but bring your own if preferred.",
    specialNotes: "Coffee and donuts at 8 AM. Pizza lunch at noon for all volunteers. Rain date: following Saturday.",
    requirements: "All ages welcome. Children under 12 must be supervised by adult.",
    contactInfo: "Volunteer coordinator: cleanup@harborpark.org or (555) 123-4567",
    cancellationPolicy: "Free event - check website morning of for weather updates.",
    eventImageUrl: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=800"
  },
  {
    title: "Senior Game Night & Social Hour",
    description: "Monthly social gathering for seniors (55+) featuring board games, card games, and friendly conversation. Light snacks and beverages provided. Great way to meet neighbors and stay socially connected. Regular attendees welcome newcomers warmly!",
    category: "Community",
    subCategory: "Social",
    date: "2025-02-18",
    time: "18:30:00",
    location: "Community Center, Multi-Purpose Room, 456 Community Lane",
    latitude: "40.7589",
    longitude: "-73.9851",
    price: "0.00",
    isFree: true,
    maxAttendees: 30,
    capacity: 30,
    parkingInfo: "Free parking in community center lot. Handicapped accessible parking available.",
    meetingPoint: "Community center main lobby",
    duration: "2.5 hours (6:30 PM - 9 PM)",
    whatToBring: "Just yourself! All games provided. Bring a favorite snack to share if you'd like.",
    specialNotes: "Popular games include Scrabble, Bridge, Rummy, and jigsaw puzzles. Very welcoming atmosphere.",
    requirements: "Ages 55+. Spouses/partners of any age welcome.",
    contactInfo: "Activity director: seniors@communitycenter.org or (555) 234-5678",
    cancellationPolicy: "Free event - rarely cancelled. Call if weather is severe.",
    eventImageUrl: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=800"
  },

  // Business Events  
  {
    title: "Small Business Networking Breakfast",
    description: "Connect with fellow local entrepreneurs over breakfast! Monthly networking event featuring structured introductions, industry mini-presentations, and open networking time. This month's focus: 'Digital Marketing on a Budget' with social media expert Jennifer Park.",
    category: "Business",
    subCategory: "Networking",
    date: "2025-02-13",
    time: "07:30:00",
    location: "Business Center Conference Room, 999 Enterprise Boulevard",
    latitude: "40.7505",
    longitude: "-73.9934",
    price: "25.00",
    isFree: false,
    maxAttendees: 40,
    capacity: 40,
    parkingInfo: "Free parking in business center garage with validation. Entrance on Enterprise Blvd.",
    meetingPoint: "Business center lobby, elevator to 5th floor conference room",
    duration: "2 hours (7:30 AM - 9:30 AM)",
    whatToBring: "Business cards and appetite for networking! Breakfast provided.",
    specialNotes: "Featured presentation 8:15-8:45 AM. Structured introductions for new attendees. Professional atmosphere.",
    requirements: "Business owners, entrepreneurs, or serious business-minded individuals.",
    contactInfo: "Network organizer: breakfast@localbiznetwork.com or (555) 345-6789",
    cancellationPolicy: "Full refund 48+ hours notice. 50% refund 24-48 hours notice.",
    eventImageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800"
  },

  // Education Events
  {
    title: "Personal Finance Workshop: Retirement Planning",
    description: "Learn essential retirement planning strategies from certified financial planner David Chen. Topics include 401k optimization, IRA strategies, Social Security planning, and investment basics. Interactive exercises help you create your personalized retirement roadmap.",
    category: "Education",
    subCategory: "Finance",
    date: "2025-02-21",
    time: "19:00:00",
    location: "Public Library, Community Room A, 300 Knowledge Street",
    latitude: "40.7831",
    longitude: "-73.9712",
    price: "0.00",
    isFree: true,
    maxAttendees: 35,
    capacity: 35,
    parkingInfo: "Free parking in library lot until 10 PM. Additional street parking available.",
    meetingPoint: "Library main entrance, follow signs to Community Room A",
    duration: "2 hours (7 PM - 9 PM)",
    whatToBring: "Notebook and pen for taking notes. Calculator helpful but not required.",
    specialNotes: "Handouts provided. No specific financial products sold. Focus on education and planning strategies.",
    requirements: "Adults 18+. Basic math skills helpful. All income levels welcome.",
    contactInfo: "Library events: events@publiclibrary.org or (555) 456-7890",
    cancellationPolicy: "Free event - registration helpful for materials but walk-ins welcome if space available.",
    eventImageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800"
  },

  // Health & Wellness Events
  {
    title: "Meditation & Mindfulness Workshop",
    description: "Discover inner peace with certified mindfulness instructor Maria Santos. Learn practical meditation techniques for stress reduction, better sleep, and improved focus. Suitable for beginners and experienced practitioners. Includes guided sessions and take-home practices.",
    category: "Health & Wellness",
    subCategory: "Mental Health",
    date: "2025-02-17",
    time: "10:00:00",
    location: "Wellness Center, Serenity Studio, 777 Peaceful Path",
    latitude: "40.7282",
    longitude: "-74.0776",
    price: "35.00",
    isFree: false,
    maxAttendees: 20,
    capacity: 20,
    parkingInfo: "Free parking in wellness center lot. Quiet arrival requested to maintain peaceful atmosphere.",
    meetingPoint: "Wellness center reception, then to Serenity Studio",
    duration: "2.5 hours (10 AM - 12:30 PM)",
    whatToBring: "Comfortable clothes for sitting. Meditation cushions provided but bring your own if preferred.",
    specialNotes: "Workshop includes breathing exercises, guided meditations, and Q&A. Recording of guided session provided.",
    requirements: "All experience levels welcome. Ages 16+ (under 18 with adult).",
    contactInfo: "Instructor Maria: meditation@wellnesscenter.com or (555) 567-8901",
    cancellationPolicy: "Full refund 72+ hours notice. 50% refund 24-72 hours. No refund day of.",
    eventImageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
  }
];

async function generateSampleEvents() {
  try {
    console.log('Starting to generate sample events...');
    
    const baseUrl = 'http://localhost:5000';
    
    // Use the external API endpoint to create events (no auth required)
    for (let i = 0; i < sampleEvents.length; i++) {
      const event = sampleEvents[i];
      console.log(`Creating event ${i + 1}/${sampleEvents.length}: ${event.title}`);
      
      try {
        const response = await fetch(`${baseUrl}/api/external/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...event,
            organizerEmail: 'sample@events.com', // Will create default organizer
            source: 'sample-data-generator',
            sourceUrl: 'https://eventconnect.app/sample-events'
          }),
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          console.log(`✓ Created: ${event.title} (ID: ${result.eventId})`);
        } else {
          console.log(`✗ Failed: ${event.title} - ${result.message || 'Unknown error'}`);
          if (result.errors) {
            console.log('  Validation errors:', result.errors);
          }
        }
        
        // Small delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`✗ Error creating ${event.title}:`, error.message);
      }
    }
    
    console.log(`Completed generating sample events!`);
    
  } catch (error) {
    console.error('Error generating sample events:', error);
    throw error;
  }
}

// Run the script
generateSampleEvents()
  .then(() => {
    console.log('Sample events generation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to generate sample events:', error);
    process.exit(1);
  });