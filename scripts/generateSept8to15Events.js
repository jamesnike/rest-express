import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/external/events';
const API_KEY = 'sk-eventconnect-2024-secure-key';

const categories = [
  'Music', 'Sports', 'Arts', 'Food', 'Tech', 'Business', 
  'Education', 'Health & Wellness', 'Entertainment', 
  'Community', 'Outdoor', 'Family', 'Lifestyle'
];

const imageUrls = {
  'Music': [
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea',
    'https://images.unsplash.com/photo-1429514513361-8fa32282fd5f'
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb',
    'https://images.unsplash.com/photo-1552674605-db6ffd4facb5',
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff'
  ],
  'Arts': [
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b',
    'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc27'
  ],
  'Food': [
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    'https://images.unsplash.com/photo-1490818387583-1baba5e638af'
  ],
  'Tech': [
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1',
    'https://images.unsplash.com/photo-1518770660439-4636190af475',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b'
  ],
  'Business': [
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d'
  ],
  'Education': [
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f'
  ],
  'Health & Wellness': [
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
    'https://images.unsplash.com/photo-1600881333168-2ef49b341f30'
  ],
  'Entertainment': [
    'https://images.unsplash.com/photo-1603190287605-e6ade32fa852',
    'https://images.unsplash.com/photo-1567593810070-7a3d471af022',
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3'
  ],
  'Community': [
    'https://images.unsplash.com/photo-1464207687429-7505649dae38',
    'https://images.unsplash.com/photo-1569163139394-de4798aa62b6',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64'
  ],
  'Outdoor': [
    'https://images.unsplash.com/photo-1533692328991-08159ff19fca',
    'https://images.unsplash.com/photo-1551632811-561732d1e306',
    'https://images.unsplash.com/photo-1501555088652-021faa106b9b'
  ],
  'Family': [
    'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5',
    'https://images.unsplash.com/photo-1542887800-faca0261c9e1',
    'https://images.unsplash.com/photo-1559734840-f9509ee5677f'
  ],
  'Lifestyle': [
    'https://images.unsplash.com/photo-1521575107034-e0fa0b594529',
    'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc',
    'https://images.unsplash.com/photo-1487956382158-bb926046304a'
  ]
};

