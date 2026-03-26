# GDD — _The Ancient God_ (working title)

**Genre**: Idle / Clicker / Roguelike
**Session length**: ~30 minutes
**Target platform**: PC (mobile possible)
**Document purpose**: Implementation reference for Claude Code. Every mechanic described here is a directive, not a suggestion. Do not invent systems not described in this document.

---

## 1. Vision & Design Pillars

> _You don't accumulate. You erase._

The player is a corrupted ancient god. The sole objective: reduce the human population to zero. This inverts the core loop of classic idle games — the central number must go **down**, not up. Tension emerges from two forces in permanent conflict: the player's corruption versus natural human birth rate.

**Three pillars:**

- **Active to passive** — the player starts by clicking to spawn each human, then gradually automates the process via the constellation. Every run is a progression from intent to inevitability.
- **Escalating pressure** — birth rate accelerates over time; every run is a race against the clock.
- **Maximum readability** — one screen, one cliff, silhouettes. No zones, no crowds, no spatial mechanics.

---

## 2. Visual Representation

The screen shows exactly one thing: **a horizon line with a cliff on the left side.**

```
★  ·  ★     ·       ★  ·
        ·         ·
                                    [Population: 4,827]
                                    [Birth rate: +12/day]

________________________________________________/|
                                               /
```

**Rendering rules (strictly enforced):**

- **Humans visible on screen** are exclusively those currently walking toward the edge.
- **Total population** is an abstract number in the UI — never represented visually as characters or crowds.
- **The sky** is the Constellation. At night, unlocked nodes glow as stars in the sky.
- No background city. No crowd sprites. No spatial zones.

---

## 3. Core Game Loop

```
┌─────────────────────────────────────────────────────────┐
│                        NIGHT                            │
│  · Review previous day summary                          │
│  · New decor element may appear on the cliff (random)   │
│  · Spend Dark Faith in the single Constellation         │
└────────────────────┬────────────────────────────────────┘
                     │  Player clicks "End Night"
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   DAYTIME (CLICKER → IDLE)              │
│  · Player clicks to spawn humans (no auto-spawn base)   │
│  · Auto-clicker nodes (from constellation) simulate     │
│    real clicks with the same cooldown as the player     │
│  · Humans walk towards cliff, jump or turn back         │
│    based on active stats + decor effects                │
│  · When a human turns back and crosses another human,   │
│    there is a chance (drag rate) the other turns back   │
│  · Each jump: +1 Dark Faith resource (× soul mult.)    │
│  · Abilities may be activated at chosen moments         │
│  · birthratePerSec adds humans continuously (if > 0)   │
│  · Birth rate increases population at sunset            │
└────────────────────┬────────────────────────────────────┘
                     │  Sunset (birth rate applied)
                     ▼
                  (back to Night)
```

**Win condition**: Population = 0
**Lose condition**: Birth rate reaches a threshold making extinction mathematically impossible. This threshold must be clearly displayed to the player at all times so they can anticipate defeat rather than be surprised by it.

---

## 4. Day / Night Cycle — Detailed Specification

### 4.1 Night — Active Phase

Night is the **only moment of full player control**. There is no time limit — the player ends the night manually when ready.

**Available actions during night:**

- Spend Dark Faith in the Constellation (see section 6)
- Review the day summary (humans jumped, born, turned back, Dark Faith earned)

**Dark Faith budget:**

- Earned during the previous day: **1 per human that jumped** (multiplied by soul multiplier).
- Unspent Dark Faith **carries over** to future nights.
- Each constellation node has a cost in Dark Faith. Once purchased, it is **permanent for the rest of the run**.
- The total cost of all nodes far exceeds what a single run can provide — every investment is a permanent trade-off.
- **First night:** player starts with a small amount of Dark Faith (e.g. 5) to unlock the first node immediately.

### 4.2 Daytime — Clicker to Idle Phase

