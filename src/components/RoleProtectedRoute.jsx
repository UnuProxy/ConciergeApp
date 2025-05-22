import { useDatabase } from '../context/DatabaseContext';
import { Navigate } from 'react-router-dom';

function RoleProtectedRoute({ children, requiredRole = 'admin', fallbackPath = '/' }) {
  const { userRole } = useDatabase();
  
  // Check if user has required role
  const hasAccess = () => {
    if (requiredRole === 'admin') {
      return userRole === 'admin';
    }
    if (requiredRole === 'user') {
      return userRole === 'user' || userRole === 'admin';
    }
    return false;
  };

  if (!hasAccess()) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

export default RoleProtectedRoute;