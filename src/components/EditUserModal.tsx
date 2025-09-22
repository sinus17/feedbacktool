import React, { useState } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { supabase } from '../lib/supabase';
import { AdminUser } from '../types';

interface EditUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    team: user.team,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!isValidPhoneNumber(formData.phone, 'DE')) {
        throw new Error('Please enter a valid German phone number');
      }

      // Update user via edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('You must be logged in to update users');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/update-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          team: formData.team,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      onSuccess();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      setError(null);

      // Reset password via edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('You must be logged in to reset passwords');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/reset-user-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      onSuccess();
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1F2937] rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold dark:text-white">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value;
                try {
                  const phoneNumber = parsePhoneNumber(value, 'DE');
                  setFormData({ ...formData, phone: phoneNumber.format('E.164') });
                } catch {
                  setFormData({ ...formData, phone: value });
                }
              }}
              placeholder="+49"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Team <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.team}
              onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="management">Management</option>
              <option value="production">Production</option>
              <option value="marketing">Marketing</option>
              <option value="support">Support</option>
            </select>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              disabled={loading}
            >
              Reset Password
            </button>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};