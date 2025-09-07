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
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f',
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745'
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a',
    'https://images.unsplash.com/photo-1541252260730-0412e8e2108e'
  ],
  'Arts': [
    'https://images.unsplash.com/photo-1561214115-f2f134cc4912',
    'https://images.unsplash.com/photo-1541367777708-7905fe3296c0',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f'
  ],
  'Food': [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836'
  ],
  'Tech': [
    'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e',
    'https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0'
  ],
  'Business': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43'
  ],
  'Education': [
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b'
  ],
  'Health & Wellness': [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a'
  ],
  'Entertainment': [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'
  ],
  'Community': [
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac',
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846'
  ],
  'Outdoor': [
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4',
    'https://images.unsplash.com/photo-1519331379826-f10be5486c6f',
    'https://images.unsplash.com/photo-1445307806294-bff7f67ff225'
  ],
  'Family': [
    'https://images.unsplash.com/photo-1511895426328-dc8714191300',
    'https://images.unsplash.com/photo-1517654443271-11c621d19e60',
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9'
  ],
  'Lifestyle': [
    'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c'
  ]
};

const eventTemplates = {
  'Music': [
    {
      title: 'Jazz Night at Blue Moon Lounge',
      description: 'Experience an intimate evening of smooth jazz featuring local and touring musicians. Our monthly jazz night showcases exceptional talent in a cozy, sophisticated atmosphere.',
      subcategory: 'Jazz',
      requirements: '21+ for bar area, all ages welcome in dining section',
      accessibility: 'Wheelchair accessible venue with accessible restrooms',
      dresscode: 'Smart casual',
      cancellationPolicy: 'Full refund up to 24 hours before event'
    },
    {
      title: 'Electronic Music Festival',
      description: 'Three stages of electronic music featuring house, techno, and experimental artists. Food trucks, art installations, and late-night dancing under the stars.',
      subcategory: 'Electronic',
      requirements: '18+ event, valid ID required',
      accessibility: 'ADA compliant with designated viewing areas',
      dresscode: 'Festival attire encouraged',
      cancellationPolicy: 'No refunds, tickets transferable'
    },
    {
      title: 'Classical Symphony Concert',
      description: 'The City Symphony Orchestra presents masterworks from Beethoven, Mozart, and contemporary composers. A night of timeless beauty and musical excellence.',
      subcategory: 'Classical',
      requirements: 'No age restrictions',
      accessibility: 'Fully accessible venue with hearing assistance devices',
      dresscode: 'Business casual to formal',
      cancellationPolicy: 'Exchanges only, no refunds'
    }
  ],
  'Sports': [
    {
      title: 'Morning Yoga Flow',
      description: 'Start your day with energizing vinyasa yoga suitable for all levels. Focus on breath, movement, and mindfulness to set a positive tone for your day.',
      subcategory: 'Yoga',
      requirements: 'Bring your own mat, water bottle',
      accessibility: 'Chair yoga options available',
      dresscode: 'Comfortable workout attire',
      cancellationPolicy: 'Cancel up to 2 hours before class'
    },
    {
      title: 'Basketball Tournament',
      description: '3-on-3 basketball tournament with divisions for all skill levels. Prizes for winners, food vendors on site, and family-friendly atmosphere.',
      subcategory: 'Basketball',
      requirements: 'Teams of 3-4 players, registration required',
      accessibility: 'Spectator areas wheelchair accessible',
      dresscode: 'Athletic wear required',
      cancellationPolicy: 'Team registration non-refundable'
    },
    {
      title: 'Marathon Training Group',
      description: 'Join our 16-week marathon training program. Weekly group runs, coaching, nutrition guidance, and race preparation for beginners to experienced runners.',
      subcategory: 'Running',
      requirements: 'Ability to run 3 miles continuously',
      accessibility: 'Various pace groups available',
      dresscode: 'Running gear',
      cancellationPolicy: 'Pro-rated refunds available'
    }
  ],
  'Arts': [
    {
      title: 'Watercolor Workshop',
      description: 'Learn watercolor techniques from basic washes to advanced wet-on-wet methods. All materials provided, suitable for beginners and intermediate artists.',
      subcategory: 'Painting',
      requirements: 'No experience necessary',
      accessibility: 'Wheelchair accessible studio',
      dresscode: 'Clothes that can get messy',
      cancellationPolicy: '48-hour cancellation policy'
    },
    {
      title: 'Gallery Opening Reception',
      description: 'Celebrate the opening of our new contemporary art exhibition. Meet the artists, enjoy wine and appetizers, and explore cutting-edge visual art.',
      subcategory: 'Exhibition',
      requirements: 'Free admission, RSVP recommended',
      accessibility: 'Fully accessible gallery space',
      dresscode: 'Cocktail attire',
      cancellationPolicy: 'No reservation required'
    },
    {
      title: 'Pottery Making Class',
      description: 'Get your hands dirty creating functional pottery. Learn wheel throwing, hand building, and glazing techniques in our fully equipped studio.',
      subcategory: 'Ceramics',
      requirements: 'Ages 16+',
      accessibility: 'Standing and sitting options available',
      dresscode: 'Casual, apron provided',
      cancellationPolicy: '72-hour cancellation for refund'
    }
  ],
  'Food': [
    {
      title: 'Farm-to-Table Dinner',
      description: 'Five-course tasting menu featuring seasonal, locally-sourced ingredients. Chef\'s presentation with wine pairings from regional vineyards.',
      subcategory: 'Fine Dining',
      requirements: 'Reservations required, dietary restrictions accommodated',
      accessibility: 'Accessible entrance and seating',
      dresscode: 'Business casual',
      cancellationPolicy: '24-hour cancellation policy'
    },
    {
      title: 'Street Food Festival',
      description: 'Over 30 food trucks and vendors offering diverse cuisines. Live music, craft beer garden, and activities for kids.',
      subcategory: 'Festival',
      requirements: 'Cash and cards accepted',
      accessibility: 'Paved pathways throughout',
      dresscode: 'Casual',
      cancellationPolicy: 'Rain or shine event'
    },
    {
      title: 'Sushi Making Workshop',
      description: 'Master the art of sushi rolling with our expert chef. Learn knife skills, rice preparation, and create various rolls to take home.',
      subcategory: 'Cooking Class',
      requirements: 'Ages 12+',
      accessibility: 'Standing workshop, stools available',
      dresscode: 'Comfortable clothing',
      cancellationPolicy: '48-hour notice for refund'
    }
  ],
  'Tech': [
    {
      title: 'AI & Machine Learning Summit',
      description: 'Industry leaders discuss the latest in artificial intelligence. Workshops, networking, and hands-on demos of cutting-edge AI applications.',
      subcategory: 'Conference',
      requirements: 'Professional or student ID',
      accessibility: 'Live streaming available',
      dresscode: 'Business casual',
      cancellationPolicy: 'Refunds until 1 week before'
    },
    {
      title: 'Coding Bootcamp Weekend',
      description: 'Intensive weekend workshop covering web development fundamentals. HTML, CSS, JavaScript, and intro to React. Laptop required.',
      subcategory: 'Workshop',
      requirements: 'Bring laptop, no coding experience needed',
      accessibility: 'Virtual attendance option',
      dresscode: 'Casual',
      cancellationPolicy: 'Full refund 72 hours prior'
    },
    {
      title: 'Startup Pitch Night',
      description: 'Watch emerging startups pitch to investors. Network with entrepreneurs, VCs, and tech professionals over drinks and appetizers.',
      subcategory: 'Networking',
      requirements: 'RSVP required',
      accessibility: 'Elevator access available',
      dresscode: 'Business casual',
      cancellationPolicy: 'Free event, no refunds'
    }
  ],
  'Business': [
    {
      title: 'Leadership Workshop',
      description: 'Develop essential leadership skills through interactive exercises, case studies, and peer feedback. Certificate of completion provided.',
      subcategory: 'Professional Development',
      requirements: '2+ years management experience',
      accessibility: 'Materials available in multiple formats',
      dresscode: 'Business attire',
      cancellationPolicy: 'Substitute attendee allowed'
    },
    {
      title: 'Networking Breakfast',
      description: 'Start your day connecting with local professionals. Structured networking activities, speaker presentation, and continental breakfast.',
      subcategory: 'Networking',
      requirements: 'Business cards recommended',
      accessibility: 'Accessible venue and parking',
      dresscode: 'Business professional',
      cancellationPolicy: '24-hour notice required'
    },
    {
      title: 'Financial Planning Seminar',
      description: 'Learn investment strategies, retirement planning, and tax optimization from certified financial planners. Q&A session included.',
      subcategory: 'Finance',
      requirements: 'No prerequisites',
      accessibility: 'Sign language interpreter available',
      dresscode: 'Business casual',
      cancellationPolicy: 'Full refund until event day'
    }
  ],
  'Education': [
    {
      title: 'College Prep Workshop',
      description: 'Comprehensive guidance on college applications, essays, and financial aid. Mock interviews and personalized feedback from admissions experts.',
      subcategory: 'Academic',
      requirements: 'High school juniors and seniors',
      accessibility: 'Online materials provided',
      dresscode: 'Casual',
      cancellationPolicy: 'Refund minus materials fee'
    },
    {
      title: 'Science Fair Showcase',
      description: 'Students present innovative science projects. Judging, awards ceremony, and hands-on demonstration areas for visitors.',
      subcategory: 'STEM',
      requirements: 'Pre-registration for participants',
      accessibility: 'Wide aisles for navigation',
      dresscode: 'School appropriate',
      cancellationPolicy: 'Free admission'
    },
    {
      title: 'Language Exchange Meetup',
      description: 'Practice conversation skills in Spanish, French, Mandarin, and more. Native speakers facilitate small group discussions.',
      subcategory: 'Language',
      requirements: 'Basic conversational level',
      accessibility: 'Quiet rooms available',
      dresscode: 'Casual',
      cancellationPolicy: 'Drop-in event'
    }
  ],
  'Health & Wellness': [
    {
      title: 'Meditation & Mindfulness',
      description: 'Learn techniques to reduce stress and increase focus. Guided meditation, breathing exercises, and take-home resources.',
      subcategory: 'Mental Health',
      requirements: 'No experience necessary',
      accessibility: 'Chair and floor options',
      dresscode: 'Comfortable clothing',
      cancellationPolicy: 'Full refund 24 hours prior'
    },
    {
      title: 'Nutrition Workshop',
      description: 'Registered dietitian teaches meal planning, label reading, and healthy cooking demos. Samples and recipes included.',
      subcategory: 'Nutrition',
      requirements: 'None',
      accessibility: 'Dietary accommodations available',
      dresscode: 'Casual',
      cancellationPolicy: '48-hour cancellation policy'
    },
    {
      title: 'Fitness Bootcamp',
      description: 'High-intensity interval training for all fitness levels. Modifications provided, focus on form and functional movement.',
      subcategory: 'Fitness',
      requirements: 'Medical clearance if needed',
      accessibility: 'Modified exercises available',
      dresscode: 'Athletic wear',
      cancellationPolicy: 'Class passes transferable'
    }
  ],
  'Entertainment': [
    {
      title: 'Comedy Night',
      description: 'Stand-up comedy featuring touring headliners and local talent. Two-drink minimum, full menu available.',
      subcategory: 'Comedy',
      requirements: '18+ with ID',
      accessibility: 'Wheelchair seating available',
      dresscode: 'Casual',
      cancellationPolicy: 'No refunds, exchanges only'
    },
    {
      title: 'Movie Marathon',
      description: 'All-night screening of cult classics. Themed snacks, costume contest, and trivia between films.',
      subcategory: 'Film',
      requirements: 'Tickets per film or all-access pass',
      accessibility: 'Closed captions available',
      dresscode: 'Pajamas encouraged',
      cancellationPolicy: 'Rain check if cancelled'
    },
    {
      title: 'Magic Show',
      description: 'Mind-bending illusions and close-up magic. Interactive performance suitable for all ages, photo opportunities after show.',
      subcategory: 'Performance',
      requirements: 'All ages welcome',
      accessibility: 'ASL interpreter on request',
      dresscode: 'Come as you are',
      cancellationPolicy: 'Refunds up to showtime'
    }
  ],
  'Community': [
    {
      title: 'Neighborhood Cleanup Day',
      description: 'Join neighbors in beautifying our community. Supplies provided, lunch for volunteers, and prizes for most trash collected.',
      subcategory: 'Volunteer',
      requirements: 'All ages, minors with guardian',
      accessibility: 'Various tasks available',
      dresscode: 'Work clothes',
      cancellationPolicy: 'Rain date scheduled'
    },
    {
      title: 'Cultural Festival',
      description: 'Celebrate diversity with food, music, dance, and crafts from around the world. Educational booths and children\'s activities.',
      subcategory: 'Cultural',
      requirements: 'Free admission',
      accessibility: 'Fully accessible grounds',
      dresscode: 'Cultural dress encouraged',
      cancellationPolicy: 'Weather permitting'
    },
    {
      title: 'Town Hall Meeting',
      description: 'Discuss local issues with city officials. Public comment period, Q&A session, and information on upcoming projects.',
      subcategory: 'Civic',
      requirements: 'Open to residents',
      accessibility: 'Live stream available',
      dresscode: 'Casual',
      cancellationPolicy: 'Public event'
    }
  ],
  'Outdoor': [
    {
      title: 'Guided Nature Hike',
      description: 'Explore local trails with experienced naturalist. Learn about native plants, wildlife, and conservation efforts.',
      subcategory: 'Hiking',
      requirements: 'Moderate fitness level, bring water',
      accessibility: 'Shorter accessible trail option',
      dresscode: 'Hiking boots recommended',
      cancellationPolicy: 'Weather-dependent'
    },
    {
      title: 'Camping Workshop',
      description: 'Learn essential camping skills: tent setup, fire building, outdoor cooking, and Leave No Trace principles.',
      subcategory: 'Camping',
      requirements: 'No experience needed',
      accessibility: 'Demonstration area accessible',
      dresscode: 'Outdoor clothing',
      cancellationPolicy: 'Full refund if cancelled'
    },
    {
      title: 'Kayaking Adventure',
      description: 'Guided kayak tour of local waterways. Equipment provided, safety briefing, and wildlife viewing opportunities.',
      subcategory: 'Water Sports',
      requirements: 'Basic swimming ability',
      accessibility: 'Adaptive equipment available',
      dresscode: 'Quick-dry clothing',
      cancellationPolicy: 'Weather cancellation refunded'
    }
  ],
  'Family': [
    {
      title: 'Family Game Night',
      description: 'Board games, card games, and video games for all ages. Snacks provided, prizes for tournament winners.',
      subcategory: 'Games',
      requirements: 'All ages welcome',
      accessibility: 'Games for various abilities',
      dresscode: 'Comfortable',
      cancellationPolicy: 'Drop-in event'
    },
    {
      title: 'Kids Science Workshop',
      description: 'Hands-on experiments and demonstrations. Make slime, launch rockets, and explore chemistry in fun, safe environment.',
      subcategory: 'Educational',
      requirements: 'Ages 6-12, parent supervision',
      accessibility: 'Sensory-friendly session available',
      dresscode: 'Clothes that can get messy',
      cancellationPolicy: '24-hour notice'
    },
    {
      title: 'Family Movie Night',
      description: 'Outdoor screening of family-friendly films. Bring blankets and chairs, concessions available, pre-movie activities.',
      subcategory: 'Entertainment',
      requirements: 'Free admission',
      accessibility: 'Reserved accessible viewing area',
      dresscode: 'Casual, layers recommended',
      cancellationPolicy: 'Rain cancellation'
    }
  ],
  'Lifestyle': [
    {
      title: 'Home Organization Workshop',
      description: 'Professional organizer shares tips for decluttering and creating functional spaces. Before/after examples and Q&A.',
      subcategory: 'Home',
      requirements: 'None',
      accessibility: 'Virtual option available',
      dresscode: 'Casual',
      cancellationPolicy: 'Full refund 48 hours prior'
    },
    {
      title: 'Fashion Show & Boutique',
      description: 'Local designers showcase collections. Pop-up shops, styling consultations, and runway presentation.',
      subcategory: 'Fashion',
      requirements: 'Tickets required for show',
      accessibility: 'Accessible seating available',
      dresscode: 'Fashionable attire',
      cancellationPolicy: 'Exchanges only'
    },
    {
      title: 'Personal Finance Bootcamp',
      description: 'Master budgeting, saving, and investing basics. Interactive workshops, one-on-one consultations available.',
      subcategory: 'Finance',
      requirements: 'Bring financial questions',
      accessibility: 'Materials in multiple formats',
      dresscode: 'Business casual',
      cancellationPolicy: 'Refundable until start'
    }
  ]
};

