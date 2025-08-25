export default function DebugLanding() {
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
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>EventConnect</h1>
      <p style={{ fontSize: '1rem', marginBottom: '2rem' }}>Debug Mode - React is Working!</p>
      <button 
        style={{
          backgroundColor: 'white',
          color: '#3b82f6',
          border: 'none',
          padding: '12px 24px',
          fontSize: '1rem',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
        onClick={() => {
          alert('Button clicked - JavaScript is working!');
        }}
      >
        Test Button
      </button>
    </div>
  );
}