import React, { useState } from 'react';
import { Bell } from 'lucide-react';

export const PushNotifications: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const sendTestNotification = async () => {
    setResult('Sending...');
    setLoading(true);
    
    try {
      const response = await fetch('https://wrlgoxbzlngdtomjhvnz.supabase.co/functions/v1/send-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '🚀 New Trend Alert!',
          body: 'Check out the latest viral video on SwipeUp',
          icon: '/plane_new.png',
          badge: '/plane_new.png',
          url: '/library?tab=feed&public=true'
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
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

          <div className="space-y-4">
            <button
              onClick={sendTestNotification}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Send Test Notification to All Users'}
            </button>

            {result && (
              <div className="bg-dark-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Result:</h3>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                  {result}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-dark-700 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Info:</h3>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Sends push notifications to all subscribed users</li>
              <li>• Users must have enabled notifications in the PWA</li>
              <li>• Works on iOS 16.4+ and Android PWAs</li>
              <li>• Check the console for detailed logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
