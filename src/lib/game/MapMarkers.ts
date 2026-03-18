// Map marker system - POIs revealed through dialogue, quests, signs, etc.

export interface MapMarker {
  id: string;
  label: string;
  // Tile coordinates (not world coords)
  tileX: number;
  tileY: number;
  map: string; // which map this marker is on
  type: 'quest' | 'poi' | 'danger' | 'npc' | 'portal';
  // Visual
  color: string; // hex color for the ping
  pulseUntil: number; // timestamp when pulsing stops (keeps showing but stops animating)
  createdAt: number;
  permanent: boolean; // stays on map even after pulse ends
}

// Known locations that can be referenced in dialogue/quests
// Maps keyword patterns to tile coordinates and map names
export interface KnownLocation {
  keywords: string[]; // lowercase keywords that trigger this marker
  tileX: number;
  tileY: number;
  map: string;
  label: string;
  type: MapMarker['type'];
  color: string;
}

// Portal connections: which portal in 'fromMap' leads to 'toMap'
export interface PortalLink {
  fromMap: string;
  toMap: string;
  portalTileX: number;
  portalTileY: number;
}

export const PORTAL_LINKS: PortalLink[] = [
  // Village portals
  { fromMap: 'village', toMap: 'forest', portalTileX: 120, portalTileY: 4 },
  { fromMap: 'village', toMap: 'forest', portalTileX: 237, portalTileY: 80 },
  { fromMap: 'village', toMap: 'deep_woods', portalTileX: 120, portalTileY: 156 },
  // Forest portals
  { fromMap: 'forest', toMap: 'village', portalTileX: 150, portalTileY: 294 },
  { fromMap: 'forest', toMap: 'village', portalTileX: 4, portalTileY: 150 },
  { fromMap: 'forest', toMap: 'deep_woods', portalTileX: 150, portalTileY: 4 },
  { fromMap: 'forest', toMap: 'ruins', portalTileX: 296, portalTileY: 150 },
  // Deep woods portals
  { fromMap: 'deep_woods', toMap: 'village', portalTileX: 120, portalTileY: 4 },
  { fromMap: 'deep_woods', toMap: 'ruins', portalTileX: 236, portalTileY: 120 },
  // Ruins portals
  { fromMap: 'ruins', toMap: 'forest', portalTileX: 4, portalTileY: 100 },
  { fromMap: 'ruins', toMap: 'deep_woods', portalTileX: 4, portalTileY: 50 },
];

