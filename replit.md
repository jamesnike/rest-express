# EventConnect - Mobile Event Discovery App

## Overview
EventConnect is a mobile-first event discovery and management platform for finding, creating, and participating in local events. It aims to connect users with their community through shared interests and activities, offering a clean, mobile-optimized interface with robust event management and social features. The platform supports user authentication, interest selection (up to 3 interests displayed on profiles), and a vision to be the go-to app for local event engagement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
- **Framework**: React with TypeScript
- **UI**: Shadcn/UI components, Radix UI primitives, Tailwind CSS for styling
- **State Management**: TanStack Query for server state
- **Routing**: Wouter
- **Build**: Vite
- **Design Principles**: Mobile-first, targeting a maximum width of 384px. Features a bottom navigation, tab-based interface, touch-friendly components, and responsive layouts.

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect, PostgreSQL-backed sessions
- **API**: RESTful, JSON responses

### Core Features
- **Authentication**: Replit Auth integration, PostgreSQL-based session management, secure HTTP-only cookies.
- **Event Management**: Supports various categories (Music, Sports, Arts, Food, Tech, Business, Education, Health & Wellness, Entertainment, Community, Outdoor, Family, Lifestyle), RSVP system (attending/maybe/not attending), free and paid events, address-based locations, and image uploads. Events can have subcategories for detailed filtering.
- **Messaging**: Real-time WebSocket messaging with unread notifications, message quoting, activity-based chat reordering, and support for both group and 1-on-1 private chats.
- **User Profiles**: Displays user interests, personality traits, and AI-generated personal signatures. Includes AnimeAvatar generation using OpenAI DALL-E 3.
- **AI Customer Service**: Voice-enabled AI assistant with Inworld TTS and browser Speech Recognition. Features speech-to-text input, text-to-speech output, voice toggle controls, and event-specific knowledge for answering user questions about event details, location, pricing, and more.
- **Event Discovery**: Features a Bumble-style swipe interface for event discovery, a dedicated browse page with category and time filters, and a "Similar Events" tab.
- **Mobile Development**: Integrated with Capacitor for native Android and iOS app deployment, utilizing core mobile plugins like geolocation, camera, and push notifications.
- **Friend System**: Complete friend management with database schema (friendships table) and full CRUD operations. Features include send/accept/reject friend requests with status tracking (pending/accepted/rejected), get friends list and pending requests (incoming and outgoing), check friendship status between users, remove friends functionality, all endpoints require JWT authentication, and bidirectional relationship support.

## External Dependencies
- **Database**: Neon PostgreSQL (serverless) with Drizzle Kit for schema management.
- **Authentication**: Replit Auth service.
- **UI/Icons**: Shadcn/UI, Lucide React icons.
- **Animations**: Framer Motion.
- **AI**: OpenAI API (for DALL-E 3 avatar generation, GPT-4o for personal signatures and customer service), Inworld AI TTS (for voice synthesis).

## API Documentation
Comprehensive backend API documentation has been created in `api-documentation.md` for mobile frontend integration. The API includes:
- Authentication endpoints (Replit Auth with session cookies)
- Event CRUD operations with rich metadata
- Event discovery and browsing with smart filtering
- RSVP and favorites management
- Real-time messaging with WebSocket support
- AI customer service with optional voice responses
- User profiles with AI-generated avatars and signatures
- Notification system for unread messages
- External API for programmatic event creation

Additional documentation includes:
- `external-api-docs.md` - External access requirements for mobile frontend integration outside of Replit environment, including production deployment considerations and mobile-specific implementation examples
- `group-chat-documentation.md` - Comprehensive Group Chat implementation summary including database schema, API endpoints, WebSocket communication, and mobile integration guide
- `mobile-group-chat-integration.md` - Step-by-step mobile integration guide for connecting to EventConnect Replit server's Group Chat functionality with code examples, error handling, and testing procedures

## Recent Changes
### 2025-09-17 - Historical Message Fetching with Cursor-Based Pagination
- **Cursor-Based Pagination**: Implemented composite cursor pagination using (createdAt, id) for deterministic and efficient historical message fetching
- **Dedicated Historical Cache**: Created separate LRU cache for historical messages with 5-minute TTL to optimize repeated queries  
- **API Endpoints**: Added `/api/events/:id/messages/history` and `/api/chats/private/:chatId/messages/history` for cursor-based historical fetching
- **Message Search**: Implemented full-text search for historical messages with relevance scoring and cursor pagination
- **Batch Fetching**: Added capability to fetch messages for multiple date ranges in parallel for timeline views
- **Cache Invalidation**: Wired automatic cache invalidation on message create/delete operations to maintain data consistency
- **Performance**: Cursor-based pagination provides O(1) lookup performance compared to O(n) for offset-based, crucial for large chat histories
- **TypeScript Fixes**: Fixed user field consistency issues by adding authProvider, googleId, facebookId fields throughout chat queries

