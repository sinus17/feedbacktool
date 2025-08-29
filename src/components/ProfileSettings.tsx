import React, { useState } from 'react';
import { User, Phone, Mail, Users, Image as ImageIcon, Loader, AlertCircle } from 'lucide-react';
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

      setSuccess('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
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
    </div>
  );
};