import express from "express";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import path from "path";

const app = express();
app.use(express.json());

// Disable all caching
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

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
    res.status(500).json({ message: 'Registration failed: ' + (error as Error).message });
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
    res.status(500).json({ message: 'Login failed: ' + (error as Error).message });
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

// Test login page without Vite interference - random route to avoid cache
app.get('/auth-demo-12345', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>EventConnect Login Test</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;font-family:Arial;background:#000;">
    <div style="width:100%;height:100vh;background:linear-gradient(45deg,#e74c3c,#f39c12);color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;">
        <h1 style="font-size:2.5rem;margin-bottom:1rem;">🔥 Login Test Page</h1>
        <p style="font-size:1.2rem;margin-bottom:2rem;">Testing JWT Without Cache Issues</p>
        
        <div style="background:rgba(0,0,0,0.3);border-radius:15px;padding:25px;max-width:350px;width:100%;">
            <button onclick="testRegister()" style="width:100%;background:#27ae60;color:white;border:none;padding:15px;font-size:16px;border-radius:8px;cursor:pointer;margin-bottom:15px;font-weight:600;">
                🚀 Create Test User
            </button>
            
            <div style="margin:15px 0;text-align:center;opacity:0.7;">Username & Password Login:</div>
            
            <input type="text" id="username" placeholder="Username" style="width:100%;padding:12px;margin-bottom:10px;border:none;border-radius:6px;font-size:16px;box-sizing:border-box;">
            <input type="password" id="password" placeholder="Password" style="width:100%;padding:12px;margin-bottom:15px;border:none;border-radius:6px;font-size:16px;box-sizing:border-box;">
            
            <button onclick="testLogin()" style="width:100%;background:#3498db;color:white;border:none;padding:15px;font-size:16px;border-radius:8px;cursor:pointer;font-weight:600;">
                🔑 Login
            </button>
            
            <div id="result" style="margin-top:15px;padding:10px;background:rgba(255,255,255,0.1);border-radius:8px;display:none;"></div>
        </div>
    </div>
    
    <script>
        console.log('Login test page loaded');
        
        async function testRegister() {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '⏳ Creating account...';
            
            try {
                const username = 'user' + Date.now().toString().slice(-6);
                
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password: 'test123',
                        firstName: 'Test',
                        lastName: 'User'
                    })
                });
                
                const data = await response.json();
                console.log('Register response:', data);
                
                if (data.token) {
                    resultDiv.innerHTML = '<div style="color:#2ecc71;font-weight:600;">✅ Account Created!</div><div>Username: ' + data.user.username + '</div><div style="font-size:0.9rem;margin-top:5px;">Token: ' + data.token.substring(0, 30) + '...</div>';
                } else {
                    resultDiv.innerHTML = '❌ Failed: ' + JSON.stringify(data);
                }
            } catch (error) {
                resultDiv.innerHTML = '❌ Error: ' + error.message;
            }
        }
        
        async function testLogin() {
            const resultDiv = document.getElementById('result');
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '⚠️ Please enter username and password';
                return;
            }
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '⏳ Logging in...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                console.log('Login response:', data);
                
                if (data.token) {
                    resultDiv.innerHTML = '<div style="color:#2ecc71;font-weight:600;">✅ Login Success!</div><div>Welcome: ' + data.user.username + '</div><div style="font-size:0.9rem;margin-top:5px;">Token: ' + data.token.substring(0, 30) + '...</div>';
                } else {
                    resultDiv.innerHTML = '❌ Login failed: ' + data.message;
                }
            } catch (error) {
                resultDiv.innerHTML = '❌ Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
  `);
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