import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.donkeysisle.thecliffwhisper',
  appName: 'the-cliff-whisper',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
