import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:5000';
const API_KEY = 'eventconnect_external_api_key_2025';
const TOTAL_EVENTS = 300;

// Event categories with subcategories
const categories = [
  { name: 'Music', subcategories: ['Concert', 'Festival', 'Open Mic', 'DJ Night', 'Jazz Club', 'Classical', 'Karaoke'] },
  { name: 'Sports', subcategories: ['Basketball', 'Soccer', 'Tennis', 'Yoga', 'Running', 'Cycling', 'Swimming', 'Fitness'] },
  { name: 'Arts', subcategories: ['Gallery', 'Theater', 'Workshop', 'Exhibition', 'Paint Night', 'Pottery', 'Photography'] },
  { name: 'Food', subcategories: ['Cooking Class', 'Wine Tasting', 'Food Festival', 'Restaurant Week', 'Farmers Market', 'Food Truck'] },
  { name: 'Tech', subcategories: ['Hackathon', 'Workshop', 'Conference', 'Meetup', 'Bootcamp', 'Demo Day', 'Webinar'] },
  { name: 'Business', subcategories: ['Networking', 'Conference', 'Workshop', 'Seminar', 'Pitch Night', 'Career Fair'] },
  { name: 'Education', subcategories: ['Lecture', 'Workshop', 'Course', 'Seminar', 'Book Club', 'Language Exchange'] },
  { name: 'Health & Wellness', subcategories: ['Meditation', 'Wellness Workshop', 'Health Fair', 'Mental Health', 'Nutrition'] },
  { name: 'Entertainment', subcategories: ['Comedy Show', 'Magic Show', 'Trivia Night', 'Game Night', 'Movie Screening'] },
  { name: 'Community', subcategories: ['Volunteer', 'Fundraiser', 'Town Hall', 'Community Garden', 'Neighborhood Meetup'] },
  { name: 'Outdoor', subcategories: ['Hiking', 'Camping', 'Nature Walk', 'Beach Cleanup', 'Picnic', 'Adventure Sports'] },
  { name: 'Family', subcategories: ['Kids Activity', 'Family Fun Day', 'Playground Meetup', 'Story Time', 'Craft Workshop'] },
  { name: 'Lifestyle', subcategories: ['Fashion Show', 'Beauty Workshop', 'Home Decor', 'Personal Development', 'Dating Event'] }
];

// Venues in San Francisco area
const venues = [
  'Moscone Center', 'Chase Center', 'Bill Graham Civic Auditorium', 'The Fillmore', 'Golden Gate Park',
  'Union Square', 'Ferry Building', 'Fort Mason Center', 'The Warfield', 'SF Jazz Center',
  'Yerba Buena Gardens', 'Palace of Fine Arts', 'Exploratorium', 'California Academy of Sciences',
  'Crissy Field', 'Ocean Beach', 'Dolores Park', 'Washington Square Park', 'Alamo Square',
  'The Independent', 'Great American Music Hall', 'Bottom of the Hill', 'The Chapel', 'Slim\'s',
  'The Regency Ballroom', 'Public Works', 'The Midway', 'DNA Lounge', 'The Catalyst',
  'Fox Theater Oakland', 'Greek Theatre Berkeley', 'Shoreline Amphitheatre', 'SAP Center',
  'Stanford Stadium', 'Berkeley Marina', 'Jack London Square', 'Lake Merritt', 'Tilden Park'
];

