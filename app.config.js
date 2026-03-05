require('dotenv/config');

const appJson = require('./app.json');

module.exports = () => {
  const baseConfig = appJson.expo;
  const projectId = process.env.EAS_PROJECT_ID || '353f52c9-6c8c-429d-aeb3-3fcff2215337';

  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra || {}),
      eas: {
        ...((baseConfig.extra && baseConfig.extra.eas) || {}),
        projectId,
      },
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      SYNC_ENDPOINT: process.env.SYNC_ENDPOINT || process.env.EXPO_PUBLIC_SYNC_ENDPOINT || '',
      EXPO_PUBLIC_SYNC_DIRECT_FALLBACK:
        process.env.EXPO_PUBLIC_SYNC_DIRECT_FALLBACK || process.env.SYNC_DIRECT_FALLBACK || 'false',
    },
  };
};
