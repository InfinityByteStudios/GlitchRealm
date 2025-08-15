You're helping build a game called NeuroCore Follow the tasks listed in Planning.MD one at a time. After finishing each task, wait for me to say "n" before continuing. Do not skip tasks or do anything extra. Just follow the checklist in order, one step at a time. Be patient and only move on when I say "n". I also want you every time you change something check for bugs/error. DO NOT MAKE TEST FILES. STAY ORGANIZED SPLIT THE CODE IN DIFFERENT FILES. Make sure every change is published to Github. Remmberadd to changelog ( the one in game)

🧠 Enemy Damage Breakdown – NeuroCore: Byte Wars
1. Data Wisp

Damage: 5 HP per hit

Role: Basic testing enemy

Threat Level: Very low — meant to teach movement and aiming

2. Bit Bug

Damage: 10 HP per hit

Role: Fast swarm melee attacker

Threat Level: Moderate — relies on speed and numbers

3. Memory Leech

Damage: 2 HP per second while latched

Role: Energy-draining parasite

Threat Level: High if not removed quickly — drains you over time instead of burst

4. Syntax Breaker

Damage: 8 HP per hit

Role: Control-disrupting enemy

Threat Level: Annoying — causes light damage but also scrambles input when close

5. Corrupted Protocol (Boss)

Damage: 15 to 25 HP per hit, depending on the attack phase

Role: First major boss

Threat Level: High — heavy hits, telegraphed attacks, multi-phase encounter

6. The Forked (Enemy Faction)

Damage: 12 to 18 HP per hit, varies by form

Role: Adaptive enemies that change tactics based on your build

Threat Level: High — smart enemies with moderate to high damage

7. NeuroFork (Final Boss)

Damage: 20 to 35 HP per hit, based on the attack type

Role: Endgame final boss

Threat Level: Extreme — uses glitch attacks, screen hazards, and phase shifts

🎮 Difficulty Tiers – Final Design
🟢 Easy
Target Audience: New/casual players.

Player Health: Starts at 150.

Enemy Behavior: Slower, less health, and lower damage.

Overclock: Charges fast.

Enemy Variety: Simpler enemies early on.

Wave Size: Fewer enemies per wave.

Healing: ✅ You heal during the wave. Gradual regen keeps you alive under pressure.

Other Perks: Forgiving dash cooldowns and early upgrades drop more often.

🟡 Medium
Target Audience: Standard gameplay.

Player Health: Starts at 100.

Enemy Behavior: Normal speed, health, and damage.

Overclock: Normal charge rate.

Enemy Variety: Balanced.

Wave Size: Normal.

Healing: ✅ You heal after every wave — full heal before the next.

Other Perks: Full upgrade pool unlocked, default leaderboard mode.

🔴 Hard
Target Audience: Skilled players.

Player Health: Starts at 100.

Enemy Behavior: Faster, tankier, and more aggressive.

Overclock: Slower charge rate.

Enemy Variety: Advanced enemies appear sooner.

Wave Size: Larger waves.

Healing: ⚠️ You only heal every 3 waves.

Other Perks: Bosses are more dangerous with sharper patterns and attack frequency.

☠️ Extreme
Target Audience: Hardcore players, challenge seekers.

Player Health: Starts at 100 (no bonus).

Enemy Behavior: Very fast, tanky, and relentless.

Overclock: Charges very slowly.

Enemy Variety: Full roster unlocked from the beginning.

Wave Size: Maxed — huge enemy counts.

Healing: ❌ No healing at all. Ever.

Other Perks: Visual/audio glitches intensify over time. Bosses gain extra phases. Minimal UI help. Pure survival.



🧠 Development Phases for NeuroCore: Byte Wars
✅ Phase 1: Core Bootup (Prototype Foundations)
Establish the mechanical heartbeat of NeuroCore: Byte Wars.

Implement twin-stick movement and aiming.

Basic shooting system with a single weapon type.

Create a test arena to iterate on feel and visuals.

Introduce the first enemy: Data Wisp (slow and simple for testing).

Build player/enemy health and damage systems.

Add basic UI: health bar, score counter, and kill tracker.

⚡ Phase 2: Core Combat Loop
Develop the signature fast-paced combat of NeuroCore: Byte Wars.

Add a dash mechanic with a cooldown.

Introduce the Overclock system: a power-up mode triggered by kill streaks.

Add a second enemy type: Bit Bug (fast and aggressive).

Implement wave-based enemy spawning.

Include visual effects: hit sparks, screen shake, damage indicators.

Expand UI: Overclock bar, dash indicator, enemy counter.

🧩 Phase 3: Upgrade System & Replayability
Establish replay-driven gameplay progression in NeuroCore: Byte Wars.

Design a simple upgrade system: players choose 1 of 3 random buffs after waves.

Add 3–5 core upgrades (e.g., piercing bullets, faster Overclock charge).

Introduce third enemy: Memory Leech (attaches to player and drains energy).

Display current upgrades and wave number on HUD.

Ensure each run feels unique through stacked perks.

👾 Phase 4: Enemy Variety & First Boss
Increase challenge and depth within NeuroCore: Byte Wars by introducing dynamic enemies and early boss design.

Add enemy: Syntax Breaker (glitches player controls when nearby).

Create the first boss encounter: Corrupted Protocol.

Build boss arena with telegraphed patterns and multiple phases.

Balance enemy scaling based on wave count and upgrades.

💾 Phase 5: Roguelite Meta Progression
Introduce long-term progression and keep players coming back to NeuroCore: Byte Wars.

Design and implement persistent upgrade unlocks via in-game currency.

Add module selection screen at the start of each run.

Save/load system for meta upgrades.

Implement multiple zones/sectors like “Cache Field,” “Protocol Nexus.”

🔐 Phase 6: Lore & Environmental Glitches
Add narrative layers and environmental storytelling to NeuroCore: Byte Wars.

Add lore terminals/log entries revealing NeuroCore’s corrupted history.

Introduce glitch events: visuals and gameplay distortion increases over time.

Implement “The Forked” — an advanced enemy faction that adapts to the player's loadout and patterns.

Design ambient world audio and tone that evolves by sector.

🧠 Phase 7: Final Boss & Climax
Deliver a powerful, narrative-driven climax to NeuroCore: Byte Wars.

Add the final boss: NeuroFork, a rogue version of the original NeuroCore AI.

Build the final sector: a morphing digital arena with dynamic hazards and glitches.

Multiple endings based on completion stats or hidden lore objectives.

🧹 Phase 8: Polish & Release Prep
Finalize NeuroCore: Byte Wars for public release.

Full UI polish with glitch/synthwave aesthetic.

Add layered soundtrack and SFX (responsive to combat and sector).

Controller support and key remapping.

Add changelog window (open with C).

Add a Send Feedback button linking to: https://forms.office.com/r/swdfiQLkCb

Integrate Firebase leaderboard for high-score tracking.
