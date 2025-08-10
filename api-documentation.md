# EventConnect Backend API Documentation

## Base URL
```
http://localhost:5000
```

## Authentication
The API uses session-based authentication with Replit Auth. Most endpoints require authentication via session cookies.

## API Endpoints

### Authentication Endpoints

#### GET `/api/auth/user`
Get current authenticated user information.

**Response:**
```json
{
  "id": "44781796",
  "email": "user@example.com",
  "name": "User Name",
  "profilePicture": "https://...",
  "interests": ["Music", "Sports", "Tech"],
  "personalityTraits": ["creative", "outgoing"],
  "personalSignature": "AI-generated personal description"
}
```

#### GET `/api/login`
Redirects to Replit Auth login flow.

#### GET `/api/logout`
Logs out the current user and redirects to landing page.

### Event Endpoints

#### GET `/api/events`
Get all events with optional filtering.

**Query Parameters:**
- `category` (optional): Filter by event category
- `subcategory` (optional): Filter by event subcategory
- `date` (optional): Filter by date (YYYY-MM-DD format)
- `isFree` (optional): Filter by free events (true/false)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Summer Music Festival",
    "description": "Three-day outdoor music festival...",
    "category": "Music",
    "subCategory": "Festival",
    "date": "2025-08-02",
    "time": "14:00:00",
    "location": "Riverside Festival Grounds, 1500 Music Park Drive",
    "latitude": "40.7589",
    "longitude": "-73.9851",
    "price": "75.00",
    "isFree": false,
    "maxAttendees": 2000,
    "capacity": 2000,
    "parkingInfo": "Free parking in festival lot...",
    "meetingPoint": "Main festival entrance gate",
    "duration": "8 hours per day (2 PM - 10 PM), 3 days total",
    "whatToBring": "Folding chairs, sunscreen...",
    "specialNotes": "Rain or shine event...",
    "requirements": "All ages welcome...",
    "contactInfo": "Festival info: tickets@summermusicfest.com...",
    "cancellationPolicy": "No refunds. Credit toward next year...",
    "eventImageUrl": "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
    "organizerId": "organizer_123",
    "organizer": {
      "id": "organizer_123",
      "name": "Event Organizer",
      "email": "organizer@example.com"
    },
    "attendeeCount": 150,
    "isAttending": false,
    "rsvpStatus": null,
    "isFavorited": false
  }
]
```

#### GET `/api/events/:id`
Get specific event details.

**Response:** Same as individual event object above.

#### POST `/api/events`
Create a new event (requires authentication).

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Event description...",
  "category": "Music",
  "subCategory": "Concert",
  "date": "2025-08-15",
  "time": "19:30:00",
  "location": "Venue Address",
  "latitude": "40.7589",
  "longitude": "-73.9851",
  "price": "25.00",
  "isFree": false,
  "maxAttendees": 100,
  "capacity": 100,
  "parkingInfo": "Parking details...",
  "meetingPoint": "Where to meet...",
  "duration": "3 hours",
  "whatToBring": "What attendees should bring...",
  "specialNotes": "Additional notes...",
  "requirements": "Age or other requirements...",
  "contactInfo": "Contact information...",
  "cancellationPolicy": "Cancellation policy...",
  "eventImageUrl": "https://example.com/image.jpg"
}
```

#### PUT `/api/events/:id`
Update an event (requires authentication and ownership).

#### DELETE `/api/events/:id`
Delete an event (requires authentication and ownership).

### Event Interaction Endpoints

#### POST `/api/events/:id/rsvp`
RSVP to an event.

**Request Body:**
```json
{
  "status": "attending" // "attending", "maybe", "not_attending"
}
```

#### DELETE `/api/events/:id/rsvp`
Remove RSVP from an event.

#### POST `/api/events/:id/favorite`
Add event to favorites.

#### DELETE `/api/events/:id/favorite`
Remove event from favorites.

#### GET `/api/events/:id/attendees`
Get list of event attendees.

**Response:**
```json
[
  {
    "id": "user_123",
    "name": "User Name",
    "email": "user@example.com",
    "profilePicture": "https://...",
    "rsvpStatus": "attending"
  }
]
```

#### GET `/api/events/:id/favorites`
Get users who favorited the event.

### Event Discovery Endpoints

