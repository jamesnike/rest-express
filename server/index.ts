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

// Test the new mobile login UI
app.get('/mobile-login-test', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>EventConnect - Mobile Login</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px 30px;
            max-width: 380px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            font-size: 2rem;
            color: #333;
            margin-bottom: 5px;
        }
        .logo p {
            color: #666;
            font-size: 0.9rem;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .form-group input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 15px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        .btn-secondary {
            background: #f8f9fa;
            color: #333;
            border: 2px solid #e1e5e9;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 12px;
            display: none;
        }
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🎯 EventConnect</h1>
            <p>Mobile Event Discovery</p>
        </div>
        
        <h3 style="margin-bottom: 20px; color: #333; text-align: center;">Test Mobile Login UI</h3>
        
        <div class="form-group">
            <label>Username</label>
            <input type="text" id="username" placeholder="Enter username">
        </div>
        <div class="form-group">
            <label>Password</label>
            <input type="password" id="password" placeholder="Enter password">
        </div>
        
        <button class="btn btn-primary" onclick="doLogin()">
            🔑 Test Login
        </button>
        <button class="btn btn-secondary" onclick="createDemo()">
            ⚡ Create Demo User
        </button>
        
        <div id="result" class="result"></div>
    </div>
    
    <script>
        function showResult(message, isSuccess) {
            const resultDiv = document.getElementById('result');
            resultDiv.className = 'result ' + (isSuccess ? 'success' : 'error');
            resultDiv.innerHTML = message;
            resultDiv.style.display = 'block';
        }
        
        async function createDemo() {
            showResult('⏳ Creating demo account...', true);
            
            const username = 'demo' + Date.now().toString().slice(-6);
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password: 'demo123',
                        firstName: 'Demo',
                        lastName: 'User'
                    })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult(\`
                        <div style="font-weight:600;margin-bottom:10px;">✅ Demo Account Created!</div>
                        <div><strong>Username:</strong> \${data.user.username}</div>
                        <div><strong>Password:</strong> demo123</div>
                        <div style="font-size:0.85rem;margin-top:8px;opacity:0.8;">Now try logging in above!</div>
                    \`, true);
                    
                    // Auto-fill the form
                    document.getElementById('username').value = data.user.username;
                    document.getElementById('password').value = 'demo123';
                } else {
                    showResult('❌ Demo creation failed: ' + data.message, false);
                }
            } catch (error) {
                showResult('❌ Error: ' + error.message, false);
            }
        }
        
        async function doLogin() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showResult('⚠️ Please enter username and password', false);
                return;
            }
            
            showResult('⏳ Signing you in...', true);
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult(\`
                        <div style="font-weight:600;margin-bottom:10px;">✅ Login Successful!</div>
                        <div><strong>Welcome:</strong> \${data.user.firstName || data.user.username}</div>
                        <div style="font-size:0.85rem;margin-top:8px;opacity:0.8;">JWT Token: \${data.token.substring(0, 30)}...</div>
                        <div style="font-size:0.85rem;margin-top:5px;opacity:0.8;">Ready for localStorage integration!</div>
                    \`, true);
                } else {
                    showResult('❌ Login failed: ' + data.message, false);
                }
            } catch (error) {
                showResult('❌ Error: ' + error.message, false);
            }
        }
    </script>
</body>
</html>
  `);
});

