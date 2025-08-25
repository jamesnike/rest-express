import { Calendar } from "lucide-react";

export default function SimpleLanding() {
  return (
    <div className="max-w-sm mx-auto bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen">
      <div className="text-white text-center px-6 pt-16 pb-8">
        <Calendar className="w-20 h-20 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">EventConnect</h1>
        <p className="text-lg opacity-90">Your events, your way</p>
      </div>
      
      <div className="px-6 pb-8">
        <button 
          onClick={() => {
            // Simple demo login
            fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: 'demouser',
                password: 'demo123',
                firstName: 'Demo',
                lastName: 'User',
                email: 'demo@eventconnect.app'
              })
            })
            .then(res => res.json())
            .then(data => {
              if (data.token) {
                localStorage.setItem('auth_token', data.token);
                window.location.reload();
              } else {
                // User might already exist, try login
                return fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    username: 'demouser',
                    password: 'demo123'
                  })
                });
              }
            })
            .then(res => res ? res.json() : null)
            .then(data => {
              if (data && data.token) {
                localStorage.setItem('auth_token', data.token);
                window.location.reload();
              }
            })
            .catch(err => console.error('Login failed:', err));
          }}
          className="w-full bg-white text-blue-600 rounded-lg p-4 font-bold text-lg hover:bg-gray-100"
        >
          Start Demo
        </button>
      </div>
    </div>
  );
}