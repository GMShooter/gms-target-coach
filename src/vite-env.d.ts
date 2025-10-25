/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_GEMINI_API_KEY: string
  
  // Legacy React App variables (for backward compatibility)
  readonly REACT_APP_SUPABASE_URL: string
  readonly REACT_APP_SUPABASE_ANON_KEY: string
  readonly REACT_APP_FIREBASE_API_KEY: string
  readonly REACT_APP_FIREBASE_AUTH_DOMAIN: string
  readonly REACT_APP_FIREBASE_PROJECT_ID: string
  readonly REACT_APP_FIREBASE_STORAGE_BUCKET: string
  readonly REACT_APP_FIREBASE_MESSAGING_SENDER_ID: string
  readonly REACT_APP_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}