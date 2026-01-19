import { useDatabase } from '../context/DatabaseContext';
import { Navigate } from 'react-router-dom';
import { isAdminRole, normalizeRole } from '../utils/roleUtils';

function RoleProtectedRoute({ children, requiredRole = 'admin', fallbackPath = '/' }) {
  const { userRole } = useDatabase();
  const normalizedRole = normalizeRole(userRole);
  
  // Check if user has required role
  const hasAccess = () => {
    if (requiredRole === 'admin') {
      return isAdminRole(normalizedRole);
    }
    if (requiredRole === 'user') {
      return normalizedRole === 'user' || isAdminRole(normalizedRole);
    }
    return false;
  };

  if (!hasAccess()) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

export default RoleProtectedRoute;
