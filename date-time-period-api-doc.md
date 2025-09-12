# Date and Time Period Filtering API Documentation

## Overview
The `/api/events/browse` endpoint now supports filtering events by specific dates and time periods (AM/PM/Night). This allows mobile apps to fetch events for a particular date and time range, such as "September 15 AM" or "September 20 Night".

## Endpoint
```
GET /api/events/browse
```

## Base URL
```
https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev
```

## New Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `date` | string | No* | Specific date in YYYY-MM-DD format | 2025-09-15 |
| `timePeriod` | string | No* | Time period filter | AM, PM, Night |

*Note: Both `date` and `timePeriod` must be provided together for date/time filtering. If neither is provided, the default 7-day range applies.

## Time Period Definitions

| Period | Time Range | Description |
|--------|------------|-------------|
| **AM** | 06:00 - 11:59 | Morning events (6 AM to noon) |
| **PM** | 12:00 - 17:59 | Afternoon events (noon to 6 PM) |
| **Night** | 18:00 - 23:59 | Evening/night events (6 PM to midnight) |

## Usage Examples

### 1. Get events for a specific date and time period
```bash
GET /api/events/browse?date=2025-09-15&timePeriod=AM
```
Returns all morning events on September 15, 2025

### 2. With pagination
```bash
GET /api/events/browse?date=2025-09-15&timePeriod=PM&page=1&limit=20
```
Returns first 20 afternoon events on September 15, 2025

### 3. With category filter
```bash
GET /api/events/browse?date=2025-09-14&timePeriod=Night&category=Music
```
Returns all Music events in the evening on September 14, 2025

### 4. Invalid date format (returns 400 error)
```bash
GET /api/events/browse?date=09-15-2025&timePeriod=AM
```
Returns: `{"message": "Invalid date format. Use YYYY-MM-DD"}`

## Response Format

Same as the standard paginated response:

```json
{
  "events": [
    {
      "id": 702,
      "title": "Morning Yoga Class",
      "date": "2025-09-15",
      "time": "09:00:00",
      "category": "Health & Wellness",
      // ... other event fields
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

## Mobile Implementation Examples

### JavaScript/React Native
```javascript
const BASE_URL = 'https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev';

// Get morning events for a specific date
async function getMorningEvents(date) {
  const response = await fetch(
    `${BASE_URL}/api/events/browse?date=${date}&timePeriod=AM`
  );
  return response.json();
}

// Get events by date and time period with pagination
async function getEventsByDateTime(date, timePeriod, page = 1) {
  const params = new URLSearchParams({
    date: date,
    timePeriod: timePeriod,
    page: page.toString(),
    limit: '20'
  });
  
  const response = await fetch(
    `${BASE_URL}/api/events/browse?${params}`
  );
  return response.json();
}

// Example usage
const morningEvents = await getMorningEvents('2025-09-15');
const eveningEvents = await getEventsByDateTime('2025-09-20', 'Night', 1);
```

### Swift/iOS
```swift
func fetchEventsByDateTime(date: String, timePeriod: String, page: Int = 1) async throws -> EventsResponse {
    var components = URLComponents(string: "\(baseURL)/api/events/browse")!
    components.queryItems = [
        URLQueryItem(name: "date", value: date),
        URLQueryItem(name: "timePeriod", value: timePeriod),
        URLQueryItem(name: "page", value: String(page)),
        URLQueryItem(name: "limit", value: "20")
    ]
    
    let (data, _) = try await URLSession.shared.data(from: components.url!)
    return try JSONDecoder().decode(EventsResponse.self, from: data)
}

// Usage
let morningEvents = try await fetchEventsByDateTime(date: "2025-09-15", timePeriod: "AM")
```

### Kotlin/Android
```kotlin
suspend fun getEventsByDateTime(
    date: String,
    timePeriod: String,
    page: Int = 1
): EventsResponse {
    return httpClient.get("$baseUrl/api/events/browse") {
        parameter("date", date)
        parameter("timePeriod", timePeriod)
        parameter("page", page)
        parameter("limit", 20)
    }.body()
}

// Usage
val afternoonEvents = getEventsByDateTime("2025-09-15", "PM")
val nightEvents = getEventsByDateTime("2025-09-20", "Night", page = 2)
```

## Important Notes

1. **Date Validation**: The date must be in YYYY-MM-DD format. Invalid formats return a 400 error.

2. **Time Period Case**: The timePeriod parameter is case-insensitive. "AM", "am", "Am" all work.

3. **Both Parameters Required**: To use date/time filtering, both `date` and `timePeriod` must be provided. Providing only one will use the default 7-day range.

4. **Combination with Other Filters**: This works seamlessly with existing filters:
   - Category filtering
   - Pagination (page/offset/limit)
   - All parameters can be combined

5. **Default Behavior**: If neither `date` nor `timePeriod` is provided, the endpoint returns events for the next 7 days (today + 7 days ahead).

## Test Results
Based on testing with production data:
- September 15 AM: 10 events
- September 15 PM: 24 events  
- September 15 Night: 6 events
- All time filtering is accurate within specified ranges
- Pagination and category filters work correctly with date/time filtering