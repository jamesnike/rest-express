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