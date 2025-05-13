import React, { useState } from 'react';
import Sidebar from './Sidebar';

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar component */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main content area */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh', 
        overflow: 'hidden',
        transition: 'margin-left 0.3s ease-in-out'
      }}>
        {/* App Header */}
        <header style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          height: '70px'
        }}>
          {/* Menu button for mobile */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ 
              display: window.innerWidth < 768 ? 'block' : 'none',
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#4F46E5',
              padding: '0.5rem',
              borderRadius: '0.375rem'
            }}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          
          {/* Page title - could be dynamic */}
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 'bold',
            margin: 0,
            color: '#111827'
          }}>
            Dashboard
          </h1>
          
          {/* User profile dropdown */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            position: 'relative'
          }}>
            <button style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderRadius: '0.375rem'
            }}>
              <div style={{ 
                width: '2rem', 
                height: '2rem', 
                borderRadius: '50%', 
                backgroundColor: '#4F46E5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                JD
              </div>
              <span style={{ display: window.innerWidth >= 768 ? 'block' : 'none' }}>John Doe</span>
            </button>
          </div>
        </header>
      
        {/* Page content */}
        <main style={{ 
          flex: 1, 
          padding: '1rem', 
          overflowY: 'auto',
          backgroundColor: '#f9fafb'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;