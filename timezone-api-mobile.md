# Timezone API Changes for Mobile

## Base URL
```
https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev
```

## New Fields in Event Objects

All event objects now include timezone information:

```json
{
  "id": 734,
  "title": "Event Title",
  "date": "2025-09-15",
  "time": "14:00:00",
  "timezone": "America/Los_Angeles",  // NEW: IANA timezone identifier
  "utcDateTime": "2025-09-15T21:00:00Z",  // NEW: UTC timestamp
  // ... other fields
}
```

## API Changes

### 1. Browse Events
**GET** `/api/events/browse`

New optional parameter:
- `timezone` (string): IANA timezone identifier. Defaults to "UTC" if not provided.

Example:
```
GET /api/events/browse?timezone=America/New_York&page=1&limit=20
```

### 2. Get Events (Home)
**GET** `/api/events`

New optional parameter:
- `timezone` (string): IANA timezone identifier. Defaults to "UTC" if not provided.

Example:
```
GET /api/events?timezone=Europe/London&category=Music
```

### 3. Create Event
**POST** `/api/events`

New field in request body:
```json
{
  "title": "New Event",
  "date": "2025-09-20",
  "time": "15:00:00",
  "timezone": "America/Los_Angeles",  // NEW: Specify event's timezone
  // ... other fields
}
```

The server will automatically calculate and store the UTC datetime.

## Mobile Implementation

### iOS/Swift
```swift
// Get user's timezone
let userTimezone = TimeZone.current.identifier  // e.g., "America/New_York"

// Fetch events with user's timezone
func fetchEvents(page: Int) async throws -> EventsResponse {
    var components = URLComponents(string: "\(baseURL)/api/events/browse")!
    components.queryItems = [
        URLQueryItem(name: "timezone", value: userTimezone),
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "limit", value: "20")
    ]
    
    let (data, _) = try await URLSession.shared.data(from: components.url!)
    return try JSONDecoder().decode(EventsResponse.self, from: data)
}
```

### Android/Kotlin
```kotlin
// Get user's timezone
val userTimezone = TimeZone.getDefault().id  // e.g., "America/New_York"

// Fetch events with user's timezone
suspend fun getEvents(page: Int): EventsResponse {
    return httpClient.get("$baseUrl/api/events/browse") {
        parameter("timezone", userTimezone)
        parameter("page", page)
        parameter("limit", 20)
    }.body()
}
```

### React Native/JavaScript
```javascript
// Get user's timezone
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;  // e.g., "America/New_York"

// Fetch events with user's timezone
async function fetchEvents(page = 1) {
  const params = new URLSearchParams({
    timezone: userTimezone,
    page: page.toString(),
    limit: '20'
  });
  
  const response = await fetch(`${BASE_URL}/api/events/browse?${params}`);
  return response.json();
}
```

## Important Notes

1. **Default Timezone**: If no timezone parameter is provided, the API defaults to "UTC"
2. **Existing Events**: All existing events are in "America/Los_Angeles" (PST) timezone
3. **IANA Timezones**: Use standard IANA timezone identifiers (e.g., "America/New_York", "Europe/London", "Asia/Tokyo")
4. **Backward Compatible**: The `timezoneOffset` parameter is still supported for backward compatibility
5. **UTC Storage**: All events store both local time and UTC datetime for accurate conversion

## Response Example

```json
{
  "events": [
    {
      "id": 762,
      "title": "Stand-up Comedy Open Mic",
      "date": "2025-09-15",
      "time": "07:00:00",
      "timezone": "America/Los_Angeles",
      "utcDateTime": "2025-09-15T14:00:00Z",
      "location": "The Laugh Track, 789 Comedy Lane",
      // ... other fields
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 20,
    "offset": 0,
    "currentPage": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  }
}
```

## Displaying Times in Mobile Apps

Use the `timezone` and `utcDateTime` fields to display event times correctly:

1. **Local Time Display**: Use the `time` field with the event's `timezone` to show the event's local time
2. **User's Time**: Convert `utcDateTime` to the user's timezone to show "Event starts at X in your time"
3. **Relative Time**: Use `utcDateTime` to calculate "starts in 2 hours" type displays

## Questions?
Contact the backend team for any timezone-related issues or clarifications.