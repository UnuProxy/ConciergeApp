import { useDatabase } from '../context/DatabaseContext';

export function usePermissions() {
  const { userRole } = useDatabase();
  
  // Define permissions based on userRole from your DatabaseContext
  const permissions = {
    // Finance permissions - only admin can access
    canViewFinance: userRole === 'admin',
    canEditFinance: userRole === 'admin',
    
    // Delete permissions - only admin can delete
    canDeleteClients: userRole === 'admin',
    canDeleteServices: userRole === 'admin', 
    canDeleteReservations: userRole === 'admin',
    canDeleteUsers: userRole === 'admin',
    canDeleteProperties: userRole === 'admin',
    
    // Edit permissions - both admin and regular users can edit
    canEditClients: true,
    canEditServices: true, 
    canEditReservations: true,
    canEditProperties: true,
    
    // View permissions - all authenticated users can view
    canViewClients: true,
    canViewServices: true,
    canViewReservations: true,
    canViewSettings: true,
    canViewUserManagement: userRole === 'admin',
    
    // System permissions - admin only
    canManageUsers: userRole === 'admin',
    canChangeSystemSettings: userRole === 'admin',
    canViewSecurityLogs: userRole === 'admin',
  };
  
  return permissions;
}