import type { GameState } from '@/lib/game/GameState';

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
  // Forest portals
  { fromMap: 'forest', toMap: 'village', portalTileX: 150, portalTileY: 294 },
  { fromMap: 'forest', toMap: 'village', portalTileX: 4, portalTileY: 150 },
];

export const KNOWN_LOCATIONS: KnownLocation[] = [
  // Village locations
  { keywords: ['cemetery', 'graveyard', 'tombstone'], tileX: 24, tileY: 26, map: 'village', label: 'Cemetery', type: 'poi', color: '#9370DB' },
  { keywords: ['market', 'shop', 'merchant'], tileX: 170, tileY: 72, map: 'village', label: 'Market District', type: 'poi', color: '#FFD700' },
  { keywords: ['training ground', 'training'], tileX: 182, tileY: 28, map: 'village', label: 'Training Grounds', type: 'poi', color: '#FF6347' },
  { keywords: ['elder', 'village elder'], tileX: 124, tileY: 100, map: 'village', label: 'Village Elder', type: 'npc', color: '#FFD700' },
  { keywords: ['blacksmith', 'forge', 'grond'], tileX: 155, tileY: 72, map: 'village', label: 'Blacksmith', type: 'npc', color: '#FF8C00' },
  { keywords: ['healer', 'sister lenna'], tileX: 110, tileY: 95, map: 'village', label: 'Healer', type: 'npc', color: '#98FB98' },
  { keywords: ['farm', 'farmer', 'crops', 'cabbage'], tileX: 40, tileY: 112, map: 'village', label: 'Farmlands', type: 'poi', color: '#8B7355' },
  { keywords: ['church'], tileX: 51, tileY: 37, map: 'village', label: 'Church', type: 'poi', color: '#E0E0E0' },
  { keywords: ['old well', 'well'], tileX: 38, tileY: 60, map: 'village', label: 'Old Well', type: 'poi', color: '#4169E1' },
  { keywords: ['fort', 'watchtower'], tileX: 200, tileY: 26, map: 'village', label: 'North Fort', type: 'danger', color: '#FF4500' },
  { keywords: ['lake'], tileX: 185, tileY: 120, map: 'village', label: 'Village Lake', type: 'poi', color: '#4169E1' },

  // Forest locations

  { keywords: ['ranger outpost'], tileX: 140, tileY: 170, map: 'forest', label: 'Ranger Outpost', type: 'poi', color: '#8FBC8F' },
  { keywords: ['ranger cottage'], tileX: 236, tileY: 227, map: 'forest', label: 'Ranger Cottage', type: 'poi', color: '#9370DB' },
  // Fort gate key — use "chapel ruins" only (not plain "chapel") so village chapel dialogue does not ping the woods.
  // Points at the actual chapel_dead_ranger remains (forest map x:65,y:183); the old (55,114) was ~70 tiles off.
  { keywords: ['chapel ruins'], tileX: 65, tileY: 183, map: 'forest', label: 'Chapel Ruins (ranger remains)', type: 'poi', color: '#A1887F' },
  { keywords: ['disparaged cottage', 'hunter cottage', 'old shack', 'shack', 'run down old shack'], tileX: 137, tileY: 184, map: 'forest', label: 'Disparaged Cottage', type: 'quest', color: '#FFD700' },
  
  // Whispering Woods quests
  { keywords: ['hunter', 'missing hunter', 'hunter manuscript', 'manuscript', 'find signs'], tileX: 137, tileY: 184, map: 'forest', label: 'Disparaged Cottage', type: 'quest', color: '#FFD700' },
  { keywords: ['return to the elder', 'findings'], tileX: 102, tileY: 70, map: 'village', label: 'Report to Elder', type: 'quest', color: '#FFD700' },

  // Guilrhym
  { keywords: ['guilrhym', 'city', 'victorian', 'urban'], tileX: 150, tileY: 150, map: 'guilrhym', label: 'Guilrhym', type: 'danger', color: '#696969' },
  { keywords: ['oliver', 'injured warrior'], tileX: 135, tileY: 268, map: 'guilrhym', label: 'Oliver', type: 'npc', color: '#CD853F' },
  { keywords: ['tolbooth', 'clocktower', 'clock tower', 'the tolbooth'], tileX: 118, tileY: 250, map: 'guilrhym', label: 'The Tolbooth', type: 'poi', color: '#C0A060' },
  { keywords: ['cathedral', 'reaver', 'ashen reaver'], tileX: 150, tileY: 48, map: 'guilrhym', label: 'Cathedral Steps', type: 'danger', color: '#8B0000' },
  { keywords: ['terminus scythe', 'scythe'], tileX: 18, tileY: 21, map: 'guilrhym', label: 'Terminus Scythe', type: 'quest', color: '#4B0082' },

  // Enemies
  { keywords: ['wolf', 'wolves'], tileX: 85, tileY: 15, map: 'village', label: 'Wolf Territory', type: 'danger', color: '#808080' },
  { keywords: ['slime', 'slimes'], tileX: 55, tileY: 118, map: 'village', label: 'Slime Infestation', type: 'danger', color: '#32CD32' },
  { keywords: ['bandit', 'bandits'], tileX: 223, tileY: 14, map: 'village', label: 'Bandit Camp', type: 'danger', color: '#8B0000' },
  { keywords: ['skeleton', 'undead'], tileX: 15, tileY: 25, map: 'village', label: 'Undead', type: 'danger', color: '#D3D3D3' },
  { keywords: ['spider', 'spiders'], tileX: 214, tileY: 123, map: 'village', label: 'Spider Nest', type: 'danger', color: '#800080' },
  { keywords: ['golem', 'stone golem'], tileX: 225, tileY: 155, map: 'forest', label: 'Stone Golem', type: 'danger', color: '#696969' },
  { keywords: ['ridge revenant', 'east ridge', 'ridge ascent', 'tempered core'], tileX: 260, tileY: 142, map: 'forest', label: 'East Ridge Ascent', type: 'danger', color: '#FF6F00' },
];