// Event name templates
const eventTemplates = {
  'Music': [
    '{artist} Live in Concert', '{genre} Night at {venue}', 'Annual {genre} Festival', 
    '{artist} World Tour', 'Acoustic Sessions: {artist}', 'Underground {genre} Showcase'
  ],
  'Sports': [
    '{sport} Tournament', 'Weekly {sport} League', '{level} {sport} Training',
    '{sport} Championship', 'Morning {sport} Session', '{sport} Skills Workshop'
  ],
  'Arts': [
    '{artist} Exhibition', '{medium} Workshop', 'Contemporary Art Showcase',
    '{style} Art Class', 'Artists Gallery Opening', '{medium} Masterclass'
  ],
  'Food': [
    '{cuisine} Cooking Class', '{dish} Making Workshop', 'Wine & Cheese Pairing',
    '{cuisine} Food Festival', 'Chef\'s Table Experience', 'Farm to Table Dinner'
  ],
  'Tech': [
    '{technology} Workshop', 'Coding Bootcamp: {language}', '{topic} Conference',
    'Tech Talk: {innovation}', 'Hackathon: {theme}', 'Developer Meetup: {framework}'
  ],
  'Business': [
    '{industry} Networking Event', 'Startup Pitch Night', '{topic} Seminar',
    'Leadership Workshop', 'Entrepreneur Meetup', '{industry} Conference'
  ],
  'Education': [
    '{subject} Masterclass', 'Learn {skill} in 30 Days', '{topic} Lecture Series',
    'Book Club: {book}', '{language} Conversation Group', 'Study Group: {subject}'
  ],
  'Health & Wellness': [
    '{type} Yoga Class', 'Mindfulness Workshop', '{topic} Health Seminar',
    'Wellness Retreat', 'Meditation & {activity}', 'Holistic Health Fair'
  ],
  'Entertainment': [
    'Comedy Night with {comedian}', 'Trivia Tuesday', 'Game Night: {game}',
    'Open Mic Night', 'Stand-up Comedy Show', 'Improv Night'
  ],
  'Community': [
    '{cause} Fundraiser', 'Community Cleanup Day', 'Volunteer at {location}',
    'Neighborhood Block Party', 'Town Hall Meeting', 'Community Garden Workshop'
  ],
  'Outdoor': [
    '{difficulty} Hiking Trail', 'Beach Bonfire Night', 'Camping at {location}',
    'Nature Photography Walk', 'Outdoor Yoga Session', 'Adventure Day: {activity}'
  ],
  'Family': [
    'Kids {activity} Workshop', 'Family Fun Day', 'Parent & Child {activity}',
    'Children\'s Story Time', 'Family Game Day', 'Kids Science Lab'
  ],
  'Lifestyle': [
    '{topic} Workshop', 'Personal Branding Seminar', 'Fashion {event}',
    'Life Coaching Session', 'Dating {type} Event', 'Style Consultation'
  ]
};

