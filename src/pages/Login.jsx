// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const { loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Show error with animation
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
    <div style={styles.container}>
      {/* Background Elements */}
      <div style={styles.geometricPattern}></div>
      <div style={styles.floatingElements}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{...styles.floatingElement, ...styles[`floatingElement${i + 1}`]}}></div>
        ))}
      </div>

      {/* Main Content */}
      <div style={styles.loginCard}>
        {/* Logo Section */}
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={styles.logoSvg}>
              <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
            </svg>
          </div>
          <h1 style={styles.brandName}>Just Enjoy Ibiza</h1>
          <p style={styles.tagline}>Concierge Excellence</p>
        </div>

        {/* Welcome Section */}
        <div style={styles.welcomeSection}>
          <h2 style={styles.welcomeTitle}>Welcome Back</h2>
          <p style={styles.welcomeSubtitle}>
            Access your luxury concierge dashboard
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            ...styles.errorMessage,
            ...(showError ? styles.errorVisible : styles.errorHidden)
          }}>
            <div style={styles.errorIcon}>⚠️</div>
            <span>{error}</span>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            ...styles.googleButton,
            ...(loading ? styles.googleButtonLoading : {})
          }}
        >
          {loading ? (
            <div style={styles.loadingContent}>
              <div style={styles.spinner}></div>
              <span>Signing you in...</span>
            </div>
          ) : (
            <div style={styles.googleContent}>
              <svg style={styles.googleIcon} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </div>
          )}
        </button>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Secure access to your personalized concierge services
          </p>
          <div style={styles.securityBadge}>
            <svg style={styles.securityIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16V13C8,12.4 8.6,11.5 9.2,11.5V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z"/>
            </svg>
            <span>Enterprise Security</span>
          </div>
        </div>
      </div>

      {/* Version */}
      <div style={styles.versionText}>v1.0.0</div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `
      radial-gradient(circle at 20% 80%, rgba(120, 113, 108, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 212, 128, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
      linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 75%, #475569 100%)
    `,
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden'
  },

  geometricPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.02,
    backgroundImage: `
      linear-gradient(30deg, #ffd700 12%, transparent 12.5%, transparent 87%, #ffd700 87.5%, #ffd700),
      linear-gradient(150deg, #ffd700 12%, transparent 12.5%, transparent 87%, #ffd700 87.5%, #ffd700)
    `,
    backgroundSize: '60px 104px',
    backgroundPosition: '0 0, 30px 52px',
    animation: 'patternFloat 20s ease-in-out infinite'
  },

  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    overflow: 'hidden'
  },

  floatingElement: {
    position: 'absolute',
    width: '3px',
    height: '3px',
    background: 'rgba(255, 215, 0, 0.2)',
    borderRadius: '50%',
    animation: 'float 20s linear infinite'
  },

  floatingElement1: { left: '15%', animationDelay: '0s', animationDuration: '18s' },
  floatingElement2: { left: '35%', animationDelay: '3s', animationDuration: '22s' },
  floatingElement3: { left: '55%', animationDelay: '6s', animationDuration: '20s' },
  floatingElement4: { left: '75%', animationDelay: '2s', animationDuration: '19s' },
  floatingElement5: { left: '85%', animationDelay: '5s', animationDuration: '21s' },
  floatingElement6: { left: '95%', animationDelay: '1s', animationDuration: '17s' },

  loginCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '48px',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
    boxShadow: `
      0 32px 64px rgba(0, 0, 0, 0.3),
      0 16px 32px rgba(0, 0, 0, 0.2),
      inset 0 1px 2px rgba(255, 255, 255, 0.1)
    `,
    animation: 'cardEntrance 1.2s ease-out forwards',
    transform: 'translateY(20px)',
    opacity: 0
  },

  logoSection: {
    marginBottom: '40px'
  },

  logoIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto 20px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #fbbf24 100%)',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `
      0 16px 32px rgba(255, 215, 0, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.3)
    `,
    animation: 'iconGlow 3s ease-in-out infinite alternate'
  },

  logoSvg: {
    width: '40px',
    height: '40px',
    fill: '#1e293b'
  },

  brandName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.75rem',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '8px',
    letterSpacing: '1px',
    background: 'linear-gradient(135deg, #ffffff 0%, #ffd700 50%, #ffffff 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },

  tagline: {
    fontSize: '0.875rem',
    fontWeight: 300,
    color: '#cbd5e1',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    margin: 0
  },

  welcomeSection: {
    marginBottom: '32px'
  },

  welcomeTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '8px',
    margin: 0
  },

  welcomeSubtitle: {
    fontSize: '0.95rem',
    color: '#94a3b8',
    fontWeight: 400,
    margin: 0
  },

  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '24px',
    color: '#fca5a5',
    fontSize: '0.875rem',
    transition: 'all 0.3s ease'
  },

  errorVisible: {
    opacity: 1,
    transform: 'translateY(0)',
    maxHeight: '60px'
  },

  errorHidden: {
    opacity: 0,
    transform: 'translateY(-10px)',
    maxHeight: '0',
    marginBottom: 0,
    padding: '0 16px'
  },

  errorIcon: {
    fontSize: '16px'
  },

  googleButton: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.95)',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 24px',
    fontSize: '1rem',
    fontWeight: 500,
    color: '#1f2937',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
    marginBottom: '32px',
    position: 'relative',
    overflow: 'hidden'
  },

  googleButtonLoading: {
    background: 'rgba(255, 255, 255, 0.8)',
    cursor: 'not-allowed'
  },

  googleContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },

  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },

  googleIcon: {
    width: '20px',
    height: '20px'
  },

  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  footer: {
    textAlign: 'center'
  },

  footerText: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '16px',
    margin: '0 0 16px 0'
  },

  securityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '20px',
    padding: '6px 12px',
    fontSize: '0.75rem',
    color: '#6ee7b7',
    fontWeight: 500
  },

  securityIcon: {
    width: '14px',
    height: '14px'
  },

  versionText: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    fontSize: '0.75rem',
    color: '#64748b',
    opacity: 0.7
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');

  @keyframes patternFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-5px) rotate(0.5deg); }
  }

  @keyframes float {
    0% {
      transform: translateY(100vh) scale(0);
      opacity: 0;
    }
    10% {
      opacity: 0.6;
      transform: translateY(90vh) scale(1);
    }
    90% {
      opacity: 0.6;
      transform: translateY(10vh) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(0vh) scale(0);
    }
  }

  @keyframes cardEntrance {
    0% {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translateY(0px) scale(1);
    }
  }

  @keyframes iconGlow {
    0% {
      box-shadow: 
        0 16px 32px rgba(255, 215, 0, 0.2),
        0 8px 16px rgba(0, 0, 0, 0.3),
        inset 0 2px 4px rgba(255, 255, 255, 0.3);
    }
    100% {
      box-shadow: 
        0 20px 40px rgba(255, 215, 0, 0.3),
        0 12px 24px rgba(0, 0, 0, 0.4),
        inset 0 2px 4px rgba(255, 255, 255, 0.4);
    }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .login-card {
      padding: 32px 24px !important;
      margin: 20px !important;
      border-radius: 20px !important;
    }
  }
`;

if (!document.head.querySelector('style[data-login-styles]')) {
  styleSheet.setAttribute('data-login-styles', 'true');
  document.head.appendChild(styleSheet);
}

export default Login;