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

// IMPORTANT: Custom routes MUST be defined BEFORE Vite middleware
// Create a unique route that bypasses all caching
const bypassRoute = '/react-oauth-' + Date.now();
console.log('🚀 Try this URL to see React with OAuth: https://local-event-connect.replit.app' + bypassRoute);

app.get(bypassRoute, (req, res) => {
  const reactHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
    <title>EventConnect - Fresh React App ${Date.now()}</title>
    <script type="module">
      import React, { useState } from 'https://esm.sh/react@18';
      import ReactDOM from 'https://esm.sh/react-dom@18/client';
      
      function App() {
        const [showOAuth, setShowOAuth] = useState(true);
        
        return React.createElement('div', {
          style: {
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            fontFamily: 'system-ui, sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }, 
          React.createElement('div', {
            style: {
              background: 'white',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
            }
          },
            React.createElement('h1', {
              style: { textAlign: 'center', marginBottom: '30px', color: '#333' }
            }, '🎯 EventConnect React'),
            React.createElement('p', {
              style: { textAlign: 'center', color: '#666', marginBottom: '30px' }
            }, 'Fresh React App - OAuth Integration'),
            
            showOAuth && React.createElement('div', {
              style: { marginBottom: '30px' }
            },
              React.createElement('h3', {
                style: { textAlign: 'center', marginBottom: '20px', color: '#666', fontSize: '0.9rem' }
              }, 'Quick Sign In'),
              React.createElement('button', {
                style: {
                  width: '100%',
                  padding: '16px',
                  marginBottom: '12px',
                  border: '2px solid #4285f4',
                  borderRadius: '12px',
                  background: 'white',
                  color: '#4285f4',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }
              }, '🔵 Continue with Google'),
              React.createElement('button', {
                style: {
                  width: '100%',
                  padding: '16px',
                  marginBottom: '20px',
                  border: '2px solid #1877f2',
                  borderRadius: '12px',
                  background: 'white',
                  color: '#1877f2',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }
              }, '🔷 Continue with Facebook')
            ),
            
            React.createElement('div', {
              style: { textAlign: 'center', margin: '20px 0', color: '#999' }
            }, '── or sign in with username ──'),
            
            React.createElement('input', {
              type: 'text',
              placeholder: 'Username',
              style: {
                width: '100%',
                padding: '15px',
                marginBottom: '15px',
                border: '2px solid #e1e5e9',
                borderRadius: '12px',
                fontSize: '16px'
              }
            }),
            React.createElement('input', {
              type: 'password',
              placeholder: 'Password',
              style: {
                width: '100%',
                padding: '15px',
                marginBottom: '20px',
                border: '2px solid #e1e5e9',
                borderRadius: '12px',
                fontSize: '16px'
              }
            }),
            React.createElement('button', {
              style: {
                width: '100%',
                padding: '16px',
                marginBottom: '15px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }
            }, '🔑 Sign In'),
            React.createElement('button', {
              style: {
                width: '100%',
                padding: '16px',
                border: '2px solid #e1e5e9',
                borderRadius: '12px',
                background: '#f8f9fa',
                color: '#333',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }
            }, '⚡ Create Demo Account'),
            
            React.createElement('div', {
              style: {
                marginTop: '20px',
                padding: '10px',
                background: '#e8f5e8',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#2d5a2d'
              }
            }, '✅ React app loaded successfully with OAuth buttons!')
          )
        );
      }
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(App));
    </script>
  </head>
  <body>
    <div id="root">Loading React app...</div>
  </body>
</html>`;
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(reactHTML);
});

const httpServer = createServer(app);

// Setup Vite AFTER all custom routes are defined
const server = await import("./vite");
await server.setupVite(app, httpServer);

httpServer.listen(5000, '0.0.0.0', () => {
  console.log("🚀 EventConnect server running on port 5000");
  console.log("📱 Access your PWA at: https://local-event-connect.replit.app");
});

export default app;