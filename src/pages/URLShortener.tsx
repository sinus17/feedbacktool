import { useState, useEffect } from 'react';
import { Link2, Plus, Copy, Trash2, BarChart3, ExternalLink, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ShortUrl {
  id: string;
  short_code: string;
  destination_url: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  click_count: number;
  is_active: boolean;
}

export function URLShortener() {
  const [shortUrls, setShortUrls] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadShortUrls();
  }, []);

  const loadShortUrls = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to manage short URLs');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-short-urls`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to load short URLs');
      }

      const data = await response.json();
      console.log('Loaded short URLs:', data);
      console.log('Current user:', session.user.email);
      setShortUrls(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading short URLs:', error);
      toast.error('Failed to load short URLs');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (shortCode: string, id: string) => {
    const url = `https://swipe.fm/${shortCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const deleteShortUrl = async (id: string) => {
    if (!confirm('Are you sure you want to delete this short URL?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-short-urls?id=${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete short URL');
      }

      toast.success('Short URL deleted');
      loadShortUrls();
    } catch (error) {
      console.error('Error deleting short URL:', error);
      toast.error('Failed to delete short URL');
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-short-urls`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id,
            is_active: !currentState,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update short URL');
      }

      toast.success(currentState ? 'Link deactivated' : 'Link activated');
      loadShortUrls();
    } catch (error) {
      console.error('Error updating short URL:', error);
      toast.error('Failed to update short URL');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Link2 className="w-8 h-8" />
              URL Shortener
            </h1>
            <p className="mt-2 text-gray-400">
              Manage short links for swipe.fm domain
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#0000fe' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0000cc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0000fe'}
          >
            <Plus className="w-5 h-5" />
            Create Short Link
          </button>
        </div>
      </div>

      {shortUrls.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <Link2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No short links yet</h3>
          <p className="text-gray-400 mb-6">Create your first short link to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#0000fe' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0000cc'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0000fe'}
          >
            <Plus className="w-5 h-5" />
            Create Short Link
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Short Link
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {shortUrls.map((url) => (
                <tr key={url.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://swipe.fm/${url.short_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono hover:underline"
                        style={{ color: '#0000fe' }}
                      >
                        swipe.fm/{url.short_code}
                      </a>
                      <button
                        onClick={() => copyToClipboard(url.short_code, url.id)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        title="Copy link"
                      >
                        {copiedId === url.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {url.title && (
                      <div className="text-sm text-gray-400 mt-1">{url.title}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={url.destination_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-blue-400 flex items-center gap-1 max-w-md truncate"
                    >
                      <span className="truncate">{url.destination_url}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                      <span className="text-white font-semibold">{url.click_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(url.id, url.is_active)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        url.is_active
                          ? 'bg-green-900 text-green-300'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {url.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(url.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => deleteShortUrl(url.id)}
                      className="text-red-400 hover:text-red-300 p-2 hover:bg-gray-700 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateShortUrlModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadShortUrls();
          }}
        />
      )}
    </div>
  );
}

interface CreateShortUrlModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateShortUrlModal({ onClose, onSuccess }: CreateShortUrlModalProps) {
  const [shortCode, setShortCode] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate short code
    if (!/^[a-zA-Z0-9_-]+$/.test(shortCode)) {
      setError('Short code can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    // Validate URL
    try {
      new URL(destinationUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Please log in');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-short-urls`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            short_code: shortCode,
            destination_url: destinationUrl,
            title: title || null,
            description: description || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create short URL');
      }

      toast.success('Short URL created successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating short URL:', error);
      setError(error.message || 'Failed to create short URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Create Short Link</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Short Code *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">swipe.fm/</span>
              <input
                type="text"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toLowerCase())}
                placeholder="my-link"
                required
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Letters, numbers, hyphens, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Destination URL *
            </label>
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://example.com/your-page"
              required
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Campaign Link"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this link..."
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: loading ? '#666' : '#0000fe' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0000cc')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#0000fe')}
            >
              {loading ? 'Creating...' : 'Create Short Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
