import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WhatsAppLog {
  id: string;
  type: 'feedback' | 'submission';
  status: 'success' | 'error';
  message: string;
  error?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export const WhatsAppLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('whatsapp_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setLogs((data as unknown as WhatsAppLog[]) || []);
      } catch (err) {
        console.error('Error loading WhatsApp logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: 'success' | 'error') => {
    return status === 'success' ? (
      <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
    );
  };

  const getTypeColor = (type: WhatsAppLog['type']) => {
    switch (type) {
      case 'feedback':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'submission':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">WhatsApp Logs</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor WhatsApp notifications and events
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-700 rounded-md focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-modal dark:text-gray-200"
          />
        </div>
      </div>

      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
            <thead className="bg-gray-50 dark:bg-dark-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-900 divide-y divide-gray-200 dark:divide-dark-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(log.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(log.type)}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-gray-100">{log.message}</div>
                      {log.error && (
                        <div className="text-red-600 dark:text-red-400 mt-1">{log.error}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {formatDate(log.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};