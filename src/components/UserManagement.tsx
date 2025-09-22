import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Loader, ShieldAlert, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { OptimizedImage } from './OptimizedImage';
import type { AdminUser, Team } from '../types';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { ConfirmationModal } from './ConfirmationModal';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const { currentUser } = useAuth();
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: '',
  });

  const isAdmin = currentUser?.user_metadata?.team === 'admin' || 
                 currentUser?.user_metadata?.team === 'management';

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (usersError) throw usersError;
      if (!data) throw new Error('No data received');

      const transformedUsers: AdminUser[] = data.map((profile: any) => ({
        id: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        team: (profile.team as Team) || 'support',
        avatarUrl: profile.avatar_url,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      }));

      setUsers(transformedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmation.userId) return;

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        deleteConfirmation.userId
      );

      if (deleteError) throw deleteError;

      setUsers(prevUsers => 
        prevUsers.filter(user => user.id !== deleteConfirmation.userId)
      );

      setDeleteConfirmation({
        isOpen: false,
        userId: null,
        userName: '',
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-gray-500 dark:text-gray-400">
          You don't have permission to manage users. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold dark:text-white">Admin Users</h2>
        <button onClick={() => setShowAddModal(true)} className="btn">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
          <button
            onClick={fetchUsers}
            className="ml-auto text-sm text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <OptimizedImage
                          src={user.avatarUrl || ''}
                          alt={user.name}
                          className="h-10 w-10 rounded-full object-cover"
                          fallbackInitial={user.name?.charAt(0)?.toUpperCase() || 'U'}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200">
                      {user.team}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirmation({
                            isOpen: true,
                            userId: user.id,
                            userName: user.name,
                          })
                        }
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchUsers();
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={() => {
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteConfirmation.userName}? This action cannot be undone.`}
        onConfirm={handleDeleteUser}
        onCancel={() =>
          setDeleteConfirmation({
            isOpen: false,
            userId: null,
            userName: '',
          })
        }
      />
    </div>
  );
};