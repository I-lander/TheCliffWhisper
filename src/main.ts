import { Device } from '@capacitor/device';
import { StatusBar } from '@capacitor/status-bar';
import { AndroidFullScreen } from '@awesome-cordova-plugins/android-full-screen';
import { initPhaserGame } from './game/main';

Device.getInfo().then((info) => {
  if (info.platform === 'android') {
    StatusBar.hide();
    AndroidFullScreen.immersiveMode();
  }
});

initPhaserGame();
