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
    itemId: 'manuscript_fragment',
    collectedFlag: 'manuscript_fragment_collected',
    glowColor: 0xffd54f,
    haloColor: 0xfff0a8,
    spriteScale: 0.62,
    haloScale: 0.92,
    bobAmplitude: 0.06,
    hoverHeight: 0.56,
  },
  hollow_manuscript: {
    interactionId: 'hollow_manuscript',
    itemId: 'hunters_manuscript',
    collectedFlag: 'hunters_manuscript_collected',
    glowColor: 0xce93d8,
    haloColor: 0xf3e5f5,
    spriteScale: 0.68,
    haloScale: 0.98,
    bobAmplitude: 0.07,
    hoverHeight: 0.6,
  },
};