#### GET `/api/events/browse`
Get events for browsing with smart filtering (excludes user's skipped events).

**Query Parameters:**
- `category` (optional): Filter by category
- `timeframe` (optional): "today", "week", "month", "all"

#### GET `/api/events/discover`
Get personalized event recommendations based on user interests.

#### POST `/api/events/:id/skip`
Mark an event as skipped (won't appear in discovery).

### Messaging Endpoints

#### GET `/api/events/:id/messages`
Get messages for an event.

**Response:**
```json
[
  {
    "id": 1,
    "content": "Message content",
    "userId": "user_123",
    "user": {
      "id": "user_123",
      "name": "User Name",
      "profilePicture": "https://..."
    },
    "timestamp": "2025-08-10T15:30:00Z",
    "quotedMessage": {
      "id": 2,
      "content": "Original message",
      "user": { "name": "Other User" }
    }
  }
]
```

#### POST `/api/events/:id/messages`
Send a message to an event.

**Request Body:**
```json
{
  "content": "Message content",
  "quotedMessageId": 123 // optional
}
```

#### GET `/api/chats/private`
Get user's private chats.

#### POST `/api/chats/private`
Create or get private chat with another user.

**Request Body:**
```json
{
  "otherUserId": "user_456"
}
```

#### GET `/api/chats/:id/messages`
Get messages from a specific chat.

#### POST `/api/chats/:id/messages`
Send message to a private chat.

### Notification Endpoints

#### GET `/api/notifications/unread`
Get unread notification counts.

**Response:**
```json
{
  "totalUnread": 5,
  "unreadByEvent": {
    "123": 2,
    "456": 3
  }
}
```

### AI Customer Service Endpoint

#### POST `/api/ai/customer-service`
Interact with AI customer service assistant.

**Request Body:**
```json
{
  "message": "User's question or message",
  "eventId": 123, // optional, for event-specific questions
  "voiceMode": false // optional, enables TTS response
}
```

**Response:**
```json
{
  "response": "AI assistant response text",
  "audioData": "base64_encoded_audio_data", // only if voiceMode: true
  "confidence": 0.95
}
```

### Profile Endpoints

#### GET `/api/profile/:userId`
Get user profile information.

#### PUT `/api/profile`
Update current user's profile.

**Request Body:**
```json
{
  "interests": ["Music", "Sports", "Tech"], // max 3
  "personalityTraits": ["creative", "outgoing"],
  "name": "Updated Name"
}
```

#### POST `/api/profile/generate-avatar`
Generate AI avatar for user using DALL-E 3.

#### POST `/api/profile/generate-signature`
Generate AI personal signature using GPT-4o.

### External API Endpoint (No Auth Required)

#### POST `/api/external/events`
Create events from external sources (used by sample data generator).

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Description...",
  // ... all event fields ...
  "organizerEmail": "organizer@example.com",
  "source": "external_source_name",
  "sourceUrl": "https://source.com"
}
```

## WebSocket Events

The API includes WebSocket support for real-time features:

**Connection:** `ws://localhost:5000`

**Events:**
- `notification`: New notification received
- `message`: New message in subscribed event/chat
- `event_update`: Event details changed
- `user_joined`: User joined an event
- `user_left`: User left an event

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // optional additional details
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Current limits:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users
- 10 requests per minute for AI customer service

## Categories and Subcategories

### Available Categories:
- **Music**: Festival, Jazz, Folk/Acoustic, Classical, Blues, Electronic, Country, World Music
- **Sports**: Volleyball, Yoga, Running, Softball, Rock Climbing, Tennis, Cycling, Swimming, Ultimate Frisbee, Fitness
- **Arts**: Visual Arts, Pottery, Theater, Photography, Sculpture, Writing, Printmaking, Glass Art
- **Food**: Festival, Cooking Class, Brewing, Baking, Wine Tasting, Japanese Cuisine, BBQ, Confections
- **Tech**: Artificial Intelligence, Cybersecurity, Mobile Development, Data Science, Blockchain, IoT/Smart Home
- **Community**: Environmental, Senior Services, Safety, Volunteer, Cultural
- **Business**: Networking, Marketing, Legal
- **Education**: Adult Education, College Prep, Financial Literacy, Professional Development
- **Health & Wellness**: Mental Health, Nutrition, Stress Management, Women's Health, Senior Fitness

## Mobile Integration Notes

For mobile apps, consider:

1. **Session Management**: Handle authentication state properly with session cookies
2. **Image Optimization**: Event images are served from Unsplash with optimized URLs
3. **Offline Support**: Cache critical data for offline browsing
4. **Push Notifications**: WebSocket events can trigger push notifications
5. **Location Services**: Use latitude/longitude for map integration
6. **Voice Features**: Customer service supports voice mode with audio responses

## Sample cURL Commands

### Get Events
```bash
curl -X GET "http://localhost:5000/api/events?category=Music" \
  -H "Cookie: session_cookie_here"
```

### RSVP to Event
```bash
curl -X POST "http://localhost:5000/api/events/123/rsvp" \
  -H "Content-Type: application/json" \
  -H "Cookie: session_cookie_here" \
  -d '{"status": "attending"}'
```

### Send Message
```bash
curl -X POST "http://localhost:5000/api/events/123/messages" \
  -H "Content-Type: application/json" \
  -H "Cookie: session_cookie_here" \
  -d '{"content": "Looking forward to this event!"}'
```