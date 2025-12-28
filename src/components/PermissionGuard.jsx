import { usePermissions } from '../hooks/usePermissions';

function PermissionGuard({ 
  children, 
  permission, 
  fallback = null, 
  showMessage = true 
}) {
  const permissions = usePermissions();
  
  if (!permissions[permission]) {
    if (showMessage) {
      return (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-rose-700 mb-1">Access Restricted</h3>
          <p className="text-rose-600">You don't have permission to access this feature.</p>
        </div>
      );
    }
    return fallback;
  }
  
  return children;
}

export default PermissionGuard;
