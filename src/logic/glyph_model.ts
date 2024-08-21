export type GlyphBlock = {
  id: string;
  startTimeMilis: number;
  durationMilis: number;
  startingBrightness: number;
  glyphId: number;
  isSelected: boolean;
  effectId: number; //Check below for which effect relates to which number #efficienty
  effectData: number[];
};

// 0 -> Constant brightness
// 1 -> Fade In
// 2 -> Fade Out
