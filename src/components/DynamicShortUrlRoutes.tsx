// @ts-nocheck
import { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ShortUrl {
  short_code: string;
  destination_url: string;
  is_active: boolean;
}

export function DynamicShortUrlRoutes() {
  const [shortUrls, setShortUrls] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShortUrls = async () => {
      try {
        const { data, error } = await supabase
          .from('short_urls')
          .select('short_code, destination_url, is_active')
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching short URLs:', error);
          return;
        }

        console.log('📋 Loaded short URLs for routing:', data);
        setShortUrls(data || []);
      } catch (err) {
        console.error('Error in fetchShortUrls:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShortUrls();
  }, []);

  if (loading) {
    return null; // Don't render anything while loading
  }

  return (
    <Routes>
      {shortUrls.map((url) => (
        <Route
          key={url.short_code}
          path={`/${url.short_code}`}
          element={<RedirectComponent destination={url.destination_url} shortCode={url.short_code} />}
        />
      ))}
    </Routes>
  );
}

function RedirectComponent({ destination, shortCode }: { destination: string; shortCode: string }) {
  useEffect(() => {
    console.log(`🔗 Redirecting ${shortCode} to:`, destination);
    
    // Track click
    supabase
      .from('short_url_clicks')
      .insert({
        short_url_id: shortCode, // We'll need to get the actual ID
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        ip_address: null,
      })
      .then(({ error }) => {
        if (error) console.error('Click tracking error:', error);
      });

    // Redirect
    window.location.href = destination;
  }, [destination, shortCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
