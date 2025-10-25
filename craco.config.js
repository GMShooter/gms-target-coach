const path = require('path');

module.exports = {
  style: {
    postcss: {
      plugins: {
        '@tailwindcss/postcss': {},
        autoprefixer: {},
      },
    },
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Ensure environment variables are properly loaded
      webpackConfig.plugins.forEach(plugin => {
        if (plugin.constructor.name === 'DefinePlugin') {
          // Add explicit environment variable handling
          plugin.definitions['process.env.REACT_APP_SUPABASE_URL'] = JSON.stringify(process.env.REACT_APP_SUPABASE_URL);
          plugin.definitions['process.env.REACT_APP_SUPABASE_ANON_KEY'] = JSON.stringify(process.env.REACT_APP_SUPABASE_ANON_KEY);
          plugin.definitions['process.env.REACT_APP_FIREBASE_API_KEY'] = JSON.stringify(process.env.REACT_APP_FIREBASE_API_KEY);
          plugin.definitions['process.env.REACT_APP_FIREBASE_AUTH_DOMAIN'] = JSON.stringify(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
          plugin.definitions['process.env.REACT_APP_FIREBASE_PROJECT_ID'] = JSON.stringify(process.env.REACT_APP_FIREBASE_PROJECT_ID);
          plugin.definitions['process.env.REACT_APP_FIREBASE_STORAGE_BUCKET'] = JSON.stringify(process.env.REACT_APP_FIREBASE_STORAGE_BUCKET);
          plugin.definitions['process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID'] = JSON.stringify(process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID);
          plugin.definitions['process.env.REACT_APP_FIREBASE_APP_ID'] = JSON.stringify(process.env.REACT_APP_FIREBASE_APP_ID);
        }
      });

      // Add path alias for @/ imports
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@': path.resolve(__dirname, 'src')
      };

      // Fix for MagicUI and other ES modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "fs": false,
        "path": false,
        "os": false
      };

      return webpackConfig;
    }
  },
  devServer: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  }
};