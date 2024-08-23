export const kTimeStepMilis = 16.666;
export const KDefaultPreviewGlyphFillColor = "#111111";
export const kAllowedModels = ["NP1", "NP1_15", "NP2_33", "NP2a"];
export const kMouseCursorOffset = 32;
export const kPhoneModelNames: { [key: string]: string } = {
  NP1: "Phone (1)",
  NP1_15: "Phone (1) | 15 Zone | Exp.",
  NP2_33: "Phone (2) | 33 Zone",
  NP2a: "Phone (2a)",
};
export const kEffectNames: { [key: number]: string } = {
  0: "Constant Brightness",
  1: "Smooth Fade",
  2: "Fade In",
  3: "Fade Out",
  4: "Fade In & Out",
  5: "Strobe",
  6: "Chaos",
  7: "Single Heartbeat",
  8: "Chaos v2",
  9: "Metro - 1 sec",
  10: "Metro - 2 sec",
  11: "Metro - 4 sec",
  12: "Metro - 8 sec",
};

// Version Info
// TODO: Remember to update on releases
export const kMajorVersion = 1;
export const kMinorVersion = 1;
export const kPatchVersion = 2;
export const kAppVersion = `${kMajorVersion}.${kMinorVersion}.${kPatchVersion}`;
// 80px = 1sec

// App Name
export const kAppName = "Better Nothing Glyph Composer (ツ)";
