import '@fontsource/noto-sans-jp/japanese-300.css';
import '@fontsource/noto-sans-jp/japanese-400.css';
import '@fontsource/noto-sans-jp/japanese-500.css';
import '@fontsource/noto-sans-jp/japanese-700.css';
import '@fontsource/roboto/latin-300.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes } from 'react-router';
import { LanguageSwitcher } from './components/languageSwitcher';
import { WebBluetoothInitializer } from './components/webBluetoothInitializer';
import { WebMidiInitializer } from './components/webMidiInitializer';
import { BackActionHandler } from './features/backAction/backActionHandler';
import { RCPLogPageTransitionMonitor } from './features/rcplog/rcpLogPageTransitionMonitor';
import { RCPLogStateHandler } from './features/rcplog/rcpLogStateHandler';
import { SystemDevice } from './functions/systemDevice';
import { useSystemColorScheme } from './hooks/useSystemColorScheme';
import { RouteMap } from './routes';
import { AppearanceMode } from './stores/preference/preferenceSlice';
import { RootState } from './stores/store';

function App() {
  const appearanceMode = useSelector(
    (state: RootState) => state.preference.appearance
  );
  const scheme = useSystemColorScheme();

  const theme = useMemo(() => {
    function getThemeMode() {
      switch (appearanceMode) {
        case AppearanceMode.Light:
          return 'light';
        case AppearanceMode.Dark:
          return 'dark';
        case AppearanceMode.System:
          return scheme; // システム設定に従う
        default:
          return 'light';
      }
    }

    return createTheme({
      /*
      sx Prop や <Box> コンポーネントで設定する padding や margin には、
      spacing が単位が暗黙的に使用される。
      spacing: 1 は spacing 単位を 1px 相当として扱う設定。
      */
      spacing: 1,

      palette: {
        /*
        ダーク/ライトモードを反映させる。`mode` は MUI のカラースキームに直接影響。
        */
        mode: getThemeMode(),
      },

      typography: {
        fontFamily: `'Roboto', 'Noto Sans JP', sans-serif`,
      },
    });
  }, [appearanceMode, scheme]);

  return (
    <>
      <div
        /* 開発時のWEBブラウザ上にて、長押しによる context menu 表示を無効化する */
        onContextMenu={(e) => {
          if (!SystemDevice.isRunningOnQuattro) {
            e.preventDefault();
          }
        }}
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BackActionHandler />
          <RCPLogStateHandler />
          <RCPLogPageTransitionMonitor />
          <LanguageSwitcher />
          {SystemDevice.isRunningOnQuattro ? null : (
            <>
              <WebMidiInitializer />
              <WebBluetoothInitializer />
            </>
          )}
          <Routes>
            <Route
              path='/'
              element={<Navigate to={RouteMap.launch.path} replace />}
            />
            <Route
              path={RouteMap.launch.path}
              element={<RouteMap.launch.component />}
            />
            <Route
              path={RouteMap.root.path}
              element={<RouteMap.root.component />}
            >
              <Route
                path={RouteMap.home.path}
                element={<RouteMap.home.component />}
              />
              <Route
                path={RouteMap.midiDevice.path}
                element={<RouteMap.midiDevice.component />}
              />
              <Route
                path={RouteMap.signin.path}
                element={<RouteMap.signin.component />}
              />
              <Route
                path={RouteMap.preference.path}
                element={<RouteMap.preference.component />}
              />
              <Route
                path={RouteMap.about.path}
                element={<RouteMap.about.component />}
              />
              <Route
                path={RouteMap.license.path}
                element={<RouteMap.license.component />}
              />
              <Route
                path={RouteMap.midiCommunication.path}
                element={<RouteMap.midiCommunication.component />}
              />
              <Route
                path={RouteMap.about.path}
                element={<RouteMap.about.component />}
              />
              <Route
                path={RouteMap.virtualScroll.path}
                element={<RouteMap.virtualScroll.component />}
              />
              <Route
                path={RouteMap.nativeExtension.path}
                element={<RouteMap.nativeExtension.component />}
              />
              <Route
                path={RouteMap.termsOfUse.path}
                element={<RouteMap.termsOfUse.component />}
              />
              <Route
                path={RouteMap.midiRecorder.path}
                element={<RouteMap.midiRecorder.component />}
              />
              <Route
                path={RouteMap.midiSequencer.path}
                element={<RouteMap.midiSequencer.component />}
              />
              <Route
                path={RouteMap.tapTempo.path}
                element={<RouteMap.tapTempo.component />}
              />
              <Route
                path={RouteMap.smartDrumsMoc.path}
                element={<RouteMap.smartDrumsMoc.component />}
              />
              <Route
                path={RouteMap.calibration.path}
                element={<RouteMap.calibration.component />}
              />
              <Route
                path={RouteMap.calibrationPixi.path}
                element={<RouteMap.calibrationPixi.component />}
              />
              <Route
                path={RouteMap.drumRhythm.path}
                element={<RouteMap.drumRhythm.component />}
              />
              <Route
                path={RouteMap.drumRhythmRaw.path}
                element={<RouteMap.drumRhythmRaw.component />}
              />
              <Route
                path={RouteMap.drumRhythmCalibration.path}
                element={<RouteMap.drumRhythmCalibration.component />}
              />
              <Route
                path={RouteMap.drumRhythm3D.path}
                element={<RouteMap.drumRhythm3D.component />}
              />
              <Route
                path={RouteMap.drumRhythm3DBabylon.path}
                element={<RouteMap.drumRhythm3DBabylon.component />}
              />
            </Route>
          </Routes>
        </ThemeProvider>
      </div>
    </>
  );
}

export default App;