const locations = [
  { venue: 'Community Center', address: '123 Main St', city: 'San Francisco', state: 'CA', zip: '94102' },
  { venue: 'City Park Amphitheater', address: '456 Park Ave', city: 'Oakland', state: 'CA', zip: '94612' },
  { venue: 'Downtown Convention Center', address: '789 Market St', city: 'San Jose', state: 'CA', zip: '95113' },
  { venue: 'Beachside Pavilion', address: '321 Ocean Blvd', city: 'Santa Cruz', state: 'CA', zip: '95060' },
  { venue: 'Historic Theater', address: '654 Broadway', city: 'Sacramento', state: 'CA', zip: '95814' },
  { venue: 'Sports Complex', address: '987 Stadium Way', city: 'Berkeley', state: 'CA', zip: '94704' },
  { venue: 'Art Gallery District', address: '147 Gallery Ln', city: 'Palo Alto', state: 'CA', zip: '94301' },
  { venue: 'Waterfront Plaza', address: '258 Harbor Dr', city: 'San Mateo', state: 'CA', zip: '94401' },
  { venue: 'Mountain Lodge', address: '369 Summit Rd', city: 'Mill Valley', state: 'CA', zip: '94941' },
  { venue: 'Cultural Center', address: '741 Heritage Way', city: 'Fremont', state: 'CA', zip: '94538' }
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPrice() {
  const prices = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100, 150, 200];
  return getRandomElement(prices);
}

