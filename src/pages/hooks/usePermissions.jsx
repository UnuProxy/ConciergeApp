import { useDatabase } from '../context/DatabaseContext';
import { isAdminRole } from '../../utils/roleUtils';

export function usePermissions() {
  const { userRole } = useDatabase();
  const isAdmin = isAdminRole(userRole);
  
  // Define permissions based on userRole from your DatabaseContext
  const permissions = {
    // Finance permissions - keep restricted to admins, employees excluded
    canViewFinance: isAdmin,
    canEditFinance: isAdmin,
    
    // Delete permissions - only admin can delete
    canDeleteClients: isAdmin,
    canDeleteServices: isAdmin, 
    canDeleteReservations: isAdmin,
    canDeleteUsers: isAdmin,
    canDeleteProperties: isAdmin,
    
    // Edit permissions - admins and employees/agents can add/edit operational data
    canEditClients: true,
    canEditServices: true, 
    canEditReservations: true,
    canEditProperties: true,
    
    // View permissions - all authenticated users can view
    canViewClients: true,
    canViewServices: true,
    canViewReservations: true,
    canViewSettings: true,
    canViewUserManagement: isAdmin,
    
    // System permissions - admin only
    canManageUsers: isAdmin,
    canChangeSystemSettings: isAdmin,
    canViewSecurityLogs: isAdmin,
  };
  
  return permissions;
}
