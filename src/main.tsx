import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

// TEMPORARILY DISABLED - Unregister existing service workers
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('🗑️ Unregistered service worker:', registration.scope);
      }
      
      // Clear all caches
      const cacheNames = await caches.keys();
      for (let cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('🗑️ Deleted cache:', cacheName);
      }
      
      console.log('✅ All service workers and caches cleared');
    } catch (error) {
      console.error('❌ Failed to clear service workers:', error);
    }
  });
}

// Register Service Worker for PWA (skip in Instagram in-app browser)
// const isInstagramBrowser = /Instagram/i.test(navigator.userAgent);
// if ('serviceWorker' in navigator && !isInstagramBrowser) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')
//       .then((registration) => {
//         console.log('✅ Service Worker registered:', registration);
//         
//         // Check for updates immediately on page load
//         registration.update().then(() => {
//           console.log('🔍 Checked for service worker updates on page load');
//         });
//         
//         // Check for updates every 60 seconds
//         setInterval(() => {
//           registration.update();
//         }, 60000);
//         
//         // Listen for new service worker waiting to activate
//         registration.addEventListener('updatefound', () => {
//           const newWorker = registration.installing;
//           if (newWorker) {
//             newWorker.addEventListener('statechange', () => {
//               if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
//                 // New service worker available, reload the page
//                 console.log('🔄 New service worker available, reloading...');
//                 window.location.reload();
//               }
//             });
//           }
//         });
//       })
//       .catch((error) => {
//         console.error('❌ Service Worker registration failed:', error);
//       });
//   });
// } else if (isInstagramBrowser) {
//   console.log('📱 Instagram browser detected - Service Worker disabled');
// }

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found');
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <Toaster position="top-center" />
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Error rendering app:', error);
    const isInstagram = /Instagram/i.test(navigator.userAgent);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; color: white; background: #1f2937; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <h1>Application Error</h1>
        <p>Failed to load the application.${isInstagram ? ' Instagram browser detected.' : ''}</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 10px;">Try opening in your default browser for best experience.</p>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}