### 2025-09-17 - Comprehensive Performance Optimizations & Server-Side Caching
- **Database Performance**: Added 9 critical indexes on frequently queried columns (date, category, isActive, organizerId, eventId, userId combinations) for dramatically improved query performance
- **Query Optimization**: Replaced redundant double queries (COUNT + SELECT) with single queries using COUNT() OVER() window functions, reducing database round trips by 50%
- **Response Logging**: Removed expensive JSON.stringify() of response bodies in logging middleware that was causing significant CPU overhead
- **Compression**: Implemented gzip compression for all responses above 1KB with optimized compression level for balanced performance
- **CORS Optimization**: Added maxAge to cache preflight responses for 1 hour, reducing OPTIONS requests
- **Caching Headers**: Added Cache-Control headers to read-only endpoints (5 minutes for event listings, 10 minutes for user profiles)
- **Pagination Limits**: Enforced consistent pagination limits across all endpoints (max 50-200 depending on endpoint) to prevent excessive data retrieval
- **Payload Optimization**: Created slim projections for list views, reducing payload size by ~70% by only returning essential fields
- **SQL Portability**: Fixed PostgreSQL-specific SQL casts to use portable CAST() syntax for better database compatibility
- **In-Memory LRU Caching**: Implemented comprehensive server-side caching using lru-cache library with:
  - Multiple cache layers: events (5min TTL), users (15min TTL), messages (30sec TTL), attendees (2min TTL)
  - Intelligent cache key generation based on query parameters
  - Cache invalidation on data mutations (create/update/delete operations)
  - Cache hit/miss tracking via X-Cache headers for monitoring
  - Max 500 entries per cache with automatic LRU eviction
  - Pattern-based cache invalidation for fine-grained control
  - Significant latency reduction for frequently accessed data

## Recent Changes
### 2025-09-16 - Private Chat API Routes Fixed
- Fixed private chat API routes returning HTML instead of JSON:
  - Added new routes matching client expectations: `/api/chats/private` (previously was `/api/private-chats`)
  - Implemented POST `/api/chats/private` for creating private chats with proper response format
  - Implemented GET `/api/chats/private` for listing all private chats with formatted user details
  - Added message routes: GET/POST `/api/chats/private/:chatId/messages`
  - Added mark as read route: PUT `/api/chats/private/:chatId/read`
  - Added delete chat route: DELETE `/api/chats/private/:chatId`
  - Maintained backward compatibility with old `/api/private-chats` routes
  - Fixed TypeScript errors by using correct storage interface methods

### 2025-09-15 - Friend System Implementation
- Implemented complete friend management system:
  - Added friendships table to database schema with pending/accepted/rejected status
  - Created storage functions for all friend operations (send/accept/reject requests, get friends list, etc.)
  - Added 8 new API endpoints for friend management, all requiring JWT authentication
  - Implemented bidirectional friendship support (friendship works both ways)
  - Tested all friend functionality successfully with comprehensive test script
- Friend system enables users to:
  - Send friend requests to other users
  - Accept or reject incoming friend requests
  - View their friends list
  - Check pending friend requests (incoming and outgoing)
  - Remove existing friends
  - Check friendship status with any user
### 2025-02-11 - JWT Authentication System Implementation
- Successfully converted from Replit Auth to JWT authentication for mobile app compatibility:
  - Implemented JWT login endpoint (`/api/auth/login`) that works with existing and new users
  - Added JWT token validation endpoint (`/api/auth/validate`)  
  - Updated frontend to use localStorage for token storage with Bearer token authentication
  - Modified API client (`queryClient.ts`) to include JWT tokens in all authenticated requests
  - Added logout functionality to clear tokens properly
  - Fixed landing page authentication flow to create demo users and store JWT tokens
- Updated API documentation with real Replit domain URL:
  - Base URL: `https://ba3a646f-8137-44c9-b8da-3a42bf8c9d50-00-12thhwhpja8kw.kirk.replit.dev`
  - Complete JWT authentication guide for mobile integration
  - Real test user credentials from existing database
  - Working cURL examples and JavaScript integration code
  - Mobile-specific setup instructions with error handling
- System now fully supports mobile app development with JWT tokens that expire in 7 days

### 2025-02-02 - Application Debugging and Sample Events
- Fixed TypeScript compilation errors in `server/routes.ts`:
  - Added missing `EventWithOrganizer` type import
  - Fixed null value handling in external event creation API
  - Added proper error type checking for OpenAI API responses
  - Fixed optional chaining for image generation response data
  - Added proper type assertion for TTS API responses
- Application now starts successfully and serves on port 5000
- Generated 57 comprehensive sample events for August 2025:
  - Created events across all categories: Music (8), Sports (10), Arts (8), Food (8), Tech (6), Community (5), Business (3), Education (4), Health & Wellness (5)
  - Each event includes rich details: descriptions, pricing, location info, requirements, contact details, and cancellation policies
  - Events scheduled throughout August with varied times, venues, and target audiences ranging from intimate workshops to large festivals
  - Used external API endpoint for event creation with sample data generator source tracking