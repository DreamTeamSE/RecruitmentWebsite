// Backend URL configuration
// Custom environment mode that can be controlled via APP_ENV
const isCustomDevelopment = process.env.APP_ENV === 'development';
const isCustomProduction = process.env.APP_ENV === 'production';

export const BACKEND_URL = isCustomDevelopment
  ? 'localhost:3000'
  : process.env.BACKEND_URL || 'localhost:3000';

// Helper function to get the full backend URL with http prefix
export const getBackendUrl = (): string => {
  let baseUrl: string;
  
  // Check custom APP_ENV first, then fall back to NODE_ENV
  if (isCustomDevelopment) {
    baseUrl = 'localhost:3000';
  } else if (isCustomProduction || process.env.NODE_ENV === 'production') {
    baseUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'localhost:3000';
  } else {
    // Default development behavior when APP_ENV is not set
    baseUrl = 'localhost:3000';
  }
  
  return baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;
};

// Note: We now use form IDs directly from the API feed
// Forms are accessed via /get-involved/join-dte/{form_id} where form_id comes from the API