// Helper data
const artists = ['The Echoes', 'Luna Rising', 'Digital Dreams', 'Urban Poets', 'Neon Nights', 'Crystal Waters', 'Solar Flare', 'Midnight Jazz Collective'];
const genres = ['Jazz', 'Rock', 'Electronic', 'Classical', 'Hip-Hop', 'Folk', 'Blues', 'Pop', 'Indie', 'R&B'];
const sports = ['Basketball', 'Soccer', 'Tennis', 'Volleyball', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Boxing', 'Martial Arts'];
const cuisines = ['Italian', 'Japanese', 'Mexican', 'Thai', 'French', 'Indian', 'Mediterranean', 'Chinese', 'Korean', 'Spanish'];
const technologies = ['AI', 'Blockchain', 'Cloud Computing', 'Machine Learning', 'Web3', 'IoT', 'AR/VR', 'Cybersecurity'];
const languages = ['JavaScript', 'Python', 'React', 'TypeScript', 'Go', 'Rust', 'Swift', 'Kotlin'];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEventName(category: string, subcategory: string): string {
  const templates: string[] = eventTemplates[category as keyof typeof eventTemplates] || [`${subcategory} Event`];
  let template: string = getRandomElement(templates);
  
  // Replace placeholders
  template = template.replace('{artist}', getRandomElement(artists));
  template = template.replace('{genre}', getRandomElement(genres));
  template = template.replace('{sport}', getRandomElement(sports));
  template = template.replace('{cuisine}', getRandomElement(cuisines));
  template = template.replace('{technology}', getRandomElement(technologies));
  template = template.replace('{language}', getRandomElement(languages));
  template = template.replace('{venue}', getRandomElement(venues));
  template = template.replace('{level}', getRandomElement(['Beginner', 'Intermediate', 'Advanced']));
  template = template.replace('{medium}', getRandomElement(['Oil Painting', 'Watercolor', 'Digital Art', 'Sculpture', 'Photography']));
  template = template.replace('{style}', getRandomElement(['Modern', 'Contemporary', 'Abstract', 'Classical', 'Street']));
  template = template.replace('{dish}', getRandomElement(['Pasta', 'Sushi', 'Pizza', 'Tacos', 'Dim Sum', 'Paella']));
  template = template.replace('{topic}', getRandomElement(['Innovation', 'Leadership', 'Growth', 'Strategy', 'Future Trends']));
  template = template.replace('{industry}', getRandomElement(['Tech', 'Healthcare', 'Finance', 'Education', 'Retail']));
  template = template.replace('{subject}', getRandomElement(['History', 'Science', 'Literature', 'Philosophy', 'Economics']));
  template = template.replace('{skill}', getRandomElement(['Public Speaking', 'Photography', 'Writing', 'Investing', 'Coding']));
  template = template.replace('{book}', getRandomElement(['Atomic Habits', '1984', 'Sapiens', 'The Lean Startup', 'Thinking Fast and Slow']));
  template = template.replace('{type}', getRandomElement(['Vinyasa', 'Hatha', 'Power', 'Yin', 'Hot']));
  template = template.replace('{activity}', getRandomElement(['Breathwork', 'Sound Bath', 'Stretching', 'Dance', 'Art']));
  template = template.replace('{comedian}', getRandomElement(['Mike Johnson', 'Sarah Chen', 'Dave Williams', 'Amy Rodriguez']));
  template = template.replace('{game}', getRandomElement(['Board Games', 'Video Games', 'Card Games', 'Trivia', 'Escape Room']));
  template = template.replace('{cause}', getRandomElement(['Animal Shelter', 'Food Bank', 'Education', 'Environment', 'Health']));
  template = template.replace('{location}', getRandomElement(['Golden Gate Park', 'Ocean Beach', 'Mount Tam', 'Muir Woods']));
  template = template.replace('{difficulty}', getRandomElement(['Easy', 'Moderate', 'Challenging', 'Expert']));
  template = template.replace('{event}', getRandomElement(['Show', 'Workshop', 'Consultation', 'Meetup']));
  template = template.replace('{innovation}', getRandomElement(['Future of AI', 'Quantum Computing', 'Space Tech', 'Biotech']));
  template = template.replace('{theme}', getRandomElement(['Social Good', 'Climate Tech', 'FinTech', 'HealthTech']));
  template = template.replace('{framework}', getRandomElement(['React', 'Vue', 'Angular', 'Next.js', 'Svelte']));
  
  return template;
}

function generateDescription(category: string, name: string, venue: string): string {
  const intros = [
    `Join us for an incredible ${category.toLowerCase()} experience`,
    `Don't miss this amazing opportunity`,
    `Experience the best of ${category.toLowerCase()}`,
    `Be part of something special`,
    `Discover and connect through ${category.toLowerCase()}`
  ];
  
  const details = [
    'This event brings together enthusiasts and professionals',
    'Perfect for beginners and experts alike',
    'A unique opportunity to learn and grow',
    'Connect with like-minded individuals',
    'Expand your horizons and make new connections'
  ];
  
  const benefits = [
    'networking opportunities',
    'hands-on experience',
    'expert guidance',
    'interactive sessions',
    'memorable experiences'
  ];
  
  return `${getRandomElement(intros)} at ${venue}! ${name} is designed to provide an unforgettable experience. ${getRandomElement(details)}. 

Join us for ${getRandomElement(benefits)} and ${getRandomElement(benefits)}. Whether you're a seasoned pro or just starting out, this event offers something for everyone. 

Don't miss out on this opportunity to be part of our vibrant community!`;
}

function generateRequirements(category: string): string {
  const requirements: { [key: string]: string[] } = {
    'Sports': ['Comfortable athletic wear', 'Water bottle', 'Appropriate footwear', 'Towel'],
    'Arts': ['All materials provided', 'Wear clothes you don\'t mind getting dirty', 'Bring your creativity'],
    'Food': ['Apron provided', 'Come hungry!', 'Note any dietary restrictions when registering'],
    'Tech': ['Bring your laptop', 'Power adapter', 'Notebook for taking notes'],
    'Outdoor': ['Weather-appropriate clothing', 'Sunscreen', 'Water', 'Comfortable shoes'],
    'Music': ['Valid ID for age verification', 'Ticket confirmation', 'Arrive 30 minutes early'],
    'Education': ['Notebook and pen', 'Open mind', 'Questions welcome'],
    'Health & Wellness': ['Yoga mat (available for rent)', 'Comfortable clothing', 'Water bottle'],
    'default': ['Registration required', 'Arrive 15 minutes early', 'Bring enthusiasm!']
  };
  
  const reqs = requirements[category] || requirements['default'];
  return reqs.slice(0, getRandomNumber(2, 4)).join(', ');
}

function generateOctoberDate(): string {
  const day = getRandomNumber(1, 31);
  const year = 2025;
  return `2025-10-${day.toString().padStart(2, '0')}`;
}

function generateTime(): string {
  const hours = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];
  return getRandomElement(hours);
}

