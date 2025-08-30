import express from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import path from "path";

const app = express();
app.use(express.json());

// Serve static client files
app.use(express.static(path.resolve(import.meta.dirname, "..", "client")));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'eventconnect-simple-secret';

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Registration request:', req.body);
    const { username, password, firstName, lastName } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [user] = await db.insert(users).values({
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      username,
      password: hashedPassword,
      firstName: firstName || 'Demo',
      lastName: lastName || 'User',
      email: username + '@demo.com'
    }).returning();
    
    // Generate JWT
    const token = jwt.sign(
      { 
        sub: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }, 
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ User registered:', user.username);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      } 
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Registration failed: ' + error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login request:', req.body);
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const token = jwt.sign(
      { 
        sub: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }, 
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('✅ User logged in:', user.username);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Login failed: ' + error.message });
  }
});

// Token validation endpoint
app.get('/api/auth/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const [user] = await db.select().from(users).where(eq(users.id, decoded.sub)).limit(1);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.json({ 
      user: { 
        id: user.id, 
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      } 
    });
  } catch (error) {
    console.error('❌ Token validation error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.resolve(import.meta.dirname, "..", "client", "index.html"));
});

const port = 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 EventConnect server running on port ${port}`);
  console.log(`📱 Access your PWA at: https://local-event-connect.replit.app`);
});