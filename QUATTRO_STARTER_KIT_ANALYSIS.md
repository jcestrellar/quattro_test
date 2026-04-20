# QuattroStarterKit — Project Analysis

**Version**: 1.3.1  
**Author**: Roland Corporation (Internal / Confidential — 関係者外秘)  
**Repository**: `rja.backlog.jp/git/QTTR2/quattro-starter-kit.git`  
**Primary Contributors**: Hiroto Oishi, Matsui Toshiaki, Sayori Takayama

---

## 1. What Is This Project?

QuattroStarterKit is **not just a React project** — it is Roland Corporation's official **multi-platform native app framework** built on top of React/TypeScript. The framework, called **Quattro**, wraps a WebView containing a React application and deploys it as a native app on **iOS, Android, Windows, and macOS** from a single codebase.

The starter kit serves two purposes:
1. **Reference implementation** — demonstrates every capability of the Quattro framework.
2. **Developer template** — starting point for building Roland-compatible music production applications.

The `quattro2/` directory at the root contains the native host per platform (Android project, macOS app, Win10 app) as a git submodule — this is where the actual native shell lives.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19.2 + TypeScript 6.0 |
| Build Tool | Vite 8.0 |
| State Management | Redux Toolkit + Redux-Saga |
| UI Components | Material-UI (MUI) v7 + Emotion |
| Routing | React Router v7 |
| i18n | i18next (English + Japanese) |
| 2D Graphics | PixiJS |
| 3D Graphics | Three.js, Babylon.js |
| Animations | Framer Motion |
| MIDI Parsing | @tonejs/midi |
| Cloud / IoT | AWS IoT Device SDK v2 (browser build) |

---

## 3. The Quattro Framework

The core of this project lives in `app/src/functions/quattro/`. These are TypeScript wrappers around a `$native` global object injected by the native host. When running in a browser (non-Quattro mode), the framework gracefully falls back to Web APIs.

### Quattro Modules

| Module | Responsibility |
|---|---|
| `Quattro.app` | App lifecycle, dialogs, storage, authentication, user agent |
| `Quattro.midi` | MIDI endpoint discovery, connection, send/receive |
| `Quattro.ble` | Bluetooth LE scanning, GATT read/write/notify |
| `Quattro.seq` | SMF (Standard MIDI File) playback sequencer |
| `Quattro.fs` | Native file system (read, write, dialogs, directory watch) |
| `Quattro.rcpLog` | Analytics telemetry to Roland Cloud |
| `Quattro.event` | Platform lifecycle events (app exit, QR scan, URL schemes) |
| `Quattro.extension` | Native extensions (battery level, mathematical calculations) |

### How the Native Bridge Works

The native host injects a `$native` object into the WebView's JavaScript context. Quattro modules call methods on `$native` and receive callbacks or events. When running in a browser, the modules detect `isRunningOnQuattro` via user-agent and switch to Web API implementations:

- `WebMidiManager` → Web MIDI API fallback  
- `WebBleManager` → Web Bluetooth API fallback  
- `StorageKey` → `localStorage` fallback

This means the entire app can be developed and tested in Chrome, then deployed natively without code changes.

---

## 4. MIDI Implementation

MIDI is a first-class citizen in this framework.

### Native MIDI (via Quattro)
- Full endpoint discovery (input/output)
- Send/receive MIDI messages as HEX strings (e.g., `"90607F"` = Note On, Ch 1, C4, vel 127)
- Full SysEx (System Exclusive) support
- SMF file playback via `Quattro.seq` (load, play, pause, tempo events)
- MIDI filter engine (filter messages by type, channel, note range)
- MIDI recorder (capture input to file)

### Web MIDI Fallback
- `WebMidiManager` wraps the standard Web MIDI API
- `WebMidiiBridge` provides the same interface as Quattro MIDI
- Available in Chrome/Edge browser without native host

### MIDI Utilities
- Tone.js used to parse `.mid` files into an internal format
- Binary ↔ HEX string conversion utilities
- Tap Tempo BPM detection

---

## 5. Bluetooth (BLE) Implementation

BLE is deeply integrated for wireless MIDI devices and IoT hardware.

### Native BLE (via Quattro)
- Device scanning with advertisement filtering
- Connect/disconnect lifecycle management
- GATT service/characteristic discovery
- Read, write, writeWithoutResponse operations
- Characteristic notifications and indications
- Supports: broadcast, read, write, writeWithoutResponse, notify, indicate properties

### Web Bluetooth Fallback
- `WebBleManager` wraps the standard Web Bluetooth API
- Same interface as the Quattro BLE module
- Enables BLE MIDI device pairing in browser (Chrome only)

### BLE MIDI
- `BLE MIDI Device Connection` feature handles BLE MIDI pairing as a dedicated flow
- Uses the BLE module to establish connection, then routes through MIDI infrastructure

---

## 6. Cloud & IoT Integration

### Roland Cloud (RCP)
The app is connected to Roland's cloud platform (RCP — Roland Control Platform):

| Service | Purpose |
|---|---|
| `rcpApiEndpoint` | Roland API (device data, user profiles) |
| `rcpSvcEndpoint` | Roland Cloud service backend |
| `rcpIotEndpoint` | Device IoT management |
| `rcpLog` | Analytics / telemetry collection |