function generatePrice(): number {
  const priceRanges = [0, 0, 0, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 80, 90, 100, 125, 150, 200];
  return getRandomElement(priceRanges);
}

function generateAddress(venue: string): string {
  const streets = [
    'Market Street', 'Mission Street', 'Van Ness Avenue', 'Geary Boulevard', 
    'Columbus Avenue', 'Broadway', 'California Street', 'Pine Street',
    'Bush Street', 'Fillmore Street', 'Divisadero Street', 'Valencia Street'
  ];
  
  const number = getRandomNumber(100, 9999);
  return `${number} ${getRandomElement(streets)}, San Francisco, CA ${getRandomNumber(94102, 94134)}`;
}

function generateImageUrl(category: string): string {
  const categoryImages: { [key: string]: string[] } = {
    'Music': [
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a'
    ],
    'Sports': [
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b'
    ],
    'Arts': [
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b',
      'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0',
      'https://images.unsplash.com/photo-1561214115-f2f134cc4912'
    ],
    'Food': [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327'
    ],
    'Tech': [
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d',
      'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8',
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87'
    ],
    'default': [
      'https://images.unsplash.com/photo-1505373877841-8d25f7d46678',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30',
      'https://images.unsplash.com/photo-1511578314322-379afb476865'
    ]
  };
  
  const images = categoryImages[category] || categoryImages['default'];
  return getRandomElement(images);
}

async function createEvent(eventData: any) {
  try {
    const response = await fetch(`${BASE_URL}/api/external/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(eventData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create event: ${error}`);
      return null;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error creating event:`, error);
    return null;
  }
}

async function generateAndCreateEvents() {
  console.log(`Starting generation of ${TOTAL_EVENTS} events for October 2025...`);
  
  const events: any[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < TOTAL_EVENTS; i++) {
    const categoryData = getRandomElement(categories);
    const category = categoryData.name;
    const subcategory = getRandomElement(categoryData.subcategories);
    const venue = getRandomElement(venues);
    const name = generateEventName(category, subcategory);
    const date = generateOctoberDate();
    const time = generateTime();
    const price = generatePrice();
    
    const eventData = {
      title: name,  // Changed from 'name' to 'title'
      description: generateDescription(category, name, venue),
      date,
      time,
      location: `${venue}, ${generateAddress(venue)}`,  // Combined venue and address into location
      category,
      subCategory: subcategory,  // Changed from 'subcategory' to 'subCategory'
      price: price === 0 ? "0.00" : price.toString(),  // Keep as string for decimal type
      isFree: price === 0,
      capacity: getRandomNumber(20, 500),  // Changed to number instead of string
      eventImageUrl: generateImageUrl(category),  // Changed from 'imageUrl' to 'eventImageUrl'
      requirements: generateRequirements(category),
      contactInfo: `Email: events@eventconnect.app | Phone: 415-555-${getRandomNumber(1000, 9999)}`,
      cancellationPolicy: price === 0 ? 'Free event - no cancellation needed' : 'Full refund if cancelled 24 hours before event',
      source: 'October 2025 Bulk Generator',  // Changed from 'externalSource' to 'source'
      timezone: 'America/Los_Angeles'  // Added timezone
    };

    console.log(`Creating event ${i + 1}/${TOTAL_EVENTS}: ${name}`);
    
    const result = await createEvent(eventData);
    if (result) {
      successCount++;
      events.push(result);
    } else {
      failCount++;
    }

    // Add a small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\n✅ Event generation complete!`);
  console.log(`Successfully created: ${successCount} events`);
  console.log(`Failed: ${failCount} events`);
  
  // Show category distribution
  const categoryCount: { [key: string]: number } = {};
  for (const cat of categories) {
    categoryCount[cat.name] = 0;
  }
  
  events.forEach(e => {
    if (e.category) categoryCount[e.category]++;
  });
  
  console.log('\nCategory distribution:');
  Object.entries(categoryCount).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} events`);
  });
}

// Run the generator
generateAndCreateEvents().catch(console.error);