import { useDatabase } from '../context/DatabaseContext';
import { isAdminRole } from '../utils/roleUtils';

export function usePermissions() {
  const { userRole, permissions: modulePermissions } = useDatabase();
  const isAdmin = isAdminRole(userRole);

  const modules = modulePermissions || {
    clients: true,
    services: true,
    reservations: true,
    finance: isAdmin
  };

  const canViewFinance = modules.finance === true || isAdmin;

  return {
    modules,
    isAdmin,

    canViewFinance,
    canEditFinance: canViewFinance,

    canViewClients: modules.clients === true,
    canEditClients: modules.clients === true,

    canViewServices: modules.services === true,
    canEditServices: modules.services === true,

    canViewReservations: modules.reservations === true,
    canEditReservations: modules.reservations === true,

    // Admin-only actions
    canViewUserManagement: isAdmin,
    canManageUsers: isAdmin,

    canDeleteClients: isAdmin,
    canDeleteServices: isAdmin,
    canDeleteReservations: isAdmin,
    canDeleteUsers: isAdmin,
    canDeleteProperties: isAdmin
  };
}