const eventTemplates = {
  'Music': [
    {
      title: 'Acoustic Sunset Sessions',
      description: 'Enjoy live acoustic performances as the sun sets over the city. Local singer-songwriters share original music and stories in an intimate outdoor setting.',
      subcategory: 'Acoustic',
      requirements: 'Bring your own blanket or chair',
      whatToBring: 'Blanket, snacks, water bottle',
      specialNotes: 'Pet-friendly event',
      contactInfo: 'music@eventconnect.com | (555) 222-3333',
      cancellationPolicy: 'Full refund 48 hours before event'
    },
    {
      title: 'Rock Revival Concert',
      description: 'Classic rock tribute bands bring the greatest hits of the 70s and 80s back to life. High-energy performances guaranteed to get you dancing.',
      subcategory: 'Rock',
      requirements: 'Standing room only venue',
      whatToBring: 'Valid ID for bar service',
      specialNotes: 'Loud music - ear protection recommended',
      contactInfo: 'rock@eventconnect.com | (555) 333-4444',
      cancellationPolicy: 'No refunds, ticket transfers allowed'
    },
    {
      title: 'Hip Hop Showcase',
      description: 'Underground hip hop artists showcase their talents. Open mic segments, battles, and featured performances from rising stars.',
      subcategory: 'Hip Hop',
      requirements: '18+ event',
      whatToBring: 'Energy and good vibes',
      specialNotes: 'Limited capacity - arrive early',
      contactInfo: 'hiphop@eventconnect.com | (555) 444-5555',
      cancellationPolicy: 'Refunds available until day of event'
    }
  ],
  'Sports': [
    {
      title: 'Beach Volleyball Tournament',
      description: 'Competitive and recreational divisions welcome. Sand courts, music, and refreshments. Great way to meet fellow volleyball enthusiasts.',
      subcategory: 'Volleyball',
      requirements: 'Teams of 4-6 players',
      whatToBring: 'Sunscreen, water, athletic wear',
      specialNotes: 'Spectators welcome',
      contactInfo: 'sports@beachvolley.com | (555) 555-6666',
      cancellationPolicy: 'Weather dependent - rain date available'
    },
    {
      title: 'CrossFit Challenge',
      description: 'Test your fitness limits with varied functional movements. All fitness levels welcome with scaled options available.',
      subcategory: 'Fitness',
      requirements: 'Basic fitness level required',
      whatToBring: 'Water bottle, towel, change of clothes',
      specialNotes: 'Professional coaches on site',
      contactInfo: 'crossfit@eventconnect.com | (555) 666-7777',
      cancellationPolicy: 'Credit toward future events'
    },
    {
      title: 'Tennis Skills Clinic',
      description: 'Improve your serve, volley, and strategy with professional coaches. Small group instruction for personalized feedback.',
      subcategory: 'Tennis',
      requirements: 'Bring your own racket',
      whatToBring: 'Tennis racket, appropriate shoes',
      specialNotes: 'Courts provided, balls included',
      contactInfo: 'tennis@eventconnect.com | (555) 777-8888',
      cancellationPolicy: 'Make-up session offered if cancelled'
    }
  ],
  'Arts': [
    {
      title: 'Abstract Painting Workshop',
      description: 'Explore color, texture, and emotion through abstract art. No experience needed - let your creativity flow freely.',
      subcategory: 'Painting',
      requirements: 'All materials provided',
      whatToBring: 'Wear clothes that can get paint on them',
      specialNotes: 'Take home your masterpiece',
      contactInfo: 'arts@paintworkshop.com | (555) 888-9999',
      cancellationPolicy: '72-hour cancellation policy'
    },
    {
      title: 'Photography Walk',
      description: 'Guided tour through photogenic locations with tips on composition, lighting, and storytelling through images.',
      subcategory: 'Photography',
      requirements: 'Bring camera or smartphone',
      whatToBring: 'Camera, comfortable walking shoes',
      specialNotes: '3-mile walking route',
      contactInfo: 'photo@eventconnect.com | (555) 999-0000',
      cancellationPolicy: 'Full refund if cancelled by organizer'
    },
    {
      title: 'Sculpture Garden Tour',
      description: 'Expert-led tour through outdoor sculpture installations. Learn about artists, techniques, and interpretations.',
      subcategory: 'Sculpture',
      requirements: 'Walking tour - 2 hours',
      whatToBring: 'Sun protection, water',
      specialNotes: 'Audio guides available',
      contactInfo: 'sculpture@artgarden.com | (555) 000-1111',
      cancellationPolicy: 'Reschedule or refund available'
    }
  ],
  'Food': [
    {
      title: 'Wine & Cheese Pairing',
      description: 'Sommelier-led tasting of carefully selected wines paired with artisanal cheeses. Learn pairing principles and tasting techniques.',
      subcategory: 'Tasting',
      requirements: '21+ only',
      whatToBring: 'Valid ID',
      specialNotes: 'Light appetizers included',
      contactInfo: 'wine@tastings.com | (555) 111-2222',
      cancellationPolicy: 'Non-refundable after 48 hours'
    },
    {
      title: 'BBQ Masterclass',
      description: 'Learn smoking techniques, rub recipes, and sauce secrets from pitmaster champions. Hands-on grilling experience.',
      subcategory: 'Cooking Class',
      requirements: 'No experience needed',
      whatToBring: 'Appetite',
      specialNotes: 'Lunch included',
      contactInfo: 'bbq@grillmaster.com | (555) 222-3333',
      cancellationPolicy: 'Full refund 3 days prior'
    },
    {
      title: 'Vegan Cooking Demo',
      description: 'Discover delicious plant-based recipes that are nutritious and satisfying. Samples and recipe cards provided.',
      subcategory: 'Cooking Demo',
      requirements: 'Open to all diets',
      whatToBring: 'Questions and curiosity',
      specialNotes: 'Allergy-friendly options',
      contactInfo: 'vegan@healthycooking.com | (555) 333-4444',
      cancellationPolicy: 'Flexible rescheduling'
    }
  ],
  'Tech': [
    {
      title: 'Blockchain Basics Workshop',
      description: 'Demystify blockchain technology and cryptocurrency. Understand the fundamentals and real-world applications.',
      subcategory: 'Blockchain',
      requirements: 'Basic computer knowledge',
      whatToBring: 'Laptop recommended',
      specialNotes: 'WiFi provided',
      contactInfo: 'blockchain@techtalks.com | (555) 444-5555',
      cancellationPolicy: 'Transfer to online if needed'
    },
    {
      title: 'App Development Bootcamp',
      description: 'Build your first mobile app in a day. Step-by-step guidance from experienced developers.',
      subcategory: 'Mobile Dev',
      requirements: 'Laptop required',
      whatToBring: 'Laptop with development tools',
      specialNotes: 'Setup instructions sent prior',
      contactInfo: 'appdev@bootcamp.com | (555) 555-6666',
      cancellationPolicy: 'Full refund 1 week before'
    },
    {
      title: 'Cybersecurity Seminar',
      description: 'Learn to protect your digital life. Password management, safe browsing, and recognizing threats.',
      subcategory: 'Security',
      requirements: 'None',
      whatToBring: 'Note-taking materials',
      specialNotes: 'Free security toolkit provided',
      contactInfo: 'security@cyberaware.com | (555) 666-7777',
      cancellationPolicy: 'Always free to reschedule'
    }
  ],
  'Business': [
    {
      title: 'Startup Funding Workshop',
      description: 'Navigate the funding landscape from bootstrapping to venture capital. Hear from successful entrepreneurs and investors.',
      subcategory: 'Entrepreneurship',
      requirements: 'Business idea helpful but not required',
      whatToBring: 'Business cards, pitch if ready',
      specialNotes: 'Networking session included',
      contactInfo: 'startup@funding.com | (555) 777-8888',
      cancellationPolicy: 'Credit toward future events'
    },
    {
      title: 'Digital Marketing Intensive',
      description: 'SEO, social media, content marketing, and analytics. Practical strategies you can implement immediately.',
      subcategory: 'Marketing',
      requirements: 'Basic marketing knowledge',
      whatToBring: 'Laptop for hands-on work',
      specialNotes: 'Templates and tools included',
      contactInfo: 'marketing@digital.com | (555) 888-9999',
      cancellationPolicy: 'Full refund 5 days before'
    },
    {
      title: 'Executive Presence Training',
      description: 'Develop confidence, communication skills, and leadership presence. Small group with personalized feedback.',
      subcategory: 'Leadership',
      requirements: 'Management experience preferred',
      whatToBring: 'Professional attire',
      specialNotes: 'Video recording for self-review',
      contactInfo: 'executive@leadership.com | (555) 999-0000',
      cancellationPolicy: 'Substitute attendee permitted'
    }
  ],
  'Education': [
    {
      title: 'Speed Reading Workshop',
      description: 'Double your reading speed while maintaining comprehension. Techniques for academic and professional reading.',
      subcategory: 'Study Skills',
      requirements: 'Bring reading material',
      whatToBring: 'Book or articles to practice',
      specialNotes: 'Before/after speed test included',
      contactInfo: 'reading@studyskills.com | (555) 000-1111',
      cancellationPolicy: 'Full refund if not satisfied'
    },
    {
      title: 'Creative Writing Circle',
      description: 'Share your writing, receive constructive feedback, and participate in writing exercises. All genres welcome.',
      subcategory: 'Writing',
      requirements: 'Bring 5 pages to share (optional)',
      whatToBring: 'Writing samples, notebook',
      specialNotes: 'Supportive environment',
      contactInfo: 'writing@creative.com | (555) 111-2222',
      cancellationPolicy: 'Drop-in format, no refunds'
    },
    {
      title: 'Math Tutoring Session',
      description: 'Group tutoring for algebra through calculus. Work through problems together with expert guidance.',
      subcategory: 'Mathematics',
      requirements: 'Bring specific questions',
      whatToBring: 'Calculator, homework problems',
      specialNotes: 'Small groups by level',
      contactInfo: 'math@tutoring.com | (555) 222-3333',
      cancellationPolicy: 'Reschedule anytime'
    }
  ],
  'Health & Wellness': [
    {
      title: 'Stress Management Workshop',
      description: 'Learn practical techniques to manage daily stress. Breathing exercises, time management, and mindfulness practices.',
      subcategory: 'Mental Health',
      requirements: 'None',
      whatToBring: 'Comfortable clothing',
      specialNotes: 'Resources booklet provided',
      contactInfo: 'wellness@stressfree.com | (555) 333-4444',
      cancellationPolicy: 'Full refund anytime'
    },
    {
      title: 'Pilates for Beginners',
      description: 'Core strengthening and flexibility through controlled movements. Perfect introduction to Pilates principles.',
      subcategory: 'Pilates',
      requirements: 'No injuries',
      whatToBring: 'Yoga mat, water',
      specialNotes: 'Equipment provided',
      contactInfo: 'pilates@fitness.com | (555) 444-5555',
      cancellationPolicy: 'Class credit if cancelled'
    },
    {
      title: 'Healthy Meal Prep Sunday',
      description: 'Prepare a week\'s worth of healthy meals. Learn batch cooking, proper storage, and balanced nutrition.',
      subcategory: 'Nutrition',
      requirements: 'Bring containers',
      whatToBring: 'Food storage containers',
      specialNotes: 'Ingredients provided',
      contactInfo: 'mealprep@healthy.com | (555) 555-6666',
      cancellationPolicy: '48-hour notice required'
    }
  ],
  'Entertainment': [
    {
      title: 'Trivia Night Championship',
      description: 'Test your knowledge across various categories. Teams compete for prizes and bragging rights.',
      subcategory: 'Trivia',
      requirements: 'Teams of 2-6',
      whatToBring: 'Team name ready',
      specialNotes: 'Food and drinks available',
      contactInfo: 'trivia@pubnight.com | (555) 666-7777',
      cancellationPolicy: 'No refunds after registration'
    },
    {
      title: 'Improv Comedy Workshop',
      description: 'Learn the basics of improvisational comedy. Fun exercises to boost creativity and confidence.',
      subcategory: 'Comedy',
      requirements: 'No experience needed',
      whatToBring: 'Willingness to play',
      specialNotes: 'Performance opportunity at end',
      contactInfo: 'improv@comedy.com | (555) 777-8888',
      cancellationPolicy: 'Full refund 24 hours before'
    },
    {
      title: 'Karaoke Marathon',
      description: 'Sing your heart out! All genres, all skill levels welcome. Prizes for best performance and most entertaining.',
      subcategory: 'Karaoke',
      requirements: 'Sign up for time slots',
      whatToBring: 'Song selections',
      specialNotes: 'Songbook available',
      contactInfo: 'karaoke@singalong.com | (555) 888-9999',
      cancellationPolicy: 'Drop-in event'
    }
  ],
  'Community': [
    {
      title: 'Food Bank Volunteer Day',
      description: 'Help sort and pack food donations for families in need. Make a direct impact in your community.',
      subcategory: 'Volunteer',
      requirements: 'Ages 12+ (under 16 with adult)',
      whatToBring: 'Closed-toe shoes',
      specialNotes: 'Lunch provided for volunteers',
      contactInfo: 'volunteer@foodbank.com | (555) 999-0000',
      cancellationPolicy: 'Please notify if unable to attend'
    },
    {
      title: 'Multicultural Potluck',
      description: 'Share dishes from your culture and taste foods from around the world. Recipe exchange and cultural stories.',
      subcategory: 'Cultural',
      requirements: 'Bring a dish to share',
      whatToBring: 'Dish serving 8-10 people',
      specialNotes: 'Label ingredients for allergies',
      contactInfo: 'culture@community.com | (555) 000-1111',
      cancellationPolicy: 'Let us know if plans change'
    },
    {
      title: 'Community Garden Workshop',
      description: 'Learn sustainable gardening practices. Help maintain community plots and take home seedlings.',
      subcategory: 'Environment',
      requirements: 'None',
      whatToBring: 'Gardening gloves if you have them',
      specialNotes: 'Tools provided',
      contactInfo: 'garden@community.com | (555) 111-2222',
      cancellationPolicy: 'Rain or shine event'
    }
  ],
  'Outdoor': [
    {
      title: 'Sunrise Photography Hike',
      description: 'Capture golden hour light on mountain trails. Moderate 5-mile hike with photo stops at scenic viewpoints.',
      subcategory: 'Hiking',
      requirements: 'Moderate fitness level',
      whatToBring: 'Camera, hiking boots, layers',
      specialNotes: 'Early 5:30 AM start',
      contactInfo: 'hiking@outdoor.com | (555) 222-3333',
      cancellationPolicy: 'Weather dependent'
    },
    {
      title: 'Rock Climbing Introduction',
      description: 'Learn basic climbing techniques at local crags. All equipment provided, certified instructors.',
      subcategory: 'Climbing',
      requirements: 'No fear of heights',
      whatToBring: 'Athletic clothes, water',
      specialNotes: 'Harnesses and helmets provided',
      contactInfo: 'climbing@adventure.com | (555) 333-4444',
      cancellationPolicy: 'Full refund bad weather'
    },
    {
      title: 'Stand-Up Paddleboard Lesson',
      description: 'Learn SUP basics on calm water. Balance, paddling technique, and water safety covered.',
      subcategory: 'Water Sports',
      requirements: 'Can swim',
      whatToBring: 'Swimsuit, towel, sunscreen',
      specialNotes: 'Boards and PFDs provided',
      contactInfo: 'sup@watersports.com | (555) 444-5555',
      cancellationPolicy: 'Reschedule if windy'
    }
  ],
  'Family': [
    {
      title: 'Family Art & Craft Fair',
      description: 'Create art projects together. Multiple stations with age-appropriate activities for all family members.',
      subcategory: 'Crafts',
      requirements: 'Children must be supervised',
      whatToBring: 'Creativity and smiles',
      specialNotes: 'All materials included',
      contactInfo: 'family@artfair.com | (555) 555-6666',
      cancellationPolicy: 'Full refund 24 hours before'
    },
    {
      title: 'Outdoor Movie Night',
      description: 'Family-friendly film under the stars. Bring blankets and enjoy popcorn and snacks available for purchase.',
      subcategory: 'Entertainment',
      requirements: 'All ages',
      whatToBring: 'Blankets, chairs, snacks',
      specialNotes: 'Movie starts at dusk',
      contactInfo: 'movies@family.com | (555) 666-7777',
      cancellationPolicy: 'Rain date available'
    },
    {
      title: 'Science Discovery Day',
      description: 'Hands-on science experiments and demonstrations. Make slime, launch rockets, and explore physics through play.',
      subcategory: 'Educational',
      requirements: 'Ages 5-15',
      whatToBring: 'Clothes that can get messy',
      specialNotes: 'Take-home experiments included',
      contactInfo: 'science@discovery.com | (555) 777-8888',
      cancellationPolicy: 'Full refund if cancelled'
    }
  ],
  'Lifestyle': [
    {
      title: 'Minimalism Workshop',
      description: 'Learn to declutter your life and focus on what matters. Practical tips for simplifying your home and schedule.',
      subcategory: 'Personal Development',
      requirements: 'None',
      whatToBring: 'Photos of problem areas (optional)',
      specialNotes: 'Workbook included',
      contactInfo: 'minimal@lifestyle.com | (555) 888-9999',
      cancellationPolicy: 'Full refund 48 hours before'
    },
    {
      title: 'DIY Home Decor Class',
      description: 'Create beautiful home decorations on a budget. Learn techniques for upcycling and personalizing your space.',
      subcategory: 'Home',
      requirements: 'None',
      whatToBring: 'Ideas and inspiration',
      specialNotes: 'Take home your creations',
      contactInfo: 'diy@homedecor.com | (555) 999-0000',
      cancellationPolicy: 'Materials fee non-refundable'
    },
    {
      title: 'Personal Styling Session',
      description: 'Discover your style personality and learn to dress for your body type. Color analysis and wardrobe tips included.',
      subcategory: 'Fashion',
      requirements: 'Bring 3 favorite outfits',
      whatToBring: 'Current wardrobe favorites',
      specialNotes: 'Personal lookbook created',
      contactInfo: 'style@fashion.com | (555) 000-1111',
      cancellationPolicy: 'Reschedule anytime'
    }
  ]
};

