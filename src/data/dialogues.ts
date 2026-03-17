export interface DialogueNode {
  id: string;
  text: string;
  responses?: { text: string; nextId: string; requiresQuest?: string; givesQuest?: string }[];
}

export interface Dialogue {
  id: string;
  nodes: DialogueNode[];
}

export const dialogues: Record<string, Dialogue> = {
  elder: {
    id: 'elder',
    nodes: [
      {
        id: 'start',
        text: "Welcome, traveler. I am the village elder. Our peaceful village has been troubled by strange occurrences in the forest. Would you help us?",
        responses: [
          { text: "I'll help. What's happening?", nextId: 'accept' },
          { text: "Tell me more about these occurrences.", nextId: 'more_info' },
          { text: "Not now.", nextId: 'reject' },
        ],
      },
      {
        id: 'more_info',
        text: "Mysterious lights have been seen deep in the forest, and strange sounds echo through the night. Our hunter went to investigate but hasn't returned. We fear something dark has awakened.",
        responses: [
          { text: "I'll help find your hunter.", nextId: 'accept' },
          { text: "This sounds dangerous. I need to think about it.", nextId: 'reject' },
        ],
      },
      {
        id: 'accept',
        text: "Thank you, brave soul! The hunter was last seen heading north into the Deep Woods. Please, find him and discover what troubles our forest. Take this map - it will guide you.",
        responses: [
          { text: "I'll return with news.", nextId: 'end', givesQuest: 'find_hunter' },
        ],
      },
      {
        id: 'reject',
        text: "I understand. These are dangerous times. If you change your mind, I'll be here.",
        responses: [
          { text: "Farewell.", nextId: 'end' },
        ],
      },
      {
        id: 'quest_active',
        text: "Have you found any sign of our missing hunter? Please be careful in the forest.",
        responses: [
          { text: "Still searching. I'll keep looking.", nextId: 'end' },
        ],
      },
      {
        id: 'quest_complete',
        text: "You've returned! And with such dire news. The ancient ruins awakening... This is worse than I feared. You've done well. Take this reward and my eternal gratitude.",
        responses: [
          { text: "Thank you, elder.", nextId: 'end' },
        ],
      },
      {
        id: 'end',
        text: "May fortune smile upon you, traveler.",
        responses: [],
      },
    ],
  },
  
  merchant: {
    id: 'merchant',
    nodes: [
      {
        id: 'start',
        text: "Ah, a customer! Welcome to my humble shop. I have traveled far and wide to bring you the finest goods. What can I interest you in today?",
        responses: [
          { text: "What do you have for sale?", nextId: 'shop' },
          { text: "Tell me about your travels.", nextId: 'travels' },
          { text: "Nothing today, thanks.", nextId: 'end' },
        ],
      },
      {
        id: 'shop',
        text: "I have health potions, ancient maps, and mysterious artifacts. Each item has been carefully selected from my journeys. Prices are fair, I assure you!",
        responses: [
          { text: "I'll take a health potion.", nextId: 'buy_potion' },
          { text: "Tell me about these artifacts.", nextId: 'artifacts' },
          { text: "Maybe later.", nextId: 'end' },
        ],
      },
      {
        id: 'travels',
        text: "I've been from the coastal cities to the mountain peaks! Each place has its own stories and treasures. The world is vast and full of wonders, my friend.",
        responses: [
          { text: "What's the most interesting place you've been?", nextId: 'interesting' },
          { text: "Show me your goods.", nextId: 'shop' },
          { text: "Fascinating. I should go.", nextId: 'end' },
        ],
      },
      {
        id: 'interesting',
        text: "Ah! There's an ancient ruin to the north - older than the village itself. Locals say it holds great power, but also great danger. Few dare venture there.",
        responses: [
          { text: "I might check it out.", nextId: 'end' },
          { text: "Show me what you're selling.", nextId: 'shop' },
        ],
      },
      {
        id: 'artifacts',
        text: "These are relics from ages past. Some say they hold magical properties, others that they're just old junk. But to a collector, they're priceless!",
        responses: [
          { text: "I'll take one.", nextId: 'buy_artifact' },
          { text: "Too rich for my blood.", nextId: 'end' },
        ],
      },
      {
        id: 'buy_potion',
        text: "Excellent choice! This potion will restore your vitality in times of need. That'll be 10 gold pieces.",
        responses: [
          { text: "Here you go.", nextId: 'end' },
        ],
      },
      {
        id: 'buy_artifact',
        text: "A wise investment! This artifact may prove useful on your journey. That'll be 50 gold pieces.",
        responses: [
          { text: "It's a deal.", nextId: 'end' },
        ],
      },
      {
        id: 'end',
        text: "Safe travels, friend! Come back anytime!",
        responses: [],
      },
    ],
  },
  
  guard: {
    id: 'guard',
    nodes: [
      {
        id: 'start',
        text: "Halt! I'm on duty protecting the village. What's your business here, traveler?",
        responses: [
          { text: "Just passing through.", nextId: 'passing' },
          { text: "I'm here to help with the trouble in the forest.", nextId: 'helping', requiresQuest: 'find_hunter' },
          { text: "What are you guarding against?", nextId: 'guarding' },
        ],
      },
      {
        id: 'passing',
        text: "Fair enough. Keep your nose clean and we won't have any problems. The village is safe as long as I'm watching.",
        responses: [
          { text: "Noted.", nextId: 'end' },
        ],
      },
      {
        id: 'helping',
        text: "Ah, so the elder sent you! Good. We need all the help we can get. The forest paths have become dangerous, but the northern route is still clear if you're careful.",
        responses: [
          { text: "Thanks for the tip.", nextId: 'end' },
          { text: "What should I watch out for?", nextId: 'dangers' },
        ],
      },
      {
        id: 'guarding',
        text: "Strange creatures have been spotted near the village borders. Nothing has attacked yet, but I'm not taking any chances. Better safe than sorry.",
        responses: [
          { text: "Good thinking.", nextId: 'end' },
          { text: "What kind of creatures?", nextId: 'creatures' },
        ],
      },
      {
        id: 'creatures',
        text: "Shadow beasts, some say. Others claim they're just wolves. But wolves don't glow with an eerie light, if you ask me.",
        responses: [
          { text: "That does sound strange.", nextId: 'end' },
        ],
      },
      {
        id: 'dangers',
        text: "Stick to the paths, don't travel at night, and trust your instincts. If something feels wrong, it probably is.",
        responses: [
          { text: "Sound advice.", nextId: 'end' },
        ],
      },
      {
        id: 'end',
        text: "Stay vigilant out there.",
        responses: [],
      },
    ],
  },

  village_sign: {
    id: 'village_sign',
    nodes: [
      {
        id: 'start',
        text: "A weathered wooden sign reads: 'Welcome to Willowbrook Village - Founded 342 years ago. Population: 47. May peace and prosperity guide all who enter.'",
        responses: [
          { text: "[Continue]", nextId: 'end' },
        ],
      },
      {
        id: 'end',
        text: "",
        responses: [],
      },
    ],
  },

  well: {
    id: 'well',
    nodes: [
      {
        id: 'start',
        text: "An old stone well sits in the center of the village square. The water looks crystal clear. You can hear the echo of dripping water from deep below.",
        responses: [
          { text: "[Drink from the well]", nextId: 'drink' },
          { text: "[Leave it alone]", nextId: 'end' },
        ],
      },
      {
        id: 'drink',
        text: "The cool, refreshing water revitalizes you! You feel your strength returning. (Health restored)",
        responses: [
          { text: "[Continue]", nextId: 'end' },
        ],
      },
      {
        id: 'end',
        text: "",
        responses: [],
      },
    ],
  },

  chest_1: {
    id: 'chest_1',
    nodes: [
      {
        id: 'start',
        text: "A wooden chest sits here, partially hidden by grass. It doesn't appear to be locked.",
        responses: [
          { text: "[Open the chest]", nextId: 'open' },
          { text: "[Leave it alone]", nextId: 'end' },
        ],
      },
      {
        id: 'open',
        text: "Inside the chest you find 20 gold coins and a small health potion! (Added to inventory)",
        responses: [
          { text: "[Take the items]", nextId: 'end' },
        ],
      },
      {
        id: 'end',
        text: "",
        responses: [],
      },
    ],
  },

  // === NEW MAP INTERACTABLES ===
  ranger_sign: {
    id: 'ranger_sign',
    nodes: [{ id: 'start', text: "A weathered sign reads: 'Ranger Outpost — All travelers welcome. Beware wolves north of here.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  bridge_sign: {
    id: 'bridge_sign',
    nodes: [{ id: 'start', text: "A sign posted near the bridge: 'Lake crossing — Watch your step. Fish are biting!'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  danger_sign: {
    id: 'danger_sign',
    nodes: [{ id: 'start', text: "WARNING: Wolf territory ahead. Only experienced adventurers should proceed.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  forest_entry_sign: {
    id: 'forest_entry_sign',
    nodes: [{ id: 'start', text: "A carved wooden sign: 'Welcome to the Whispering Woods. Stay on the paths, traveler.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  witch_sign: {
    id: 'witch_sign',
    nodes: [{ id: 'start', text: "Scrawled on a rotting plank: 'The Witch sees all. Leave offerings or leave quickly.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  temple_sign: {
    id: 'temple_sign',
    nodes: [{ id: 'start', text: "Ancient runes glow faintly: 'Beyond lies the Temple of the Forgotten. Only the worthy may enter.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  deep_woods_sign: {
    id: 'deep_woods_sign',
    nodes: [{ id: 'start', text: "A battered sign: 'The Deep Woods — Turn back. Shadow creatures roam these lands.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  tombstone: {
    id: 'tombstone',
    nodes: [{ id: 'start', text: "The weathered inscription is barely legible: 'Here lies one who sought the truth and found only darkness.'", responses: [{ text: "[Pay respects]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  stump_lore: {
    id: 'stump_lore',
    nodes: [{ id: 'start', text: "This ancient tree stump has strange markings carved into it. They seem to point north, toward the forest.", responses: [{ text: "[Interesting...]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  market_sign: {
    id: 'market_sign',
    nodes: [{ id: 'start', text: "The Market District — Finest wares in all of Greenleaf Village!", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  ancient_tablet: {
    id: 'ancient_tablet',
    nodes: [{ id: 'start', text: "The ancient tablet bears inscriptions in a forgotten language. You can make out: '...the key lies where shadows converge...'", responses: [{ text: "[Study further]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  ancient_tablet_2: {
    id: 'ancient_tablet_2',
    nodes: [{ id: 'start', text: "Another tablet, cracked with age: '...three trials await those who seek the vault. Strength. Wisdom. Courage.'", responses: [{ text: "[Remember this]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  vault_inscription: {
    id: 'vault_inscription',
    nodes: [{ id: 'start', text: "Golden letters shimmer on the wall: 'The Vault of Ancients. Here rest treasures of a civilization long forgotten.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  campfire: {
    id: 'campfire',
    nodes: [{ id: 'start', text: "The campfire crackles warmly. You feel your wounds healing in its gentle light.", responses: [{ text: "[Rest by the fire]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  healing_mushroom: {
    id: 'healing_mushroom',
    nodes: [{ id: 'start', text: "A ring of glowing mushrooms pulses with healing energy. You feel revitalized!", responses: [{ text: "[Absorb the energy]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
};
