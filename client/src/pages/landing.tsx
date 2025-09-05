import { useEffect, useState } from "react";
import { Calendar, Users, MapPin, Star } from "lucide-react";

export default function Landing() {
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Debug logging for mobile troubleshooting
    if (process.env.NODE_ENV === 'development') {
      console.log('Landing page loaded, showing login in 2 seconds');
    }
    
    const timer = setTimeout(() => {
      setShowLogin(true);
      if (process.env.NODE_ENV === 'development') {
        console.log('Login button now visible');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!showLogin) {
    return (
      <div className="max-w-sm mx-auto bg-gradient-to-br from-primary to-accent min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="mb-8">
            <Calendar className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">EventConnect</h1>
            <p className="text-lg opacity-90">Discover amazing events near you</p>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen flex flex-col justify-center p-6">
      <div className="text-center mb-8">
        <Calendar className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to EventConnect!</h2>
        <p className="text-gray-600">Sign in to discover events in your area</p>
      </div>
      
      <div className="space-y-6 mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Find Local Events</h3>
            <p className="text-sm text-gray-600">Discover events happening near you</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Connect with People</h3>
            <p className="text-sm text-gray-600">Meet like-minded individuals</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <Star className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Create Events</h3>
            <p className="text-sm text-gray-600">Host your own amazing events</p>
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('Get Started button clicked, creating demo login');
          }
          // For demo purposes, use a predefined user
          fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'demo@eventconnect.app',
              firstName: 'Demo',
              lastName: 'User'
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.token) {
              localStorage.setItem('auth_token', data.token);
              window.location.href = '/';
            }
          })
          .catch(err => console.error('Login failed:', err));
        }}
        className="w-full bg-primary text-white rounded-lg p-4 font-medium mb-4 hover:bg-primary/90 transition-colors"
      >
        Get Started
      </button>
      
      <p className="text-center text-sm text-gray-600">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