const locations = [
  { venue: 'Civic Center Plaza', address: '1 Dr Carlton B Goodlett Pl', city: 'San Francisco', state: 'CA', zip: '94102' },
  { venue: 'Golden Gate Park', address: '501 Stanyan St', city: 'San Francisco', state: 'CA', zip: '94117' },
  { venue: 'Embarcadero Center', address: '1 Embarcadero Center', city: 'San Francisco', state: 'CA', zip: '94111' },
  { venue: 'Mission Bay Park', address: '1800 Owens St', city: 'San Francisco', state: 'CA', zip: '94158' },
  { venue: 'Presidio Main Post', address: '210 Lincoln Blvd', city: 'San Francisco', state: 'CA', zip: '94129' },
  { venue: 'Union Square', address: '333 Post St', city: 'San Francisco', state: 'CA', zip: '94108' },
  { venue: 'AT&T Park Plaza', address: '24 Willie Mays Plaza', city: 'San Francisco', state: 'CA', zip: '94107' },
  { venue: 'Crissy Field', address: '1199 E Beach', city: 'San Francisco', state: 'CA', zip: '94129' },
  { venue: 'Fort Mason Center', address: '2 Marina Blvd', city: 'San Francisco', state: 'CA', zip: '94123' },
  { venue: 'Yerba Buena Gardens', address: '750 Howard St', city: 'San Francisco', state: 'CA', zip: '94103' }
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPrice() {
  const prices = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 85, 100, 125, 150];
  return getRandomElement(prices);
}

