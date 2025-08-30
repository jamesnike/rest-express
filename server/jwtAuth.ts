import jwt from 'jsonwebtoken';
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

if (!process.env.JWT_SECRET) {
  throw new Error("Environment variable JWT_SECRET not provided");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  sub: string; // user id
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Express.Request {
  user: {
    claims: JWTPayload;
  };
}

export function generateToken(userPayload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(userPayload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'eventconnect-api'
  } as any);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function setupJWTAuth(app: Express) {
  // Username/password login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Validate user credentials
      const user = await storage.validatePassword(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Generate JWT token
      const token = generateToken({
        sub: user.id,
        email: user.email || '',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileImageUrl: user.profileImageUrl || undefined,
      });

      res.json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl
        }
      });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, firstName, lastName, email } = req.body;
      
      if (!username || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Username, password, first name, and last name are required" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmailUser = await storage.getUserByEmail(email);
        if (existingEmailUser) {
          return res.status(409).json({ message: "Email already exists" });
        }
      }

      // Create new user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const user = await storage.createUser({
        id: userId,
        username,
        password,
        firstName,
        lastName,
        email,
        animeAvatarSeed: `seed_${userId}`,
        interests: [],
        personality: []
      });

      // Generate JWT token
      const token = generateToken({
        sub: user.id,
        email: user.email || '',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileImageUrl: user.profileImageUrl || undefined,
      });

      res.status(201).json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl
        }
      });
    } catch (error) {
      console.error("Error in registration:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Legacy simple login endpoint for existing functionality
  app.post('/api/auth/login-simple', async (req, res) => {
    try {
      const { email, firstName, lastName, profileImageUrl } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Try to get existing user first
      let user = await storage.getUserByEmail(email);
      let userId;
      
      if (user) {
        // User exists, use existing ID and update other fields
        userId = user.id;
        await storage.upsertUser({
          id: userId,
          email,
          firstName,
          lastName,
          profileImageUrl,
          animeAvatarSeed: user.animeAvatarSeed || `seed_${userId}`,
        });
      } else {
        // Create new user
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await storage.upsertUser({
          id: userId,
          email,
          firstName,
          lastName,
          profileImageUrl,
          animeAvatarSeed: `seed_${userId}`,
        });
      }

      // Generate JWT token
      const token = generateToken({
        sub: userId,
        email,
        firstName,
        lastName,
        profileImageUrl,
      });

      res.json({ 
        token,
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          profileImageUrl
        }
      });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Token validation endpoint
  app.post('/api/auth/validate', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Get fresh user data from database
      const user = await storage.getUser(payload.sub);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({ 
        valid: true,
        user 
      });
    } catch (error) {
      console.error("Error validating token:", error);
      res.status(500).json({ message: "Token validation failed" });
    }
  });

  // OAuth login endpoint
  app.post('/api/auth/oauth', async (req, res) => {
    try {
      const { oauthProvider, oauthId, email, firstName, lastName, profileImageUrl } = req.body;
      
      if (!oauthProvider || !oauthId || !email) {
        return res.status(400).json({ message: "OAuth provider, ID, and email are required" });
      }

      // Check if user already exists with this OAuth account
      let user = await storage.getUserByOAuth(oauthProvider, oauthId);
      
      if (!user) {
        // Check if user exists with this email from different auth method
        const existingUser = await storage.getUserByEmail(email);
        
        if (existingUser) {
          // Link OAuth account to existing email-based account
          await storage.upsertUser({
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            firstName: firstName || existingUser.firstName,
            lastName: lastName || existingUser.lastName,
            profileImageUrl: profileImageUrl || existingUser.profileImageUrl,
            oauthProvider,
            oauthId,
            animeAvatarSeed: existingUser.animeAvatarSeed,
            interests: existingUser.interests,
            personality: existingUser.personality,
            aiSignature: existingUser.aiSignature,
          });
          user = existingUser;
        } else {
          // Create new OAuth user
          user = await storage.createOAuthUser({
            oauthProvider,
            oauthId,
            email,
            firstName: firstName || 'User',
            lastName: lastName || 'OAuth',
            profileImageUrl,
          });
        }
      }

      // Generate JWT token
      const token = generateToken({
        sub: user.id,
        email: user.email || '',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileImageUrl: user.profileImageUrl || undefined,
      });

      res.json({ 
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl
        }
      });
    } catch (error) {
      console.error("Error in OAuth login:", error);
      res.status(500).json({ message: "OAuth login failed" });
    }
  });

  // Refresh token endpoint
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Generate new token
      const newToken = generateToken({
        sub: payload.sub,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        profileImageUrl: payload.profileImageUrl,
      });

      res.json({ token: newToken });
    } catch (error) {
      console.error("Error refreshing token:", error);
      res.status(500).json({ message: "Token refresh failed" });
    }
  });
}

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authorization header required" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);
    
    if (!payload) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Verify user still exists in database
    const user = await storage.getUser(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user info to request
    req.user = {
      claims: payload
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};

// Optional auth middleware - doesn't fail if no token provided
export const optionalAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (payload) {
      const user = await storage.getUser(payload.sub);
      if (user) {
        req.user = {
          claims: payload
        };
      }
    }

    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    req.user = null;
    next();
  }
};