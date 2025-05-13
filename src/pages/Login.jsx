// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleGoogleSignIn() {
    try {
      setError('');
      setLoading(true);
      
      const { newUser } = await loginWithGoogle();
      
      // Since we're auto-assigning users to their company based on email,
      // we don't need the company selection screen anymore
      // Just redirect to dashboard
      navigate('/');
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Special handling for unauthorized users
      if (error.message.includes('Unauthorized email')) {
        setError('Access denied. Your email is not authorized to use this application.');
      } else {
        setError('Failed to log in: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100" style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827'
          }}>
            Concierge App Login
          </h2>
          <p style={{ color: '#6B7280', marginTop: '0.5rem' }}>
            Please sign in to continue
          </p>
        </div>
        
        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            borderRadius: '0.375rem'
          }}>
            {error}
          </div>
        )}
        
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            display: 'flex',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            backgroundColor: '#4F46E5',
            color: 'white',
            borderRadius: '0.375rem',
            fontWeight: '500',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? '0.7' : '1'
          }}
        >
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}