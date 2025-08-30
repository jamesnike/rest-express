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