### AWS IoT Core
- Uses AWS IoT Device SDK v2 (browser build, polyfilled for Vite)
- Device certificates loaded from platform file system
- Separate endpoints for `dev`, `test`, `staging`, `prod` environments
- Previously included full MQTT support (removed in recent commits per git history)

### Authentication
- OAuth sign-in with Roland Cloud account
- JWT token parsing for session management
- Opt-in analytics with privacy controls

---

## 7. Committed Features (What's Actually Built)

| Feature | Description |
|---|---|
| Home | Navigation dashboard |
| MIDI Device | Discover, connect, and manage MIDI endpoints |
| MIDI Communication | Send/receive arbitrary MIDI messages |
| MIDI Recorder | Record MIDI input with filter engine |
| MIDI Sequencer | Load and play back SMF files |
| Tap Tempo | BPM detection utility |
| Web MIDI Device (debug) | Web MIDI API UI for browser testing |
| BLE MIDI Device Connection | Bluetooth LE MIDI device pairing |
| Friend Jam Demo | V-Drums collaborative session demo |
| Native Extension | Battery monitor + mathematical calculations |
| Sign In | Roland Cloud authentication |
| Preference | Theme, language, analytics settings |
| License | OSS license viewer (auto-generated at build) |
| Terms of Use | Legal text display |
| About | App version info |
| Virtual Scroll | Performance testing component |

---

## 8. State Management Architecture

### Redux Store Slices

| Slice | State Managed |
|---|---|
| `user` | Sign-in state, auth tokens |
| `preference` | UI theme, language, analytics opt-in |
| `bleDevice` | BLE scan results, connection state |
| `midiDevice` | MIDI endpoint list, active connections |
| `midiCommunication` | MIDI message log, send state |
| `appSystem` | System initialization, platform info |

### Redux-Saga
Async side effects are handled via sagas:
- BLE scanning and connection flows
- MIDI device enumeration
- MIDI message routing
- App initialization sequence

---

## 9. Multi-Platform Build Pipeline

### Targets
- **iOS** — Xcode project in `quattro2/ios/`
- **Android** — Android Studio project in `quattro2/android/`
- **macOS** — Native macOS app in `quattro2/mac/`
- **Windows 10** — Win10 app in `quattro2/win10/`
- **Browser** — Standard Vite dev server for development

### Build Commands
```bash
npm run build:dev         # Debug build
npm run build:prod        # Production build with minification
npm run build-copy:dev    # Build + copy into native projects
npm run ios:all           # Full iOS build and run
npm run android:all       # Full Android build and run
npm run win:all           # Full Windows build and run
npm run mac:all           # Full macOS build and run
```

### Vite Configuration Highlights
- Target: ES2020, Chrome 87+, Safari 14+, Edge 88+, Firefox 78+
- AWS IoT SDK polyfills (Node.js → browser-safe aliases)
- Debug builds: inline source maps, no minification (iOS WebView debugger compatible)
- Production builds: full minification, no source maps
- Auto-generated OSS license report for app stores

---

## 10. Custom React Hooks

Platform-specific behavior is abstracted into hooks:

| Hook | Purpose |
|---|---|
| `useIsLandscape()` | Device orientation detection |
| `useSafeAreaInsets()` | Notch / status bar padding |
| `useSystemColorScheme()` | OS dark/light mode |

---

## 11. Internationalization

- Framework: i18next + react-i18next
- Languages: **English** and **Japanese** (default: Japanese with English fallback)
- Namespaces: `common` (UI strings), `error` (error messages)
- Key extraction via `i18next-cli`

---

## 12. What Makes This Special

1. **True cross-platform from one codebase** — iOS, Android, Mac, Windows, and browser all from a single React app. No Capacitor, no Cordova, no Expo — Roland built their own native shell.

2. **Production-grade MIDI stack** — not just Web MIDI. Full native MIDI endpoints on every platform with SysEx, BLE MIDI, SMF playback, and a filter/recorder engine.

3. **BLE + MIDI at the same time** — the BLE module and MIDI module work in parallel, allowing BLE MIDI devices alongside USB MIDI simultaneously.

4. **Native file system access** — real file I/O with platform-native file pickers, directory watching, and bundle asset management. Not limited to browser sandbox.

5. **Cloud-connected device architecture** — AWS IoT Core integration for device management (RCP platform). Designed for connected Roland hardware products, not generic music apps.

6. **Roland internal tooling** — uses Roland's own Backlog git server, internal API endpoints (`rcp*`), and analytics infrastructure. This is an actual internal Roland engineering framework, not an open-source or third-party tool.

7. **Confidential status** — marked 関係者外秘 (internal use only) as of April 2024, meaning it is intended only for Roland developers and licensed partners.

---

## 13. Summary

QuattroStarterKit is Roland Corporation's proprietary **cross-platform native app framework** for building music production applications. It is far more than a React template — it is a complete engineering platform that:

- Wraps React in a native host on 4 operating systems
- Provides production-grade MIDI, BLE, file system, and cloud APIs via a native JavaScript bridge
- Supports Web MIDI and Web Bluetooth as development fallbacks
- Connects to Roland's cloud infrastructure (RCP + AWS IoT Core)
- Handles the complete build pipeline from TypeScript to App Store submissions

For developers building Roland ecosystem products, this starter kit is the fastest path from code to shipping native apps on every major platform simultaneously.
