const ADMIN_ROLES = new Set(['admin', 'administrator', 'owner', 'manager', 'superadmin']);

export const normalizeRole = (role) => {
  if (typeof role !== 'string') return '';
  return role.trim().toLowerCase();
};

export const isAdminRole = (role) => ADMIN_ROLES.has(normalizeRole(role));