Daytime is the core active phase. It begins as a **clicker game** and gradually transforms into an **idle game** as the player invests in auto-clicker constellation nodes.

**Spawn mechanics:**

- **By default, no humans spawn automatically.**
- **Manual click** on the screen (cliff area) = spawn 1 human (subject to turnBackRate and normal walk logic).
- **Click cooldown** applies equally to the player's manual clicks and all auto-clickers. A single shared cooldown governs the minimum interval between any click event.
- **Auto-clicker nodes** (unlocked via constellation) simulate real clicks. Each auto-clicker fires once per cooldown cycle, just like the player. Multiple auto-clickers stack additively.
- **birthratePerSec** (base: 0, unlocked via constellation) adds humans continuously during the day, independent of clicks. These humans behave normally (walk, turn-back, etc.).

**Drag rate (contagion mechanic):**

- When a human **turns back** and walks in the opposite direction, each time it **crosses another human** still walking toward the cliff, there is a chance equal to the **drag rate** that the crossed human also turns back.
- This creates a contagion effect: a single turn-back can cascade into multiple reversals if drag rate is high.
- This is the player's secondary enemy — high drag rate compounds the turn-back problem.

**Dark Faith gain:**

- Each human that jumps grants **Dark Faith equal to the soul multiplier**, visible in real-time on the UI.

**The player cannot:**

- Modify the constellation mid-day

---

## 5. Stats

Stats are modified by **constellations** (player choices) and **decor elements** (random, work against the player). Everything is behavioral and probabilistic, applied globally.

| Stat                    | Base value | Description                                                                            | Favorable direction                                |
| ----------------------- | ---------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Walk speed**          | 150 px/s   | Speed at which humans walk toward the cliff edge                                       | ↑ Faster = less exposure to turn-back and drag     |
| **Turn-back rate**      | 0.35       | Probability (0-1) a human reverses before reaching the edge                            | ↓ Reducing this is the primary gameplay challenge  |
| **Drag rate**           | 0.10       | Probability (0-1) a turning-back human causes another to also turn back when crossing  | ↓ Reducing contagion protects throughput            |
| **Birth rate**          | 15/day     | Humans added to the population at sunset (integer)                                     | ↓ The player's main enemy                          |
| **birthratePerSec**     | 0/s        | Humans spawned per second during the day (integer). Accumulates and spawns whole humans | ↓ Secondary pressure (unlocked via constellation)  |
| **Click cooldown**      | 1000 ms    | Minimum interval between any click event (player or auto-clicker)                      | ↓ Faster clicks = higher throughput                |
| **Auto-clicker count**  | 0          | Number of auto-clickers, each fires once per cooldown cycle                            | ↑ More passive spawns                              |
| **Soul multiplier**     | 1.0×       | Dark Faith earned per jump                                                             | ↑ Every death feeds more power                     |

---

## 5.1 Decor System — The Living Cliff

The cliff edge is a **1D tilemap**. Over the course of a run, decor elements appear randomly on the cliff, representing the humans' resistance to extinction. Each element modifies stats **against the player**. They are permanent and non-destructible.

**Tileset**: `tileset_legacy.png` (16x16 pixel tiles).

**Slot count**: cliff edge width / tile size. All slots start empty. Elements are placed on empty slots only.

### Spawn rules

- At the start of each night (except night 1), there is a random chance of a new decor element appearing.
- **Base probability**: 40% per night. Increases by +10% per day (day 2: 50%, day 3: 60%, etc., capped at 90%).
- When an element spawns, it is chosen randomly from the catalog below and placed on a random empty slot.
- A notification is shown to the player during the night phase.

### Decor catalog

| Element        | Sprite      | Effect (cumulative, permanent)     |
| -------------- | ----------- | ---------------------------------- |
| **House**      | House tile  | Birth rate +5/day                  |
| **Church**     | Church tile | Turn-back rate +0.05               |
| **Lighthouse** | Tower tile  | Walk speed -15%                    |
| **Tree**       | Tree tile   | birthratePerSec +1/s               |
| **Tombstone**  | Cross tile  | Turn-back rate +0.03               |
| **Wall**       | Wall tile   | Walk speed -10%                    |

