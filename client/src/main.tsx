import { createRoot } from "react-dom/client";

// Remove all imports that might cause issues and test with absolute basics
const App = () => {
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
      <h1>EventConnect</h1>
      <p>Basic React Test</p>
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
        onClick={() => alert('React is working!')}
      >
        Test React
      </button>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);