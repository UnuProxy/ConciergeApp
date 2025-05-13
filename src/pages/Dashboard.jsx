import { useState, useEffect } from 'react';

function Dashboard() {
  const [stats, setStats] = useState({
    activeRequests: 0,
    pendingBookings: 0,
    completedTasks: 0,
    revenue: 0
  });

  // Mock data
  useEffect(() => {
    setTimeout(() => {
      setStats({
        activeRequests: 12,
        pendingBookings: 8,
        completedTasks: 147,
        revenue: 24850
      });
    }, 500);
  }, []);

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    padding: '1.25rem',
    marginBottom: '1.5rem'
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Card 1 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              backgroundColor: '#8B5CF6', 
              borderRadius: '0.375rem', 
              padding: '0.75rem',
              marginRight: '1rem'
            }}>
              <svg style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Active Requests</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{stats.activeRequests}</div>
            </div>
          </div>
        </div>
        
        {/* Card 2 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              backgroundColor: '#10B981', 
              borderRadius: '0.375rem', 
              padding: '0.75rem',
              marginRight: '1rem'
            }}>
              <svg style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Pending Bookings</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{stats.pendingBookings}</div>
            </div>
          </div>
        </div>
        
        {/* Card 3 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              backgroundColor: '#3B82F6', 
              borderRadius: '0.375rem', 
              padding: '0.75rem',
              marginRight: '1rem'
            }}>
              <svg style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Completed Tasks</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>{stats.completedTasks}</div>
            </div>
          </div>
        </div>
        
        {/* Card 4 */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              backgroundColor: '#EC4899', 
              borderRadius: '0.375rem', 
              padding: '0.75rem',
              marginRight: '1rem'
            }}>
              <svg style={{ width: '1.5rem', height: '1.5rem', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Revenue (USD)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.25rem' }}>${stats.revenue.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;