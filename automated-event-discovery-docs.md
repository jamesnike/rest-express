# Automated Event Discovery System Documentation

## Overview
EventConnect now includes an automated event discovery system that allows external services, crawlers, and scripts to programmatically create events in the database.

## External API for Event Creation

### Endpoint
`POST https://local-event-connect.replit.app/api/external/events`

### Authentication
- **Header**: `X-API-Key`
- **Value**: `eventconnect_external_api_key_2024` (configured in environment)

### Request Format
```json
{
  "title": "Event Title",
  "description": "Detailed event description",
  "date": "2025-09-15",
  "time": "18:30",
  "location": "Venue Name, Full Address",
  "address": "123 Main St",
  "city": "San Carlos",
  "state": "CA",
  "zipCode": "94070",
  "category": "Tech",
  "subcategory": "Workshop",
  "price": "Free",
  "capacity": 100,
  "requirementsAge": "18+",
  "requirementsDress": "Casual",
  "requirementsOther": "Bring laptop",
  "organizerName": "Event Organizer",
  "organizerEmail": "organizer@example.com",
  "organizerPhone": "(555) 123-4567",
  "organizerWebsite": "https://example.com",
  "imageUrl": "https://example.com/event-image.jpg",
  "tags": ["tech", "workshop", "networking"],
  "source": "crawler_eventbrite"
}
```

### Categories
Valid categories: Music, Sports, Arts, Food, Tech, Business, Education, Health & Wellness, Entertainment, Community, Outdoor, Family, Lifestyle

### Response
**Success (201):**
```json
{
  "success": true,
  "event": {
    "id": 123,
    "title": "Event Title",
    ...
  }
}
```

**Error (400/409):**
```json
{
  "error": "Duplicate event detected",
  "existingEvent": { ... }
}
```

## Example: Automated Event Crawler Script

```javascript
#!/usr/bin/env node

const fetch = require('node-fetch');

const API_URL = 'https://local-event-connect.replit.app';
const API_KEY = 'eventconnect_external_api_key_2024';

async function createEvent(eventData) {
  try {
    const response = await fetch(`${API_URL}/api/external/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(eventData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Event created:', result.event.title);
      return result.event;
    } else {
      console.error('❌ Failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error creating event:', error);
    return null;
  }
}

// Example: Create multiple events from a data source
async function importEvents() {
  const eventsToImport = [
    {
      title: "Tech Startup Meetup",
      description: "Monthly gathering for tech entrepreneurs",
      date: "2025-09-20",
      time: "18:00",
      location: "TechHub San Carlos",
      address: "500 Innovation Way",
      city: "San Carlos",
      state: "CA",
      zipCode: "94070",
      category: "Tech",
      subcategory: "Meetup",
      price: "Free",
      capacity: 50,
      organizerName: "Tech Community",
      organizerEmail: "meetup@techcommunity.com",
      tags: ["startup", "networking", "tech"],
      source: "manual_import"
    }
    // Add more events here
  ];
  
  for (const event of eventsToImport) {
    await createEvent(event);
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

importEvents().catch(console.error);
```

## Web Scraping Integration Example

```python
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import json

API_URL = 'https://local-event-connect.replit.app'
API_KEY = 'eventconnect_external_api_key_2024'

def scrape_and_submit_events():
    # Example: Scrape events from a website
    response = requests.get('https://example-events-site.com')
    soup = BeautifulSoup(response.content, 'html.parser')
    
    events = []
    for event_div in soup.find_all('div', class_='event'):
        event_data = {
            'title': event_div.find('h3').text.strip(),
            'description': event_div.find('p', class_='description').text.strip(),
            'date': parse_date(event_div.find('span', class_='date').text),
            'time': event_div.find('span', class_='time').text.strip(),
            'location': event_div.find('span', class_='venue').text.strip(),
            'city': 'San Carlos',
            'state': 'CA',
            'category': determine_category(event_div),
            'price': event_div.find('span', class_='price').text.strip() or 'Free',
            'source': 'web_scraper',
            'tags': extract_tags(event_div)
        }
        
        # Submit to EventConnect API
        submit_event(event_data)
        
def submit_event(event_data):
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
    }
    
    response = requests.post(
        f'{API_URL}/api/external/events',
        json=event_data,
        headers=headers
    )
    
    if response.status_code == 201:
        print(f"✅ Created: {event_data['title']}")
    elif response.status_code == 409:
        print(f"⚠️ Duplicate: {event_data['title']}")
    else:
        print(f"❌ Failed: {response.json()}")
```

## Automated Scheduling with Cron

To run event discovery automatically, set up a cron job:

```bash
# Run every 4 hours
0 */4 * * * /usr/bin/node /path/to/event-crawler.js >> /var/log/event-crawler.log 2>&1

# Run daily at 2 AM
0 2 * * * /usr/bin/python3 /path/to/event-scraper.py >> /var/log/event-scraper.log 2>&1
```

## AI-Enhanced Event Validation

The external API automatically:
1. **Validates** event data using OpenAI GPT-4o
2. **Enhances** descriptions to be more engaging
3. **Generates** AI avatars for events without images
4. **Categorizes** events into appropriate categories
5. **Detects** and prevents duplicate submissions

## Rate Limits & Best Practices

1. **Rate Limiting**: Submit max 1 event per second
2. **Batch Processing**: Use delays between submissions
3. **Error Handling**: Implement retry logic for failures
4. **Duplicate Detection**: API automatically checks for duplicates
5. **Data Quality**: Provide complete event information for best results

## Testing the API

Quick test using curl:

```bash
curl -X POST https://local-event-connect.replit.app/api/external/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: eventconnect_external_api_key_2024" \
  -d '{
    "title": "Test Event from Crawler",
    "description": "This is a test event submitted via the external API",
    "date": "2025-09-25",
    "time": "19:00",
    "location": "Test Venue, 123 Main St, San Carlos, CA 94070",
    "category": "Tech",
    "price": "Free",
    "organizerName": "Test Organizer",
    "organizerEmail": "test@example.com",
    "source": "api_test"
  }'
```

## Integration with EventConnect Features

Events created through the external API automatically:
- Appear in the main event discovery feed
- Support RSVP and favorites
- Enable group chat for attendees
- Show in search and category filters
- Include AI-generated enhancements

## Monitoring & Logs

Check event creation activity:
```bash
# View recent external API events in database
SELECT * FROM events 
WHERE source LIKE '%crawler%' OR source LIKE '%external%' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Support & Troubleshooting

Common issues:
1. **401 Unauthorized**: Check API key in header
2. **409 Conflict**: Event already exists (duplicate)
3. **400 Bad Request**: Missing required fields
4. **500 Server Error**: Check server logs

For more help, review the server logs or contact the EventConnect development team.