import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.donkeysisle.thecliffwhisper',
  appName: 'The Cliff Whisper',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
