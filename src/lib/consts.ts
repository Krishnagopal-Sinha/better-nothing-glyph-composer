export const kTimeStepMilis = 16.666;
export const KDefaultPreviewGlyphFillColor = '#111111';
export const kAllowedModels = ['NP1', 'NP1_15', 'NP2', 'NP2a'];
export const kMouseCursorOffset = 32;
export const kWidthBound = 1420;
export const kMaxBrightness = 4095;
export const kPhoneModelNames: { [key: string]: string } = {
  NP1: 'Phone (1)',
  NP1_15: 'Phone (1) | 15 Zone',
  NP2: 'Phone (2)',
  NP2a: 'Phone (2a) / (2a) Plus'
};
export const kPhoneZones: { [key: number]: string } = {
  5: 'Phone (1)',
  15: 'Phone (1) | 15 Zone',
  33: 'Phone (2)',
  26: 'Phone (2a) / (2a) Plus'
};
export const kEffectNames: { [key: number]: string } = {
  0: 'Constant Brightness',
  1: 'Smooth Fade',
  2: 'Fade In',
  3: 'Fade Out',
  4: 'Fade In & Out',
  5: 'Strobe',
  6: 'Chaos',
  7: 'Single Heartbeat',
  8: 'Chaos v2',
  9: 'Max Strobe!',
  10: 'Pulse End',
  11: 'Metronome - 1s'
  // 101: "Unknown / Imported",
};

// Version Info
// TODO: Remember to update on releases
export const kMajorVersion = 1;
export const kMinorVersion = 1;
export const kPatchVersion = 7;
export const kAppVersion = `${kMajorVersion}.${kMinorVersion}.${kPatchVersion}`;
// 80px = 1sec

// App Name
export const kAppName = 'Better Nothing Glyph Composer (ツ)';
