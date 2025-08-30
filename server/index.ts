import express from "express";
import { createServer, type Server } from "http";
import { setupVite } from "./vite";
import { storage } from "./storage";
import { generateToken, verifyToken } from "./jwtAuth";

const app = express();
app.use(express.json());

console.log("🔥 Test JWT at: https://local-event-connect.replit.app/jwt-login-" + Date.now());

// JWT Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, firstName, lastName } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    if (await storage.getUserByUsername(username)) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const user = await storage.createUser({
      username,
      password,
      firstName,
      lastName,
      email: `${username}@example.com`,
    });

    const token = generateToken({
      sub: user.id,
      email: user.email || '',
      firstName: user.firstName,
      lastName: user.lastName,
    });

    res.json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed: ' + (error as Error).message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await storage.validatePassword(username, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = generateToken({
      sub: user.id,
      email: user.email || '',
      firstName: user.firstName,
      lastName: user.lastName,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed: ' + (error as Error).message });
  }
});

app.post('/api/auth/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// OAuth Authentication Route
app.post('/api/auth/oauth', async (req, res) => {
  try {
    const { oauthProvider, oauthId, email, firstName, lastName, profileImageUrl } = req.body;
    
    if (!oauthProvider || !oauthId) {
      return res.status(400).json({ message: "OAuth provider and ID required" });
    }

    // Check if user already exists with this OAuth account
    let user = await storage.getUserByOAuth(oauthProvider, oauthId);
    
    if (!user) {
      // Create new user with OAuth data
      user = await storage.createUser({
        email: email || `${oauthId}@${oauthProvider}.oauth`,
        firstName: firstName || 'User',
        lastName: lastName || oauthProvider.charAt(0).toUpperCase() + oauthProvider.slice(1),
        profileImageUrl,
        oauthProvider,
        oauthId,
      });
    }

    const token = generateToken({
      sub: user.id,
      email: user.email || '',
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    });

    res.json({
      message: 'OAuth login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (error) {
    console.error('OAuth login error:', error);
    res.status(500).json({ message: 'OAuth login failed: ' + (error as Error).message });
  }
});

// React app handles all authentication UI

const httpServer = createServer(app);

// Setup Vite after creating server
const server = await import("./vite");
await server.setupVite(app, httpServer);

httpServer.listen(5000, '0.0.0.0', () => {
  console.log("🚀 EventConnect server running on port 5000");
  console.log("📱 Access your PWA at: https://local-event-connect.replit.app");
});

export default app;