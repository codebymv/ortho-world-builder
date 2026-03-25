export interface CriticalPathItemVisual {
  interactionId: string;
  itemId: string;
  collectedFlag: string;
  glowColor: number;
  haloColor?: number;
  spriteScale?: number;
  haloScale?: number;
  bobAmplitude?: number;
  hoverHeight?: number;
}

export const criticalPathItems: Record<string, CriticalPathItemVisual> = {
  hunter_clue: {
    interactionId: 'hunter_clue',
    itemId: 'hunters_manuscript',
    collectedFlag: 'hunters_manuscript_collected',
    glowColor: 0xffd54f,
    haloColor: 0xfff0a8,
    spriteScale: 0.62,
    haloScale: 0.92,
    bobAmplitude: 0.06,
    hoverHeight: 0.56,
  },
};
