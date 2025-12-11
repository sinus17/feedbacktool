// VAPID Keys for Web Push Notifications
// Public key is safe to expose in frontend
export const VAPID_PUBLIC_KEY = 'BLeXYHMpjqspKNY_pxGtuCHgDbH6IxE6Ksk0vAtZPySciN9JvgrDX20TtAbjLWapDQU_BYO3Qbc4IQr10MWZTDk';

// Private key should ONLY be used in backend/edge functions
// DO NOT import or use this in frontend code - use environment variables in edge functions instead

// Helper function to convert base64 string to Uint8Array
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
