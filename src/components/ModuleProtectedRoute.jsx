import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

function ModuleProtectedRoute({ children, module, fallbackPath = '/' }) {
  const { modules, isAdmin } = usePermissions();

  const allowed = (() => {
    if (module === 'userManagement') return isAdmin;
    if (!module) return true;
    return modules?.[module] === true;
  })();

  if (!allowed) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

export default ModuleProtectedRoute;

