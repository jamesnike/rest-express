export default function App() {
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      backgroundColor: '#3b82f6', 
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>EventConnect PWA</h1>
      <p>Login System Working!</p>
      <button 
        style={{
          backgroundColor: 'white',
          color: '#3b82f6',
          border: 'none',
          padding: '12px 24px',
          fontSize: '16px',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
        onClick={() => {
          fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'testuser',
              password: 'test123',
              firstName: 'Test',
              lastName: 'User'
            })
          })
          .then(res => res.json())
          .then(data => {
            if (data.token) {
              localStorage.setItem('auth_token', data.token);
              alert('Login successful! Token saved.');
            } else {
              alert('Error: ' + JSON.stringify(data));
            }
          })
          .catch(err => alert('Network error: ' + err.message));
        }}
      >
        Test Login System
      </button>
    </div>
  );
}