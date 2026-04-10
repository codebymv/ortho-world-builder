import { findHunterArc } from './arcs/findHunter';
import type { CampaignArc } from './types';

export const campaignArcs: CampaignArc[] = [
  findHunterArc,
];

export const campaignArcById = Object.fromEntries(
  campaignArcs.map(arc => [arc.id, arc]),
) as Record<string, CampaignArc>;
