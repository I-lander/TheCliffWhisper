import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.donkeysisle.thecliffwhisperer',
  appName: 'the-cliff-whisperer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