function getRandomCapacity() {
  const capacities = [15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300];
  return getRandomElement(capacities);
}

function generateEvent(category, day, eventNumber) {
  const templates = eventTemplates[category];
  const template = templates[eventNumber % templates.length];
  const location = getRandomElement(locations);
  const images = imageUrls[category];
  const image = getRandomElement(images);
  
  const hours = [8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20];
  const hour = getRandomElement(hours);
  const duration = Math.floor(Math.random() * 3) + 1; // 1-3 hours
  const startTime = `${String(hour).padStart(2, '0')}:00:00`;
  const endHour = Math.min(hour + duration, 23);
  const endTime = `${String(endHour).padStart(2, '0')}:00:00`;
  
  const price = getRandomPrice();
  const fullLocation = `${location.venue}, ${location.address}, ${location.city}, ${location.state} ${location.zip}`;
  
  return {
    title: `${template.title}`,
    description: template.description,
    date: `2025-09-${String(day).padStart(2, '0')}`,
    time: startTime,
    location: fullLocation,
    category: category,
    subCategory: template.subcategory,
    price: price.toString(),
    isFree: price === 0,
    capacity: getRandomCapacity(),
    requirements: template.requirements,
    eventImageUrl: image,
    duration: `${duration} hours`,
    whatToBring: template.whatToBring,
    specialNotes: template.specialNotes,
    contactInfo: template.contactInfo,
    parkingInfo: 'Street parking and nearby garages available',
    cancellationPolicy: template.cancellationPolicy,
    organizerEmail: `organizer@eventconnect.com`,
    source: 'Sept 8-15 Event Generator',
    sourceUrl: 'https://eventconnect.app/generator'
  };
}

