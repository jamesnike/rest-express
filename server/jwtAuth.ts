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
  });
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
  // Simple login endpoint that creates users and returns JWT
  app.post('/api/auth/login', async (req, res) => {
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