### Design intent

Decor replaces the old `birthRateEscalation` mechanic. Instead of a predictable mathematical escalation, the player faces **random, visible, permanent obstacles**. The cliff visually transforms from an empty edge into a small village clinging to the abyss — a civilization that refuses to die.

This creates:

- **Narrative escalation**: the humans are building a life right at the edge.
- **Visual progression**: the scene evolves over the run.
- **Strategic variance**: each run has different decor, requiring different constellation responses.
- **Readable pressure**: the player can see and count the elements to understand why stats are shifting.

---

## 6. Skill Tree — The Constellation

There is **one single Constellation** for the entire game. It is structured as a **central star** with **5 main branches**, each of which forks into **sub-branches**. At night, the player spends **Dark Faith** (earned from jumps during the day) to unlock nodes. Effects are **cumulative and permanent** for the rest of the run.

- Unspent Dark Faith carries over between nights.
- The total cost of all nodes (~3845 Dark Faith) far exceeds a single run's supply — every choice is a meaningful trade-off.
- Nodes must be unlocked in order within their branch (parent node required).
- **First night:** player starts with 5 Dark Faith to allow unlocking the tree's root node immediately.

### Structure

```
                     [Velocity]
                    /    |    \
              passifs    |    Frenzy Pulse
                         |
       [Devotion]-------ROOT-------[Contagion]
         / |  \                      / |  \
   passifs | Void Call         passifs | Dark Wave
           |                          |
      [Machinery]              [Genesis]
        / |  \                  / |  \
  passifs | Soul Harvest  passifs | Silence
```

Each main branch has:
- A **trunk** (10 nodes) — the primary stat line
- **Fork A** (4 nodes) — deeper passive investment, branching from trunk node 4
- **Fork B** (3 nodes) — specialized passive, branching from trunk node 7
- **Ability sub-branch** (6 nodes) — unlocks and upgrades the branch's ability, branching from trunk node 5

**Total: 115 nodes** (5 branches × 23 nodes)

### Cost Curve

Costs escalate exponentially to ensure long, satisfying progression:

| Position | Trunk | Fork A | Fork B | Ability sub-branch |
| -------- | ----- | ------ | ------ | ------------------ |
| Node 1   | 3     | 10     | 30     | 20 (unlock)        |
| Node 2   | 5     | 18     | 45     | 35                 |
| Node 3   | 8     | 28     | 65     | 50                 |
| Node 4   | 12    | 42     | —      | 70                 |
| Node 5   | 18    | —      | —      | 100                |
| Node 6   | 25    | —      | —      | 120                |
| Node 7   | 35    | —      | —      | —                  |
| Node 8   | 45    | —      | —      | —                  |
| Node 9   | 60    | —      | —      | —                  |
| Node 10  | 80    | —      | —      | —                  |

**Per branch total:** ~291 (trunk) + ~98 (fork A) + ~140 (fork B) + ~395 (ability) = **~924 Dark Faith**
**Full tree total:** **~4620 Dark Faith**

---

### 6.1 Branch: Velocity (Walk Speed)

Primary stat: **walkSpeed**. Faster humans reach the edge sooner, reducing exposure to turn-back and drag contagion.

**Trunk** (10 nodes):

| # | Name            | Cost | Effect         |
|---|-----------------|------|----------------|
| 1 | Swift Step      | 3    | walkSpeed +3   |
| 2 | Quickened Pace  | 5    | walkSpeed +5   |
| 3 | Hurried Stride  | 8    | walkSpeed +5   |
| 4 | Fevered March   | 12   | walkSpeed +8   |
| 5 | Driven Forward  | 18   | walkSpeed +8   |
| 6 | Rushing Tide    | 25   | walkSpeed +10  |
| 7 | Relentless Gait | 35   | walkSpeed +10  |
| 8 | Blinding Speed  | 45   | walkSpeed +12  |
| 9 | Wind Walker     | 60   | walkSpeed +15  |
| 10| Terminal Velocity| 80  | walkSpeed +20  |

