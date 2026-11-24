/**
 * GlitchRealm — per-game content that is not stored in Firestore.
 *
 * Precedence is handled in `loadGames()`:
 *   Firestore snapshot  →  this file  →  short description
 *
 * For `extendedDescription` and `howToPlay` this file is a FALLBACK ONLY: if a
 * game already ships a long description, it is used verbatim and anything here
 * is ignored.
 *
 * `controls`, `tips` and `faq` are additive: they are rendered as their own
 * sections next to the existing content. They never replace game copy.
 */

/** @typedef {{ action: string, keys: string }} Control */
/** @typedef {{ q: string, a: string }} FaqItem */

export const GAME_CONTENT = {
  coderunner: {
    controls: [
      { action: 'Move', keys: 'Arrow keys or WASD' },
      { action: 'Restart a run', keys: 'On-screen restart control' },
      { action: 'Launch the game', keys: 'Play Now' },
    ],
    tips: [
      'Read the whole room before you move — the shortest route is rarely the safest one.',
      'Plan your route around the programming puzzle instead of reacting to it.',
      'Watch the timer: a safe route you finish beats a fast route you restart.',
    ],
    faq: [
      { q: 'Is CodeRunner free to play?', a: 'Yes. CodeRunner is free and runs in your browser on GlitchRealm.' },
      { q: 'Do I need to install anything?', a: 'No. Select Play Now and the game opens in a new tab — there is no download or installer.' },
      { q: 'Who made CodeRunner?', a: 'CodeRunner was developed by NanoShade Studios and is published on GlitchRealm.' },
    ],
  },

  bytesurge: {
    controls: [
      { action: 'Steer', keys: 'Arrow keys or A / D' },
      { action: 'Restart after a crash', keys: 'On-screen restart control' },
      { action: 'Launch the game', keys: 'Play Now' },
    ],
    tips: [
      'Keep your speed up through the data streams — slowing down rarely helps.',
      'Learn the traffic pattern on a run before chasing a fast time.',
      'Restart immediately after a crash and treat each run as a short time trial.',
    ],
    faq: [
      { q: 'Is ByteSurge free?', a: 'Yes, ByteSurge is a free browser game on GlitchRealm.' },
      { q: 'Does it need an account?', a: 'No account is required to play.' },
      { q: 'Who developed ByteSurge?', a: 'ByteSurge was developed by NanoShade Studios.' },
    ],
  },

  neurocore: {
    controls: [
      { action: 'Deploy units', keys: 'In-game command panel' },
      { action: 'Select a node', keys: 'Mouse or tap' },
      { action: 'End a round', keys: 'In-game action button' },
    ],
    tips: [
      'Watch how the enemy commits units before you spend yours.',
      'Contest the nodes that matter instead of spreading across the whole network.',
      'Change your plan each round — the network state shifts as the match goes on.',
    ],
    faq: [
      { q: 'Is NeuroCore: Byte Wars free?', a: 'Yes. It is free to play in your browser on GlitchRealm.' },
      { q: 'Is it multiplayer?', a: 'NeuroCore: Byte Wars is a strategic combat game played against rival algorithms in the network.' },
      { q: 'Who made it?', a: 'NeuroCore: Byte Wars was developed by InfinityByte Studios.' },
    ],
  },

  'reality-sim': {
    controls: [
      { action: 'Interact with the terminal', keys: 'Mouse or tap' },
      { action: 'Enter commands', keys: 'Keyboard, where the interface prompts for input' },
      { action: 'Manage vitals and crafting', keys: 'On-screen terminal menus' },
    ],
    tips: [
      'Secure food and water before you explore — hunger and thirst end runs quickly.',
      'Gather stone and plant fibre early so you can craft tools before nightfall.',
      'Plant crops as soon as you can; sustainable food beats scavenging.',
      'Watch for impossible weather and glitches — they are part of the story, not a bug.',
    ],
    faq: [
      { q: 'Is Reality Sim free?', a: 'Yes, Reality Sim is free to play in your browser.' },
      { q: 'What kind of game is it?', a: 'It is a text-based survival and resource-management game with a terminal-style interface.' },
      { q: 'Who developed Reality Sim?', a: 'Reality Sim was developed by NanoShade Studios.' },
    ],
  },

  'spaceshooter-master': {
    controls: [
      { action: 'Move the ship', keys: 'Arrow keys or WASD' },
      { action: 'Fire', keys: 'Automatic — no fire button needed' },
      { action: 'Pause / resume', keys: 'Pause icon, bottom-left' },
    ],
    tips: [
      'Keep moving; a stationary ship is an easy target for kamikaze fighters.',
      'Collect every power-up you can — the shield and rapid-fire change a run.',
      'Learn the four enemy types: blue fighters ram, red ships rush, green bombers shoot, black elites do all three.',
      'Meteors chain-react. Use a collision to clear a path instead of flying into it.',
    ],
    faq: [
      { q: 'Is SpaceShooter Master free?', a: 'Yes, it is a free HTML5 arcade game on GlitchRealm.' },
      { q: 'Does it work on mobile?', a: 'The game is built for keyboard controls; on touch devices a keyboard is recommended.' },
      { q: 'Who made SpaceShooter Master?', a: 'SpaceShooter Master was developed by InfinityByte.' },
    ],
  },

  xfps: {
    controls: [
      { action: 'Move', keys: 'WASD or arrow keys' },
      { action: 'Sprint', keys: 'Shift' },
      { action: 'Jump / climb', keys: 'Space' },
      { action: 'Crouch / slide', keys: 'C or Ctrl (press while sprinting to slide)' },
      { action: 'Aim (ADS)', keys: 'Right mouse button' },
      { action: 'Fire', keys: 'Left mouse button' },
      { action: 'Reload', keys: 'R' },
      { action: 'Switch weapon', keys: 'Mouse wheel or 1–3' },
      { action: 'Frag grenade', keys: 'G' },
      { action: 'Tactical equipment', keys: 'Q' },
      { action: 'Interact', keys: 'F' },
      { action: 'Melee / finisher', keys: 'E' },
    ],
    tips: [
      'Slide into cover instead of walking — movement is part of the gunplay.',
      'Learn one mode before queuing for everything; Search & Destroy and Domination play very differently.',
      'Use Zombies to practise aim and movement without competitive pressure.',
      'Tactical equipment wins fights; use it before you push, not after.',
    ],
    faq: [
      { q: 'Is xFPS free?', a: 'Yes, xFPS is free to play in the browser.' },
      { q: 'Can I play as a guest?', a: 'Yes — you can join quick matches as a casual guest without creating an account.' },
      { q: 'Which modes are included?', a: 'Team Deathmatch, Free-for-All, Domination, Hardpoint, Search & Destroy, Cyber Attack, Quickscope, Prop Hunt, Hide and Seek, 2v2 Gunfight, Co-op Zombies and a Football mode.' },
      { q: 'Who developed xFPS?', a: 'xFPS was developed by Bink Online.' },
    ],
  },

  'random-realms-3d': {
    controls: [
      { action: 'Move on foot', keys: 'WASD or left stick' },
      { action: 'Look', keys: 'Mouse or right stick' },
      { action: 'Enter a vehicle', keys: 'E' },
      { action: 'Accelerate / brake', keys: 'W / S or triggers' },
      { action: 'Steer', keys: 'A / D or left stick' },
      { action: 'Jump', keys: 'Space or A button' },
      { action: 'Interact / pick up', keys: 'E or Y' },
    ],
    tips: [
      'Runs are short — decide early whether you are driving or walking.',
      'Use the seed controls to repeat a layout you like or reroll for a new one.',
      'Lower the hazard chance while you learn the terrain, then raise it.',
      'Head for the exit beacon if you want a fast clear; collect pickups if you want a fuller run.',
    ],
    faq: [
      { q: 'Is Random Realms 3D free?', a: 'Yes, it is free to play in your browser.' },
      { q: 'What does the AI panel do?', a: 'It exposes simple generation controls: seed, vehicle presence, pickup density and hazard chance.' },
      { q: 'Who developed it?', a: 'Random Realms 3D was developed by InfinityByte.' },
    ],
  },

  'spire-oath': {
    controls: [
      { action: 'Create a character', keys: 'In-game character screen' },
      { action: 'Use a skill', keys: 'In-game combat bar' },
      { action: 'Open inventory / enchant', keys: 'In-game menu' },
      { action: 'Start a fight', keys: 'Fight button on Home' },
    ],
    tips: [
      'Start with Bot or Farm battles to learn your class before entering PvP.',
      'Equip and enchant gear before pushing raid content.',
      'Raid Boss registration needs level 20+; Epic Boss needs level 40+.',
      'Your progress is stored on the game server, so you can return to the same hero later.',
    ],
    faq: [
      { q: 'Is Spire Oath free?', a: 'Yes. Spire Oath is free-to-play in a web browser or through Telegram.' },
      { q: 'Do I need to download it?', a: 'No. It runs in the browser and as a Telegram Mini App.' },
      { q: 'Who developed Spire Oath?', a: 'Spire Oath was developed by TGAME.' },
    ],
  },

  roadrival: {
    controls: [
      { action: 'Build roads', keys: 'Mouse or tap on the battlefield' },
      { action: 'Place towers', keys: 'Mouse or tap on a build slot' },
      { action: 'Choose a mode', keys: 'In-game mode menu' },
    ],
    tips: [
      'Play the three-minute guided bot match before jumping into multiplayer.',
      'Build chokepoints instead of covering the whole map evenly.',
      'Keep a defensive line around your castle while you push the other side.',
      'Road Race and Road Clash reward different plans — learn both.',
    ],
    faq: [
      { q: 'Is RoadRival free?', a: 'Yes, RoadRival is free to play in your browser.' },
      { q: 'Can I play offline?', a: 'Yes — Road Race and Road Clash both support offline bot matches.' },
      { q: 'Is it mobile friendly?', a: 'Yes, the game is optimised for touch devices as well as desktop.' },
      { q: 'Who developed RoadRival?', a: 'RoadRival was developed by Blink Online.' },
    ],
  },

  'sushi-catch': {
    extendedDescription:
      '**Sushi Catch** is a free arcade reflex game from InfinityByte. You are the itamae: slide a ceramic plate across the counter, catch fresh sushi, and let the bad orders fall past. Five shifts, each with a target score, stand between you and the title of Grand Itamae Master.\n\nThe counter is generous with points but unforgiving with mistakes. Salmon nigiri, tamago, tuna maki and shrimp tempura all build your score, while spoiled fish, soy sauce spills and wasabi bombs cost lives. Matcha green tea restores a life, and three Golden Wasabi Leaves trigger a five-second Golden Frenzy where every drop is a 500-point Golden Dragon Roll.\n\nCombos reward clean play: chain catches without a drop and your multiplier climbs up to 5x. The game runs in the browser on desktop and mobile, with no download and no account. Arrow keys, A/D, click-and-drag or a finger all work.',
    controls: [
      { action: 'Slide the plate (desktop)', keys: 'Left / Right arrows or A / D' },
      { action: 'Slide the plate (mouse)', keys: 'Click and drag across the counter' },
      { action: 'Slide the plate (mobile)', keys: 'Drag your finger, or use the on-screen arrows' },
    ],
    tips: [
      'Chain catches without dropping to build the combo multiplier up to 5x.',
      'Watch the top of the screen — drop shadows and arrows telegraph fast or hazardous items.',
      'Do not dodge fresh sushi too eagerly; dropping it also costs a life.',
      'Save matcha for a run where you have already lost a life, and collect three Golden Wasabi Leaves for a Frenzy.',
    ],
    faq: [
      { q: 'Is Sushi Catch free?', a: 'Yes, it is free to play in your browser.' },
      { q: 'How many shifts are there?', a: 'Five. Reach each shift target score to advance to the next one.' },
      { q: 'What happens during Golden Frenzy?', a: 'Everything falls as 500-point Golden Dragon Rolls for five seconds.' },
      { q: 'Who developed Sushi Catch?', a: 'Sushi Catch was developed by InfinityByte.' },
    ],
  },

  'no-map-home': {
    controls: [
      { action: 'Move', keys: 'WASD or arrow keys' },
      { action: 'Select an enemy', keys: 'Click or T' },
      { action: 'Use an ability', keys: '1–6' },
      { action: 'Class defense', keys: 'V' },
      { action: 'Health / energy potion', keys: 'Q / R' },
      { action: 'Interact', keys: 'E or right-click' },
      { action: 'Kindle / cover the lantern', keys: 'Y / U' },
      { action: 'Bag / hero / abilities', keys: 'I / C / K' },
      { action: 'Local map / world atlas', keys: 'M / G' },
      { action: 'Zoom', keys: 'Mouse wheel' },
    ],
    tips: [
      'Play with friends if you can — parties of up to eight share the same dungeon.',
      'At night, an open lantern draws hunters; cover it when you need to move quietly.',
      'Use checkpoints: a defeat returns your hero with progress intact.',
      'Rekindle the Nine Watchlights — they are the thread that moves the story forward.',
    ],
    faq: [
      { q: 'Is No Map Home free?', a: 'Yes. It is free to play in a web browser.' },
      { q: 'How many players can play together?', a: 'Up to eight players can party together.' },
      { q: 'Do I need an account?', a: 'You can start as a guest. From level 2 the guest is kept, and registering during play keeps the hero permanently.' },
      { q: 'Who developed No Map Home?', a: 'No Map Home was developed by nomaphome.' },
    ],
  },

  'sobosuba-squishy-merge-puzzle': {
    controls: [
      { action: 'Aim', keys: 'Mouse or touch' },
      { action: 'Launch a blob', keys: 'Click or release' },
      { action: 'Stronger shot', keys: 'Pull farther before releasing' },
    ],
    tips: [
      'Keep space under the two switches at the top — if both are pressed at once, the round ends.',
      'Use gentle shots to place a blob exactly where you want it.',
      'Use a strong shot to shove the pile and open a path to the next match.',
      'Plan two merges ahead instead of chasing the immediate pair.',
    ],
    faq: [
      { q: 'Is sobosuba free?', a: 'Yes, it is free to play in your browser.' },
      { q: 'Does it work on mobile?', a: 'Yes, it supports both mouse and touch controls.' },
      { q: 'Is there a leaderboard?', a: 'Yes, the game includes a global leaderboard and achievements.' },
      { q: 'Who developed sobosuba?', a: 'sobosuba was developed by an independent community creator and published on GlitchRealm.' },
    ],
  },

  'hood-warfare': {
    extendedDescription:
      '**Hood Warfare** is a free, independent browser first-person shooter built around small, fast matches. Drop into Rail Block with brick-built characters and fight for the centre point with the Carbine, Breacher or Marksman. There is no download and no account — just a keyboard and mouse.\n\nMatches are designed to start quickly. Play solo against bots to learn the map, jump into a public match in about five seconds, or share a room link so up to eight friends can join with bots filling the empty slots. The centre point is the whole game: capture it, hold it, and make the other team come to you.\n\nThe game is an original browser project from Trapstar Games, not an official web port of the Steam game with a similar name. It is built for short sessions: pick a weapon, take the point, and rotate before the other team resets.',
    controls: [
      { action: 'Move', keys: 'WASD' },
      { action: 'Aim', keys: 'Mouse' },
      { action: 'Shoot', keys: 'Left mouse button' },
      { action: 'Capture / hold the point', keys: 'Stand inside the centre zone' },
    ],
    tips: [
      'Learn Rail Block against bots before joining a public match.',
      'The centre point decides the match — do not chase kills away from it.',
      'The Carbine is the flexible pick; the Breacher and Marksman reward tighter ranges and lanes.',
      'Share a room link when you want a private match with friends; bots fill the empty slots.',
    ],
    faq: [
      { q: 'Is Hood Warfare free?', a: 'Yes. Hood Warfare is free to play in your browser.' },
      { q: 'How many players can join a room?', a: 'Up to eight players, with bots filling empty slots.' },
      { q: 'Do I need an account?', a: 'No. There is no download and no account required.' },
      { q: 'Is this the Steam game?', a: 'No. Hood Warfare is an original browser project, not an official web port of the Steam game with the same name.' },
      { q: 'Who developed Hood Warfare?', a: 'Hood Warfare was developed by Trapstar Games.' },
    ],
  },

  questforge: {
    controls: [
      { action: 'Attack / defend / flee', keys: 'In-game combat buttons' },
      { action: 'Allocate stat points', keys: 'Character sheet' },
      { action: 'Shop and upgrade gear', keys: 'Location shops' },
    ],
    tips: [
      'Use the Training Dummy before fighting real enemies — it scales with you and costs nothing.',
      'You only get three stat points per level, so decide what the character is for before spending them.',
      'Upgrade gear at location shops instead of hoarding gold.',
      'Kill quests are the steady source of gold and upgrades early on.',
    ],
    faq: [
      { q: 'Is QuestForge free?', a: 'Yes, QuestForge is free to play in your browser.' },
      { q: 'Is combat real-time or turn-based?', a: 'Combat is turn-based: you act, then the enemy acts.' },
      { q: 'What are the six stats?', a: 'Strength, Dexterity, Constitution, Intelligence, Wisdom and Charisma.' },
      { q: 'Who developed QuestForge?', a: 'QuestForge was developed by InfinityByte.' },
    ],
  },

  'poke-survivor': {
    controls: [
      { action: 'Move', keys: 'Keyboard or touch' },
      { action: 'Attack', keys: 'Automatic — attacks fire on their own' },
      { action: 'Choose an upgrade', keys: 'Level-up selection screen' },
    ],
    tips: [
      'Keep moving — standing still is how most runs end.',
      'Build around one or two automatic attacks instead of spreading upgrades thin.',
      'Pick upgrades that keep you alive first; damage comes once the run is stable.',
      'Every run plays differently, so treat a failed build as information.',
    ],
    faq: [
      { q: 'Is Poke Survivor free?', a: 'Yes, it is free to play in your browser.' },
      { q: 'Do I need to sign up?', a: 'No. There is no download or sign-up required.' },
      { q: 'Who developed Poke Survivor?', a: 'Poke Survivor was developed by JayElDragon.' },
    ],
  },
};

const wordCount = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

/**
 * A game is indexable when a page has enough real content to be useful.
 * Existing long descriptions satisfy this immediately; thin new submissions
 * are generated but kept out of the sitemap until their copy is filled in.
 */
export function computeContentReady(game) {
  const hasLongCopy = String(game.extendedDescription || '').trim().length >= 250;
  const hasFaq = Array.isArray(game.faq) && game.faq.length >= 3;
  const hasControls = Array.isArray(game.controls) && game.controls.length >= 2;
  const hasHowTo = wordCount(game.howToPlay) >= 25;
  const hasDescription = String(game.description || '').trim().length >= 80;

  return Boolean(
    game.title
      && game.playUrl
      && game.cover
      && hasDescription
      && (hasLongCopy || (hasFaq && hasControls))
      && (hasHowTo || hasControls)
  );
}
