import React, { useEffect, useState } from 'react';
// import { useUpdateAssignment } from '../hooks/useupdateassignment';
import { useUsers } from '../hooks/useUsers';
import { useGuards } from '../hooks/useGuards';
import { useClients } from '../hooks/useClients';
import { useAddressesByClient } from '../hooks/useAddressesByClient';
import { toast } from 'react-toastify';
import { useUpdateAssignment } from '../hooks/useupdateassignment';
import { Button } from './ui/button';

interface EditAssignmentModalProps {
  record: any;
  onClose: () => void;
  onSuccess: () => void;
}

const notificationOptions = ["Geolocation", "Time Clock", "Weekly Hours", "Scheduling"];

const EditAssignmentModal: React.FC<EditAssignmentModalProps> = ({ record, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    id: record.id,
    userId: record.userId,
    guardId: record.guardId,
    clientId: record.clientId,
    notification: record.notifications,
    addressId: record.addressId || 0,
    role: record.role,
    access: record.access,
  });

  const { data: users = [] } = useUsers();
  const { data: guards = [] } = useGuards();
  const { data: clients = [] } = useClients();
  const { data: addresses = [] } = useAddressesByClient(formData.clientId);

  const { mutate: updateAssignment, isPending } = useUpdateAssignment();

  useEffect(() => {
    // Refresh address list when client changes
  }, [formData.clientId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'userId' || name === 'guardId' || name === 'clientId' || name === 'addressId' ? Number(value) : value,
    }));
  };

  const handleNotificationChange = (notif: string) => {
    setFormData((prev) => {
      const exists = prev.notification.includes(notif);
      return {
        ...prev,
        notification: exists
          ? prev.notification.filter((n: string) => n !== notif)
          : [...prev.notification, notif],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateAssignment(
      {
        id: formData.id,
        data: {
          userId: formData.userId,
          guardId: formData.guardId,
          clientId: formData.clientId,
          notification: formData.notification,
          addressId: formData.addressId,
          role: formData.role,
          access: formData.access,
        },
      },
      {
        onSuccess: () => {
          toast.success('Assignment updated successfully!');
          onSuccess();
          onClose();
        },
        onError: () => {
          toast.error('Failed to update assignment.');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 space-y-2 grid w-[90%] max-w-lg">
        <h3 className="text-lg font-semibold mb-4">Edit Assignment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">User</label>
            <select name="userId" value={formData.userId} onChange={handleChange} className="w-full border px-2 py-1 rounded">
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Guard</label>
            <select name="guardId" value={formData.guardId} onChange={handleChange} className="w-full border px-2 py-1 rounded">
              {guards.map((guard: any) => (
                <option key={guard.id} value={guard.id}>{guard.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Client</label>
            <select
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            >
              {clients.map((client: any) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Address</label>
            <select
              name="addressId"
              value={formData.addressId}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
            >
              {addresses.map((addr: any) => (
                <option key={addr.id} value={addr.id}>{addr.label}, {addr.city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Role</label>
            <select name="role" value={formData.role} onChange={handleChange} className="w-full border px-2 py-1 rounded">
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Guard">Guard</option>
              <option value="Client">Client</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Access</label>
            <select name="access" value={formData.access} onChange={handleChange} className="w-full border px-2 py-1 rounded">
              <option value="View">View</option>
              <option value="Edit">Edit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notifications</label>
            <div className="grid grid-cols-2 gap-2">
              {notificationOptions.map((notif) => (
                <label key={notif} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.notification.includes(notif)}
                    onChange={() => handleNotificationChange(notif)}
                    className="w-4 h-4"
                  />
                  {notif}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAssignmentModal;