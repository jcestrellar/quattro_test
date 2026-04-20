export enum StorageKey {
  AppLanguage = 'AppLanguage', // AppLanguage
  AppearanceMode = 'AppearanceMode', // AppearanceMode
  LaunchViewDisabled = 'LaunchViewDisabled', // true/false
  Optin = 'Optin', // true/false
  AgreedToTerms = 'AgreedToTerms', // true/false
  WebMidiEnabled = 'WebMidiEnabled', // true/false
  WebMidiLastConnectedInputId = 'WebMidiLastConnectedInputId', // string
  WebMidiLastConnectedOutputId = 'WebMidiLastConnectedOutputId', // string
  WifiPasswordPrefix = 'WifiPassword_',
  InputOffsetSec = 'InputOffsetSec', // float as string (seconds) — total end-to-end offset for compensation
  AudioOutputLatencySec = 'AudioOutputLatencySec', // float as string (seconds) — diagnostic
  CalibrationDone = 'CalibrationDone_v1', // true/false
}
