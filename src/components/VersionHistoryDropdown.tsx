import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, formatDistanceToNow } from 'date-fns';

interface Version {
  version_id: string;
  version_number: number;
  title: string;
  content_size: number;
  saved_at: string;
  change_type: string;
}

interface VersionHistoryDropdownProps {
  releaseSheetId: string;
  onRestore?: () => void;
}

export const VersionHistoryDropdown: React.FC<VersionHistoryDropdownProps> = ({
  releaseSheetId,
  onRestore
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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

  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white opacity-50 px-3 py-1 rounded-full text-sm hover:opacity-100 transition-opacity cursor-pointer group relative"
        title="Version History"
      >
        {/* History icon */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 640 640" fill="currentColor" className="inline">
          <path d="M320 128C426 128 512 214 512 320C512 426 426 512 320 512C254.8 512 197.1 479.5 162.4 429.7C152.3 415.2 132.3 411.7 117.8 421.8C103.3 431.9 99.8 451.9 109.9 466.4C156.1 532.6 233 576 320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C234.3 64 158.5 106.1 112 170.7L112 144C112 126.3 97.7 112 80 112C62.3 112 48 126.3 48 144L48 256C48 273.7 62.3 288 80 288L104.6 288C105.1 288 105.6 288 106.1 288L192.1 288C209.8 288 224.1 273.7 224.1 256C224.1 238.3 209.8 224 192.1 224L153.8 224C186.9 166.6 249 128 320 128zM344 216C344 202.7 333.3 192 320 192C306.7 192 296 202.7 296 216L296 320C296 326.4 298.5 332.5 303 337L375 409C384.4 418.4 399.6 418.4 408.9 409C418.2 399.6 418.3 384.4 408.9 375.1L343.9 310.1L343.9 216z"/>
        </svg>
        
        {/* Tooltip on hover */}
        <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Version History
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Version History</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Last {versions.length} version{versions.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No version history yet.</p>
              </div>
            ) : (
              <div className="py-2">
                {versions.map((version, index) => {
                  const isCurrent = index === 0;
                  return (
                    <div
                      key={version.version_id}
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                              v{version.version_number}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                Current
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                            <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                              {version.title}
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{formatRelativeTime(version.saved_at)}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500">{formatDate(version.saved_at)}</span>
                            </div>
                            <div>{formatSize(version.content_size)}</div>
                          </div>
                        </div>

                      <button
                        onClick={() => handleRestore(version.version_id)}
                        disabled={restoring !== null}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        title="Restore this version"
                      >
                        {restoring === version.version_id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {versions.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Auto-saved on changes (max 10)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
