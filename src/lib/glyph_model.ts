export type GlyphBlock = {
  id: string;
  startTimeMilis: number;
  durationMilis: number;
  startingBrightness: number;
  glyphId: number;
  isSelected: boolean;
  effectId: number; //Check consts file for values #efficiency
  effectData: number[];
};

export type DeltaUpdateBlock = {
  startTimeMilis?: number;
  durationMilis?: number;
  startingBrightness?: number;
  effectId?: number;
};

export type GlyphGenerationModel = {
  generationStartTimeMilis: number;
  generationEndTimeMilis: number;
  generationDurationMilis: number;
  generationBlockBrightnessPercentage: number;
  generationBlockEffectId: number;
  generationGapMilis: number;
  generationGlyphZone: number;
};

export type GlyphStore = { [key: number]: GlyphBlock[] };
