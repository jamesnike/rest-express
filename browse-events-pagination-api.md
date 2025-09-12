# Browse Events API - Pagination Documentation

## Endpoint
```
GET /api/events/browse
```

## Base URL
```
https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev
```

## Description
Returns paginated events for the next 7 days (today + 7 days ahead). Events are sorted by date and time, with no authentication required.

## Request Parameters

| Parameter | Type | Default | Description | Constraints |
|-----------|------|---------|-------------|-------------|
| `limit` | integer | 20 | Number of events per page | Min: 1, Max: 100 |
| `page` | integer | 1 | Page number (1-based) | Min: 1 |
| `offset` | integer | 0 | Number of events to skip | Min: 0 |
| `category` | string | - | Filter by event category | Valid categories: Music, Sports, Arts, Food, Tech, Business, Education, Health & Wellness, Entertainment, Community, Outdoor, Family, Lifestyle |
| `timeFilter` | string | - | Filter by time of day | Options: morning, afternoon, evening, night |
| `timezoneOffset` | integer | 0 | Timezone offset in minutes | -720 to 840 |

**Note:** Use either `page` OR `offset`, not both. If both are provided, `offset` takes precedence.

## Response Format

### Success Response (200 OK)
```json
{
  "events": [
    {
      "id": 702,
      "title": "Sunset Yoga in the Park",
      "description": "Relaxing yoga session at sunset...",
      "category": "Health & Wellness",
      "subCategory": "Yoga",
      "date": "2025-09-12",
      "time": "18:30:00",
      "location": "Central Park West Lawn",
      "latitude": 40.7829,
      "longitude": -73.9654,
      "price": "15.00",
      "isFree": false,
      "eventImageUrl": "https://images.unsplash.com/...",
      "organizerId": "user123",
      "maxAttendees": 30,
      "capacity": 30,
      "parkingInfo": "Street parking available",
      "meetingPoint": "West Lawn entrance",
      "duration": "60 minutes",
      "whatToBring": "Yoga mat, water bottle",
      "specialNotes": "All levels welcome",
      "requirements": "None",
      "contactInfo": "yoga@example.com",
      "cancellationPolicy": "Full refund 24 hours before",
      "isActive": true,
      "createdAt": "2025-09-10T10:00:00.000Z",
      "updatedAt": "2025-09-10T10:00:00.000Z",
      "organizer": {
        "id": "user123",
        "email": "organizer@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "profileImageUrl": null,
        "customAvatarUrl": null,
        "animeAvatarSeed": "seed123",
        "location": "New York, NY",
        "interests": ["Wellness", "Fitness", "Nature"],
        "personality": "Calm and encouraging",
        "aiSignature": "Bringing peace through movement",
        "createdAt": "2025-01-15T08:00:00.000Z",
        "updatedAt": "2025-09-01T12:00:00.000Z"
      },
      "rsvpCount": 12,
      "userRsvpStatus": null
    }
    // ... more events
  ],
  "pagination": {
    "total": 253,
    "limit": 20,
    "offset": 0,
    "currentPage": 1,
    "totalPages": 13,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

### Error Response (500 Internal Server Error)
```json
{
  "message": "Failed to fetch browse events"
}
```

## Pagination Details

### Page Calculation
- **offset** = (page - 1) * limit
- **currentPage** = floor(offset / limit) + 1
- **totalPages** = ceil(total / limit)

### Navigation Flags
- **hasNext**: `true` if more events exist after current page
- **hasPrevious**: `true` if current page is not the first page

## Example Requests

### 1. Get First Page (Default)
```bash
GET /api/events/browse
```
Returns first 20 events

### 2. Get Specific Page
```bash
GET /api/events/browse?page=2&limit=20
```
Returns events 21-40

### 3. Custom Limit
```bash
GET /api/events/browse?limit=10
```
Returns first 10 events

### 4. Using Offset
```bash
GET /api/events/browse?limit=20&offset=40
```
Returns events 41-60

### 5. Filter by Category
```bash
GET /api/events/browse?category=Music&page=1&limit=10
```
Returns first 10 Music events

### 6. Combined Filters
```bash
GET /api/events/browse?category=Sports&timeFilter=morning&limit=15&page=2
```
Returns page 2 of morning Sports events (15 per page)

## Mobile Implementation Examples

### JavaScript/React Native
```javascript
const BASE_URL = 'https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev';

// Get first page
async function getEvents(page = 1, limit = 20) {
  try {
    const response = await fetch(
      `${BASE_URL}/api/events/browse?page=${page}&limit=${limit}`
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching events:', error);
  }
}

// Load more pattern
async function loadMoreEvents(currentOffset, limit = 20) {
  const response = await fetch(
    `${BASE_URL}/api/events/browse?offset=${currentOffset}&limit=${limit}`
  );
  return response.json();
}

// With filters
async function getFilteredEvents(category, page = 1) {
  const params = new URLSearchParams({
    category: category,
    page: page.toString(),
    limit: '20'
  });
  
  const response = await fetch(
    `${BASE_URL}/api/events/browse?${params}`
  );
  return response.json();
}
```

### Swift/iOS
```swift
let baseURL = "https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev"

func fetchEvents(page: Int = 1, limit: Int = 20) async throws -> EventsResponse {
    var components = URLComponents(string: "\(baseURL)/api/events/browse")!
    components.queryItems = [
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "limit", value: String(limit))
    ]
    
    let (data, _) = try await URLSession.shared.data(from: components.url!)
    return try JSONDecoder().decode(EventsResponse.self, from: data)
}
```

### Kotlin/Android
```kotlin
val baseUrl = "https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev"

suspend fun getEvents(page: Int = 1, limit: Int = 20): EventsResponse {
    return httpClient.get("$baseUrl/api/events/browse") {
        parameter("page", page)
        parameter("limit", limit)
    }.body()
}
```

## Best Practices

1. **Default Page Size**: Use 20 events per page for optimal mobile performance
2. **Caching**: Cache pages locally to reduce API calls
3. **Infinite Scroll**: Use `hasNext` to determine when to load more
4. **Error Handling**: Always handle network errors gracefully
5. **Loading States**: Show loading indicators during pagination
6. **Empty States**: Handle cases where `total = 0`

## Rate Limiting
No rate limiting is currently implemented, but please be respectful of server resources.

## Notes
- Events are always from today to 7 days in the future
- No authentication required
- Results are ordered by date, then time, then event ID for consistency
- All dates are in YYYY-MM-DD format
- All times are in HH:MM:SS format (24-hour)
- Response size is approximately 50KB for 20 events