import express from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const app = express();
app.use(express.json());

// Serve static files
app.use(express.static('client'));

// Simple auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, firstName, lastName } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const [user] = await db.insert(users).values({
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      username,
      password: hashedPassword,
      firstName,
      lastName,
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
      'simple-secret',
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user || !await bcrypt.compare(password, user.password!)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { 
        sub: user.id, 
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }, 
      'simple-secret',
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Serve the HTML for any non-API route
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'client' });
});

const port = 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple server running on port ${port}`);
});