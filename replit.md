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

## Recent Changes
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