export const KNOWN_LOCATIONS: KnownLocation[] = [
  // Village locations
  { keywords: ['cemetery', 'graveyard', 'tombstone'], tileX: 24, tileY: 26, map: 'village', label: 'Cemetery', type: 'poi', color: '#9370DB' },
  { keywords: ['market', 'shop', 'merchant'], tileX: 170, tileY: 72, map: 'village', label: 'Market District', type: 'poi', color: '#FFD700' },
  { keywords: ['training ground', 'training'], tileX: 182, tileY: 28, map: 'village', label: 'Training Grounds', type: 'poi', color: '#FF6347' },
  { keywords: ['elder', 'village elder'], tileX: 102, tileY: 70, map: 'village', label: 'Village Elder', type: 'npc', color: '#FFD700' },
  { keywords: ['blacksmith', 'forge', 'grond'], tileX: 155, tileY: 72, map: 'village', label: 'Blacksmith', type: 'npc', color: '#FF8C00' },
  { keywords: ['healer', 'sister lenna'], tileX: 110, tileY: 95, map: 'village', label: 'Healer', type: 'npc', color: '#98FB98' },
  { keywords: ['farm', 'farmer', 'crops', 'cabbage'], tileX: 40, tileY: 112, map: 'village', label: 'Farmlands', type: 'poi', color: '#8B7355' },
  { keywords: ['church'], tileX: 51, tileY: 37, map: 'village', label: 'Church', type: 'poi', color: '#E0E0E0' },
  { keywords: ['old well', 'well'], tileX: 38, tileY: 60, map: 'village', label: 'Old Well', type: 'poi', color: '#4169E1' },
  { keywords: ['fort', 'watchtower'], tileX: 200, tileY: 26, map: 'village', label: 'North Fort', type: 'danger', color: '#FF4500' },
  { keywords: ['lake'], tileX: 185, tileY: 120, map: 'village', label: 'Village Lake', type: 'poi', color: '#4169E1' },

  // Forest locations
  { keywords: ['forest', 'whispering woods', 'woods'], tileX: 150, tileY: 150, map: 'forest', label: 'Whispering Woods', type: 'danger', color: '#228B22' },
  { keywords: ['ranger', 'ranger outpost'], tileX: 70, tileY: 70, map: 'forest', label: 'Ranger Outpost', type: 'poi', color: '#8FBC8F' },
  
  // Deep woods
  { keywords: ['deep woods', 'shadow', 'shadow creature', 'shadow beast'], tileX: 120, tileY: 120, map: 'deep_woods', label: 'Deep Woods', type: 'danger', color: '#4B0082' },
  { keywords: ['hunter', 'missing hunter'], tileX: 120, tileY: 120, map: 'deep_woods', label: 'Missing Hunter', type: 'quest', color: '#FF4500' },

  // Ruins  
  { keywords: ['ancient ruins', 'ruins', 'ancient ruin', 'temple', 'vault'], tileX: 100, tileY: 100, map: 'ruins', label: 'Ancient Ruins', type: 'danger', color: '#B8860B' },
  { keywords: ['rare ore', 'ore'], tileX: 100, tileY: 100, map: 'ruins', label: 'Rare Ore', type: 'quest', color: '#C0C0C0' },

  // Enemies
  { keywords: ['wolf', 'wolves'], tileX: 85, tileY: 15, map: 'village', label: 'Wolf Territory', type: 'danger', color: '#808080' },
  { keywords: ['slime', 'slimes'], tileX: 55, tileY: 118, map: 'village', label: 'Slime Infestation', type: 'danger', color: '#32CD32' },
  { keywords: ['bandit', 'bandits'], tileX: 223, tileY: 14, map: 'village', label: 'Bandit Camp', type: 'danger', color: '#8B0000' },
  { keywords: ['skeleton', 'undead'], tileX: 15, tileY: 25, map: 'village', label: 'Undead', type: 'danger', color: '#D3D3D3' },
  { keywords: ['spider', 'spiders'], tileX: 214, tileY: 123, map: 'village', label: 'Spider Nest', type: 'danger', color: '#800080' },
  { keywords: ['golem', 'stone golem'], tileX: 200, tileY: 26, map: 'village', label: 'Golem', type: 'danger', color: '#696969' },
];

/**
 * Scan dialogue text for keyword matches and return relevant markers.
 * Also handles cross-map portal highlighting.
 */
export function extractMarkersFromText(
  text: string,
  currentMap: string,
  existingMarkerIds: Set<string>,
): MapMarker[] {
  const lower = text.toLowerCase().replace(/\*\*|__/g, ''); // strip rich text markers
  const now = Date.now();
  const markers: MapMarker[] = [];
  const addedIds = new Set<string>();

  for (const loc of KNOWN_LOCATIONS) {
    // Check if any keyword appears in the text
    const matched = loc.keywords.some(kw => lower.includes(kw));
    if (!matched) continue;

    const markerId = `${loc.map}_${loc.label}`;
    if (existingMarkerIds.has(markerId) || addedIds.has(markerId)) continue;
    addedIds.add(markerId);

    if (loc.map === currentMap) {
      // Same map: mark the actual location
      markers.push({
        id: markerId,
        label: loc.label,
        tileX: loc.tileX,
        tileY: loc.tileY,
        map: loc.map,
        type: loc.type,
        color: loc.color,
        pulseUntil: now + 15000, // pulse for 15 seconds
        createdAt: now,
        permanent: true,
      });
    } else {
      // Different map: find the portal that leads to that map
      const portal = PORTAL_LINKS.find(p => p.fromMap === currentMap && p.toMap === loc.map);
      if (portal) {
        const portalMarkerId = `portal_to_${loc.map}`;
        if (!existingMarkerIds.has(portalMarkerId) && !addedIds.has(portalMarkerId)) {
          addedIds.add(portalMarkerId);
          markers.push({
            id: portalMarkerId,
            label: `→ ${loc.label}`,
            tileX: portal.portalTileX,
            tileY: portal.portalTileY,
            map: currentMap,
            type: 'portal',
            color: '#9370DB',
            pulseUntil: now + 20000,
            createdAt: now,
            permanent: true,
          });
        }
      }
      // Also add the actual location marker (for when the player gets to that map)
      markers.push({
        id: markerId,
        label: loc.label,
        tileX: loc.tileX,
        tileY: loc.tileY,
        map: loc.map,
        type: loc.type,
        color: loc.color,
        pulseUntil: now + 15000,
        createdAt: now,
        permanent: true,
      });
    }
  }

  return markers;
}
