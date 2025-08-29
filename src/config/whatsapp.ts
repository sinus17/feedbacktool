export const WHATSAPP_CONFIG = {
  API_URL: 'https://gate.whapi.cloud/messages/text',
  TOKEN: import.meta.env.VITE_WHAPI_TOKEN || '',
  TEAM_GROUP_ID: import.meta.env.VITE_TEAM_GROUP_ID || ''
} as const;