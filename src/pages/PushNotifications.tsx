import React, { useState } from 'react';
import { Bell, Send } from 'lucide-react';

export const PushNotifications: React.FC = () => {
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('/library?tab=feed&public=true');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setResult('Error: Message is required');
      return;
    }
    
    setResult('Sending...');
    setLoading(true);
    
    try {
      const response = await fetch('https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'SwipeUp',
          body: message,
          icon: '/plane_new.png',
          badge: '/plane_new.png',
          url: url
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      
      // Clear form on success
      if (data.success) {
        setMessage('');
      }
    } catch (error: any) {
      setResult('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-dark-800 rounded-lg p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">Push Notifications</h1>
          </div>

          <form onSubmit={sendNotification} className="space-y-6">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                Message *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your notification message..."
                rows={4}
                className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
                URL (where notification links to)
              </label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/library?tab=feed&public=true"
                className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {loading ? 'Sending...' : 'Send Notification to All Users'}
            </button>
          </form>

          {result && (
            <div className="mt-6 bg-dark-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Result:</h3>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                {result}
              </pre>
            </div>
          )}

          <div className="mt-8 p-4 bg-dark-700 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Info:</h3>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Sends push notifications to all subscribed users</li>
              <li>• Users must have enabled notifications in the PWA</li>
              <li>• Works on iOS 16.4+ and Android PWAs</li>
              <li>• Clicking the notification will open the specified URL</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