// Hybrid OAuth + Password Login System
app.get('/auth-demo-12345', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>EventConnect - Hybrid Authentication</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script type="module">
        import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

        const firebaseConfig = {
            apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
            authDomain: "${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com",
            projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
            storageBucket: "${process.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app",
            appId: "${process.env.VITE_FIREBASE_APP_ID}",
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const googleProvider = new GoogleAuthProvider();
        const facebookProvider = new FacebookAuthProvider();

        window.firebaseAuth = { auth, googleProvider, facebookProvider, signInWithPopup };
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 0;
        }
        .app {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        .login-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-card {
            background: white;
            border-radius: 20px;
            padding: 40px 30px;
            max-width: 380px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .oauth-section {
            margin-bottom: 30px;
            padding-bottom: 25px;
            border-bottom: 2px solid #f0f0f0;
        }
        .oauth-title {
            text-align: center;
            margin-bottom: 20px;
            color: #666;
            font-size: 0.9rem;
            font-weight: 600;
        }
        .oauth-btn {
            width: 100%;
            padding: 16px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 12px;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        .oauth-btn:hover {
            border-color: #d0d7de;
            transform: translateY(-1px);
        }
        .google-btn {
            color: #4285f4;
            border-color: #4285f4;
        }
        .facebook-btn {
            color: #1877f2;
            border-color: #1877f2;
        }
        .divider {
            text-align: center;
            margin: 25px 0;
            position: relative;
            color: #999;
            font-size: 0.85rem;
        }
        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #e1e5e9;
            z-index: 1;
        }
        .divider span {
            background: white;
            padding: 0 15px;
            position: relative;
            z-index: 2;
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            font-size: 2rem;
            color: #333;
            margin-bottom: 5px;
        }
        .logo p {
            color: #666;
            font-size: 0.9rem;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .form-group input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 15px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        .btn-secondary {
            background: #f8f9fa;
            color: #333;
            border: 2px solid #e1e5e9;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 12px;
            display: none;
        }
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .dashboard {
            display: none;
            padding: 20px;
            text-align: center;
        }
        .dashboard.active {
            display: block;
        }
        .dashboard h2 {
            color: white;
            margin-bottom: 20px;
        }
        .dashboard .user-info {
            background: rgba(255,255,255,0.2);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            color: white;
        }
        .logout-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 12px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="app">
        <!-- Login View -->
        <div id="login-view" class="login-container">
            <div class="login-card">
                <div class="logo">
                    <h1>🎯 EventConnect</h1>
                    <p>Mobile Event Discovery</p>
                </div>
                
                <!-- OAuth Section -->
                <div class="oauth-section">
                    <div class="oauth-title">Quick Sign In</div>
                    <button class="oauth-btn google-btn" onclick="handleGoogleLogin()">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        Continue with Google
                    </button>
                    <button class="oauth-btn facebook-btn" onclick="handleFacebookLogin()">
                        <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Continue with Facebook
                    </button>
                </div>
                
                <div class="divider">
                    <span>or sign in with username</span>
                </div>
                
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="username" placeholder="Enter your username">
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" placeholder="Enter your password">
                </div>
                
                <button class="btn btn-primary" onclick="handleLogin()">
                    🔑 Sign In
                </button>
                <button class="btn btn-secondary" onclick="createDemo()">
                    ⚡ Create Demo Account
                </button>
                
                <div id="result" class="result"></div>
            </div>
        </div>
        
        <!-- Dashboard View (after login) -->
        <div id="dashboard-view" class="dashboard">
            <h2>🎉 Welcome to EventConnect!</h2>
            <div class="user-info">
                <div id="user-welcome"></div>
                <div style="font-size: 0.9rem; margin-top: 10px; opacity: 0.8;">✅ JWT Login with localStorage persistence</div>
            </div>
            <button class="logout-btn" onclick="handleLogout()">
                🚪 Sign Out
            </button>
        </div>
    </div>
    
    <script>
        console.log('🔥 EventConnect Mobile App with localStorage loaded!');
        
        // Check for existing login on page load
        window.addEventListener('load', checkExistingLogin);
        
        function showResult(message, isSuccess) {
            const resultDiv = document.getElementById('result');
            resultDiv.className = 'result ' + (isSuccess ? 'success' : 'error');
            resultDiv.innerHTML = message;
            resultDiv.style.display = 'block';
        }
        
        function showDashboard(user) {
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('dashboard-view').classList.add('active');
            document.getElementById('user-welcome').innerHTML = \`
                <div style="font-weight: 600; margin-bottom: 5px;">Welcome back!</div>
                <div>\${user.firstName || user.username}</div>
            \`;
        }
        
        function showLogin() {
            document.getElementById('dashboard-view').classList.remove('active');
            document.getElementById('login-view').style.display = 'flex';
        }
        
        function saveToken(token, user) {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user_data', JSON.stringify(user));
            console.log('✅ Token saved to localStorage');
        }
        
        function clearToken() {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            console.log('✅ Token cleared from localStorage');
        }
        
        async function checkExistingLogin() {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');
            
            if (!token || !userData) {
                console.log('ℹ️ No existing login found');
                return;
            }
            
            try {
                // Validate token with server
                const response = await fetch('/api/auth/validate', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                    const user = JSON.parse(userData);
                    console.log('✅ Auto-login successful:', user.username);
                    showDashboard(user);
                } else {
                    console.log('⚠️ Token expired, clearing storage');
                    clearToken();
                }
            } catch (error) {
                console.log('⚠️ Token validation failed, clearing storage');
                clearToken();
            }
        }
        
        async function createDemo() {
            showResult('⏳ Creating demo account...', true);
            
            const username = 'demo' + Date.now().toString().slice(-6);
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password: 'demo123',
                        firstName: 'Demo',
                        lastName: 'User'
                    })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult(\`
                        <div style="font-weight:600;margin-bottom:10px;">✅ Demo Account Created!</div>
                        <div><strong>Username:</strong> \${data.user.username}</div>
                        <div><strong>Password:</strong> demo123</div>
                        <div style="font-size:0.85rem;margin-top:8px;">Auto-logging you in...</div>
                    \`, true);
                    
                    // Save to localStorage and show dashboard
                    saveToken(data.token, data.user);
                    setTimeout(() => showDashboard(data.user), 1500);
                } else {
                    showResult('❌ Demo creation failed: ' + data.message, false);
                }
            } catch (error) {
                showResult('❌ Error: ' + error.message, false);
            }
        }
        
        async function handleLogin() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showResult('⚠️ Please enter username and password', false);
                return;
            }
            
            showResult('⏳ Signing you in...', true);
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult('✅ Login successful! Redirecting...', true);
                    
                    // Save to localStorage and show dashboard
                    saveToken(data.token, data.user);
                    setTimeout(() => showDashboard(data.user), 1500);
                } else {
                    showResult('❌ Login failed: ' + data.message, false);
                }
            } catch (error) {
                showResult('❌ Error: ' + error.message, false);
            }
        }
        
        // OAuth login functions
        async function handleGoogleLogin() {
            showResult('⏳ Connecting to Google...', true);
            
            try {
                const { auth, googleProvider, signInWithPopup } = window.firebaseAuth;
                const result = await signInWithPopup(auth, googleProvider);
                const user = result.user;
                
                console.log('Google login result:', user);
                
                // Send OAuth data to our backend to get JWT token
                const response = await fetch('/api/auth/oauth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        oauthProvider: 'google',
                        oauthId: user.uid,
                        email: user.email,
                        firstName: user.displayName?.split(' ')[0] || 'User',
                        lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Google',
                        profileImageUrl: user.photoURL
                    })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult('✅ Google login successful!', true);
                    saveToken(data.token, data.user);
                    setTimeout(() => showDashboard(data.user), 1500);
                } else {
                    showResult('❌ Google login failed: ' + data.message, false);
                }
            } catch (error) {
                console.error('Google login error:', error);
                showResult('❌ Google login failed: ' + error.message, false);
            }
        }
        
        async function handleFacebookLogin() {
            showResult('⏳ Connecting to Facebook...', true);
            
            try {
                const { auth, facebookProvider, signInWithPopup } = window.firebaseAuth;
                const result = await signInWithPopup(auth, facebookProvider);
                const user = result.user;
                
                console.log('Facebook login result:', user);
                
                // Send OAuth data to our backend to get JWT token
                const response = await fetch('/api/auth/oauth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        oauthProvider: 'facebook',
                        oauthId: user.uid,
                        email: user.email,
                        firstName: user.displayName?.split(' ')[0] || 'User',
                        lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Facebook',
                        profileImageUrl: user.photoURL
                    })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult('✅ Facebook login successful!', true);
                    saveToken(data.token, data.user);
                    setTimeout(() => showDashboard(data.user), 1500);
                } else {
                    showResult('❌ Facebook login failed: ' + data.message, false);
                }
            } catch (error) {
                console.error('Facebook login error:', error);
                showResult('❌ Facebook login failed: ' + error.message, false);
            }
        }

        function handleLogout() {
            clearToken();
            showLogin();
            showResult('✅ Signed out successfully', true);
        }
    </script>
</body>
</html>
  `);
});

// Main login page (no localStorage yet)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>EventConnect - Mobile Login</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px 30px;
            max-width: 380px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            font-size: 2rem;
            color: #333;
            margin-bottom: 5px;
        }
        .logo p {
            color: #666;
            font-size: 0.9rem;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .form-group input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 15px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }
        .btn-secondary {
            background: #f8f9fa;
            color: #333;
            border: 2px solid #e1e5e9;
        }
        .btn-secondary:hover {
            background: #e9ecef;
        }
        .divider {
            text-align: center;
            margin: 20px 0;
            color: #666;
            font-size: 0.9rem;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 12px;
            display: none;
        }
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .tabs {
            display: flex;
            margin-bottom: 25px;
            background: #f8f9fa;
            border-radius: 12px;
            padding: 4px;
        }
        .tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s;
        }
        .tab.active {
            background: white;
            color: #667eea;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🎯 EventConnect</h1>
            <p>Mobile Event Discovery</p>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('login')">Login</div>
            <div class="tab" onclick="showTab('register')">Sign Up</div>
        </div>
        
        <!-- Login Tab -->
        <div id="login-tab" class="tab-content active">
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="login-username" placeholder="Enter your username">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="login-password" placeholder="Enter your password">
            </div>
            <button class="btn btn-primary" onclick="handleLogin()">
                🔑 Sign In
            </button>
            <button class="btn btn-secondary" onclick="createDemoUser()">
                ⚡ Try Demo Account
            </button>
        </div>
        
        <!-- Register Tab -->
        <div id="register-tab" class="tab-content">
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="reg-username" placeholder="Choose a username">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="reg-password" placeholder="Create a password">
            </div>
            <div class="form-group">
                <label>First Name</label>
                <input type="text" id="reg-firstname" placeholder="Your first name">
            </div>
            <div class="form-group">
                <label>Last Name</label>
                <input type="text" id="reg-lastname" placeholder="Your last name">
            </div>
            <button class="btn btn-primary" onclick="handleRegister()">
                🚀 Create Account
            </button>
        </div>
        
        <div id="result" class="result"></div>
    </div>
    
    <script>
        console.log('EventConnect Mobile Login loaded');
        
        function showTab(tabName) {
            // Hide all tabs
            document.getElementById('login-tab').classList.remove('active');
            document.getElementById('register-tab').classList.remove('active');
            
            // Show selected tab
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Update tab buttons
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');
            
            // Clear results
            document.getElementById('result').style.display = 'none';
        }
        
        function showResult(message, isSuccess) {
            const resultDiv = document.getElementById('result');
            resultDiv.className = 'result ' + (isSuccess ? 'success' : 'error');
            resultDiv.innerHTML = message;
            resultDiv.style.display = 'block';
        }
        
        async function createDemoUser() {
            showResult('⏳ Creating demo account...', true);
            
            const username = 'demo' + Date.now().toString().slice(-6);
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password: 'demo123',
                        firstName: 'Demo',
                        lastName: 'User'
                    })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult(\`
                        <div style="font-weight:600;margin-bottom:10px;">✅ Demo Account Created!</div>
                        <div><strong>Username:</strong> \${data.user.username}</div>
                        <div><strong>Password:</strong> demo123</div>
                        <div style="font-size:0.85rem;margin-top:8px;opacity:0.8;">You can now login with these credentials!</div>
                    \`, true);
                } else {
                    showResult('❌ Demo creation failed: ' + data.message, false);
                }
            } catch (error) {
                showResult('❌ Error: ' + error.message, false);
            }
        }
        
        async function handleRegister() {
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            const firstName = document.getElementById('reg-firstname').value;
            const lastName = document.getElementById('reg-lastname').value;
            
            if (!username || !password) {
                showResult('⚠️ Please enter username and password', false);
                return;
            }
            
            showResult('⏳ Creating your account...', true);
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, firstName, lastName })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult(\`
                        <div style="font-weight:600;margin-bottom:10px;">✅ Account Created Successfully!</div>
                        <div><strong>Welcome:</strong> \${data.user.firstName || data.user.username}</div>
                        <div style="font-size:0.85rem;margin-top:8px;opacity:0.8;">You're now signed in! Token expires in 7 days.</div>
                    \`, true);
                } else {
                    showResult('❌ Registration failed: ' + data.message, false);
                }
            } catch (error) {
                showResult('❌ Error: ' + error.message, false);
            }
        }
        
        async function handleLogin() {
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            if (!username || !password) {
                showResult('⚠️ Please enter username and password', false);
                return;
            }
            
            showResult('⏳ Signing you in...', true);
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showResult(\`
                        <div style="font-weight:600;margin-bottom:10px;">✅ Welcome Back!</div>
                        <div><strong>Signed in as:</strong> \${data.user.firstName || data.user.username}</div>
                        <div style="font-size:0.85rem;margin-top:8px;opacity:0.8;">Login successful! Token expires in 7 days.</div>
                    \`, true);
                } else {
                    showResult('❌ Login failed: ' + data.message, false);
                }
            } catch (error) {
                showResult('❌ Error: ' + error.message, false);
            }
        }
    </script>
</body>
</html>
  `);
});

