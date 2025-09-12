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
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745',
    'https://images.unsplash.com/photo-1511192336575-5a79af67a629'
  ],
  'Sports': [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211',
    'https://images.unsplash.com/photo-1541252260730-0412e8e2108e',
    'https://images.unsplash.com/photo-1519861531473-9200262188bf'
  ],
  'Arts': [
    'https://images.unsplash.com/photo-1561214115-f2f134cc4912',
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
    'https://images.unsplash.com/photo-1549289524-06cf8837ace5'
  ],
  'Food': [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38'
  ],
  'Tech': [
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b',
    'https://images.unsplash.com/photo-1496065187959-7f07b8353c55',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c'
  ],
  'Business': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984',
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd'
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
    'https://images.unsplash.com/photo-1499364615650-ec38552f4f34',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3'
  ],
  'Community': [
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a',
    'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a'
  ],
  'Outdoor': [
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4',
    'https://images.unsplash.com/photo-1445308394109-4ec2920981b1',
    'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b'
  ],
  'Family': [
    'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4',
    'https://images.unsplash.com/photo-1578662996442-48f60103fc27',
    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205'
  ],
  'Lifestyle': [
    'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59',
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee',
    'https://images.unsplash.com/photo-1522444432501-2e24f34e1f38'
  ]
};

