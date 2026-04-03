import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sentinel.babel',
  appName: 'Library of Babel',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://srv1195671.hstgr.cloud/babel/',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
