import { Item } from '@/lib/game/GameState';

export const items: Record<string, Item> = {
  health_potion: {
    id: 'health_potion',
    name: 'Ephemeral Extract',
    description: 'A bright alchemical draught that briefly steadies body and breath. Restores 55 health when consumed.',
    type: 'consumable',
    sprite: 'potion',
    healAmount: 55,
  },

  tempest_grass: {
    id: 'tempest_grass',
    name: 'Tempest Grass',
    description: 'A wild healing herb bundled with twine. Restores 40 health and fully replenishes stamina when chewed.',
    type: 'consumable',
    sprite: 'tempest_grass_item',
    healAmount: 40,
  },
  
  ancient_map: {
    id: 'ancient_map',
    name: 'Ancient Map',
    description: 'A weathered map showing the location of ancient ruins and forgotten paths.',
    type: 'quest',
    sprite: 'map',
  },
  
  village_key: {
    id: 'village_key',
    name: 'Village Key',
    description: 'An old iron key. It might open something important in the village.',
    type: 'key',
    sprite: 'key',
  },

  fort_gate_key: {
    id: 'fort_gate_key',
    name: 'Fort Gate Key',
    description: 'A heavy iron key taken from a dead ranger at the old chapel ruins in the west woods. It bears the same crest as the fort banner.',
    type: 'key',
    sprite: 'fort_gate_key',
  },

  highlanders_key: {
    id: 'highlanders_key',
    name: "Highlander's Key",
    description: 'A small rusted key, its teeth worn soft with age. Humbler than the fort\'s iron key, yet someone hid it away in the cliffs for a reason.',
    type: 'key',
    sprite: 'highlanders_key',
  },
  
  moonbloom: {
    id: 'moonbloom',
    name: 'Moonbloom Flower',
    description: 'A rare blossom of deep indigo, violet, and ember-red. Even in shade it seems to hold a sliver of moonlight.',
    type: 'quest',
    sprite: 'moonbloom',
  },

  manuscript_fragment: {
    id: 'manuscript_fragment',
    name: 'Manuscript Fragment',
    description: 'Torn pages from the missing hunter. The writing speaks of corruption deeper in the woods and a guardian at its heart. The rest of the manuscript lies beyond the river.',
    type: 'quest',
    sprite: 'loose_pages',
  },

  hunters_manuscript: {
    id: 'hunters_manuscript',
    name: "Hunter's Manuscript",
    description: 'The complete manuscript recovered from the Hollow. It details the corruption spreading through the Whispering Woods and the ancient guardian that protects its source.',
    type: 'quest',
    sprite: 'loose_pages',
  },

  evacuation_order: {
    id: 'evacuation_order',
    name: "Commander's Evacuation Order",
    description: "A fort commander's orders, wax seal broken, partially charred. The ink reads: 'All non-military personnel evacuate south to Greenleaf immediately. The Hollow corruption has breached the river line. Do not attempt to reach Guilrhym. The source of this heresy lies within the city walls. The Ashen Court has fractured the old seals.' Dated weeks ago. It never arrived.",
    type: 'quest',
    sprite: 'loose_pages',
  },
  
  ornamental_broadsword: {
    id: 'ornamental_broadsword',
    name: 'Ornamental Broadsword',
    description: 'A broad, heavy blade etched with faded ceremonial runes. Whoever carried it into these woods never carried it out.',
    type: 'equipment',
    sprite: 'broadsword',
    stats: {
      // 22 -> 28: turns the only mid-rung into a real upgrade so the weapon ladder reads
      // 20 -> 28 -> 34 instead of 20/22 then a cliff to the Terminus Scythe. Makes the
      // scythe a +6 climax step whether it's acquired early (field boss) or late (final
      // boss), smoothing the curve without weapon variants.
      damage: 28,
      range: 2.15,
    },
  },

  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A well-crafted blade of sturdy iron. Reliable and sharp.',
    type: 'equipment',
    sprite: 'sword',
    stats: {
      damage: 28,
      range: 2.15,
    },
  },
  
  meek_short_sword: {
    id: 'meek_short_sword',
    name: 'Meek Short Sword',
    description: 'A simple, reliable starting blade. Attack with left click.',
    type: 'equipment',
    sprite: 'sword',
    stats: {
      damage: 20,
      range: 2,
    },
  },

  shadow_blade: {
    id: 'shadow_blade',
    name: 'Shadow Blade',
    description: 'A dark sword forged from an alloy found only in the ancient ruins. Its edge hums with residual magic.',
    type: 'equipment',
    sprite: 'sword',
    stats: {
      damage: 36,
      range: 2.3,
    },
  },

  terminus_scythe: {
    id: 'terminus_scythe',
    name: 'Terminus Scythe',
    description: 'A two-handed scythe radiating dark matter energy. Its charge attack sends a devastating arc slash forward, cutting the threads that bind souls to this world.',
    type: 'equipment',
    sprite: 'scythe',
    stats: {
      damage: 34,
      range: 2.6,
    },
  },

  crystal_greatsword: {
    id: 'crystal_greatsword',
    name: 'Crystal Greatsword',
    description: 'A massive crystalline blade pulsing with arcane power. Devastatingly slow but overwhelmingly powerful.',
    type: 'equipment',
    sprite: 'sword',
    stats: {
      damage: 44,
      range: 2.5,
    },
  },

  verdant_tonic: {
    id: 'verdant_tonic',
    name: 'Verdant Tonic',
    description: 'A thick, bitter draught brewed from purified grove sap. Cloaks your presence for 14 seconds. Enemies will not detect you unless you are nearly on top of them.',
    type: 'consumable',
    sprite: 'verdant_tonic',
    buffType: 'stealth',
    buffDuration: 14,
  },

  berserker_draught: {
    id: 'berserker_draught',
    name: 'Berserker Draught',
    description: 'A black tincture that floods the veins with heat. For 10 seconds, your strikes hit 50% harder and you move 40% faster. But the cost is paid in nerves and shaking hands when it ends.',
    type: 'consumable',
    sprite: 'berserker_draught',
    buffType: 'berserker',
    buffDuration: 10,
  },

  sundered_essence_i: {
    id: 'sundered_essence_i',
    name: 'Sundered Essence I',
    description: 'A cold knot of soul-light, prised from something that died in these woods and never moved on. Crush it and the essence floods into you. Enough to feel the weight of a life half-spent. Grants 50 essence when consumed.',
    type: 'consumable',
    sprite: 'sundered_essence_i',
    essenceAmount: 50,
  },

  sundered_essence_ii: {
    id: 'sundered_essence_ii',
    name: 'Sundered Essence II',
    description: 'A denser coil of stolen soul-light, the kind that only gathers where the corruption runs deep. Past the river, beneath the dead bridge. It burns colder and gives far more. Grants 150 essence when consumed.',
    type: 'consumable',
    sprite: 'sundered_essence_ii',
    essenceAmount: 150,
  },

  last_breath_charm: {
    id: 'last_breath_charm',
    name: 'Last Breath Charm',
    description: 'A bone token carved with a single rune. When a killing blow lands, the charm cracks and pulls you back from the brink. Once. Carry it close; it cannot be drunk or willed to act, only spent by death itself.',
    type: 'consumable',
    sprite: 'last_breath_charm',
    buffType: 'last_breath',
  },

  blighted_root_shard: {
    id: 'blighted_root_shard',
    name: 'Blighted Root Shard',
    description: 'A gnarled, pulsing fragment torn from the heart of the corrupted grove. It still twitches faintly in your hands.',
    type: 'quest',
    sprite: 'blighted_root_shard',
  },

  golem_heart: {
    id: 'golem_heart',
    name: 'Golem Heart',
    description: 'A dense core chipped from the Stone Golem. It is warm to the touch and thrums with the memory of impossible weight.',
    type: 'quest',
    sprite: 'golem_heart',
  },

  radiant_vestige: {
    id: 'radiant_vestige',
    name: 'Radiant Vestige',
    description: 'A shard of unspent dawn, warm to the touch and faintly humming. Offered to a bonfire it deepens the flame\'s gift. Each one strengthens your Ephemeral Extract and grants another draught between rests.',
    type: 'key',
    sprite: 'radiant_vestige',
  },

  tempered_core: {
    id: 'tempered_core',
    name: 'Tempered Core',
    description: 'A fist-sized ingot prised from the Ridge Revenant, its surface folded a thousand times and still glowing at the seams. A smith who knows how to work bound steel could fold its strength into a blade.',
    type: 'quest',
    sprite: 'tempered_core',
  },

  ranger_badge: {
    id: 'ranger_badge',
    name: 'Ranger Badge',
    description: 'A weathered badge from the old outpost, pressed into your palm as proof that the high road is safe again.',
    type: 'quest',
    sprite: 'map',
  },

  gravebound_ring: {
    id: 'gravebound_ring',
    name: 'Gravebound Ring',
    description: 'A band of black stone that absorbs warmth and gives back none. It was tucked inside a hunter cache on the cliff shelf. And it fits like it was waiting.',
    type: 'ring',
    sprite: 'gravebound_ring',
    stats: {
      staminaRegenMult: 1.22,
    },
  },

  wolf_ring: {
    id: 'wolf_ring',
    name: 'Wolf Ring',
    description: 'A battered iron band stamped with a wolf\'s head. Olwen swore it crawled back onto his finger every time he threw it away. Yet your wounds seem to loosen their grip a little faster while you wear it.',
    type: 'ring',
    sprite: 'wolf_ring',
    stats: {
      recoverySpeedMult: 1.22,
    },
  },

  wayfarer_ring: {
    id: 'wayfarer_ring',
    name: 'Wayfarer Ring',
    description: 'A light bronze band etched with marching chevrons, found in a ranger cache near the southern fort road. Your stride feels noticeably lighter. Though stronger march-rings are rumored deeper in the woods.',
    type: 'ring',
    sprite: 'wayfarer_ring',
    stats: {
      moveSpeedMult: 1.15,
    },
  },

  ironbark_ring: {
    id: 'ironbark_ring',
    name: 'Ironbark Band',
    description: "A ring of fused ironbark and grey stone, prised from the knuckle of the thing that wades the dead pools. The land leans in around its wearer. And leans in further with each blow turned aside: every clean parry seems to peel back a little more of the woods, until death takes the knowing away again.",
    type: 'ring',
    // NOTE: reuses the gravebound ring icon for now. Give it a bespoke sprite later.
    sprite: 'gravebound_ring',
    stats: {
      // Utility ring: a small BASE fog-of-war reveal bonus, grown by perfect parries this
      // life (GameState.registerPerfectParry, capped at IRONBARK_PARRY_REVEAL_CAP, reset on death).
      revealRadiusBonus: 3,
    },
  },

  heretical_essence_apparition: {
    id: 'heretical_essence_apparition',
    name: 'Heretical Essence of the Apparition',
    description: 'A condensed wisp of forbidden power torn from the Hollow Apparition. It pulses with a cold, violet light and hums with the memory of the guardian that once protected this place.',
    type: 'quest',
    sprite: 'heretical_essence_apparition',
  },
};