*Trunk total: +96 walkSpeed*

**Fork A** (from node 4, 4 nodes): +6, +8, +10, +12 walkSpeed
**Fork B** (from node 7, 3 nodes): +15, +18, +20 walkSpeed

*Branch total walkSpeed: +152*

**Ability: Frenzy Pulse** (from node 5, 6 nodes):

| # | Cost | Effect                                              |
|---|------|-----------------------------------------------------|
| 1 | 20   | **Unlock**: walkSpeed ×2 for 8s, cooldown 45s       |
| 2 | 35   | Duration +4s (12s)                                   |
| 3 | 50   | Multiplier ×2.5                                      |
| 4 | 70   | Cooldown -10s (35s)                                  |
| 5 | 100  | Duration +4s (16s), multiplier ×3                    |
| 6 | 120  | Cooldown -10s (25s), duration +4s (20s)              |

*Final: walkSpeed ×3 for 20s, cooldown 25s*

---

### 6.2 Branch: Devotion (Turn-back Rate)

Primary stat: **turnBackRate**. Reducing this probability is the most direct path to higher kill throughput.

**Trunk** (10 nodes):

| # | Name            | Cost | Effect              |
|---|-----------------|------|---------------------|
| 1 | Linger          | 3    | turnBackRate -0.01  |
| 2 | Hesitation      | 5    | turnBackRate -0.01  |
| 3 | Doubt           | 8    | turnBackRate -0.02  |
| 4 | Wavering Faith  | 12   | turnBackRate -0.02  |
| 5 | Fading Hope     | 18   | turnBackRate -0.02  |
| 6 | Conviction      | 25   | turnBackRate -0.03  |
| 7 | Blind Devotion  | 35   | turnBackRate -0.03  |
| 8 | No Return       | 45   | turnBackRate -0.03  |
| 9 | The Abyss Calls | 60   | turnBackRate -0.04  |
| 10| Absolute Faith  | 80   | turnBackRate -0.04  |

*Trunk total: -0.25 turnBackRate*

**Fork A** (from node 4, 4 nodes): -0.02, -0.03, -0.03, -0.04 turnBackRate
**Fork B** (from node 7, 3 nodes): -0.03, -0.04, -0.05 turnBackRate

*Branch total turnBackRate: -0.49*

**Ability: Void Call** (from node 5, 6 nodes):

| # | Cost | Effect                                              |
|---|------|-----------------------------------------------------|
| 1 | 20   | **Unlock**: turnBackRate = 0 for 5s, cooldown 30s   |
| 2 | 35   | Duration +3s (8s)                                    |
| 3 | 50   | Cooldown -5s (25s)                                   |
| 4 | 70   | Duration +4s (12s)                                   |
| 5 | 100  | Cooldown -5s (20s)                                   |
| 6 | 120  | Duration +5s (17s), cooldown -5s (15s)               |

*Final: turnBackRate = 0 for 17s, cooldown 15s*

---

### 6.3 Branch: Contagion (Drag Rate)

Primary stat: **dragRate**. Drag rate represents the contagion of turn-back: when a human turns back and crosses another, there is a chance the other follows. Reducing this protects throughput. However, this branch **increases** drag rate — the investment here is about accepting the contagion mechanic in exchange for other benefits.

> **Design note:** The Contagion branch is unique — its trunk nodes **increase** a stat that works against the player (drag rate). The value comes from unlocking Dark Wave (mass spawning) and the fork nodes which provide mixed benefits. This creates a risk/reward dynamic: investing in Contagion gives access to powerful burst spawning at the cost of higher contagion.

**Trunk** (10 nodes):

