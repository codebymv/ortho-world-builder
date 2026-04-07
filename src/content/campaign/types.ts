export type CampaignBeatRole =
  | 'hub'
  | 'briefing'
  | 'investigation'
  | 'discovery'
  | 'boss'
  | 'return'
  | 'revelation'
  | 'dungeon'
  | 'resolution';

export interface CampaignBeat {
  id: string;
  label: string;
  role: CampaignBeatRole;
  summary: string;
  maps: string[];
  quests?: string[];
  items?: string[];
}

export interface CampaignArc {
  id: string;
  label: string;
  act: number;
  summary: string;
  maps: string[];
  quests: string[];
  items?: string[];
  beats: CampaignBeat[];
}
