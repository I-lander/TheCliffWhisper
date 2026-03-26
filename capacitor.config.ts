import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.donkeysisle.thecliffwhisperer',
  appName: 'The Cliff Whisperer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