function normalizeMarkerText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function getPrimaryObjectiveText(state: GameState): string {
  const activeQuest = state.quests.find(q => q.active && !q.completed);
  if (!activeQuest) return '';

  const nextObjective = activeQuest.objectives.find(objective => !objective.includes('\u2713'));
  return normalizeMarkerText(nextObjective ?? activeQuest.description ?? '');
}

export function markerTargetsNpc(
  marker: Pick<MapMarker, 'label' | 'type'>,
  npc: { id: string; name: string; dialogueId?: string }
): boolean {
  if (marker.type !== 'quest' && marker.type !== 'npc') return false;
  const label = normalizeMarkerText(marker.label);
  const npcName = normalizeMarkerText(npc.name);
  const npcId = normalizeMarkerText(npc.id);
  const dialogueId = normalizeMarkerText(npc.dialogueId ?? '');

  if (npcName && label.includes(npcName)) return true;
  if (npcId && label.includes(npcId)) return true;
  if (dialogueId && label.includes(dialogueId)) return true;

  if (npcName.includes('elder') && label.includes('elder')) return true;
  if (npcName.includes('merchant') && label.includes('merchant')) return true;
  if (npcName.includes('guard') && label.includes('guard')) return true;
  if (npcName.includes('blacksmith') && label.includes('blacksmith')) return true;
  if (npcName.includes('healer') && label.includes('healer')) return true;
  if (npcName.includes('ranger') && label.includes('ranger')) return true;

  return false;
}

export function isNpcObjectiveTarget(
  npc: { id: string; name: string; dialogueId?: string },
  currentMap: string,
  markers: MapMarker[]
): boolean {
  return markers.some(marker => marker.map === currentMap && marker.type === 'quest' && markerTargetsNpc(marker, npc));
}

export function isPrimaryObjectiveMarker(
  marker: Pick<MapMarker, 'label' | 'type'> & { id?: string },
  state: GameState,
): boolean {
  // Dynamic objective markers are always primary when they exist
  if (marker.id === MANUSCRIPT_PRIMARY_MARKER_ID) return true;
  if (marker.id === VILLAGE_PRIMARY_MARKER_ID) return true;

  const objectiveText = getPrimaryObjectiveText(state);
  if (!objectiveText) return false;

  const label = normalizeMarkerText(marker.label);
  if (!label) return false;

  if (objectiveText.includes(label)) return true;

  if (marker.type === 'portal') {
    const cleanedPortalLabel = label.replace(/^ /, '');
    if (objectiveText.includes(cleanedPortalLabel)) return true;
  }

  if (label.includes('elder') && objectiveText.includes('elder')) return true;
  if (label.includes('whispering woods') && objectiveText.includes('whispering woods')) return true;
  if (label.includes('disparaged cottage') && (objectiveText.includes('disparaged cottage') || objectiveText.includes('old shack'))) return true;
  if (label.includes('ranger') && objectiveText.includes('ranger')) return true;

  return false;
}

