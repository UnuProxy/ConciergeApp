import { usePermissions } from '../hooks/usePermissions';

function DeleteButton({ 
  onDelete, 
  permission, 
  className = "bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition-colors",
  children = "Delete",
  confirmMessage = "Are you sure you want to delete this item?"
}) {
  const permissions = usePermissions();
  
  const handleDelete = () => {
    if (window.confirm(confirmMessage)) {
      onDelete();
    }
  };
  
  if (!permissions[permission]) {
    return (
      <button 
        className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed"
        disabled
        title="You don't have permission to delete this item"
      >
        {children}
      </button>
    );
  }
  
  return (
    <button 
      onClick={handleDelete}
      className={className}
    >
      {children}
    </button>
  );
}

export default DeleteButton;