const eventTemplates = {
  'Music': [
    {
      title: 'Jazz & Blues Evening',
      description: 'Immerse yourself in smooth jazz and soulful blues. Local and touring musicians perform classic standards and original compositions in an intimate club setting.',
      subcategory: 'Jazz',
      requirements: 'Must be 21+ for bar area',
      whatToBring: 'Appreciation for live music',
      specialNotes: 'Limited seating - first come, first served',
      contactInfo: 'jazz@musicvenue.com | (555) 123-4567',
      cancellationPolicy: 'No refunds within 24 hours'
    },
    {
      title: 'Electronic Music Production Workshop',
      description: 'Learn the basics of electronic music production. Create beats, synthesize sounds, and mix your first track using industry-standard software.',
      subcategory: 'Electronic',
      requirements: 'Bring laptop if available',
      whatToBring: 'Headphones, laptop (optional)',
      specialNotes: 'Software provided for workshop',
      contactInfo: 'edm@beatlab.com | (555) 234-5678',
      cancellationPolicy: 'Full refund 72 hours before'
    },
    {
      title: 'Classical Music Appreciation',
      description: 'Discover the beauty of classical music with expert commentary. Learn about composers, instruments, and the stories behind famous pieces.',
      subcategory: 'Classical',
      requirements: 'No experience needed',
      whatToBring: 'Open mind and ears',
      specialNotes: 'Live performances included',
      contactInfo: 'classical@symphony.com | (555) 345-6789',
      cancellationPolicy: 'Transferable tickets'
    }
  ],
  'Sports': [
    {
      title: 'Martial Arts Introduction',
      description: 'Try different martial arts styles in one session. Learn basic self-defense, improve fitness, and discover which discipline suits you best.',
      subcategory: 'Martial Arts',
      requirements: 'All fitness levels welcome',
      whatToBring: 'Comfortable workout clothes',
      specialNotes: 'Protective gear provided',
      contactInfo: 'martial@dojo.com | (555) 456-7890',
      cancellationPolicy: 'Credit for future classes'
    },
    {
      title: 'Bike Maintenance Clinic',
      description: 'Learn to maintain and repair your bicycle. Cover basic tune-ups, tire changes, brake adjustments, and chain maintenance.',
      subcategory: 'Cycling',
      requirements: 'Bring your bike',
      whatToBring: 'Your bicycle, any problem areas noted',
      specialNotes: 'Tools and supplies provided',
      contactInfo: 'bikes@cyclerepair.com | (555) 567-8901',
      cancellationPolicy: 'Full refund 48 hours before'
    },
    {
      title: 'Trail Running Group',
      description: 'Join experienced trail runners for scenic routes. Build endurance, improve technique, and connect with the running community.',
      subcategory: 'Running',
      requirements: 'Can run 3+ miles',
      whatToBring: 'Trail running shoes, water',
      specialNotes: 'Different pace groups available',
      contactInfo: 'trails@runclub.com | (555) 678-9012',
      cancellationPolicy: 'Drop-in format'
    }
  ],
  'Arts': [
    {
      title: 'Pottery Throwing Class',
      description: 'Get your hands dirty creating pottery on the wheel. Learn centering, pulling, and shaping techniques to create bowls and vases.',
      subcategory: 'Ceramics',
      requirements: 'Wear old clothes',
      whatToBring: 'Apron or old clothes',
      specialNotes: 'Pieces fired and glazed for pickup',
      contactInfo: 'clay@pottery.com | (555) 789-0123',
      cancellationPolicy: '72-hour cancellation required'
    },
    {
      title: 'Digital Art & Design',
      description: 'Explore digital art creation using tablets and software. Learn techniques for illustration, concept art, and graphic design.',
      subcategory: 'Digital Art',
      requirements: 'Basic computer skills',
      whatToBring: 'USB drive for files',
      specialNotes: 'Equipment provided',
      contactInfo: 'digital@artlab.com | (555) 890-1234',
      cancellationPolicy: 'Full refund 5 days before'
    },
    {
      title: 'Street Art Walking Tour',
      description: 'Discover hidden murals and graffiti art. Learn about artists, techniques, and the cultural significance of street art.',
      subcategory: 'Street Art',
      requirements: 'Walking tour - 2 miles',
      whatToBring: 'Camera, comfortable shoes',
      specialNotes: 'Rain or shine',
      contactInfo: 'street@arttours.com | (555) 901-2345',
      cancellationPolicy: 'Reschedule for weather'
    }
  ],
  'Food': [
    {
      title: 'Sushi Making Masterclass',
      description: 'Learn to prepare authentic sushi from a master chef. Roll maki, form nigiri, and understand fish selection and rice preparation.',
      subcategory: 'Japanese Cuisine',
      requirements: 'No seafood allergies',
      whatToBring: 'Appetite for learning',
      specialNotes: 'All ingredients provided',
      contactInfo: 'sushi@culinary.com | (555) 012-3456',
      cancellationPolicy: 'Non-refundable after 48 hours'
    },
    {
      title: 'Farm-to-Table Dinner',
      description: 'Multi-course dinner featuring local, seasonal ingredients. Meet the farmers, learn about sustainable agriculture, and enjoy fresh cuisine.',
      subcategory: 'Local Cuisine',
      requirements: 'Dietary restrictions accommodated',
      whatToBring: 'Note any allergies',
      specialNotes: 'Vegetarian options available',
      contactInfo: 'farm@table.com | (555) 123-4567',
      cancellationPolicy: 'Full refund 72 hours before'
    },
    {
      title: 'Chocolate Tasting Experience',
      description: 'Journey through chocolate varieties from around the world. Learn about cacao origins, processing methods, and flavor profiles.',
      subcategory: 'Tasting',
      requirements: 'No cocoa allergies',
      whatToBring: 'Palate cleanser preference',
      specialNotes: 'Take-home samples included',
      contactInfo: 'choco@tastings.com | (555) 234-5678',
      cancellationPolicy: 'Transferable tickets'
    }
  ],
  'Tech': [
    {
      title: 'AI & Machine Learning Basics',
      description: 'Understand AI fundamentals and practical applications. No coding required - learn concepts and see real-world demonstrations.',
      subcategory: 'Artificial Intelligence',
      requirements: 'Interest in technology',
      whatToBring: 'Questions about AI',
      specialNotes: 'Hands-on demos included',
      contactInfo: 'ai@techtalks.com | (555) 345-6789',
      cancellationPolicy: 'Online recording available'
    },
    {
      title: 'Web Development Bootcamp',
      description: 'Build a website from scratch in one day. Learn HTML, CSS, and basic JavaScript to create your own responsive webpage.',
      subcategory: 'Web Development',
      requirements: 'Bring laptop',
      whatToBring: 'Laptop, charger',
      specialNotes: 'Free hosting provided',
      contactInfo: 'web@bootcamp.com | (555) 456-7890',
      cancellationPolicy: 'Full refund 1 week before'
    },
    {
      title: '3D Printing Workshop',
      description: 'Design and print your own 3D objects. Learn CAD basics, printer operation, and material selection.',
      subcategory: '3D Technology',
      requirements: 'Basic computer skills',
      whatToBring: 'Design ideas',
      specialNotes: 'Take home your creation',
      contactInfo: '3d@makerspace.com | (555) 567-8901',
      cancellationPolicy: 'Materials fee non-refundable'
    }
  ],
  'Business': [
    {
      title: 'Personal Branding Workshop',
      description: 'Build your professional brand online and offline. Create consistent messaging, optimize LinkedIn, and develop your unique value proposition.',
      subcategory: 'Career Development',
      requirements: 'Bring current resume',
      whatToBring: 'Resume, LinkedIn login',
      specialNotes: 'Headshot photography available',
      contactInfo: 'brand@career.com | (555) 678-9012',
      cancellationPolicy: 'Credit toward future workshop'
    },
    {
      title: 'Real Estate Investment Basics',
      description: 'Learn fundamentals of property investment. Understand market analysis, financing options, and rental property management.',
      subcategory: 'Investment',
      requirements: 'None',
      whatToBring: 'Calculator, notepad',
      specialNotes: 'Market data provided',
      contactInfo: 'realestate@invest.com | (555) 789-0123',
      cancellationPolicy: 'Full refund 5 days before'
    },
    {
      title: 'Negotiation Skills Training',
      description: 'Master negotiation techniques for business and life. Practice with role-playing exercises and learn psychological strategies.',
      subcategory: 'Professional Skills',
      requirements: 'Come ready to practice',
      whatToBring: 'Current negotiation challenges',
      specialNotes: 'Small group for personalization',
      contactInfo: 'negotiate@skills.com | (555) 890-1234',
      cancellationPolicy: 'Substitute attendee allowed'
    }
  ],
  'Education': [
    {
      title: 'Public Speaking Confidence',
      description: 'Overcome speaking anxiety and deliver compelling presentations. Practice techniques, get feedback, and build confidence.',
      subcategory: 'Communication',
      requirements: 'Prepare 2-minute speech',
      whatToBring: 'Brief speech prepared',
      specialNotes: 'Video feedback provided',
      contactInfo: 'speak@confidence.com | (555) 901-2345',
      cancellationPolicy: 'Full refund if not satisfied'
    },
    {
      title: 'Language Exchange Meetup',
      description: 'Practice languages with native speakers. Structured activities help you improve conversation skills in a fun, social setting.',
      subcategory: 'Languages',
      requirements: 'Any language level',
      whatToBring: 'Notebook for new words',
      specialNotes: 'Multiple languages available',
      contactInfo: 'language@exchange.com | (555) 012-3456',
      cancellationPolicy: 'Drop-in event'
    },
    {
      title: 'Memory Improvement Techniques',
      description: 'Learn proven methods to enhance memory. Master mnemonics, mind mapping, and other cognitive tools for better retention.',
      subcategory: 'Learning Skills',
      requirements: 'None',
      whatToBring: 'Items to memorize',
      specialNotes: 'Practice materials provided',
      contactInfo: 'memory@brain.com | (555) 123-4567',
      cancellationPolicy: 'Reschedule anytime'
    }
  ],
  'Health & Wellness': [
    {
      title: 'Sleep Optimization Workshop',
      description: 'Improve your sleep quality naturally. Learn about sleep cycles, bedroom environment, and habits for better rest.',
      subcategory: 'Sleep Health',
      requirements: 'Track sleep for 3 days prior',
      whatToBring: 'Sleep log if available',
      specialNotes: 'Sleep tracking app recommendations',
      contactInfo: 'sleep@wellness.com | (555) 234-5678',
      cancellationPolicy: 'Full refund anytime'
    },
    {
      title: 'Breathwork & Meditation',
      description: 'Explore breathing techniques for stress relief and energy. Combine with meditation for mental clarity and emotional balance.',
      subcategory: 'Mindfulness',
      requirements: 'No respiratory issues',
      whatToBring: 'Yoga mat, cushion',
      specialNotes: 'Mats available if needed',
      contactInfo: 'breathe@mindful.com | (555) 345-6789',
      cancellationPolicy: 'Drop-in welcome'
    },
    {
      title: 'Injury Prevention for Athletes',
      description: 'Learn proper warm-up, stretching, and recovery techniques. Understand common injuries and how to avoid them.',
      subcategory: 'Sports Medicine',
      requirements: 'Active individuals',
      whatToBring: 'Athletic wear',
      specialNotes: 'Physical therapist led',
      contactInfo: 'prevent@sports.com | (555) 456-7890',
      cancellationPolicy: 'Class credit if cancelled'
    }
  ],
  'Entertainment': [
    {
      title: 'Murder Mystery Dinner',
      description: 'Solve a thrilling murder mystery while enjoying dinner. Interactive theater where guests become detectives.',
      subcategory: 'Interactive Theater',
      requirements: 'Love of mystery',
      whatToBring: 'Detective mindset',
      specialNotes: 'Costume suggestions provided',
      contactInfo: 'mystery@dinner.com | (555) 567-8901',
      cancellationPolicy: 'No refunds after booking'
    },
    {
      title: 'Stand-up Comedy Open Mic',
      description: 'Watch aspiring comedians or try your own material. Supportive environment for new and experienced performers.',
      subcategory: 'Comedy',
      requirements: '18+ event',
      whatToBring: '5-minute set if performing',
      specialNotes: 'Sign-up starts at 7pm',
      contactInfo: 'comedy@openmic.com | (555) 678-9012',
      cancellationPolicy: 'First come, first served'
    },
    {
      title: 'Board Game Tournament',
      description: 'Compete in popular board games for prizes. Multiple games running simultaneously with brackets and finals.',
      subcategory: 'Games',
      requirements: 'Basic game knowledge helpful',
      whatToBring: 'Competitive spirit',
      specialNotes: 'Games and rules provided',
      contactInfo: 'games@tournament.com | (555) 789-0123',
      cancellationPolicy: 'Entry fee non-refundable'
    }
  ],
  'Community': [
    {
      title: 'Beach Cleanup & BBQ',
      description: 'Help clean local beaches then enjoy a community BBQ. Make environmental impact while meeting neighbors.',
      subcategory: 'Environment',
      requirements: 'All ages welcome',
      whatToBring: 'Reusable water bottle, sunscreen',
      specialNotes: 'Supplies and lunch provided',
      contactInfo: 'beach@cleanup.com | (555) 890-1234',
      cancellationPolicy: 'Rain date available'
    },
    {
      title: 'Senior Tech Help Session',
      description: 'Volunteers help seniors with technology questions. From smartphones to social media, patient assistance provided.',
      subcategory: 'Volunteer',
      requirements: 'Patience with teaching',
      whatToBring: 'Your devices for demos',
      specialNotes: 'Ongoing program',
      contactInfo: 'tech@seniors.com | (555) 901-2345',
      cancellationPolicy: 'Flexible attendance'
    },
    {
      title: 'Cultural Food Festival',
      description: 'Celebrate diversity through food. Multiple cultures represented with authentic dishes, music, and traditions.',
      subcategory: 'Cultural',
      requirements: 'Come hungry',
      whatToBring: 'Cash for vendors',
      specialNotes: 'Family-friendly',
      contactInfo: 'culture@festival.com | (555) 012-3456',
      cancellationPolicy: 'Rain or shine event'
    }
  ],
  'Outdoor': [
    {
      title: 'Kayaking for Beginners',
      description: 'Learn kayaking basics on calm water. Paddle techniques, safety procedures, and guided tour of scenic waterways.',
      subcategory: 'Water Sports',
      requirements: 'Can swim',
      whatToBring: 'Swimsuit, towel, dry clothes',
      specialNotes: 'All equipment provided',
      contactInfo: 'kayak@paddle.com | (555) 123-4567',
      cancellationPolicy: 'Weather dependent'
    },
    {
      title: 'Wilderness Survival Skills',
      description: 'Learn essential survival techniques. Fire starting, shelter building, water purification, and navigation basics.',
      subcategory: 'Survival',
      requirements: 'Physical mobility required',
      whatToBring: 'Sturdy boots, pocket knife',
      specialNotes: 'Not for young children',
      contactInfo: 'survive@wild.com | (555) 234-5678',
      cancellationPolicy: 'Full refund bad weather'
    },
    {
      title: 'Astronomy Night',
      description: 'Stargazing with telescopes and expert guides. Learn constellations, planets, and deep-sky objects visible tonight.',
      subcategory: 'Astronomy',
      requirements: 'Dress warmly',
      whatToBring: 'Red flashlight, blanket',
      specialNotes: 'Telescopes provided',
      contactInfo: 'stars@astronomy.com | (555) 345-6789',
      cancellationPolicy: 'Clear skies required'
    }
  ],
  'Family': [
    {
      title: 'Magic Show & Workshop',
      description: 'Professional magic show followed by teaching simple tricks. Kids learn to perform and gain confidence.',
      subcategory: 'Magic',
      requirements: 'Ages 5+',
      whatToBring: 'Deck of cards if available',
      specialNotes: 'Magic kit included',
      contactInfo: 'magic@family.com | (555) 456-7890',
      cancellationPolicy: 'Full refund 48 hours before'
    },
    {
      title: 'Family Game Olympics',
      description: 'Compete in fun family challenges. Relay races, trivia, and silly games that everyone can enjoy together.',
      subcategory: 'Games',
      requirements: 'Teams of 2-6',
      whatToBring: 'Team spirit',
      specialNotes: 'Prizes for all teams',
      contactInfo: 'olympics@family.com | (555) 567-8901',
      cancellationPolicy: 'Rain date provided'
    },
    {
      title: 'Nature Scavenger Hunt',
      description: 'Explore nature while hunting for treasures. Educational and fun way to learn about local flora and fauna.',
      subcategory: 'Nature',
      requirements: 'Walking ability',
      whatToBring: 'Collection bag, camera',
      specialNotes: 'Guide sheets provided',
      contactInfo: 'nature@family.com | (555) 678-9012',
      cancellationPolicy: 'Weather permitting'
    }
  ],
  'Lifestyle': [
    {
      title: 'Zero Waste Living',
      description: 'Practical tips for reducing waste. Learn composting, bulk shopping, and DIY alternatives to disposable products.',
      subcategory: 'Sustainability',
      requirements: 'None',
      whatToBring: 'Reusable containers for samples',
      specialNotes: 'Starter kit available',
      contactInfo: 'zero@waste.com | (555) 789-0123',
      cancellationPolicy: 'Full refund 3 days before'
    },
    {
      title: 'Interior Design Basics',
      description: 'Transform your space with design principles. Color theory, furniture arrangement, and budget-friendly decorating tips.',
      subcategory: 'Home Design',
      requirements: 'Photos of your space',
      whatToBring: 'Room photos and measurements',
      specialNotes: 'Personal consultations available',
      contactInfo: 'design@home.com | (555) 890-1234',
      cancellationPolicy: 'Credit for future class'
    },
    {
      title: 'Financial Wellness Workshop',
      description: 'Take control of your finances. Budgeting, saving strategies, and investment basics for financial freedom.',
      subcategory: 'Finance',
      requirements: 'Bring financial goals',
      whatToBring: 'Financial questions',
      specialNotes: 'Free planning tools included',
      contactInfo: 'finance@wellness.com | (555) 901-2345',
      cancellationPolicy: 'Always free to reschedule'
    }
  ]
};

