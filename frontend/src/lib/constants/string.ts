// Backend URL configuration
// Custom environment mode that can be controlled via APP_ENV
const isCustomDevelopment = process.env.APP_ENV === 'development';
const isCustomProduction = process.env.APP_ENV === 'production';

export const BACKEND_URL = isCustomDevelopment
  ? 'http://localhost:3000'
  : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://d2oc9fk5wyihzt.cloudfront.net';

// Helper function to get the full backend URL with http prefix
export const getBackendUrl = (): string => {
  // Check custom APP_ENV first, then fall back to NODE_ENV
  if (isCustomDevelopment) {
    return 'http://localhost:3000';
  } else if (isCustomProduction || process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://d2oc9fk5wyihzt.cloudfront.net';
  } else {
    // Default development behavior when APP_ENV is not set
    return 'http://localhost:3000';
  }
};

// Note: We now use form IDs directly from the API feed
// Forms are accessed via /get-involved/join-dte/{form_id} where form_id comes from the API