// Super unique route to bypass all caching
app.get('/jwt-login-' + Date.now(), (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>EventConnect JWT Login</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;font-family:Arial;background:linear-gradient(45deg,#ff6b6b,#4ecdc4);color:white;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;">
    <div style="background:white;color:#333;border-radius:20px;padding:30px;max-width:350px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,0.2);">
        <h1 style="text-align:center;margin-bottom:20px;color:#333;">🎯 EventConnect</h1>
        <p style="text-align:center;margin-bottom:30px;color:#666;">JWT Login System</p>
        
        <button onclick="quickDemo()" style="width:100%;background:#4ecdc4;color:white;border:none;padding:15px;border-radius:10px;font-size:16px;margin-bottom:15px;cursor:pointer;font-weight:600;">
            ⚡ Quick Demo Login
        </button>
        
        <div style="margin:15px 0;text-align:center;color:#888;">- OR -</div>
        
        <input type="text" id="user" placeholder="Username" style="width:100%;padding:12px;margin-bottom:10px;border:2px solid #eee;border-radius:8px;font-size:16px;">
        <input type="password" id="pass" placeholder="Password" style="width:100%;padding:12px;margin-bottom:15px;border:2px solid #eee;border-radius:8px;font-size:16px;">
        
        <button onclick="testLogin()" style="width:100%;background:#ff6b6b;color:white;border:none;padding:15px;border-radius:10px;font-size:16px;margin-bottom:10px;cursor:pointer;font-weight:600;">
            🔑 Login
        </button>
        
        <div id="status" style="margin-top:15px;padding:10px;border-radius:8px;display:none;"></div>
    </div>
    
    <script>
        console.log('🔥 Fresh JWT login page loaded!');
        
        function showStatus(msg, success) {
            const div = document.getElementById('status');
            div.style.display = 'block';
            div.style.background = success ? '#d4edda' : '#f8d7da';
            div.style.color = success ? '#155724' : '#721c24';
            div.innerHTML = msg;
        }
        
        async function quickDemo() {
            showStatus('⏳ Creating demo account...', true);
            
            const username = 'demo' + Math.random().toString(36).substr(2, 6);
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password: 'demo123',
                        firstName: 'Demo',
                        lastName: 'User'
                    })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showStatus(\`✅ Success! Username: \${data.user.username} | Password: demo123\`, true);
                    document.getElementById('user').value = data.user.username;
                    document.getElementById('pass').value = 'demo123';
                } else {
                    showStatus('❌ Demo failed: ' + data.message, false);
                }
            } catch (error) {
                showStatus('❌ Error: ' + error.message, false);
            }
        }
        
        async function testLogin() {
            const username = document.getElementById('user').value;
            const password = document.getElementById('pass').value;
            
            if (!username || !password) {
                showStatus('⚠️ Enter username and password', false);
                return;
            }
            
            showStatus('⏳ Logging in...', true);
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (data.token) {
                    showStatus(\`✅ Login Success! Welcome \${data.user.username}. JWT Token: \${data.token.substring(0, 25)}...\`, true);
                } else {
                    showStatus('❌ Login failed: ' + data.message, false);
                }
            } catch (error) {
                showStatus('❌ Error: ' + error.message, false);
            }
        }
    </script>
</body>
</html>
  `);
});

// Print the route for user
console.log('🔥 Test JWT at: https://local-event-connect.replit.app/jwt-login-' + Date.now());

// Temporarily disable static files to test login
// app.use(express.static(path.resolve(import.meta.dirname, "..", "client")));

// Catch-all for testing (temporarily disabled)
// app.get('*', (req, res) => {
//   res.sendFile(path.resolve(import.meta.dirname, "..", "client", "index.html"));
// });

const port = 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 EventConnect server running on port ${port}`);
  console.log(`📱 Access your PWA at: https://local-event-connect.replit.app`);
});