// ─── Manuscript quest — dynamic primary objective marker ──────────────────────

export const MANUSCRIPT_PRIMARY_MARKER_ID = 'manuscript_primary_objective';

/**
 * Computes the single "Primary" objective marker for the manuscript
 * (find_hunter) quest.  Its tile position advances automatically as the player
 * collects fragments and opens gates.  Returns null when the quest is not
 * active, already completed, or no longer needs a map pin.
 *
 * Stage 1 — initial:                  Disparaged Cottage (tile 137, 184)
 * Stage 2 — fragment collected:        Manuscript Gate Guard (tile 230, 154)
 * Stage 3 — checkpoint gate open:      Second manuscript location (tile 213, 70)
 * Stage 4 — second manuscript in hand: Hollow fog-gate entrance (tile 122, 18)
 */
export function getManuscriptPrimaryObjectiveMarker(state: GameState): MapMarker | null {
  const quest = state.quests.find(q => q.id === 'find_hunter' && !q.completed);
  if (!quest) return null;
  // Show the marker once the quest is active OR the player has already collected
  // the first fragment (in case they picked it up before the quest was formally started).
  if (!quest.active && !state.getFlag('manuscript_fragment_collected')) return null;

  const now = Date.now();
  const base = {
    id: MANUSCRIPT_PRIMARY_MARKER_ID,
    label: 'Primary',
    type: 'quest' as const,
    color: '#FFD700',
    map: 'forest',
    pulseUntil: 0,
    createdAt: now,
    permanent: true,
  };

  // Stage 4: second manuscript in hand → go fight the boss at the fog gate
  if (state.getFlag('hunters_manuscript_collected') && !state.getFlag('hollow_guardian_defeated')) {
    return { ...base, tileX: 122, tileY: 18 };
  }
  // Boss defeated — quest is wrapping up; no forest pin needed
  if (state.getFlag('hollow_guardian_defeated')) return null;

  // Stage 3: checkpoint gate open → go collect the second manuscript piece
  if (state.getFlag('manuscript_checkpoint_gate_open')) {
    return { ...base, tileX: 213, tileY: 70 };
  }
  // Stage 2: first fragment collected → talk to the gate guard to open the checkpoint
  if (state.getFlag('manuscript_fragment_collected')) {
    return { ...base, tileX: 230, tileY: 154 };
  }
  // Stage 1: initial → find the Disparaged Cottage
  return { ...base, tileX: 137, tileY: 184 };
}

// ─── Village — dynamic primary objective marker ────────────────────────────────

export const VILLAGE_PRIMARY_MARKER_ID = 'village_primary_objective';

/**
 * Computes the "Primary" objective marker shown in Greenleaf Village for the
 * find_hunter quest.
 *
 * Stage 1 — quest not yet given:  Village Elder (tile 124, 100)
 * Stage 2 — quest active:         Forest portal (tile 120, 8)
 */
export function getVillagePrimaryObjectiveMarker(state: GameState): MapMarker | null {
  const quest = state.quests.find(q => q.id === 'find_hunter');

  // Quest fully completed → no village pin needed
  if (quest?.completed) return null;
  // Player has already progressed into the forest — the static "Village Elder"
  // marker handles the "return to report" stage on its own.
  if (state.getFlag('manuscript_fragment_collected')) return null;

  const now = Date.now();
  const base = {
    id: VILLAGE_PRIMARY_MARKER_ID,
    label: 'Primary',
    type: 'quest' as const,
    color: '#FFD700',
    map: 'village',
    pulseUntil: 0,
    createdAt: now,
    permanent: true,
  };

  // Quest accepted → direct the player to the forest entrance portal
  if (quest?.active) {
    return { ...base, tileX: 120, tileY: 8 };
  }
  // Quest not yet given (beginning of game, elder not spoken to yet) →
  // point to the Elder regardless of whether the quest record exists yet.
  return { ...base, tileX: 124, tileY: 100 };
}

// ─── Ring hint — dynamic secondary marker ────────────────────────────────────

export const RING_HINT_MARKER_ID = 'ring_hint_ranger_cottage';
const STORED_RING_HINT_MARKER_IDS = new Set(['forest_Ranger Cottage', 'forest_Ranger Outpost']);

