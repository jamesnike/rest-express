// Production server wrapper to run the app with proper configuration
// This ensures Vite and all services work correctly in production

// Set NODE_ENV to development to use Vite properly
process.env.NODE_ENV = 'development';

// Import and run the main server
import('./index.js');