async function createEvent(eventData) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create event: ${error}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

async function generateAndCreateEvents() {
  const events = [];
  const totalEvents = 100;
  const startDay = 8;
  const endDay = 15;
  const daysTotal = endDay - startDay + 1;
  const eventsPerDay = Math.floor(totalEvents / daysTotal);
  const extraEvents = totalEvents % daysTotal;
  
  let eventNumber = 0;
  
  // Generate events distributed across the days
  for (let day = startDay; day <= endDay; day++) {
    const eventsToday = day - startDay < extraEvents ? eventsPerDay + 1 : eventsPerDay;
    
    for (let i = 0; i < eventsToday; i++) {
      const category = categories[eventNumber % categories.length];
      const event = generateEvent(category, day, eventNumber);
      events.push(event);
      eventNumber++;
    }
  }
  
  console.log(`Generated ${events.length} events for September 8-15, 2025`);
  console.log(`Events per day: ${eventsPerDay}-${eventsPerDay + 1}`);
  
  // Create events in batches
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(events.length / batchSize)}...`);
    
    const promises = batch.map(event => 
      createEvent(event)
        .then(() => {
          successCount++;
          console.log(`✓ Created: ${event.title} on Sept ${event.date.slice(-2)}`);
        })
        .catch(error => {
          errorCount++;
          console.error(`✗ Failed: ${event.title} - ${error.message}`);
        })
    );
    
    await Promise.all(promises);
    
    // Small delay between batches
    if (i + batchSize < events.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Successfully created: ${successCount} events`);
  console.log(`Failed: ${errorCount} events`);
  console.log(`Total processed: ${events.length} events`);
}

// Run the generator
generateAndCreateEvents().catch(console.error);