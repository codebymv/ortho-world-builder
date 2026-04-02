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
        text: "Thank you, brave soul! The **hunter** was last seen heading into the **Whispering Woods** near a **run down old shack**. Search it, find what became of him, and discover what troubles our forest. Take this __map__ - it will guide you.",
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
        text: "Have you found any sign of our missing **hunter**? Search the **run down old shack** in the **Whispering Woods** if you have not yet, and please be careful in the **forest**.",
        responses: [
          { text: "Still searching. I'll keep looking.", nextId: 'end' },
        ],
      },
      {
        id: 'quest_active_fragment',
        text: "A **fragment**? There must be more. The hunter wouldn't have stopped there — he was __thorough__, stubborn to a fault. The writing speaks of a corruption deeper in the woods... beyond a river. Find the rest of the manuscript. That is our only hope of understanding what stirs in the forest.",
        responses: [
          { text: "I'll cross the river and find the rest.", nextId: 'end' },
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
        id: 'shadow_watch',
        text: "Greenleaf speaks your name with gratitude now. The village will hold the lantern line as best it can, but the road ahead leads to **Shadow Castle**. Rest while you can. When you are ready, finish what woke in the woods.",
        responses: [
          { text: "I'll carry the fight north.", nextId: 'end' },
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
        id: 'manuscript_return',
        text: "Since your return from the cottage, half the village has been buying lantern oil, bandages, and lucky charms. Bad times for nerves, good times for trade. What can I get you?",
        responses: [
          { text: "What do you have for sale?", nextId: 'shop' },
          { text: "Tell me about your travels.", nextId: 'travels' },
          { text: "I heard you're looking for rare herbs.", nextId: 'merchant_herb_pitch' },
          { text: "Nothing today, thanks.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "These days I'm selling more lamp oil and salves than trinkets. Still, if you're marching on **Shadow Castle**, better to leave prepared than brave and empty-handed.",
        responses: [
          { text: "Show me your goods.", nextId: 'shop' },
          { text: "Tell me about your travels.", nextId: 'travels' },
          { text: "Still looking for rare herbs?", nextId: 'merchant_herb_pitch' },
          { text: "I'll be on my way.", nextId: 'end' },
        ],
      },
      {
        id: 'shop',
        text: "I have **Ephemeral Extracts**, __ancient maps__, and **mysterious artifacts**. Each item has been carefully selected from my journeys. Prices are fair, I assure you!",
        responses: [
          { text: "I'll take an Ephemeral Extract.", nextId: 'buy_potion' },
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
        text: "Ah! There are **Ancient Ruins** beyond the **Whispering Woods** - older than the village itself. Locals say they hold __great power__, but also __great danger__. Few dare venture that far.",
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
        text: "Excellent choice! This **Ephemeral Extract** will restore your vitality in times of need. That'll be __10 gold__ pieces.",
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
        id: 'merchant_herb_pitch',
        text: "Moonbloom only blooms where old stone remembers moonlight. Bring me **three bunches** from the **Whispering Woods** and the ruin-side paths beyond it, and I'll pay well for the risk.",
        responses: [
          { text: "I'll gather the Moonbloom.", nextId: 'end', givesQuest: 'merchants_request' },
          { text: "Not today.", nextId: 'end' },
        ],
      },
      {
        id: 'merchant_moonbloom_deliver',
        text: "By the stars, you really found enough __Moonbloom__. Hand it over and I'll make it worth your while. Fresh bloom like this is hard to come by in frightened times.",
        responses: [
          { text: "Hand over the Moonbloom.", nextId: 'end' },
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
        id: 'manuscript_return',
        text: "Since your report from the **Disparaged Cottage**, we've doubled the watch and barred the north road at dusk. If you're heading back out, do it with your eyes open.",
        responses: [
          { text: "What are the defenses now?", nextId: 'guarding' },
          { text: "I could help you patrol.", nextId: 'patrol_offer' },
          { text: "Stay sharp.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "The Elder's warning changed everything. Every spear in **Greenleaf** faces north now, and every torch stays lit past midnight. If the castle stirs, we hold long enough for you to end it.",
        responses: [
          { text: "How bad is it beyond the walls?", nextId: 'dangers' },
          { text: "Hold the line.", nextId: 'end' },
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
        id: 'patrol_offer',
        text: "Good. Sweep the **northern border**, put down whatever hostile creatures you find, and report back. We need proof the line can still hold.",
        responses: [
          { text: "I'll take the patrol.", nextId: 'end', givesQuest: 'guard_duty' },
          { text: "Maybe another time.", nextId: 'end' },
        ],
      },
      {
        id: 'guard_turnin',
        text: "Back from the border? You look like you've thinned the pack. That's the sort of work that buys a village one more quiet night.",
        responses: [
          { text: "The border is clear for now.", nextId: 'end' },
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
      { id: 'start', text: "A weathered wooden sign reads: '**Welcome to Greenleaf Village** - Founded __342 years ago__. Population: 47. May peace and prosperity guide all who enter.'", responses: [{ text: "[Continue]", nextId: 'end' }] },
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
        text: "Inside the chest you find **20 gold coins** and an **Ephemeral Extract**! (Added to inventory)",
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
    nodes: [{ id: 'start', text: "A weathered sign reads: '**Ranger Outpost** — Rest, resupply, and keep the fire lit. Follow the __blood-dark trail east__ for the **Disparaged Cottage**. __Northwest__ paths lead into wolf country.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  /** Pacing: after the cottage arc, the main quest continues up the central packed-earth spine; this sign anchors that read. */
  ranger_north_spine_sign: {
    id: 'ranger_north_spine_sign',
    nodes: [{ id: 'start', text: "Nailed beside the __main verge__: '**Fort ahead. Keep to the packed spine.** If the south gate is barred, check the __chapel ruins to the west__ before pressing north.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  /** Just before the lake / bridge cluster — confirms the player is still on the critical path. */
  whisper_lake_runoff_sign: {
    id: 'whisper_lake_runoff_sign',
    nodes: [{ id: 'start', text: "A slate shard wedged in a stump: '__Still on the spine.__' Under it, fresher chalk — '**Cross the bridge**, then pick up the **dark thread** where the reeds end. The manuscript trail does not turn aside here.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  /** Just north of the fort — confirms the player is on the right track toward the lake and Hollow. */
  fort_north_approach_sign: {
    id: 'fort_north_approach_sign',
    nodes: [{ id: 'start', text: "A ranger stake, freshly cut: '**Lake crossing** ahead. Stay on the __spine__. The river is the last line before the **Hollow**.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  /** West branch off the spine — frames detours as deliberate exploration, not the authored quest line. */
  whisper_wild_fork_sign: {
    id: 'whisper_wild_fork_sign',
    nodes: [{ id: 'start', text: "Scratched into the post: '__Chapel ruins.__ West path only. Patrols kept spare iron and lock keys there when the fort sealed early.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  forest_shortcut_lever: {
    id: 'forest_shortcut_lever',
    nodes: [{ id: 'start', text: "A rain-darkened **gate lever** juts from a square timber plate beside the collapsed palisade. The mechanism looks old, but the route beyond would fold back toward the **Ranger Outpost**.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  bridge_sign: {
    id: 'bridge_sign',
    nodes: [{ id: 'start', text: "A ranger waypost driven into the bank: '**Lake crossing** — last clean water before the river. Fill your skins here. Beyond the __northern ford__ the corruption sets in and the wood does not forgive.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  danger_sign: {
    id: 'danger_sign',
    nodes: [{ id: 'start', text: "**WARNING:** __Wolf territory__ ahead. The ruin road is faster, but only experienced hunters should proceed.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  forest_entry_sign: {
    id: 'forest_entry_sign',
    nodes: [{ id: 'start', text: "A carved wooden sign: '**Welcome to the Whispering Woods**. Stay on the __paths__. The __ranger fire__ burns on the rise ahead.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  destroyed_town_sign: {
    id: 'destroyed_town_sign',
    nodes: [{ id: 'start', text: "A broken road marker lists no village name, only a warning carved later by an unsteady hand: '__Do not rebuild here.__ The dead were walking before the roofs were cold.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  hunter_cottage_sign: {
    id: 'hunter_cottage_sign',
    nodes: [{ id: 'start', text: "A crude board hangs by a single nail: '**Disparaged Cottage**.' Someone has scratched a second line beneath it: '__Do not linger after dark.__'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  forest_cottage_sign: {
    id: 'forest_cottage_sign',
    nodes: [{ id: 'start', text: "A faded placard reads: '**Wayfarer's Cottage**.' The latch is clean and the threshold recently swept.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  hunter_clue: {
    id: 'hunter_clue',
    nodes: [
      { 
        id: 'start', 
        text: "Torn **manuscript pages** rest on the stand, but many are missing. The hunter's scrawl reads: '**Only a fragment** of the text survived the journey. The corruption runs deeper — I pressed north past the river, following it to its source. If these pages are found, follow the trail north. The rest of the manuscript lies beyond the **Hollow**...'",
        responses: [{ text: "Take the Manuscript Fragment", nextId: 'complete_quest' }]
      },
      { 
        id: 'complete_quest', 
        text: "You take the **Manuscript Fragment**. The hunter's trail leads north, past the river, into the corrupted heart of the woods. The rest of the manuscript must be there.", 
        responses: [{ text: "[Continue]", nextId: 'end' }] 
      },
      { id: 'end', text: "", responses: [] }
    ],
  },

  hollow_manuscript: {
    id: 'hollow_manuscript',
    nodes: [
      {
        id: 'start',
        text: "Inside the chest, beneath layers of dried moss and corruption, you find the **complete manuscript**. The hunter's final entry reads: 'The Guardian is the source — or the seal. I cannot tell which. The corruption flows from the earth itself. Take this knowledge to the elder. Let my journey mean something.'",
        responses: [{ text: "Take the Hunter's Manuscript", nextId: 'complete_quest' }],
      },
      {
        id: 'complete_quest',
        text: "You secure the **complete Hunter's Manuscript**. Combined with the fragment, this is everything the elder needs. The path back to the village is long — but the Hollow's secrets are now yours to carry.",
        responses: [{ text: "[Continue]", nextId: 'end' }],
      },
      { id: 'end', text: '', responses: [] },
    ],
  },

  hollow_warning_sign: {
    id: 'hollow_warning_sign',
    nodes: [{ id: 'start', text: "Carved into a weathered post: '**The trees grow sick** beyond this river. Turn back if you value your life. Those who cross do not return unchanged.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },

  hollow_trail_sign_1: {
    id: 'hollow_trail_sign_1',
    nodes: [{ id: 'start', text: "A hunter's carved marker in the bark: '**The corruption grows thicker here.** The manuscript speaks of a guardian — something ancient, bound to the roots. I press on.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },

  hollow_trail_sign_2: {
    id: 'hollow_trail_sign_2',
    nodes: [{ id: 'start', text: "Scratched into a dead trunk: '**I can hear it breathing** in the dark. The ground pulses underfoot. If I don't return, tell the elder it was worth knowing.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },

  hollow_trail_sign_3: {
    id: 'hollow_trail_sign_3',
    nodes: [{ id: 'start', text: "The last marker before the clearing. The hunter's hand was shaking: '**The arena is ahead.** Something guards this place. I leave the rest of the manuscript here — if it survives me.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },

  hollow_final_camp: {
    id: 'hollow_final_camp',
    nodes: [{ id: 'start', text: "A dying campfire and a **broken sword** driven into the earth. The hunter's last camp. Whatever he found here, it found him first. The boss arena looms ahead.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },

  hollow_shortcut_lever: {
    id: 'hollow_shortcut_lever',
    nodes: [{ id: 'start', text: "A crude lever mechanism bound in twisted roots and corroded iron. The path beyond would lead back toward the **Hollow bonfire**.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },

  hollow_hunter_camp_1: {
    id: 'hollow_hunter_camp_1',
    nodes: [{ id: 'start', text: "An abandoned campsite. Supplies scattered, a torn bedroll. The hunter rested here — but not for long. Claw marks score the nearby trees.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },

  hollow_hunter_camp_2: {
    id: 'hollow_hunter_camp_2',
    nodes: [{ id: 'start', text: "Another of the hunter's camps, more desperate than the last. A crude poultice bandage lies discarded. The corruption was already taking hold.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },

  hollow_hunters_final_camp: {
    id: 'hollow_hunters_final_camp',
    nodes: [{ id: 'start', text: "The hunter's final resting place before the arena. His pack is here, empty. Only the trail markers remain — and whatever waits ahead.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  witch_sign: {
    id: 'witch_sign',
    nodes: [{ id: 'start', text: "Scrawled on a rotting plank: '**The Witch** sees all. Leave __offerings__ and follow the __lanterns west__ if you seek counsel. Climb __north__ only if you seek the shadow gate.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
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
        text: "You understand the danger: a **well of shadow magic** is waking, twisting creature and forest alike. The witch has been holding the line for years. Its pull now climbs the __temple road__ toward the **Shadow Castle** gate.",
        responses: [{ text: "[Continue]", nextId: 'end' }],
      },
      { id: 'end', text: '', responses: [] },
    ],
  },
  temple_sign: {
    id: 'temple_sign',
    nodes: [{ id: 'start', text: "Ancient runes glow faintly: '**Beyond lies the Temple of the Forgotten**. The __seal road__ climbs north toward the **Shadow Castle** gate. Cross the ruined court, raise the inner mechanism, and only then may the keep be faced.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  deep_woods_sign: {
    id: 'deep_woods_sign',
    nodes: [{ id: 'start', text: "A battered sign: '**The Deep Woods** — Turn back. Follow the __west lantern road__ to the witch. The __north road__ rises toward old temple stones and the shadow gate beyond.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  tombstone: {
    id: 'tombstone',
    nodes: [{ id: 'start', text: "The weathered inscription is barely legible: '__Here lies one who sought the truth__ and found only **darkness**.'", responses: [{ text: "[Pay respects]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  stump_lore: {
    id: 'stump_lore',
    nodes: [{ id: 'start', text: "This ancient tree stump has __strange markings__ carved into it. They seem to point deeper into the **forest**, toward an older trail.", responses: [{ text: "[Interesting...]", nextId: 'end' }] }, { id: 'end', text: "", responses: [] }],
  },
  wolf_den_bones: {
    id: 'wolf_den_bones',
    nodes: [{ id: 'start', text: "The bones are picked clean and stacked almost neatly. A snapped spear shaft lies among them, suggesting the wolves dragged more than deer back to this hollow.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  old_chapel_altar: {
    id: 'old_chapel_altar',
    nodes: [{ id: 'start', text: "A stone altar sinks into the damp floor. Melted wax and fern roots share the same cracks. Someone still leaves tiny offerings here: feathers, beads, and silver thread.", responses: [{ text: "[Pay respects]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  volcano_warning: {
    id: 'volcano_warning',
    nodes: [{ id: 'start', text: "A soot-stained sign warns: '**Ashfall ridge ahead.** The ground breaks without warning when the old fire mountain mutters.'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  temple_inscription: {
    id: 'temple_inscription',
    nodes: [{ id: 'start', text: "Shallow carvings run across the temple stones: '__Bind the wild heart. Keep the hill asleep.__' Moss obscures the rest.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  chapel_dead_ranger: {
    id: 'chapel_dead_ranger',
    nodes: [
      { id: 'start', text: "A ranger slumped against the chapel steps. Dead for days — armour torn, a heavy **iron key** on his belt. A torn note in his hand reads: '__Fort overrun. Lock the gate. Don't let them inside the walls.__'", responses: [{ text: "Take the key.", nextId: 'take_key' }, { text: "Leave him.", nextId: 'end' }] },
      { id: 'take_key', text: "You pull the key free. The crest on its bow matches the fort banner to the east.", responses: [{ text: "[Continue]", nextId: 'end' }] },
      { id: 'end', text: '', responses: [] },
    ],
  },
  forest_fort_banner: {
    id: 'forest_fort_banner',
    nodes: [{ id: 'start', text: "A faded crest — lantern over crossed spears. Scratched below in charcoal: '**Gate sealed. Merchant inside.** Last spare key taken toward the __chapel ruins__.", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  caravan_journal: {
    id: 'caravan_journal',
    nodes: [{ id: 'start', text: "Most of the ledger is ruined by rain, but the last page remains: '__Lost two mules at dusk. Heard bells in the trees. Leaving the crates and making for the south gate before moonrise.__'", responses: [{ text: "[Continue]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  spider_cocoon: {
    id: 'spider_cocoon',
    nodes: [{ id: 'start', text: "The cocoon twitches once when you draw near, then hangs still. Strands of cloth and old mail are woven into the silk like warning flags.", responses: [{ text: "[Step back]", nextId: 'end' }] }, { id: 'end', text: '', responses: [] }],
  },
  ancient_well: {
    id: 'ancient_well',
    nodes: [
      {
        id: 'start',
        text: "A circular well of pale stone sits beside the trail, older than the road around it. The water below is clear enough to reflect the canopy like dark glass.",
        responses: [
          { text: "[Drink from the well]", nextId: 'drink' },
          { text: "[Leave it alone]", nextId: 'end' },
        ],
      },
      {
        id: 'drink',
        text: "The water is cold and impossibly clean. Your breathing steadies, and for a moment the whispering of the woods grows quiet. (**Health restored**)",
        responses: [{ text: "[Continue]", nextId: 'end' }],
      },
      { id: 'end', text: '', responses: [] },
    ],
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
        id: 'manuscript_return',
        text: "Ever since you came back from that cottage, I've been turning spare iron into nails, spearheads, and anything else that might stop a beast at the wall. Need something while the forge is still hot?",
        responses: [
          { text: "Can you improve my weapons?", nextId: 'weapons' },
          { text: "Heard any rumors lately?", nextId: 'rumors' },
          { text: "Just browsing.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "I've handed the guard every spare blade I trust not to snap. If you're really going north, make sure your steel is cleaner than your conscience.",
        responses: [
          { text: "Can you improve my weapons?", nextId: 'weapons' },
          { text: "Heard any rumors lately?", nextId: 'rumors' },
          { text: "Just browsing.", nextId: 'end' },
        ],
      },
      {
        id: 'weapons',
        text: "Ha! Eager to fight, are we? I can sharpen what you've got, but if you're looking for a real upgrade you'll need to find something out in the wilds. I've heard the **Ancient Ruins** still hold blades from a bygone age.",
        responses: [
          { text: "I'll keep that in mind.", nextId: 'end' },
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
        id: 'manuscript_return',
        text: "Since your news from the forest, the chapel has barely gone quiet. Hunters, woodcutters, frightened children - everyone wants a blessing before sunset. How may I help you?",
        responses: [
          { text: "Can you heal me?", nextId: 'heal' },
          { text: "Do you know anything about the forest?", nextId: 'forest' },
          { text: "I'm fine, thanks.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "The beds are full and the lanterns burn through the night, but fear is worse than any wound if you let it settle. Tell me what you need.",
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

  apothecary: {
    id: 'apothecary',
    nodes: [
      {
        id: 'start',
        text: "Welcome to the **Greenleaf Apothecary**. I'm **Mirelle**. If it's bitter, it probably works. If it stains, don't ask what was in it. What do you need?",
        responses: [
          { text: "Could you mix a restorative?", nextId: 'heal' },
          { text: "What are people buying lately?", nextId: 'stock' },
          { text: "Seen anything strange from the woods?", nextId: 'woods' },
          { text: "Just browsing.", nextId: 'end' },
        ],
      },
      {
        id: 'manuscript_return',
        text: "Since the hunter's notes came back, I've been grinding moonbloom and sleep-leaf from dawn to dusk. Folk want courage in a bottle, but I mostly sell steadier hands and quieter hearts.",
        responses: [
          { text: "Could you mix a restorative?", nextId: 'heal' },
          { text: "What are people buying lately?", nextId: 'stock' },
          { text: "Seen anything strange from the woods?", nextId: 'woods' },
          { text: "Just browsing.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "I've moved the strongest tinctures off the front shelves. Between the chapel beds and the north watch, the whole village seems to breathe in short, careful sips now. What can I make for you?",
        responses: [
          { text: "Could you mix a restorative?", nextId: 'heal' },
          { text: "What are people buying lately?", nextId: 'stock' },
          { text: "Seen anything strange from the woods?", nextId: 'woods' },
          { text: "Just browsing.", nextId: 'end' },
        ],
      },
      {
        id: 'heal',
        text: "Drink this while it's still warm. Bitter root, clean water, and just enough embermint to bully the ache out of your bones. (**Health restored**)",
        responses: [
          { text: "That helped. Thanks.", nextId: 'end' },
        ],
      },
      {
        id: 'stock',
        text: "Bandages, calming draughts, lamp-oil, and every herb the rangers drag in before sunset. When a village gets nervous, it starts buying anything that promises one more good night of sleep.",
        responses: [
          { text: "Makes sense.", nextId: 'end' },
        ],
      },
      {
        id: 'woods',
        text: "The worst part isn't the blood on the hunters' clothes. It's the resin. Black, sticky, and cold even when I put it near the fire. Whatever's gone wrong beyond the **Deep Woods**, it's seeping south in more ways than one.",
        responses: [
          { text: "I'll remember that.", nextId: 'end' },
        ],
      },
      { id: 'end', text: "Mind the shelves. Half these bottles heal, and the other half teach respect.", responses: [] },
    ],
  },

  chapel_keeper: {
    id: 'chapel_keeper',
    nodes: [
      {
        id: 'start',
        text: "Peace on this threshold. I'm **Rowan**, keeper of the village chapel. We keep the candles trimmed, the names remembered, and the door unbarred for anyone who needs a quieter room than the world provides.",
        responses: [
          { text: "How's the chapel holding up?", nextId: 'chapel' },
          { text: "How is the village taking all this?", nextId: 'watch' },
          { text: "I'll leave you to your work.", nextId: 'end' },
        ],
      },
      {
        id: 'manuscript_return',
        text: "Since word came back from the forest, we've kept the chapel open past moonrise. People pray here, rest here, and sometimes just sit where the bells ought to sound and listen for proof the night hasn't swallowed everything yet.",
        responses: [
          { text: "How's the chapel holding up?", nextId: 'chapel' },
          { text: "How is the village taking all this?", nextId: 'watch' },
          { text: "I'll leave you to your work.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "We're down to the last dry linens and the chapel floor is lined with cots, but the door still opens and the lantern still burns. That's enough to keep fear from thinking it owns the room.",
        responses: [
          { text: "How's the chapel holding up?", nextId: 'chapel' },
          { text: "How is the village taking all this?", nextId: 'watch' },
          { text: "I'll leave you to your work.", nextId: 'end' },
        ],
      },
      {
        id: 'chapel',
        text: "A chapel earns its keep long before funerals. Right now it's blankets, water, a steady voice, and someplace Sister Lenna can send the frightened before they become wounded.",
        responses: [
          { text: "That's good to hear.", nextId: 'end' },
        ],
      },
      {
        id: 'watch',
        text: "Greenleaf still has its shape: market fires, chapel candles, gate lanterns, boots on the road. People can endure a great deal if the small familiar things keep happening around them.",
        responses: [
          { text: "Let's keep it that way.", nextId: 'end' },
        ],
      },
      { id: 'end', text: "If you need a quiet moment before the road, the chapel door is yours.", responses: [] },
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
        id: 'manuscript_return',
        text: "Since the village heard your news, nobody wants to work the fields after dusk. Can't say I blame them. Half the harvest's still sitting out there under a nervous sky.",
        responses: [
          { text: "Sorry about that. Need any help?", nextId: 'help' },
          { text: "Seen anything strange around here?", nextId: 'strange' },
          { text: "I'll be on my way.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "We've hauled what grain we can inside the fences and left the rest to weather. If the castle road keeps souring the night air, next season's going to be hard.",
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
          { text: "Sounds rough. Good luck with that.", nextId: 'end' },
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
        id: 'manuscript_return',
        text: "Everyone keeps whispering about the forest now. Mama says I have to stay where the lanterns reach, but I still want to hear what you saw out there!",
        responses: [
          { text: "I sure do! Want to hear a story?", nextId: 'story' },
          { text: "It's dangerous work, kid.", nextId: 'dangerous' },
          { text: "Maybe when you're older.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "They won't let me near the north gate anymore. Everybody keeps carrying boxes and whispering about the castle. Are you really going to stop it?",
        responses: [
          { text: "I sure do! Want to hear a story?", nextId: 'story' },
          { text: "It's dangerous work, kid.", nextId: 'dangerous' },
          { text: "Maybe when you're older.", nextId: 'end' },
        ],
      },
      {
        id: 'story',
        text: "YES! Tell me tell me! ...Wow, a real **shadow beast**?! I bet they're huge! Do they have claws? Do they breathe fire?! ...Okay maybe I'd be a LITTLE scared.",
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
  innkeeper: {
    id: 'innkeeper',
    nodes: [
      {
        id: 'start',
        text: "Welcome to the **Greenleaf Inn**. I'm **Mara**. Warm stew, dry blankets, and no questions unless you want them. What do you need?",
        responses: [
          { text: "How's the inn holding up?", nextId: 'inn_talk' },
          { text: "Heard anything lately?", nextId: 'rumors' },
          { text: "Just looking around.", nextId: 'end' },
        ],
      },
      {
        id: 'manuscript_return',
        text: "Since the hunter's pages came back, half the village has been sleeping here in shifts. Folk feel safer near the fire and the walls. What can I do for you?",
        responses: [
          { text: "How's the inn holding up?", nextId: 'inn_talk' },
          { text: "Heard anything lately?", nextId: 'rumors' },
          { text: "Just looking around.", nextId: 'end' },
        ],
      },
      {
        id: 'shadow_watch',
        text: "I've turned spare rooms into cots and the common tables into bandage stations. If the castle road sends worse down on us, this place becomes a shelter before sunrise.",
        responses: [
          { text: "How's the inn holding up?", nextId: 'inn_talk' },
          { text: "Heard anything lately?", nextId: 'rumors' },
          { text: "Just looking around.", nextId: 'end' },
        ],
      },
      {
        id: 'inn_talk',
        text: "A village can panic quietly for a while, but you can hear it in the cups and footsteps. These days everyone drinks slower and listens harder.",
        responses: [
          { text: "Any useful rumors?", nextId: 'rumors' },
          { text: "Thanks, Mara.", nextId: 'end' },
        ],
      },
      {
        id: 'rumors',
        text: "Rangers say the woods went wrong in layers. First the beasts, then the shadows, and now the road north feels watched. Whatever waits beyond the **Deep Woods**, it wants the village afraid before it ever arrives.",
        responses: [
          { text: "I'll keep that in mind.", nextId: 'end' },
        ],
      },
      { id: 'end', text: "There's always a chair by the fire if you make it back in one piece.", responses: [] },
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
  hermit_hut: {
    id: 'hermit_hut',
    nodes: [
      {
        id: 'start',
        text: "A ramshackle hut half-swallowed by roots and moss. Dried herbs hang from the eaves. Whoever lived here valued __solitude__ above all else.",
        responses: [{ text: "Move on.", nextId: 'end' }],
      },
      { id: 'end', text: "The forest hums quietly around the hut.", responses: [] },
    ],
  },
  forest_hermit: {
    id: 'forest_hermit',
    nodes: [
      {
        id: 'start',
        text: "A narrow cottage stands under sagging branches. Bundles of dried moss hang in the window and a dozen tiny bottles line the sill. Whoever lives here studies the woods by patience, not force.",
        responses: [{ text: "Move on.", nextId: 'end' }],
      },
      { id: 'end', text: "A faint herbal scent follows you back to the path.", responses: [] },
    ],
  },
  southern_outpost: {
    id: 'southern_outpost',
    nodes: [
      {
        id: 'start',
        text: "An abandoned campsite. Half-packed crates and a cold fire pit suggest the occupants left in a hurry. A torn banner bearing the **village crest** flutters from a crooked pole.",
        responses: [{ text: "Search the camp.", nextId: 'search' }, { text: "Leave.", nextId: 'end' }],
      },
      {
        id: 'search',
        text: "Nothing of value remains. The crates hold only rotted provisions and a broken lantern.",
        responses: [{ text: "Move on.", nextId: 'end' }],
      },
      { id: 'end', text: "The wind picks up as you step away from the outpost.", responses: [] },
    ],
  },
  overgrown_shrine: {
    id: 'overgrown_shrine',
    nodes: [
      {
        id: 'start',
        text: "An ancient shrine reclaimed by the forest. Ivy drapes the altar and wildflowers push through cracked stone. Whatever was once worshipped here is long forgotten.",
        responses: [{ text: "Offer a moment of silence.", nextId: 'pray' }, { text: "Leave.", nextId: 'end' }],
      },
      {
        id: 'pray',
        text: "A faint warmth passes through you. Perhaps the old spirits still listen.",
        responses: [{ text: "Move on.", nextId: 'end' }],
      },
      { id: 'end', text: "The shrine fades into the undergrowth behind you.", responses: [] },
    ],
  },
  witch_cottage: {
    id: 'witch_cottage',
    nodes: [
      {
        id: 'start',
        text: "Shelves of stoppered jars crowd the walls, and a low cauldron ticks as it cools. This place feels less abandoned than merely unattended, as if its owner stepped out only moments ago.",
        responses: [{ text: "Look around quietly.", nextId: 'end' }],
      },
      { id: 'end', text: "Herbs, ash, and rainwater leave a bitter scent in the air.", responses: [] },
    ],
  },
  forest_ranger: {
    id: 'forest_ranger',
    nodes: [
      {
        id: 'start',
        text: "Easy now. The fire's friendly, the woods aren't. I'm the last ranger holding this outpost, and every trail north of here has grown teeth.",
        responses: [
          { text: "What happened to the woods?", nextId: 'woods' },
          { text: "Need a hand with anything?", nextId: 'offer' },
          { text: "Any advice before I move on?", nextId: 'advice' },
        ],
      },
      {
        id: 'woods',
        text: "The forest used to turn hostile in pockets. Now it sours in layers. Wolves first. Then the dead. Then that stone brute on the eastern rise started prowling close enough to shake the watchtower steps.",
        responses: [{ text: "Anything else I should know?", nextId: 'advice' }],
      },
      {
        id: 'offer',
        text: "Aye. There's a **Stone Golem** stalking the eastern highlands above the temple road. Bring it down and the old watch route opens again.",
        responses: [
          { text: "I'll handle the golem.", nextId: 'end', givesQuest: 'rangers_request' },
          { text: "Not yet.", nextId: 'end' },
        ],
      },
      {
        id: 'advice',
        text: "Use the lever by the broken palisade if you find it. That gate folds the hunter road back toward this fire. And if the trees go quiet near stonework, assume something there is hunting.",
        responses: [{ text: "Understood.", nextId: 'end' }],
      },
      {
        id: 'quest_active',
        text: "The golem still walks the eastern highlands. Follow the ridge road past the fort and keep your feet moving when it starts its swing.",
        responses: [{ text: "I'm on it.", nextId: 'end' }],
      },
      {
        id: 'quest_complete',
        text: "You brought the brute down? Good. The ridge will breathe easier now. Take this badge - the watch carried it before the line broke, and you've earned it more than they ever did.",
        responses: [{ text: "I'll take it.", nextId: 'end' }],
      },
      {
        id: 'after_quest',
        text: "The high road's open again, thanks to you. If the woods hold, they'll do it because someone finally hit back hard enough.",
        responses: [{ text: "Stay safe out here.", nextId: 'end' }],
      },
      { id: 'end', text: "Keep the lanterns in sight when you can.", responses: [] },
    ],
  },
  fort_quartermaster: {
    id: 'fort_quartermaster',
    nodes: [
      {
        id: 'start',
        text: "…Hm? Oh. A customer. I have things. You have gold, presumably. Let's not make this longer than it needs to be.",
        responses: [
          { text: "What do you sell?", nextId: 'shop' },
          { text: "Why are you out here?", nextId: 'rumors' },
          { text: "Never mind.", nextId: 'end' },
        ],
      },
      {
        id: 'shop',
        text: "**Tempest Grass** — __8 gold__. **Ephemeral Extract** — __15 gold__. **Ornamental Broadsword** — __280 gold__. That's the whole catalogue. Try not to look disappointed.",
        responses: [
          { text: "Tempest Grass. (8 gold)", nextId: 'buy_tempest_grass' },
          { text: "Ephemeral Extract. (15 gold)", nextId: 'buy_ephemeral_extract' },
          { text: "Ornamental Broadsword. (280 gold)", nextId: 'buy_broadsword' },
          { text: "I'm good.", nextId: 'end' },
        ],
      },
      {
        id: 'buy_tempest_grass',
        text: "Here. __8 gold__. Chew it, steep it, press it on things that bleed. I don't care which.",
        responses: [
          { text: "Anything else?", nextId: 'shop' },
          { text: "That's all.", nextId: 'end' },
        ],
      },
      {
        id: 'buy_ephemeral_extract',
        text: "One vial. __15 gold__. Drink it before you're dead, not after. Common mistake.",
        responses: [
          { text: "Anything else?", nextId: 'shop' },
          { text: "That's all.", nextId: 'end' },
        ],
      },
      {
        id: 'buy_broadsword',
        text: "Ceremonial piece. Previous owner didn't make it out. __280 gold__. Heavy, but it hits like it means it.",
        responses: [
          { text: "Anything else?", nextId: 'shop' },
          { text: "That's all.", nextId: 'end' },
        ],
      },
      {
        id: 'rumors',
        text: "The rangers posted me here. Then they stopped coming back. The wolves got plating from somewhere and the river up north started smelling wrong. I stay because the walls are thick and leaving sounds exhausting.",
        responses: [
          { text: "Show me what you've got.", nextId: 'shop' },
          { text: "Hang in there.", nextId: 'end' },
        ],
      },
      { id: 'end', text: "I'll be here. Obviously.", responses: [] },
    ],
  },
};
