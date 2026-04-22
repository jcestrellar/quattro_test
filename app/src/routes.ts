import { AboutPage } from './pages/aboutPage/aboutPage';
import { CalibrationPage } from './pages/calibrationPage/calibrationPage';
import { CalibrationPixiPage } from './pages/calibrationPixiPage/calibrationPixiPage';
import { DrumRhythmPage } from './pages/drumRhythmPage/drumRhythmPage';
import { DrumRhythmRawPage } from './pages/drumRhythmRawPage/drumRhythmRawPage';
import { DrumRhythmCalibrationPage } from './pages/drumRhythmCalibrationPage/drumRhythmCalibrationPage';
import { DrumRhythm3DPage } from './pages/drumRhythm3DPage/drumRhythm3DPage';
import { DrumRhythm3DBabylonPage } from './pages/drumRhythm3DBabylonPage/drumRhythm3DBabylonPage';
import { DrumRhythm3DBabylonConcertPage } from './pages/drumRhythm3DBabylonConcertPage/drumRhythm3DBabylonConcertPage';
import { DrumRhythm3DBabylonConcertShowPage } from './pages/drumRhythm3DBabylonConcertShowPage/drumRhythm3DBabylonConcertShowPage';
import { FriendJamDemoPage } from './pages/friendJamDemoPage/friendJamDemoPage';
import { HomePage } from './pages/homePage/homePage';
import { LaunchPage } from './pages/lauchPage/launchPage';
import { LicensePage } from './pages/licensePage/licensePage';
import { MidiCommunicationPage } from './pages/midiConnectionPage/midiConnectionPage';
import { MidiDevicePage } from './pages/midiDevicePage/midiDevicePage';
import { MidiRecorderPage } from './pages/midiRecorderPage/midiRecorderPage';
import { MidiSequencerPage } from './pages/midiSequencerPage/midiSequencerPage';
import { NativeExtensionPage } from './pages/nativeExtensionPage/nativeExtensionPage';
import { PreferencePage } from './pages/preferencePage/preferencePage';
import { RootPage } from './pages/rootPage/rootPage';
import { SigninPage } from './pages/signinPage/signinPage';
import { TapTempoPage } from './pages/tapTempoPage/tapTempoPage';
import { TermsOfUsePage } from './pages/termsOfUsePage/termsOfUsePage';
import { VirtualScrollPage } from './pages/virtualScrollPage/virtualScrollPage';
// i18next-parserが検出できるように、多言語対象の文字列を定義する
/*
 t('Home');
 t('Signin');
 t('Calibration');
 t('Calibration PixiJS');
 t('MIDI Device');
 t('MIDI Communication');
 t('MIDI Recorder');
 t('MIDI Sequencer');
 t('Preference');
 t('License');
 t('Virtual Scroll');
 t('Native Extension');
 t('Terms of use');
 t('Web MIDI Device（Debug;
 t('Tap Tempo')'
 t('Drum Rhythm')
 t('Drum Rhythm (Raw)')
*/

export const RouteMap = {
  root: {
    path: 'root',
    component: RootPage,
    title: '',
  },
  home: {
    path: 'home',
    component: HomePage,
    title: 'Home',
  },
  signin: {
    path: 'signin',
    component: SigninPage,
    title: 'Signin',
  },
  midiDevice: {
    path: 'midiDevice',
    component: MidiDevicePage,
    title: 'MIDI Device',
  },
  about: {
    path: 'about',
    component: AboutPage,
    title: 'About',
  },
  preference: {
    path: 'preference',
    component: PreferencePage,
    title: 'Preference',
  },
  license: {
    path: 'license',
    component: LicensePage,
    title: 'License',
  },
  midiCommunication: {
    path: 'midiCommunication',
    component: MidiCommunicationPage,
    title: 'MIDI Communication',
  },
  virtualScroll: {
    path: 'virtualScroll',
    component: VirtualScrollPage,
    title: 'Virtual Scroll',
  },
  nativeExtension: {
    path: 'nativeExtension',
    component: NativeExtensionPage,
    title: 'Native Extension',
  },
  termsOfUse: {
    path: 'termsOfUse',
    component: TermsOfUsePage,
    title: 'Terms of use',
  },
  launch: {
    path: 'launch',
    component: LaunchPage,
    title: '',
  },
  midiRecorder: {
    path: 'MidiRecorder',
    component: MidiRecorderPage,
    title: 'MIDI Recorder',
  },
  midiSequencer: {
    path: 'MidiSequencer',
    component: MidiSequencerPage,
    title: 'MIDI Sequencer',
  },
  tapTempo: {
    path: 'TapTempo',
    component: TapTempoPage,
    title: 'Tap Tempo',
  },
  smartDrumsMoc: {
    path: 'friendJamDemo',
    component: FriendJamDemoPage,
    title: 'Friend Jam Demo',
  },
  calibration: {
    path: 'calibration',
    component: CalibrationPage,
    title: 'Calibration',
  },
  calibrationPixi: {
    path: 'calibrationPixi',
    component: CalibrationPixiPage,
    title: 'Calibration PixiJS',
  },
  drumRhythm: {
    path: 'drumRhythm',
    component: DrumRhythmPage,
    title: 'Drum Rhythm',
  },
  drumRhythmRaw: {
    path: 'drumRhythmRaw',
    component: DrumRhythmRawPage,
    title: 'Drum Rhythm (Raw)',
  },
  drumRhythmCalibration: {
    path: 'drumRhythmCalibration',
    component: DrumRhythmCalibrationPage,
    title: 'Drum Rhythm Calibration',
  },
  drumRhythm3D: {
    path: 'drumRhythm3D',
    component: DrumRhythm3DPage,
    title: 'Drum Rhythm 3D (Three.js)',
  },
  drumRhythm3DBabylon: {
    path: 'drumRhythm3DBabylon',
    component: DrumRhythm3DBabylonPage,
    title: 'Drum Rhythm 3D (Babylon.js)',
  },
  drumRhythm3DBabylonConcert: {
    path: 'drumRhythm3DBabylonConcert',
    component: DrumRhythm3DBabylonConcertPage,
    title: 'Drum Rhythm 3D · Concierto (Babylon.js)',
  },
  drumRhythm3DBabylonConcertShow: {
    path: 'drumRhythm3DBabylonConcertShow',
    component: DrumRhythm3DBabylonConcertShowPage,
    title: 'Drum Rhythm 3D · Concierto show (Babylon.js)',
  },
} as const;
