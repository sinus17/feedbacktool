export const WHATSAPP_CONFIG = {
  API_URL: 'https://gate.whapi.cloud/messages/text',
  TOKEN: import.meta.env.VITE_WHAPI_TOKEN || '',
  TEAM_GROUP_ID: import.meta.env.VITE_TEAM_GROUP_ID || '',
  AD_CREATIVE_GROUP_ID: import.meta.env.VITE_AD_CREATIVE_GROUP_ID || '120363376937486419'
} as const;