| # | Name            | Cost | Effect            |
|---|-----------------|------| ------------------|
| 1 | Whispered Doubt | 3    | dragRate +0.01    |
| 2 | Shared Glance   | 5    | dragRate +0.01    |
| 3 | Herd Instinct   | 8    | dragRate +0.02    |
| 4 | Mass Anxiety    | 12   | dragRate +0.02    |
| 5 | Panic Spread    | 18   | dragRate +0.02    |
| 6 | Chain Reaction  | 25   | dragRate +0.03    |
| 7 | Mob Mentality   | 35   | dragRate +0.03    |
| 8 | Hysteria        | 45   | dragRate +0.03    |
| 9 | Cascade Effect  | 60   | dragRate +0.04    |
| 10| Mass Psychosis  | 80   | dragRate +0.04    |

*Trunk total: +0.25 dragRate*

**Fork A** (from node 4, 4 nodes): +0.02, +0.03, +0.03, +0.04 dragRate
**Fork B** (from node 7, 3 nodes): +0.04, +0.05, +0.06 dragRate

*Branch total dragRate: +0.50*

**Ability: Dark Wave** (from node 5, 6 nodes):

| # | Cost | Effect                                              |
|---|------|-----------------------------------------------------|
| 1 | 20   | **Unlock**: Spawn 5 humans instantly, cooldown 30s   |
| 2 | 35   | +3 humans (8 total)                                  |
| 3 | 50   | Cooldown -5s (25s)                                   |
| 4 | 70   | +5 humans (13 total)                                 |
| 5 | 100  | Cooldown -5s (20s)                                   |
| 6 | 120  | +7 humans (20 total), cooldown -5s (15s)             |

*Final: Spawn 20 humans instantly, cooldown 15s*

---

### 6.4 Branch: Machinery (Auto-clickers & Click Cooldown)

Primary stats: **clickCooldown** and **autoClickerCount**. This branch transitions the game from clicker to idle. The cooldown applies identically to the player's manual clicks and all auto-clickers.

**Trunk** (10 nodes):

| # | Name              | Cost | Effect                      |
|---|-------------------|------|-----------------------------|
| 1 | Loose Gear        | 3    | clickCooldown -30ms         |
| 2 | First Automaton   | 5    | autoClickerCount +1         |
| 3 | Oiled Mechanism   | 8    | clickCooldown -40ms         |
| 4 | Second Automaton  | 12   | autoClickerCount +1         |
| 5 | Precision Gears   | 18   | clickCooldown -50ms         |
| 6 | Third Automaton   | 25   | autoClickerCount +1         |
| 7 | Clockwork Engine  | 35   | clickCooldown -60ms         |
| 8 | Fourth Automaton  | 45   | autoClickerCount +1         |
| 9 | Perpetual Motion  | 60   | clickCooldown -80ms         |
| 10| The Machine God   | 80   | autoClickerCount +2         |

*Trunk total: -260ms clickCooldown, +6 autoClickerCount*

**Fork A** (from node 4, 4 nodes): -40ms, -50ms, -60ms, -80ms clickCooldown
**Fork B** (from node 7, 3 nodes): +1, +2, +3 autoClickerCount

*Branch total: -490ms clickCooldown, +12 autoClickerCount*

**Ability: Soul Harvest** (from node 5, 6 nodes):

| # | Cost | Effect                                              |
|---|------|-----------------------------------------------------|
| 1 | 20   | **Unlock**: soulMultiplier ×2 for 10s, cooldown 40s |
| 2 | 35   | Duration +5s (15s)                                   |
| 3 | 50   | Multiplier ×2.5                                      |
| 4 | 70   | Cooldown -10s (30s)                                  |
| 5 | 100  | Duration +5s (20s), multiplier ×3                    |
| 6 | 120  | Cooldown -10s (20s)                                  |

*Final: soulMultiplier ×3 for 20s, cooldown 20s*

---

### 6.5 Branch: Genesis (Soul Multiplier & birthratePerSec)

