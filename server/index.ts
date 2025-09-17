import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Enable gzip/brotli compression for all responses
// This must be early in the middleware stack to compress all responses
app.use(compression({
  // Enable compression for all responses above 1kb
  threshold: 1024,
  // Use maximum compression level in production (6 is default, 9 is max)
  level: process.env.NODE_ENV === 'production' ? 9 : 6
}));

// Optimized CORS configuration to reduce preflight requests
app.use(cors({
  origin: true, // Allow all origins (you can restrict this in production)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  // Cache preflight responses for 1 hour to reduce OPTIONS requests
  maxAge: 3600,
  // Allow browsers to expose these headers to JS
  exposedHeaders: ['Content-Range', 'X-Total-Count']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Optimized logging middleware - removed expensive response body serialization
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log API requests with basic info (no response body to avoid serialization overhead)
    if (path.startsWith("/api")) {
      const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
