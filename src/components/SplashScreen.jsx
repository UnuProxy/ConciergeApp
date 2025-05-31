import React, { useEffect } from 'react';

const SplashScreen = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={styles.splashContainer}>
      <div style={styles.geometricPattern}></div>
      
      <div style={styles.floatingElements}>
        {[...Array(9)].map((_, i) => (
          <div key={i} style={{...styles.floatingElement, ...styles[`floatingElement${i + 1}`]}}></div>
        ))}
      </div>

      <div style={styles.logoContainer}>
        <div style={styles.logoIcon}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={styles.logoSvg}>
            <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
          </svg>
        </div>
        
        <h1 style={styles.brandName}>Ibiza</h1>
        <p style={styles.tagline}>Concierge Excellence</p>
        
        <div style={styles.loadingContainer}>
          <div style={styles.loadingBar}></div>
        </div>
      </div>

      <div style={styles.loadingText}>Loading your luxury experience...</div>
      <div style={styles.versionText}>v1.0.0</div>
    </div>
  );
};

const styles = {
  splashContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: `
      radial-gradient(circle at 20% 80%, rgba(120, 113, 108, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 212, 128, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 50%),
      linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 75%, #475569 100%)
    `,
    zIndex: 9999,
    fontFamily: "'Inter', sans-serif",
    animation: 'backgroundShift 8s ease-in-out infinite alternate'
  },
  
  geometricPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.03,
    backgroundImage: `
      linear-gradient(30deg, #ffd700 12%, transparent 12.5%, transparent 87%, #ffd700 87.5%, #ffd700),
      linear-gradient(150deg, #ffd700 12%, transparent 12.5%, transparent 87%, #ffd700 87.5%, #ffd700),
      linear-gradient(30deg, #ffd700 12%, transparent 12.5%, transparent 87%, #ffd700 87.5%, #ffd700),
      linear-gradient(150deg, #ffd700 12%, transparent 12.5%, transparent 87%, #ffd700 87.5%, #ffd700)
    `,
    backgroundSize: '80px 140px',
    backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px',
    animation: 'patternFloat 12s ease-in-out infinite'
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
    width: '4px',
    height: '4px',
    background: 'rgba(255, 215, 0, 0.3)',
    borderRadius: '50%',
    animation: 'float 15s linear infinite'
  },
  
  floatingElement1: { left: '10%', animationDelay: '0s', animationDuration: '12s' },
  floatingElement2: { left: '20%', animationDelay: '2s', animationDuration: '14s' },
  floatingElement3: { left: '30%', animationDelay: '4s', animationDuration: '16s' },
  floatingElement4: { left: '40%', animationDelay: '1s', animationDuration: '13s' },
  floatingElement5: { left: '50%', animationDelay: '3s', animationDuration: '15s' },
  floatingElement6: { left: '60%', animationDelay: '5s', animationDuration: '11s' },
  floatingElement7: { left: '70%', animationDelay: '2s', animationDuration: '17s' },
  floatingElement8: { left: '80%', animationDelay: '4s', animationDuration: '12s' },
  floatingElement9: { left: '90%', animationDelay: '1s', animationDuration: '14s' },
  
  logoContainer: {
    position: 'relative',
    zIndex: 10,
    textAlign: 'center',
    animation: 'logoEntrance 2s ease-out forwards',
    opacity: 0,
    transform: 'translateY(30px) scale(0.9)'
  },
  
  logoIcon: {
    width: '120px',
    height: '120px',
    margin: '0 auto 24px',
    position: 'relative',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #fbbf24 100%)',
    borderRadius: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `
      0 20px 40px rgba(255, 215, 0, 0.2),
      0 10px 20px rgba(0, 0, 0, 0.3),
      inset 0 2px 4px rgba(255, 255, 255, 0.3)
    `,
    animation: 'iconPulse 3s ease-in-out infinite',
    overflow: 'hidden'
  },
  
  logoSvg: {
    width: '60px',
    height: '60px',
    fill: '#1e293b',
    position: 'relative',
    zIndex: 2
  },
  
  brandName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '2.5rem',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '8px',
    letterSpacing: '2px',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    background: 'linear-gradient(135deg, #ffffff 0%, #ffd700 50%, #ffffff 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'textShine 4s ease-in-out infinite',
    margin: 0
  },
  
  tagline: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '1rem',
    fontWeight: 300,
    color: '#cbd5e1',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    marginBottom: '40px',
    opacity: 0,
    animation: 'taglineSlideUp 2s ease-out 0.5s forwards',
    margin: '0 0 40px 0'
  },
  
  loadingContainer: {
    position: 'relative',
    width: '200px',
    height: '4px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
    opacity: 0,
    animation: 'loadingFadeIn 2s ease-out 1s forwards'
  },
  
  loadingBar: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, 
      transparent 0%, 
      #ffd700 25%, 
      #ffed4e 50%, 
      #ffd700 75%, 
      transparent 100%)`,
    borderRadius: '2px',
    animation: 'loadingProgress 3s ease-in-out infinite'
  },
  
  loadingText: {
    position: 'absolute',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.875rem',
    fontWeight: 400,
    color: '#94a3b8',
    letterSpacing: '1px',
    opacity: 0,
    animation: 'loadingTextFade 2s ease-out 1.5s forwards'
  },
  
  versionText: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.75rem',
    color: '#64748b',
    opacity: 0,
    animation: 'versionFade 2s ease-out 2s forwards'
  }
};

export default SplashScreen;