Primary stats: **soulMultiplier** and **birthratePerSec**. This branch accelerates Dark Faith income but also introduces continuous human spawning (birthratePerSec) — a double-edged sword that pressures the player while funding faster constellation progress.

**Trunk** (10 nodes):

| # | Name              | Cost | Effect               |
|---|-------------------|------|-----------------------|
| 1 | Dark Ember        | 3    | soulMultiplier +0.05 |
| 2 | Soul Spark        | 5    | soulMultiplier +0.05 |
| 3 | Growing Hunger    | 8    | soulMultiplier +0.10 |
| 4 | Death's Tithe     | 12   | soulMultiplier +0.10 |
| 5 | Reaping Wind      | 18   | soulMultiplier +0.10 |
| 6 | Soul Furnace      | 25   | soulMultiplier +0.15 |
| 7 | Dark Harvest      | 35   | soulMultiplier +0.15 |
| 8 | Essence Drain     | 45   | soulMultiplier +0.20 |
| 9 | Death's Bounty    | 60   | soulMultiplier +0.20 |
| 10| The Soul Singularity| 80 | soulMultiplier +0.25 |

*Trunk total: +1.35 soulMultiplier*

**Fork A** (from node 4, 4 nodes): soulMultiplier +0.10, +0.15, +0.20, +0.25
**Fork B** (from node 7, 3 nodes): birthratePerSec +1, +1, +2 /s

*Branch total: soulMultiplier +2.05, birthratePerSec +4/s*

**Ability: Silence** (from node 5, 6 nodes):

| # | Cost | Effect                                               |
|---|------|------------------------------------------------------|
| 1 | 20   | **Unlock**: birthratePerSec = 0 for 15s, cooldown 60s|
| 2 | 35   | Duration +5s (20s)                                    |
| 3 | 50   | Cooldown -10s (50s)                                   |
| 4 | 70   | Duration +5s (25s)                                    |
| 5 | 100  | Cooldown -10s (40s)                                   |
| 6 | 120  | Duration +10s (35s), cooldown -10s (30s)              |

*Final: birthratePerSec = 0 for 35s, cooldown 30s*

---

### 6.6 Design Constraints

- **No guaranteed full unlock.** The total tree cost (~4620 Dark Faith) far exceeds what a single run provides. The player must specialize.
- **Abilities gate behind mid-branch investment.** You must invest 46 Dark Faith in a trunk (nodes 1-5) before accessing the ability unlock node. Maxing an ability costs ~395 more.
- **Forks reward deep specialization.** Fork A rewards mid-depth commitment; Fork B rewards deep investment.
- **The Contagion branch is deliberately punishing** — its trunk increases drag rate (bad for the player). The payoff is Dark Wave's burst spawning power.

---

## 7. Abilities

Abilities are **active skills** unlocked and upgraded through their respective constellation branch. Each ability has a cooldown and can only be activated during the daytime phase. Only one ability can be active at a time.

| Ability        | Branch     | Base effect                          | Base duration | Base cooldown |
| -------------- | ---------- | ------------------------------------ | ------------- | ------------- |
| Frenzy Pulse   | Velocity   | walkSpeed multiplied                 | 8s            | 45s           |
| Void Call      | Devotion   | turnBackRate set to 0                | 5s            | 30s           |
| Dark Wave      | Contagion  | Spawn N humans instantly (one-shot)  | —             | 30s           |
| Soul Harvest   | Machinery  | soulMultiplier multiplied            | 10s           | 40s           |
| Silence        | Genesis    | birthratePerSec set to 0            | 15s           | 60s           |

### Ability rules

- Abilities are **not available** during night.
- Dark Wave is instant (no duration) — it spawns humans that then behave normally.
- Silence only affects birthratePerSec, not the sunset birth rate.
- Ability upgrades (duration, cooldown, multiplier) are permanent for the run, unlocked via constellation nodes.

---

## 8. Meta Progression

### 8.1 Run Modifiers

