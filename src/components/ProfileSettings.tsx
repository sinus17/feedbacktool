import React, { useState } from 'react';
import { User, Phone, Mail, Users, Image as ImageIcon, Loader, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { supabase } from '../lib/supabase';

interface ProfileSettingsProps {
  user: any;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: user?.user_metadata?.name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    team: user?.user_metadata?.team || 'support',
    avatarUrl: user?.user_metadata?.avatar_url || null,
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
    },
    onDrop: async (acceptedFiles) => {
      try {
        setLoading(true);
        setError(null);
        
        const file = acceptedFiles[0];
        const fileExt = file.name.split('.').pop();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
        
        // Automatically save avatar URL to database
        // Update auth metadata
        await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            avatar_url: publicUrl,
          },
        });

        // Update profiles table
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl } as any)
          .eq('id' as any, user.id as any);
        
        setSuccess('Profile picture updated successfully');
      } catch (err) {
        console.error('Error uploading file:', err);
        setError('Failed to upload profile picture');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!isValidPhoneNumber(formData.phone, 'DE')) {
        throw new Error('Please enter a valid German phone number');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        email: formData.email,
        data: {
          name: formData.name,
          phone: formData.phone,
          team: formData.team,
          avatar_url: formData.avatarUrl,
        },
      });

      if (updateError) throw updateError;

      // Also update the profiles table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            team: formData.team,
            avatar_url: formData.avatarUrl,
          } as any)
          .eq('id' as any, user.id as any);

        if (profileError) {
          console.error('Error updating profile table:', profileError);
          // Don't throw here, auth update was successful
        }
      }

      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (passwordData.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (updateError) throw updateError;

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSuccess('Password updated successfully');
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-500 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">Profile Picture</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
              }`}
            >
              <input {...getInputProps()} />
              {formData.avatarUrl ? (
                <div className="flex flex-col items-center">
                  <img
                    src={formData.avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover mb-2"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Click or drag to change picture</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click or drag and drop to upload profile picture
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                required
                className="pl-10 w-full rounded-md dark:bg-dark-modal dark:border-dark-700 dark:text-gray-200"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="email"
                required
                className="pl-10 w-full rounded-md dark:bg-dark-modal dark:border-dark-700 dark:text-gray-200"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="tel"
                required
                className="pl-10 w-full rounded-md dark:bg-dark-modal dark:border-dark-700 dark:text-gray-200"
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
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Team <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <select
                required
                className="pl-10 w-full rounded-md dark:bg-dark-modal dark:border-dark-700 dark:text-gray-200"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
              >
                <option value="management">Management</option>
                <option value="production">Production</option>
                <option value="marketing">Marketing</option>
                <option value="support">Support</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
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
              'Update Profile'
            )}
          </button>
        </div>
      </form>

      {/* Password Change Section */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium mb-4 dark:text-gray-200">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type={showPasswords.current ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="pl-10 pr-10 w-full rounded-md dark:bg-dark-modal dark:border-dark-700 dark:text-gray-200"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              >
                {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type={showPasswords.new ? 'text' : 'password'}
                required
                autoComplete="new-password"
                className="pl-10 pr-10 w-full rounded-md dark:bg-dark-modal dark:border-dark-700 dark:text-gray-200"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password (min 8 characters)"
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
              >
                {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                required
                autoComplete="new-password"
                className="pl-10 pr-10 w-full rounded-md dark:bg-dark-modal dark:border-dark-700 dark:text-gray-200"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                minLength={8}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
              >
                {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className="btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating Password...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};