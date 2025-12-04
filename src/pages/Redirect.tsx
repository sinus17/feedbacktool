// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';

export function Redirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performRedirect = async () => {
      if (!shortCode) {
        setError('No short code provided');
        return;
      }

      try {
        // Query the database for the short URL
        const { data, error: queryError } = await supabase
          .from('short_urls')
          .select('id, destination_url, is_active, expires_at')
          .eq('short_code', shortCode)
          .eq('is_active', true)
          .maybeSingle();

        if (queryError) {
          console.error('Database error:', queryError);
          setError('Database error');
          return;
        }

        if (!data) {
          setError('Short URL not found');
          return;
        }

        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError('This link has expired');
          return;
        }

        // Track the click
        const clickData = {
          short_url_id: data.id,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          ip_address: null, // Will be null from client side
          metadata: {
            timestamp: new Date().toISOString(),
          }
        };

        // Track click (fire and forget)
        supabase
          .from('short_url_clicks')
          .insert(clickData)
          .then(({ error }) => {
            if (error) console.error('Click tracking error:', error);
          });

        // Perform the redirect
        window.location.href = data.destination_url;
      } catch (err) {
        console.error('Redirect error:', err);
        setError('An error occurred');
      }
    };

    performRedirect();
  }, [shortCode]);

  if (error) {
    // Redirect to 404 page if no route found
    setTimeout(() => {
      window.location.href = '/404';
    }, 1500);

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Link not found</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <Loader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-white text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
