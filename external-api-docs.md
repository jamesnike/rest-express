# EventConnect External Mobile API Integration

## Backend URL Access

### Development Environment
```
https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev
```

### Production Environment (After Deployment)
```
https://your-app-name.replit.app
```

## Mobile App Configuration

### Base API Configuration
```javascript
// Mobile app config
const API_BASE_URL = 'https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev';

// API Client setup
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for session cookies
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});
```

### Authentication Flow for Mobile
Since this uses session-based auth with Replit Auth, mobile apps need to handle the web-based auth flow:

```javascript
// Option 1: WebView Authentication
const authenticateUser = () => {
  // Open WebView to: ${API_BASE_URL}/api/login
  // Handle redirect back to app after auth success
  // Session cookie will be automatically stored
};

// Option 2: Check Authentication Status
const checkAuthStatus = async () => {
  try {
    const response = await apiClient.get('/api/auth/user');
    return response.data; // User is authenticated
  } catch (error) {
    if (error.response?.status === 401) {
      // User needs to authenticate
      return null;
    }
    throw error;
  }
};
```

## Key Mobile API Endpoints

### Core Event Operations
```javascript
// Get all events
const getEvents = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  return await apiClient.get(`/api/events?${params}`);
};

// Get event details
const getEventDetails = async (eventId) => {
  return await apiClient.get(`/api/events/${eventId}`);
};

// RSVP to event
const rsvpToEvent = async (eventId, status) => {
  return await apiClient.post(`/api/events/${eventId}/rsvp`, { status });
};

// Get event messages
const getEventMessages = async (eventId) => {
  return await apiClient.get(`/api/events/${eventId}/messages`);
};

// Send message to event
const sendEventMessage = async (eventId, content, quotedMessageId = null) => {
  return await apiClient.post(`/api/events/${eventId}/messages`, {
    content,
    quotedMessageId
  });
};
```

### Event Discovery
```javascript
// Browse events with filtering
const browseEvents = async (category = null, timeframe = null) => {
  const params = {};
  if (category) params.category = category;
  if (timeframe) params.timeframe = timeframe;
  
  const query = new URLSearchParams(params);
  return await apiClient.get(`/api/events/browse?${query}`);
};

// Get personalized recommendations
const getRecommendedEvents = async () => {
  return await apiClient.get('/api/events/discover');
};
```

### Real-time Features
```javascript
// WebSocket connection for real-time updates
const connectWebSocket = () => {
  const wsUrl = API_BASE_URL.replace('https://', 'wss://');
  const socket = new WebSocket(wsUrl);
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleRealtimeUpdate(data);
  };
  
  return socket;
};
```

### AI Customer Service
```javascript
// Chat with AI assistant
const chatWithAI = async (message, eventId = null, voiceMode = false) => {
  return await apiClient.post('/api/ai/customer-service', {
    message,
    eventId,
    voiceMode
  });
};
```

## Error Handling

```javascript
// API Error Handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to authentication
      handleAuthRequired();
    } else if (error.response?.status >= 500) {
      // Show server error message
      showErrorMessage('Server error. Please try again later.');
    }
    return Promise.reject(error);
  }
);
```

## Sample Data Available

The backend currently has **57 comprehensive sample events** for August 2025:

- **8 Music Events**: Festivals, concerts, open mic nights
- **10 Sports Events**: Tournaments, fitness classes, outdoor activities  
- **8 Arts Events**: Workshops, exhibitions, creative classes
- **8 Food Events**: Cooking classes, tastings, food festivals
- **6 Tech Events**: AI workshops, development bootcamps
- **5 Community Events**: Volunteer opportunities, cultural events
- **3 Business Events**: Networking, professional development
- **4 Education Events**: Learning opportunities, skill building
- **5 Health & Wellness Events**: Fitness, mental health, nutrition

## Location Integration

Events include location data for map integration:
```javascript
// Event location data structure
{
  "location": "Venue Name, 123 Street Address",
  "latitude": "40.7589",
  "longitude": "-73.9851"
}
```

## Rate Limiting

Current API limits:
- 100 requests/minute for authenticated users
- 20 requests/minute for unauthenticated users
- 10 requests/minute for AI customer service

## Cross-Origin Requests

The backend supports CORS for external mobile applications. Ensure your mobile app includes credentials in requests for session-based authentication.

## Deployment Recommendation

For production mobile apps, deploy your Replit backend to get a stable `.replit.app` URL rather than using the development URL.