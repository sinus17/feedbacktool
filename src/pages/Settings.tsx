import React, { useState, useEffect } from 'react';
import { User, Users, Upload, Loader, AlertCircle, Download, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserManagement } from '../components/UserManagement';
import { ProfileSettings } from '../components/ProfileSettings';
import { ImportSubmissions } from '../components/ImportSubmissions';
import { DatabaseBackup } from '../components/DatabaseBackup';
import { TimeBreakdown } from '../components/TimeBreakdown';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'import' | 'backup' | 'time'>('profile');
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        setLoading(false);
      } catch (err) {
        console.error('Error initializing settings:', err);
        setError('Failed to load settings');
        setLoading(false);
      }
    };

    initializeSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  // Check if current user is admin or management
  const isAdmin = currentUser?.user_metadata?.team === 'admin' || 
                 currentUser?.user_metadata?.team === 'management';

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Profile Settings</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>User Management</span>
            </div>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('time')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'time'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Time Breakdown</span>
              </div>
            </button>
          )}
          <button
            onClick={() => setActiveTab('import')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'import'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <span>Import Data</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'backup'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Database Backup</span>
            </div>
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'profile' ? (
          <ProfileSettings user={currentUser} />
        ) : activeTab === 'users' ? (
          <UserManagement />
        ) : activeTab === 'time' ? (
          <TimeBreakdown />
        ) : activeTab === 'import' ? (
          <ImportSubmissions />
        ) : (
          <DatabaseBackup />
        )}
      </div>
    </div>
  );
};