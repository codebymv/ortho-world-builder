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
        text: "Welcome, traveler. I am the **Village Elder**. Our peaceful village has been troubled by __strange occurrences__ in the **forest**. Would you help us?",
        responses: [
          { text: "I'll help. What's happening?", nextId: 'accept' },
          { text: "Tell me more about these occurrences.", nextId: 'more_info' },
          { text: "Not now.", nextId: 'reject' },
        ],
      },
      {
        id: 'more_info',
        text: "**Mysterious lights** have been seen deep in the forest, and __strange sounds__ echo through the night. Our **hunter** went to investigate but hasn't returned. We fear something __dark__ has awakened.",
        responses: [
          { text: "I'll help find your hunter.", nextId: 'accept' },
          { text: "This sounds dangerous. I need to think about it.", nextId: 'reject' },
        ],
      },
      {
        id: 'accept',
        text: "Thank you, brave soul! The **hunter** was last seen heading into the **Whispering Woods**. Please, find him and discover what troubles our forest. Take this __map__ - it will guide you.",
        responses: [
          { text: "I'll return with news.", nextId: 'end', givesQuest: 'find_hunter' },
        ],
      },
      {
        id: 'reject',
        text: "I understand. These are __dangerous times__. If you change your mind, I'll be here.",
        responses: [
          { text: "Farewell.", nextId: 'end' },
        ],
      },
      {
        id: 'quest_active',
        text: "Have you found any sign of our missing **hunter**? Please be careful in the **forest**.",
        responses: [
          { text: "Still searching. I'll keep looking.", nextId: 'end' },
        ],
      },
      {
        id: 'quest_complete',
        text: "You've returned! And with such dire news about the forest. The **Deep Woods**... I sense the magical barrier has weakened. I need you to travel there and find the **witch**. She knows the source of this darkness. The path is now open to you.",
        responses: [
          { text: "I'll go to the Deep Woods.", nextId: 'give_second_quest' },
        ],
      },
      {
        id: 'give_second_quest',
        text: "Gather your strength and travel to the Deep Woods. Find the witch at her hut, learn what has awakened, and return with that knowledge. The fate of our village depends on it.",
        responses: [
          { text: "I won't let you down.", nextId: 'end', givesQuest: 'clear_deep_woods' },
        ],
      },
      {
        id: 'deep_woods_active',
        text: "The **Deep Woods** are treacherous. Find the **witch's hut**, learn what __shadow magic__ stirs below, and follow its trail toward **Shadow Castle** before you return.",
        responses: [
          { text: "I'm still investigating.", nextId: 'end' },
        ],
      },
      {
        id: 'deep_woods_report',
        text: "You're back—and your face says you've seen something grave. What did the witch reveal?",
        responses: [
          { text: "Ancient shadow magic is waking beneath the woods.", nextId: 'elder_deep_done' },
        ],
      },
      {
        id: 'elder_deep_done',
        text: "Then we must act quickly. You've done the village a great service. Take this reward, and stay sharp.",
        responses: [
          { text: "I'll be ready.", nextId: 'end' },
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
        text: "Ah, a customer! Welcome to my humble shop. I have traveled __far and wide__ to bring you the finest goods. What can I interest you in today?",
        responses: [
          { text: "What do you have for sale?", nextId: 'shop' },
          { text: "Tell me about your travels.", nextId: 'travels' },
          { text: "I heard you're looking for rare herbs.", nextId: 'merchant_herb_pitch' },
          { text: "Nothing today, thanks.", nextId: 'end' },
        ],
      },
      {
        id: 'shop',
        text: "I have **health potions**, __ancient maps__, and **mysterious artifacts**. Each item has been carefully selected from my journeys. Prices are fair, I assure you!",
        responses: [
          { text: "I'll take a health potion.", nextId: 'buy_potion' },
          { text: "Tell me about these artifacts.", nextId: 'artifacts' },
          { text: "Maybe later.", nextId: 'end' },
        ],
      },
      {
        id: 'travels',
        text: "I've been from the __coastal cities__ to the __mountain peaks__! Each place has its own stories and treasures. The world is vast and full of wonders, my friend.",
        responses: [
          { text: "What's the most interesting place you've been?", nextId: 'interesting' },
          { text: "Show me your goods.", nextId: 'shop' },
          { text: "Fascinating. I should go.", nextId: 'end' },
        ],
      },
      {
        id: 'interesting',
        text: "Ah! There's an **Ancient Ruin** to the north - older than the village itself. Locals say it holds __great power__, but also __great danger__. Few dare venture there.",
        responses: [
          { text: "I might check it out.", nextId: 'end' },
          { text: "Show me what you're selling.", nextId: 'shop' },
        ],
      },
      {
        id: 'artifacts',
        text: "These are __relics from ages past__. Some say they hold **magical properties**, others that they're just old junk. But to a collector, they're __priceless__!",
        responses: [
          { text: "I'll take one.", nextId: 'buy_artifact' },
          { text: "Too rich for my blood.", nextId: 'end' },
        ],
      },
      {
        id: 'buy_potion',
        text: "Excellent choice! This **Health Potion** will restore your vitality in times of need. That'll be __10 gold__ pieces.",
        responses: [
          { text: "Here you go.", nextId: 'end' },
        ],
      },
      {
        id: 'buy_artifact',
        text: "A wise investment! This **artifact** may prove useful on your journey. That'll be __50 gold__ pieces.",
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
          { text: "I could help you patrol.", nextId: 'patrol_offer' },
          { text: "What are you guarding against?", nextId: 'guarding' },
        ],
      },
      {
        id: 'passing',
        text: "Fair enough. Keep your nose clean and we won't have any problems. The village is __safe__ as long as I'm watching.",
        responses: [
          { text: "Noted.", nextId: 'end' },
        ],
      },
      {
        id: 'helping',
        text: "Ah, so the **Elder** sent you! Good. We need all the help we can get. The __forest paths__ have become dangerous, but the **northern route** is still clear if you're careful.",
        responses: [
          { text: "Thanks for the tip.", nextId: 'end' },
          { text: "What should I watch out for?", nextId: 'dangers' },
        ],
      },
      {
        id: 'guarding',
        text: "**Strange creatures** have been spotted near the village borders. Nothing has attacked yet, but I'm not taking any chances. Better safe than sorry.",
        responses: [
          { text: "Good thinking.", nextId: 'end' },
          { text: "What kind of creatures?", nextId: 'creatures' },
        ],
      },
      {
        id: 'creatures',
        text: "**Shadow beasts**, some say. Others claim they're just __wolves__. But wolves don't glow with an __eerie light__, if you ask me.",
        responses: [
          { text: "That does sound strange.", nextId: 'end' },
        ],
      },
      {
        id: 'dangers',
        text: "Stick to the __paths__, don't travel at night, and trust your instincts. If something feels wrong, it probably is.",
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
      { id: 'start', text: "A weathered wooden sign reads: '**Welcome to Willowbrook Village** - Founded __342 years ago__. Population: 47. May peace and prosperity guide all who enter.'", responses: [{ text: "[Continue]", nextId: 'end' }] },
      { id: 'end', text: "", responses: [] },
    ],
  },

  well: {
    id: 'well',
    nodes: [
      {
        id: 'start',
        text: "An old stone well sits in the center of the village square. The water looks __crystal clear__. You can hear the echo of dripping water from deep below.",
        responses: [
          { text: "[Drink from the well]", nextId: 'drink' },
          { text: "[Leave it alone]", nextId: 'end' },
        ],
      },
      {
        id: 'drink',
        text: "The cool, refreshing water revitalizes you! You feel your strength returning. (**Health restored**)",
        responses: [
          { text: "[Continue]", nextId: 'end' },
        ],
      },
      { id: 'end', text: "", responses: [] },
    ],
  },

  chest_1: {
    id: 'chest_1',
    nodes: [
      {
        id: 'start',
        text: "A wooden chest sits here, partially hidden by grass. It doesn't appear to be __locked__.",
        responses: [
          { text: "[Open the chest]", nextId: 'open' },
          { text: "[Leave it alone]", nextId: 'end' },
        ],
      },
      {
        id: 'open',
        text: "Inside the chest you find **20 gold coins** and a **Health Potion**! (Added to inventory)",
        responses: [
          { text: "[Take the items]", nextId: 'end' },
        ],
      },
      { id: 'end', text: "", responses: [] },
    ],
  },

  // === MAP INTERACTABLES ===
  ranger_sign: {
    id: 'ranger_sign',
    nodes: [{ id: 'start', text: "A weathered sign reads: '**Ranger Outpost** — All travelers welcome. Beware __wolves__ north of here.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  bridge_sign: {
    id: 'bridge_sign',
    nodes: [{ id: 'start', text: "A sign posted near the bridge: '**Lake crossing** — Watch your step. Fish are biting!'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  danger_sign: {
    id: 'danger_sign',
    nodes: [{ id: 'start', text: "**WARNING:** __Wolf territory__ ahead. Only experienced adventurers should proceed.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  forest_entry_sign: {
    id: 'forest_entry_sign',
    nodes: [{ id: 'start', text: "A carved wooden sign: '**Welcome to the Whispering Woods**. Stay on the __paths__, traveler.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  hunter_clue: {
    id: 'hunter_clue',
    nodes: [
      { 
        id: 'start', 
        text: "A cluster of **loose manuscript pages** rests on the stand, still catching the light. In the hunter's hand: '**Defeated by shadow creatures** near the northern perimeter. The forest is not safe. I must return to warn the village...'",
        responses: [{ text: "Take the Hunter's Manuscript and return to the Elder", nextId: 'complete_quest' }]
      },
      { 
        id: 'complete_quest', 
        text: "You secure the **Hunter's Manuscript**. Its final pages should reach the village elder.", 
        responses: [{ text: "[Continue]", nextId: 'end' }] 
      },
      { id: 'end', text: "", responses: [] }
    ],
  },
  witch_sign: {
    id: 'witch_sign',
    nodes: [{ id: 'start', text: "Scrawled on a rotting plank: '**The Witch** sees all. Leave __offerings__ or leave quickly.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },

  witch_hut_lore: {
    id: 'witch_hut_lore',
    nodes: [
      {
        id: 'start',
        text: "Charred notes and rune-carved bark cover the table. One line is underlined three times: '__Shadow roots__ drink old magic below the temple hill. The seal is __fraying__.'",
        responses: [
          { text: "Study the writings closely.", nextId: 'lore' },
        ],
      },
      {
        id: 'lore',
        text: "You understand the danger: a **well of shadow magic** is waking, twisting creature and forest alike. The witch has been holding the line for years.",
        responses: [{ text: "[Continue]", nextId: 'end' }],
      },
      { id: 'end', text: '', responses: [] },
    ],
  },
  temple_sign: {
    id: 'temple_sign',
    nodes: [{ id: 'start', text: "Ancient runes glow faintly: '**Beyond lies the Temple of the Forgotten**. Only the __worthy__ may enter.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  deep_woods_sign: {
    id: 'deep_woods_sign',
    nodes: [{ id: 'start', text: "A battered sign: '**The Deep Woods** — Turn back. __Shadow creatures__ roam these lands.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  tombstone: {
    id: 'tombstone',
    nodes: [{ id: 'start', text: "The weathered inscription is barely legible: '__Here lies one who sought the truth__ and found only **darkness**.'", responses: [{ text: "[Pay respects]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  stump_lore: {
    id: 'stump_lore',
    nodes: [{ id: 'start', text: "This ancient tree stump has __strange markings__ carved into it. They seem to point **north**, toward the **forest**.", responses: [{ text: "[Interesting...]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  market_sign: {
    id: 'market_sign',
    nodes: [{ id: 'start', text: "**The Market District** — Finest wares in all of __Greenleaf Village__!", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  ancient_tablet: {
    id: 'ancient_tablet',
    nodes: [{ id: 'start', text: "The ancient tablet bears inscriptions in a forgotten language. You can make out: '__...the key lies where **shadows** converge...__'", responses: [{ text: "[Study further]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  ancient_tablet_2: {
    id: 'ancient_tablet_2',
    nodes: [{ id: 'start', text: "Another tablet, cracked with age: '__...three trials await those who seek the vault. **Strength**. **Wisdom**. **Courage**.__'", responses: [{ text: "[Remember this]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  vault_inscription: {
    id: 'vault_inscription',
    nodes: [{ id: 'start', text: "Golden letters shimmer on the wall: '**The Vault of Ancients**. Here rest __treasures of a civilization long forgotten__.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  campfire: {
    id: 'campfire',
    nodes: [{ id: 'start', text: "The campfire crackles warmly. You feel your wounds __healing__ in its gentle light.", responses: [{ text: "[Rest by the fire]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  healing_mushroom: {
    id: 'healing_mushroom',
    nodes: [{ id: 'start', text: "A ring of __glowing mushrooms__ pulses with **healing energy**. You feel revitalized!", responses: [{ text: "[Absorb the energy]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },

  // ========== NEW NPC DIALOGUES ==========
  blacksmith: {
    id: 'blacksmith',
    nodes: [
      {
        id: 'start',
        text: "The forge burns hot! Name's **Grond**. I've been hammering steel since before you were born. What brings you to my shop?",
        responses: [
          { text: "Can you improve my weapons?", nextId: 'weapons' },
          { text: "Heard any rumors lately?", nextId: 'rumors' },
          { text: "Just browsing.", nextId: 'end' },
        ],
      },
      {
        id: 'weapons',
        text: "Ha! Eager to fight, are we? I can see your blade's seen some action. Come back with some **rare ore** from the **Ancient Ruins** and I'll forge you something __special__.",
        responses: [
          { text: "I'll keep an eye out for ore.", nextId: 'end' },
        ],
      },
      {
        id: 'rumors',
        text: "Word is the creatures in the **forest** are getting bolder. __Wolves__ prowling closer to the village walls. And there's talk of something stirring in the **Deep Woods**... something __ancient__.",
        responses: [
          { text: "That's concerning.", nextId: 'end' },
          { text: "Nothing I can't handle.", nextId: 'end' },
        ],
      },
      { id: 'end', text: "Keep your blade sharp, adventurer.", responses: [] },
    ],
  },

  healer: {
    id: 'healer',
    nodes: [
      {
        id: 'start',
        text: "Greetings, weary traveler. I am **Sister Lenna**. I tend to the sick and wounded. You look like you could use some __healing__.",
        responses: [
          { text: "Can you heal me?", nextId: 'heal' },
          { text: "Do you know anything about the forest?", nextId: 'forest' },
          { text: "I'm fine, thanks.", nextId: 'end' },
        ],
      },
      {
        id: 'heal',
        text: "Of course. The light mends all wounds. Rest a moment... there. You should feel __much better__ now. (**Health restored**)",
        responses: [
          { text: "Thank you, Sister.", nextId: 'end' },
        ],
      },
      {
        id: 'forest',
        text: "I've treated several hunters with __strange wounds__ recently. Bite marks that glow with an unnatural **purple light**. Whatever lurks in those woods, it's no __ordinary beast__.",
        responses: [
          { text: "I'll be careful.", nextId: 'end' },
        ],
      },
      { id: 'end', text: "May the light guide your path.", responses: [] },
    ],
  },

  farmer: {
    id: 'farmer',
    nodes: [
      {
        id: 'start',
        text: "Hmph. Another adventurer tramping through my fields. Mind where you step! Those __crops__ took months to grow.",
        responses: [
          { text: "Sorry about that. Need any help?", nextId: 'help' },
          { text: "Seen anything strange around here?", nextId: 'strange' },
          { text: "I'll be on my way.", nextId: 'end' },
        ],
      },
      {
        id: 'help',
        text: "Help? HA! Unless you can chase off the **slimes** eating my cabbages, I don't see what good a sword-swinger like you can do. They come from the __south__ at night.",
        responses: [
          { text: "I'll handle the slimes for you.", nextId: 'end' },
        ],
      },
      {
        id: 'strange',
        text: "Strange? Besides the __wolves__ getting braver and those blasted **slimes**? I saw lights flickering near the **old cemetery** last night. Didn't stick around to investigate.",
        responses: [
          { text: "I'll check it out.", nextId: 'end' },
        ],
      },
      { id: 'end', text: "Now get off my turnips!", responses: [] },
    ],
  },

  child: {
    id: 'child',
    nodes: [
      {
        id: 'start',
        text: "Wow! Are you a real **adventurer**?! That's so cool! I want to be an adventurer when I grow up! Do you fight __monsters__?!",
        responses: [
          { text: "I sure do! Want to hear a story?", nextId: 'story' },
          { text: "It's dangerous work, kid.", nextId: 'dangerous' },
          { text: "Maybe when you're older.", nextId: 'end' },
        ],
      },
      {
        id: 'story',
        text: "YES! Tell me tell me! ...Wow, a real **shadow beast**?! My friend **Tommy** says he saw one near the __old well__ but I think he was just making it up. Or maybe not...",
        responses: [
          { text: "Stay safe, little one.", nextId: 'end' },
        ],
      },
      {
        id: 'dangerous',
        text: "I know! That's what makes it COOL! My mom says I can't go past the __village gates__ but sometimes I sneak out to the **lake**. Don't tell her!",
        responses: [
          { text: "Your secret's safe with me.", nextId: 'end' },
        ],
      },
      { id: 'end', text: "Bye bye, adventurer! Come back and tell me more stories!", responses: [] },
    ],
  },
  building_entrance: {
    id: 'building_entrance',
    nodes: [
      {
        id: 'start',
        text: "*The door stands ajar, inviting you inside.*\n\n_(Stand still for a moment to enter)_",
        responses: [],
      },
    ],
  },
  building_exit: {
    id: 'building_exit',
    nodes: [
      {
        id: 'start',
        text: "*Exit to the outside world?*\n\n_(Stand still for a moment to leave)_",
        responses: [],
      },
    ],
  },
};
