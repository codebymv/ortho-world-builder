import { deepWoodsArc } from './arcs/deepWoods';
import { findHunterArc } from './arcs/findHunter';
import { shadowCastleArc } from './arcs/shadowCastle';
import type { CampaignArc } from './types';

export const campaignArcs: CampaignArc[] = [
  findHunterArc,
  deepWoodsArc,
  shadowCastleArc,
];

export const campaignArcById = Object.fromEntries(
  campaignArcs.map(arc => [arc.id, arc]),
) as Record<string, CampaignArc>;