const locations = [
  { venue: 'Marina Green', address: '3950 Scott St', city: 'San Francisco', state: 'CA', zip: '94123' },
  { venue: 'Dolores Park', address: 'Dolores St & 19th St', city: 'San Francisco', state: 'CA', zip: '94114' },
  { venue: 'The Ferry Building', address: '1 Ferry Building', city: 'San Francisco', state: 'CA', zip: '94111' },
  { venue: 'Palace of Fine Arts', address: '3601 Lyon St', city: 'San Francisco', state: 'CA', zip: '94123' },
  { venue: 'Chinatown Gate', address: 'Bush St & Grant Ave', city: 'San Francisco', state: 'CA', zip: '94108' },
  { venue: 'Ocean Beach', address: 'Great Highway', city: 'San Francisco', state: 'CA', zip: '94122' },
  { venue: 'Twin Peaks', address: '501 Twin Peaks Blvd', city: 'San Francisco', state: 'CA', zip: '94114' },
  { venue: 'Alamo Square', address: 'Hayes St & Steiner St', city: 'San Francisco', state: 'CA', zip: '94117' },
  { venue: 'Salesforce Park', address: '425 Mission St', city: 'San Francisco', state: 'CA', zip: '94105' },
  { venue: 'Chase Center', address: '1 Warriors Way', city: 'San Francisco', state: 'CA', zip: '94158' },
  { venue: 'Moscone Center', address: '747 Howard St', city: 'San Francisco', state: 'CA', zip: '94103' },
  { venue: 'The Fillmore', address: '1805 Geary Blvd', city: 'San Francisco', state: 'CA', zip: '94115' }
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPrice() {
  const prices = [0, 10, 15, 20, 25, 30, 35, 40, 45, 50, 65, 75, 80, 95, 110, 125, 140, 160, 175, 200];
  return getRandomElement(prices);
}

function getRandomCapacity() {
  const capacities = [10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 100, 120, 150, 200, 250, 300, 400, 500];
  return getRandomElement(capacities);
}

function generateEvent(category, day, eventNumber) {
  const templates = eventTemplates[category];
  const template = templates[eventNumber % templates.length];
  const location = getRandomElement(locations);
  const images = imageUrls[category];
  const image = getRandomElement(images);
  
  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const hour = getRandomElement(hours);
  const minutes = ['00', '15', '30', '45'];
  const minute = getRandomElement(minutes);
  const duration = Math.floor(Math.random() * 4) + 1; // 1-4 hours
  const startTime = `${String(hour).padStart(2, '0')}:${minute}:00`;
  
  const price = getRandomPrice();
  const fullLocation = `${location.venue}, ${location.address}, ${location.city}, ${location.state} ${location.zip}`;
  
  // Add variation to the title to make events unique
  const titleVariations = ['', ' - Advanced', ' - Beginner Friendly', ' - Special Edition', ' - Weekend Special'];
  const titleVariation = eventNumber % 5 === 0 ? getRandomElement(titleVariations) : '';
  
  return {
    title: `${template.title}${titleVariation}`,
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
    duration: `${duration} ${duration === 1 ? 'hour' : 'hours'}`,
    whatToBring: template.whatToBring,
    specialNotes: template.specialNotes,
    contactInfo: template.contactInfo,
    parkingInfo: price === 0 ? 'Free street parking available' : 'Paid parking garage nearby',
    cancellationPolicy: template.cancellationPolicy,
    organizerEmail: `organizer${eventNumber}@eventconnect.com`,
    source: 'Next 7 Days Event Generator',
    sourceUrl: 'https://eventconnect.app/generator/next7days'
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
  const totalEvents = 150; // Creating 150 events for the next 7 days
  const startDay = 12;
  const endDay = 18;
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
  
  console.log(`Generated ${events.length} events for September 12-18, 2025`);
  console.log(`Events per day: ${eventsPerDay}-${eventsPerDay + 1}`);
  
  // Create events in smaller batches to avoid overwhelming the server
  const batchSize = 5;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(events.length / batchSize)}...`);
    
    const promises = batch.map(event => 
      createEvent(event)
        .then(() => {
          successCount++;
          console.log(`✓ Created: ${event.title} on Sept ${event.date.slice(-2)} at ${event.time.slice(0, 5)}`);
        })
        .catch(error => {
          errorCount++;
          console.error(`✗ Failed: ${event.title} - ${error.message}`);
        })
    );
    
    await Promise.all(promises);
    
    // Small delay between batches to prevent overwhelming the server
    if (i + batchSize < events.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('\n=== Final Summary ===');
  console.log(`Successfully created: ${successCount} events`);
  console.log(`Failed: ${errorCount} events`);
  console.log(`Total processed: ${events.length} events`);
  console.log(`Date range: September 12-18, 2025`);
}

// Run the generator
generateAndCreateEvents().catch(console.error);