At the start of each run, one **random modifier** is offered from the unlocked pool. Modifiers adjust difficulty and create run variety:

| Modifier              | Effect                                    |
| --------------------- | ----------------------------------------- |
| _Abundant Population_ | +50% starting population                  |
| _Natural Resilience_  | Base turn-back rate increased by 20%      |
| _Baby Boom_           | Birth rate accelerates every 2 days       |
| _Mute God_            | Manual click spawns 2 humans instead of 1 |
| _Contagious Fear_     | Base drag rate doubled                    |

---

## 9. Balance Parameters

These are target values for implementation. Adjust through playtesting but treat these as the baseline:

| Parameter                  | Target value                     |
| -------------------------- | -------------------------------- |
| Session duration           | 25–35 minutes                    |
| Day/night cycles per run   | 5–7                              |
| Night duration             | No limit (player ends manually)  |
| Day duration               | ~3 minutes                       |
| Starting population        | 1,000 humans                     |
| Base birth rate            | +15 humans/day                   |
| Base birthratePerSec       | 0/s integer (requires Genesis branch) |
| Decor spawn chance (base)  | 40% per night, +10%/day, cap 90% |
| Dark Faith start (night 1) | 5                                |
| Auto-clicker base count    | 0 (requires Machinery branch)    |
| Click cooldown (base)      | 1000ms (shared player + AC)      |
| Soul multiplier (base)     | 1.0×                             |
| Full tree cost             | ~4620 Dark Faith                 |

---

## 10. Intended Player Experience

This table describes the **emotional target** for each phase. Implementation decisions should be evaluated against these targets:

| Phase                 | Target emotion                                                                  |
| --------------------- | ------------------------------------------------------------------------------- |
| Night                 | Silent architect. Control, anticipation, quiet planning                         |
| Daytime (early runs)  | Frantic clicking. Urgency, building rhythm                                      |
| Daytime (later runs)  | Contemplative tension. A machine humming, abilities used at key moments         |
| Ability activation    | Decisive power — the god's hand revealed. Timing matters                        |
| Victory               | Cold satisfaction. No fanfare — the silence of an empty cliff                   |
| Defeat                | Immediate understanding of the mistake. Desire to rebuild                       |

---

## 11. Implementation Constraints

These are hard rules for Claude Code. Do not deviate without explicit instruction:

- **No zone effects.** All stat modifications are global and probabilistic.
- **Click-to-spawn is the base mechanic.** No humans spawn without player input by default. Auto-clickers supplement but never replace the click mechanic until explicitly unlocked.
- **Shared cooldown.** The click cooldown applies identically to the player's manual clicks and all auto-clickers. There is no separate spawn interval.
- **Dark Faith is the sole constellation currency.** Earned only from jumps (× soul multiplier), never granted for free (except the 5 starting Faith on night 1).
- **One constellation, one tree.** There is no multiple-tree system. All upgrades live in one structure with a central star and radiating branches.
- **No cards.** There is no card system. All player agency during daytime comes from clicking and ability activation.
- **No visual population.** The population count is always a number, never a crowd or visual mass.
- **One screen only.** No navigation between screens during a run. Night and day happen on the same visual layout — sky changes from stars to sun, the cliff remains.
- **Constellation effects are permanent within a run.** Once a node is unlocked, its effect applies for the rest of the run. Dark Faith spent cannot be recovered.
- **Decor elements are permanent and non-destructible.** Once a decor element appears on the cliff, it stays for the rest of the run.
- **No automatic birth rate escalation.** All difficulty scaling comes from decor elements appearing on the cliff.
- **Drag rate is contagion.** When a human turns back and crosses another, there is a probability (drag rate) the other turns back too. Drag rate does NOT cause humans to follow each other toward the cliff.
- **Human counts are always integers.** Population, birthRate, birthratePerSec, and all spawn counts must be whole numbers. No fractional humans. birthratePerSec spawns 1 whole human per tick at the given rate.
