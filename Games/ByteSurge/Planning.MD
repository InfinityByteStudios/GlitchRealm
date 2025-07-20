Always do the first unclompted task from planning.MD whenever i say "n". whenever you finish a task, mark it as completed. go above and beyond on the tasks, think big. Remember to kee file sizes small and organized. and dont add onsole logs unless debugging. but once done debugging delete console logs



Phase 1 Planning Doc – ByteSurge: Infinite Loop
✅ GOAL:
Build a working prototype where the player controls a drone, collects energy, avoids obstacles, and places harvesters. It should include basic movement, collision, scoring, and minimal 2D visuals.

1. Core Gameplay Overview
Genre:
2D Endless Action + Automation Idle Hybrid

Core Loop:

You control a small drone with one-button turning

Drone auto-flies forward in an endless scrolling world

Collect energy nodes to upgrade

Avoid corruption zones

Drop harvesters to collect passive energy

2. Visual Style (Minimal Art)
Everything is low-res vector-style or just colored shapes. Super lightweight and clean.

Art Details:
Element	Art Description
Drone	A small white circle (10x10 px) with a blue tail trail and a soft glow
Energy Nodes	Floating yellow squares (6x6 px) with a blinking animation every 2 seconds
Corruption	Red wavy blobs with static-style flicker (low-opacity red glow + noise shader)
Harvesters	Mini stationary triangles with a slow green pulsing glow
Background	Solid dark gray (#1A1A1A) that scrolls subtly to the left
UI Text	Retro pixel font for score, energy, and zone level (top-left corner)

Optional: Everything is drawn with canvas, no images.

3. Phase 1 Features
🔹 A. Player Movement
Drone spawns at center

Constant forward movement

Press space or click → turns left (90°)

Collision detection with edges

🔹 B. Energy Nodes
Randomly spawn ahead of the player

Collect on collision

Adds to player’s energy counter

🔹 C. Corruption Zones
Move slowly from the right side of the screen

If touched, resets run and logs distance

🔹 D. Drop Harvester
Press H to drop a harvester behind

Stays in place and flashes green

Collects 1 energy every 2 seconds

Limit: 3 harvesters max in Phase 1

🔹 E. UI + Stats
Top-left HUD with:

Distance traveled

Energy collected

Harvesters deployed

Simple pixel-style white text

4. Technical Breakdown (No Game Engine)
Feature	Built With
Game loop	requestAnimationFrame()
Input	keydown / click
Drawing	HTML5 <canvas>
Collision	Bounding box checks
Save system	LocalStorage (Phase 2)

5. Phase 1 Tasks (Checklist Style)
🧱 Set Up
✅ Create base HTML file with canvas

✅ Set canvas size (800x600) and scale

✅ Initialize game loop and input handler

🚀 Player
✅ Spawn drone at center

✅ Add turning input

✅ Add constant forward movement

✅ Add collision detection with edges

🔹 B. Energy Nodes
✅ Randomly spawn ahead of player

✅ Collect on collision

✅ Adds to player's energy counter

🔹 C. Corruption Zones
✅ Move slowly from the right side of the screen

✅ If touched, resets run and logs distance

🔹 D. Drop Harvester
✅ Press H to drop a harvester behind

✅ Stays in place and flashes green

✅ Collects 1 energy every 2 seconds

✅ Limit: 3 harvesters max in Phase 1

🔹 E. UI + Stats
✅ Top-left HUD with essential information

✅ Distance traveled

✅ Energy collected

✅ Harvesters deployed

✅ Simple pixel-style white text

✨ Phase 1 Complete! ✨

Phase 2 Planning Doc – ByteSurge: Infinite Loop
✅ GOAL:
Add dynamic world progression, meaningful upgrades, smarter corruption, and polish the core loop.

1. New Gameplay Systems
🔹 A. Zone Layers (World Depth)
✅ Every 1000 distance = 1 new "Zone"

✅ Each Zone adds a visual background shift (slightly different color tone)

✅ New Zone = new energy type with more value

✅ You get a "Zone Bonus" every time you enter a new zone

🔹 B. Upgrade System
Spend collected energy on upgrades in a simple menu:

Upgrade	Effect	Max Level
Drone Speed	Moves faster	10
Harvester Rate	Collects energy faster	10
Harvester Limit	More harvesters at once	5
Auto-Turn Assist	Helps smooth drone movement	3
Zone Detection	Mini-map shows upcoming hazards	3

UI: Use simple popup menu with buttons + costs.

2. Smarter Corruption AI
Make corruption more dynamic:

It speeds up the longer you stay in a zone

It targets energy-rich areas

Flashing warning when it's nearby

New corruption types (like “jammers” that disable harvesters for 5 seconds)








Add to player’s total with a small bonus if they return soon



3. Polish and Juice
Visual Polish:
Element	Upgrade
Energy Node	Add soft glow + twinkle animation
Corruption	Add static flicker overlay
Drone Trail	Smoother, wavy animation
Zone Transition	Quick screen flash + zone number popup

Sound (Optional for now):
Blip for collecting energy

Hum for harvesters

Glitch sound when corruption appears

5. Phase 2 Tasks (Checklist)
🌍 Zones + Progress
✅ Add distance tracking system

✅ Change visuals every new 1000 units

✅ Add new energy types with increasing value

🛠️ Upgrades
✅ Create upgrade menu UI

✅ Code upgrade effects and level caps

✅ Store upgrade data between runs

👾 Smarter Corruption
✅ Add behavior that targets harvester zones

✅ Add faster corruption with warning

✅ Add new corruption blob types (e.g., jammer)






 Display message like: “Your harvesters brought back 120 energy!”

✨ Visual Juice
 ✅ Drone trail smoothing

 ✅ Zone transition effects

 Floating text when you collect energy

✅ Phase 2 End Goal
A deeper game loop with actual progression

Real feeling of growth from upgrades and zones

Passive reward system with idle/harvester bonuses

Game that’s fun to keep returning to, even just to check harvesters