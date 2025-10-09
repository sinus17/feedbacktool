import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configure retry options
const RETRY_COUNT = 2;
const RETRY_DELAY = 500; // 0.5 seconds
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Add retry wrapper with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = RETRY_COUNT,
  initialDelay = RETRY_DELAY
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's an abort error
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      
      // Don't retry on authentication errors
      if ((error as any)?.message?.includes('JWT')) {
        throw error;
      }

      // Only retry on network errors or 5xx server errors
      const shouldRetry = error instanceof TypeError || 
                         ((error as any)?.status >= 500 && (error as any)?.status < 600);
      
      if (!shouldRetry || i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, i) * (0.5 + Math.random() * 0.5);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'video-feedback-webapp',
      'X-Timezone': 'Europe/Berlin'
    }
  },
  // Add request timeout and retry logic with proper CORS handling
  // @ts-ignore - fetch option exists in runtime but not in SupabaseClientOptions types
  fetch: (url: string, options: any = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const fetchOptions = {
      ...options,
      signal: controller.signal,
      mode: 'cors' as RequestMode,
      credentials: 'omit' as RequestCredentials, // Fixed CORS issue by omitting credentials
      headers: {
        ...options.headers,
        'Cache-Control': 'no-cache'
      }
    };

    return withRetry(
      () => fetch(url, fetchOptions)
        .then(async response => {
          if (!response.ok) {
            // Handle authentication errors
            if (response.status === 400 || response.status === 401) {
              try {
                const responseText = await response.text();
                const errorData = JSON.parse(responseText);
                
                // Check for refresh token errors or JWT expiration
                if (errorData.code === 'refresh_token_not_found' || 
                    errorData.message?.includes('JWT expired') ||
                    errorData.message?.includes('Invalid Refresh Token')) {
                  
                  // Force sign out and redirect to login
                  try {
                    await supabase.auth.signOut();
                  } catch (signOutError) {
                    console.error('Failed to sign out:', signOutError);
                    // Fallback: clear local storage
                    localStorage.clear();
                  }
                  
                  // Redirect to login page
                  window.location.href = '/login';
                  return response;
                }
                
                // Re-create response with the text we already read
                const newResponse = new Response(responseText, {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers
                });
                throw new Error(`HTTP error! status: ${newResponse.status}`);
              } catch (parseError) {
                // If we can't parse the response, just throw the original error
                throw new Error(`HTTP error! status: ${response.status}`);
              }
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response;
        })
        .finally(() => {
          clearTimeout(timeoutId);
        }),
      RETRY_COUNT,
      RETRY_DELAY
    );
  }
});

// Add health check function with retry and better error handling
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('artists').select('id').limit(1).single();
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found is still a successful connection
        return true;
      }
      console.error('Supabase connection check failed:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    return false;
  }
}

// Add connection state management with improved error handling
let isConnected = true;
let connectionCheckInterval: number | null = null;

export function startConnectionMonitoring(onConnectionChange?: (connected: boolean) => void) {
  if (connectionCheckInterval) return;

  const checkConnection = async () => {
    try {
      const connected = await checkSupabaseConnection();
      if (connected !== isConnected) {
        isConnected = connected;
        onConnectionChange?.(connected);
      }
    } catch (error) {
      console.error('Connection monitoring error:', error);
      if (isConnected) {
        isConnected = false;
        onConnectionChange?.(false);
      }
    }
  };

  connectionCheckInterval = window.setInterval(checkConnection, 30000) as unknown as number;

  // Initial check
  checkConnection();

  return () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
      connectionCheckInterval = null;
    }
  };
}

export function getConnectionState(): boolean {
  return isConnected;
}