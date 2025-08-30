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

// Test route with OAuth buttons
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
                    showResult('✅ Demo account created! Username: ' + data.user.username, true);
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
                    showResult('✅ Login successful!', true);
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
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
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
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                } else {
                    showResult('❌ Facebook login failed: ' + data.message, false);
                }
            } catch (error) {
                console.error('Facebook login error:', error);
                showResult('❌ Facebook login failed: ' + error.message, false);
            }
        }
    </script>
</body>
</html>
  `);
});

const httpServer = createServer(app);

// Setup Vite after creating server
const server = await import("./vite");
await server.setupVite(app, httpServer);

httpServer.listen(5000, '0.0.0.0', () => {
  console.log("🚀 EventConnect server running on port 5000");
  console.log("📱 Access your PWA at: https://local-event-connect.replit.app");
});

export default app;