export function shouldHideStoredRingHintMarker(
  marker: Pick<MapMarker, 'id' | 'label' | 'map' | 'tileX' | 'tileY'>,
  state: GameState,
): boolean {
  const isStoredRangerObjectiveMarker =
    STORED_RING_HINT_MARKER_IDS.has(marker.id) ||
    (
      marker.map === 'forest' &&
      marker.label === 'Ranger Cottage' &&
      marker.tileX === 236 &&
      marker.tileY === 227
    ) ||
    (
      marker.map === 'forest' &&
      marker.label === 'Ranger Outpost' &&
      marker.tileX === 140 &&
      marker.tileY === 170
    );

  // The live ring hint marker owns this map pin while the hint is active, and
  // getRingHintMarker removes it after the ring is picked up. Hide any older
  // text-discovered ranger copy so saves cannot keep stale secondary pins over
  // either the old cabin/outpost or the relocated cottage.
  //
  // We hide on EITHER flag: `olwen_ranger_cabin_hint` covers the live quest path,
  // while `wolf_ring_received` covers migrated/loaded saves (see SaveManager) that
  // can set the ring flag without ever setting the hint flag — otherwise a stale
  // "Secondary" ranger pin would survive on those saves.
  return Boolean(
    isStoredRangerObjectiveMarker &&
    (state.getFlag('olwen_ranger_cabin_hint') || state.getFlag('wolf_ring_received'))
  );
}

// Discovered quest/POI markers are never removed from the save once added, and are
// only suppressed while their objective is the active primary (HIDE_MARKER_IDS_WHEN_PRIMARY
// in the map components). Once the related quest completes the dynamic primary disappears,
// so without this these markers resurface as permanent stray "Secondary" pins.
const STORED_DONE_MARKER_IDS = new Set(['forest_Disparaged Cottage']);

export function shouldHideCompletedObjectiveMarker(
  marker: Pick<MapMarker, 'id'>,
  state: GameState,
): boolean {
  // The Disparaged Cottage is the manuscript quest's Stage 1 POI. Once the first
  // fragment is collected (the cottage has been looted) it is no longer a relevant
  // destination — the later stages point elsewhere and never return here.
  return Boolean(
    STORED_DONE_MARKER_IDS.has(marker.id) && state.getFlag('manuscript_fragment_collected'),
  );
}

/**
 * Single predicate the minimap / map components use to decide whether a stored
 * marker should be suppressed. Combines the ranger-ring hide logic with the
 * completed-objective hide logic so neither stale pin lingers as a "Secondary".
 */
export function shouldHideStoredMarker(
  marker: Pick<MapMarker, 'id' | 'label' | 'map' | 'tileX' | 'tileY'>,
  state: GameState,
): boolean {
  return (
    shouldHideStoredRingHintMarker(marker, state) ||
    shouldHideCompletedObjectiveMarker(marker, state)
  );
}

/** @deprecated Use {@link shouldHideStoredMarker} */
export const shouldHideStoredIdolHintMarker = shouldHideStoredMarker;

/**
 * Returns a map marker pointing the player to the relocated Ranger Cottage
 * where the Wolf Ring is waiting. Visible only between Olwen's hint
 * dialogue and the actual world-item pickup.
 */
export function getRingHintMarker(state: GameState): MapMarker | null {
  if (!state.getFlag('olwen_ranger_cabin_hint')) return null;
  if (state.getFlag('wolf_ring_received')) return null;

  return {
    id: RING_HINT_MARKER_ID,
    label: 'Ranger Cottage',
    type: 'poi' as const,
    color: '#9370DB',
    map: 'forest',
    tileX: 236,
    tileY: 227,
    pulseUntil: 0,
    createdAt: Date.now(),
    permanent: true,
  };
}

/** @deprecated Use {@link getRingHintMarker} */
export const getIdolHintMarker = getRingHintMarker;

/** @deprecated Use {@link RING_HINT_MARKER_ID} */
export const IDOL_HINT_MARKER_ID = RING_HINT_MARKER_ID;

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
        pulseUntil: now + 60000, // pulse for 60 seconds
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
            label: 'Portal',
            tileX: portal.portalTileX,
            tileY: portal.portalTileY,
            map: currentMap,
            type: 'portal',
            color: '#C71585',
            pulseUntil: now + 120000, // portal pulses for 2 minutes
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