function getRandomCapacity() {
  const capacities = [20, 30, 50, 75, 100, 150, 200, 300, 500, 1000];
  return getRandomElement(capacities);
}

function generateTimeSlot(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

function generateEvent(category, day, index) {
  const templates = eventTemplates[category];
  const template = templates[index % templates.length];
  const location = getRandomElement(locations);
  const images = imageUrls[category];
  const image = getRandomElement(images);
  
  const hours = [9, 10, 11, 14, 15, 16, 17, 18, 19, 20];
  const hour = getRandomElement(hours);
  const startTime = `${String(hour).padStart(2, '0')}:00:00`; // HH:MM:SS format
  const endTime = `${String(hour + 2).padStart(2, '0')}:00:00`;
  
  const price = getRandomPrice();
  const duration = `${hour + 2 - hour} hours`;
  
  // Combine address into single location string
  const fullLocation = `${location.venue}, ${location.address}, ${location.city}, ${location.state} ${location.zip}`;
  
  return {
    title: `${template.title} - September Edition ${index + 1}`,
    description: `${template.description} Join us for this special September event featuring enhanced programming and exclusive experiences.`,
    date: `2025-09-${String(day).padStart(2, '0')}`,
    time: startTime,
    location: fullLocation,
    category: category,
    subCategory: template.subcategory,
    price: price.toString(), // Convert to string
    isFree: price === 0,
    capacity: getRandomCapacity(),
    requirements: template.requirements,
    eventImageUrl: image,
    duration: duration,
    whatToBring: template.requirements,
    specialNotes: template.accessibility,
    contactInfo: `Email: events@${category.toLowerCase().replace(/\s+/g, '')}connect.com | Phone: (555) 123-4567`,
    parkingInfo: 'Free parking available on site',
    cancellationPolicy: template.cancellationPolicy,
    organizerEmail: `organizer@${category.toLowerCase().replace(/\s+/g, '')}events.com`,
    source: 'September Event Generator',
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
  let eventIndex = 0;
  
  // Generate events distributed across the month
  for (let day = 1; day <= 30; day++) {
    // Create 6-7 events per day to reach 200 total
    const eventsPerDay = day <= 20 ? 7 : 6;
    
    for (let i = 0; i < eventsPerDay && eventIndex < 200; i++) {
      const category = categories[eventIndex % categories.length];
      const event = generateEvent(category, day, eventIndex);
      events.push(event);
      eventIndex++;
    }
  }
  
  console.log(`Generated ${events.length} events for September 2025`);
  
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
          console.log(`✓ Created: ${event.title}`);
        })
        .catch(error => {
          errorCount++;
          console.error(`✗ Failed: ${event.title} - ${error.message}`);
        })
    );
    
    await Promise.all(promises);
    
    // Small delay between batches to avoid overwhelming the server
    if (i + batchSize < events.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Successfully created: ${successCount} events`);
  console.log(`Failed: ${errorCount} events`);
  console.log(`Total processed: ${events.length} events`);
}

// Run the generator
generateAndCreateEvents().catch(console.error);