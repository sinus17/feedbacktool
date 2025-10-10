import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';
import { Loader, AlertCircle, RefreshCw, RotateCcw, ExternalLink, Copy, Check } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface ArchivedItem {
  id: string;
  type: 'artist' | 'submission' | 'ad_creative';
  name: string;
  archivedAt: string;
  metadata?: any;
}

export const Archive: React.FC = () => {
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState<{
    isOpen: boolean;
    item: ArchivedItem | null;
  }>({
    isOpen: false,
    item: null
  });

  const { fetchArtists, fetchSubmissions, fetchAdCreatives } = useStore();

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '-';
      return format(date, 'dd.MM.yyyy HH:mm');
    } catch (err) {
      console.error('Error formatting date:', err);
      return '-';
    }
  };

  const fetchArchivedItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch archived artists
      const { data: archivedArtists, error: artistsError } = await supabase
        .from('artists')
        .select('*')
        .eq('archived' as any, true as any);

      if (artistsError) throw artistsError;

      // Fetch archived submissions
      const { data: archivedSubmissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('*, artists!inner(*)')
        .eq('status' as any, 'archived' as any);

      if (submissionsError) throw submissionsError;

      // Fetch archived ad creatives
      const { data: archivedCreatives, error: creativesError } = await supabase
        .from('ad_creatives')
        .select('*, artists!inner(*)')
        .eq('status' as any, 'archived' as any);

      if (creativesError) throw creativesError;

      // Transform and combine the data
      const transformedItems: ArchivedItem[] = [
        ...(archivedArtists || []).map((artist: any) => ({
          id: artist.id,
          type: 'artist' as const,
          name: artist.name,
          archivedAt: artist.updated_at || new Date().toISOString(), // Fallback to current date if null
          metadata: { 
            submissions: artist.submissions,
            whatsappGroupId: artist.whatsapp_group_id,
            elementId: artist.element_id
          }
        })),
        ...(archivedSubmissions || []).map((submission: any) => ({
          id: submission.id,
          type: 'submission' as const,
          name: submission.project_name,
          archivedAt: submission.updated_at || new Date().toISOString(),
          metadata: { 
            artistName: submission.artists.name,
            artistId: submission.artist_id,
            videoUrl: submission.video_url,
            type: submission.type
          }
        })),
        ...(archivedCreatives || []).map((creative: any) => ({
          id: creative.id,
          type: 'ad_creative' as const,
          name: `${creative.platform} content`,
          archivedAt: creative.updated_at || new Date().toISOString(),
          metadata: {
            artistName: creative.artists.name,
            artistId: creative.artists_id,
            platform: creative.platform,
            content: creative.content
          }
        }))
      ].sort((a, b) => {
        const dateA = new Date(a.archivedAt).getTime();
        const dateB = new Date(b.archivedAt).getTime();
        return isNaN(dateB) || isNaN(dateA) ? 0 : dateB - dateA;
      });

      setItems(transformedItems);
    } catch (err) {
      console.error('Error fetching archived items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load archived items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedItems();
  }, []);

  const handleRestore = async (item: ArchivedItem) => {
    try {
      setLoading(true);
      setError(null);

      switch (item.type) {
        case 'artist': {
          // Update artist archived status
          const { error: artistError } = await supabase
            .from('artists')
            .update({ archived: false } as any)
            .eq('id' as any, item.id as any)
            .select();

          if (artistError) throw artistError;

          // Update associated submissions
          const { error: submissionsError } = await supabase
            .from('submissions')
            .update({ status: 'new' } as any)
            .eq('artist_id' as any, item.id as any)
            .eq('status' as any, 'archived' as any)
            .select();

          if (submissionsError) throw submissionsError;

          await fetchArtists();
          break;
        }
        case 'submission': {
          const { error: submissionError } = await supabase
            .from('submissions')
            .update({ status: 'new' } as any)
            .eq('id' as any, item.id as any)
            .select();

          if (submissionError) throw submissionError;

          await fetchSubmissions();
          break;
        }
        case 'ad_creative': {
          const { error: creativeError } = await supabase
            .from('ad_creatives')
            .update({ status: 'pending' } as any)
            .eq('id' as any, item.id as any)
            .select();

          if (creativeError) throw creativeError;

          await fetchAdCreatives();
          break;
        }
      }

      // Log the unarchive action
      await supabase.from('archive_logs').insert({
        entity_type: item.type,
        entity_id: item.id,
        action: 'unarchive',
        metadata: {
          name: item.name,
          timestamp: new Date().toISOString(),
          ...item.metadata
        }
      } as any).select();

      await fetchArchivedItems();
    } catch (err) {
      console.error('Error restoring item:', err);
      setError(err instanceof Error ? err.message : 'Failed to restore item');
    } finally {
      setLoading(false);
      setRestoreConfirmation({ isOpen: false, item: null });
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading && !items.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Archive</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage archived content
          </p>
        </div>
        <button 
          onClick={fetchArchivedItems}
          className="btn"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Artist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Archived Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No archived items found
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.type === 'artist'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
                          : item.type === 'submission'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                          : 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-200'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.type === 'artist' ? item.name : item.metadata?.artistName || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {item.type === 'artist' && (
                        <div className="space-y-1">
                          {item.metadata?.elementId && (
                            <div>Element ID: {item.metadata.elementId}</div>
                          )}
                          <div>Submissions: {item.metadata?.submissions || 0}</div>
                        </div>
                      )}
                      {item.type === 'submission' && (
                        <div className="space-y-1">
                          <div>Type: {item.metadata?.type}</div>
                          {item.metadata?.videoUrl && (
                            <div className="flex items-center gap-2">
                              <a
                                href={item.metadata.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center"
                              >
                                Video URL <ExternalLink className="h-4 w-4 ml-1" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      {item.type === 'ad_creative' && (
                        <div className="space-y-1">
                          <div>Platform: {item.metadata?.platform}</div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(item.metadata?.content, item.id)}
                              className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center"
                              title={copiedId === item.id ? 'Copied!' : 'Copy URL'}
                            >
                              {copiedId === item.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                              <span className="ml-1">Copy URL</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(item.archivedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setRestoreConfirmation({ isOpen: true, item })}
                        className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 flex items-center"
                        title="Restore"
                      >
                        <RotateCcw className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={restoreConfirmation.isOpen}
        title="Restore Item"
        message={
          restoreConfirmation.item
            ? `Are you sure you want to restore ${restoreConfirmation.item.name}? This will unarchive the item and make it active again.`
            : ''
        }
        confirmLabel="Restore"
        onConfirm={() => restoreConfirmation.item && handleRestore(restoreConfirmation.item)}
        onCancel={() => setRestoreConfirmation({ isOpen: false, item: null })}
        isLoading={loading}
      />
    </div>
  );
};