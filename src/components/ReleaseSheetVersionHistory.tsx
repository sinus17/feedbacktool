import React, { useState, useEffect } from 'react';
import { History, RotateCcw, X, Clock, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface Version {
  version_id: string;
  version_number: number;
  title: string;
  content_size: number;
  saved_at: string;
  change_type: string;
}

interface ReleaseSheetVersionHistoryProps {
  releaseSheetId: string;
  onRestore?: () => void;
}

export const ReleaseSheetVersionHistory: React.FC<ReleaseSheetVersionHistoryProps> = ({
  releaseSheetId,
  onRestore
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_release_sheet_versions', {
        sheet_id: releaseSheetId
      });

      if (error) throw error;
      setVersions((data as Version[]) || []);
    } catch (err) {
      console.error('Error fetching versions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, releaseSheetId]);

  const handleRestore = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this version? This will replace the current content.')) {
      return;
    }

    try {
      setRestoring(versionId);
      const { data, error } = await supabase.rpc('restore_release_sheet_version', {
        sheet_id: releaseSheetId,
        version_id: versionId
      });

      if (error) throw error;
      
      if (data) {
        alert('Version restored successfully!');
        setIsOpen(false);
        if (onRestore) {
          onRestore();
        }
      } else {
        alert('Failed to restore version. Version not found.');
      }
    } catch (err) {
      console.error('Error restoring version:', err);
      alert('Failed to restore version. Please try again.');
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        title="View version history"
      >
        <History className="h-4 w-4" />
        Version History
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Version History
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No version history available yet.</p>
                  <p className="text-sm mt-1">Versions will be saved automatically when you make changes.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Showing last {versions.length} version{versions.length !== 1 ? 's' : ''} (max 10 stored)
                  </p>
                  {versions.map((version) => (
                    <div
                      key={version.version_id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                              Version {version.version_number}
                            </span>
                            {version.version_number === 1 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                (Current - 1)
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <FileText className="h-4 w-4" />
                              <span className="font-medium">{version.title}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Clock className="h-4 w-4" />
                              <span>{formatDate(version.saved_at)}</span>
                            </div>
                            
                            <div className="text-gray-600 dark:text-gray-400">
                              Size: {formatSize(version.content_size)}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRestore(version.version_id)}
                          disabled={restoring !== null}
                          className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {restoring === version.version_id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Restoring...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4" />
                              Restore
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Tip: Versions are saved automatically when you make changes. Only the last 10 versions are kept.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
