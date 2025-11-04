/**
 * Environment variable utility that works with both Vite and Jest
 */

// For Vite (browser) environment
export const getEnvVar = (key: string): string => {
  // Check if we're in a Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || '';
  }
  
  // Check if we're in a Node.js/Jest environment
  if (typeof process !== 'undefined' && process.env) {
    // Handle both VITE_ and REACT_APP_ prefixes for backward compatibility
    return process.env[key] || process.env[`REACT_APP_${key.replace('VITE_', '')}`] || '';
  }
  
  return '';
};

// Export all environment variables with proper fallbacks
export const env = {
  // Supabase
  VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
  VITE_SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  
  // Roboflow
  VITE_ROBOFLOW_API_KEY: getEnvVar('VITE_ROBOFLOW_API_KEY'),
  VITE_ROBOFLOW_MODEL_ID: getEnvVar('VITE_ROBOFLOW_MODEL_ID'),
  VITE_ROBOFLOW_URL: getEnvVar('VITE_ROBOFLOW_URL'),
  
  // Ngrok
  VITE_NGROK_URL: getEnvVar('VITE_NGROK_URL'),
  
  // Gemini
  VITE_GEMINI_API_KEY: getEnvVar('VITE_GEMINI_API_KEY'),
  
  // Mock flags for testing
  VITE_USE_MOCK_HARDWARE: getEnvVar('VITE_USE_MOCK_HARDWARE'),
  VITE_USE_MOCK_AUTH: getEnvVar('VITE_USE_MOCK_AUTH'),
  
};