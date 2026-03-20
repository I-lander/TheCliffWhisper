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
│  · Spend Dark Faith in the single Constellation        │
└────────────────────┬────────────────────────────────────┘
                     │  Player clicks "End Night"
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   DAYTIME (CLICKER → IDLE)              │
│  · Player clicks to spawn humans (no auto-spawn base)   │
│  · Auto-clicker nodes (from constellation) add passive  │
│    spawning on top of or instead of manual clicks       │
│  · Humans walk towards cliff, jump or turn back         │
│    based on active stats + decor effects                │
│  · Each jump: +1 Dark Faith resource                    │
│  · Cards may drop randomly based on Card Drop Rate stat │
│  · Player plays dropped cards at chosen moments         │
│  · Birth rate increases population at sunset            │
└────────────────────┬────────────────────────────────────┘
                     │  Sunset (penalties, birth rate)
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

- Earned during the previous day: **1 per human that jumped**.
- Unspent Dark Faith **carries over** to future nights.
- Each constellation node has a cost in Dark Faith. Once purchased, it is **permanent for the rest of the run**.
- The total cost of all nodes far exceeds what a single run can provide — every investment is a permanent trade-off.
- **First night:** player starts with a small amount of Dark Faith (e.g. 5) to unlock the first node immediately.

### 4.2 Daytime — Clicker to Idle Phase

Daytime is the core active phase. It begins as a **clicker game** and gradually transforms into an **idle game** as the player invests in auto-clicker constellation nodes.

**Spawn mechanics:**

- **By default, no humans spawn automatically.**
- **Manual click** on the screen (cliff area) = spawn 1 human (subject to turnBackRate and normal walk logic).
- **Auto-clicker nodes** (unlocked via constellation) periodically spawn humans passively, at an interval determined by the node tier. Multiple auto-clicker nodes stack additively.

**Dark Faith gain:**

- Each human that jumps grants **+1 Dark Faith**, visible in real-time on the UI.

**Card drops:**

- No deck or pre-drawn hand. Cards drop randomly during the day based on the **Card Drop Rate** stat (see section 5).
- A dropped card appears in the player's hand and can be played at any moment that day.
- Cards not played by sunset trigger their penalty effect.

**The player cannot:**

- Modify the constellation mid-day
- Trigger forced waves (only cards may do this)

---

## 5. Stats

Stats are modified by **constellations** (player choices), **decor elements** (random, work against the player), and **cards** (temporary effects). Everything is behavioral and probabilistic, applied globally.

| Stat                 | Description                                                                  | Favorable direction                               |
| -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| **Walk speed**       | Time for a human to reach the cliff edge                                     | ↑ Faster = less exposure to turn-back chance      |
| **Turn-back rate**   | Probability a human reverses before reaching the edge                        | ↓ Reducing this is the primary gameplay challenge |
| **Drag rate**        | Chance a human brings one additional human along when spawning               | ↑ Multiplier effect on throughput                 |
| **Birth rate**       | Humans added to the abstract population count per day                        | ↓ The player's main enemy                         |
| **Dark Faith**       | Resource earned per jump (+1 each). Spent at night in the Constellation      | ↑ Every death feeds power                         |
| **Card Drop Rate**   | % chance per jump that a card drops into the player's hand (base: 0%)        | ↑ More cards = more punctual decision moments     |
| **Auto-click count** | Number of active auto-clicker nodes. Each spawns 1 human at its own interval | ↑ More passive spawns per second                  |

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

| Element        | Sprite      | Effect (cumulative, permanent) |
| -------------- | ----------- | ------------------------------ |
| **House**      | House tile  | Birth rate +5/day              |
| **Church**     | Church tile | Turn-back rate +0.05           |
| **Lighthouse** | Tower tile  | Walk speed -15%                |
| **Tree**       | Tree tile   | Spawn interval +100ms          |
| **Tombstone**  | Cross tile  | Turn-back rate +0.03           |
| **Wall**       | Wall tile   | Walk speed -10%                |

### Design intent

Decor replaces the old `birthRateEscalation` mechanic. Instead of a predictable mathematical escalation, the player faces **random, visible, permanent obstacles**. The cliff visually transforms from an empty edge into a small village clinging to the abyss — a civilization that refuses to die.

This creates:

- **Narrative escalation**: the humans are building a life right at the edge.
- **Visual progression**: the scene evolves over the run.
- **Strategic variance**: each run has different decor, requiring different constellation/card responses.
- **Readable pressure**: the player can see and count the elements to understand why stats are shifting.

---

## 6. Skill Tree — The Constellation

There is **one single Constellation** for the entire game. It is a large branching tree with distinct thematic branches. At night, the player spends **Dark Faith** (1 per jump earned during the day) to unlock nodes. Effects are **cumulative and permanent** for the rest of the run.

- Unspent Dark Faith carries over between nights.
- The total cost of all nodes far exceeds a single run's supply — every choice is a meaningful trade-off.
- Nodes must be unlocked in order within their branch (parent node required). Cross-branch connections exist for capstone nodes.
- **First night:** player starts with 5 Dark Faith to allow unlocking the tree's root node immediately.

### Branch Overview

#### 🖱 Auto-Clicker Branch — Passive Spawning

Unlocks passive human spawning, graduating the experience from clicker to idle.

| Node       | Cost | Effect                 |
| ---------- | ---- | ---------------------- |
| Whisper    | 3    | +1 auto-spawn every 4s |
| Echo       | 5    | +1 auto-spawn every 3s |
| Voice      | 8    | +1 auto-spawn every 2s |
| The Chorus | 12   | +1 auto-spawn every 1s |

#### 👁 Faith Branch — Turn-back Rate

Reduces the probability that a human turns back before the edge.

| Node       | Cost | Effect               |
| ---------- | ---- | -------------------- |
| Linger     | 3    | Turn-back rate -0.04 |
| Doubt      | 5    | Turn-back rate -0.06 |
| Conviction | 8    | Turn-back rate -0.08 |
| No Return  | 12   | Turn-back rate -0.12 |

#### ⚡ Tide Branch — Drag Rate

Increases the chance a spawned human drags additional humans along.

| Node          | Cost | Effect          |
| ------------- | ---- | --------------- |
| Resonance     | 3    | Drag rate +0.06 |
| Chain Pull    | 5    | Drag rate +0.10 |
| Mass Calling  | 8    | Drag rate +0.14 |
| Mass Hysteria | 12   | Drag rate +0.20 |

#### ✦ Void Branch — Birth Rate

Reduces the birth rate, weakening the player's main enemy.

| Node                | Cost | Effect          |
| ------------------- | ---- | --------------- |
| Whispered Doubt     | 4    | Birth rate -10% |
| Fading Hope         | 7    | Birth rate -15% |
| Empty Cradles       | 11   | Birth rate -20% |
| Silence of the Womb | 16   | Birth rate -25% |

#### 🃏 Omen Branch — Card Drop Rate

Unlocks and improves the chance that a card drops mid-day per jump.

| Node           | Cost | Effect                           |
| -------------- | ---- | -------------------------------- |
| Dark Omen      | 4    | Card Drop Rate: 5% per jump      |
| Ill Sign       | 7    | Card Drop Rate: +5% (10% total)  |
| Prophecy       | 11   | Card Drop Rate: +10% (20% total) |
| The Revelation | 16   | Card Drop Rate: +15% (35% total) |

#### 🌊 Haste Branch — Walk Speed

Increases walk speed so humans reach the edge faster and are less exposed to turn-back.

| Node            | Cost | Effect          |
| --------------- | ---- | --------------- |
| Swift Step      | 3    | Walk speed +10% |
| Fevered March   | 5    | Walk speed +15% |
| Relentless Tide | 9    | Walk speed +20% |

**Design constraint**: There is no guaranteed path through the whole tree. The player must choose which branches to prioritize each run, shaping a unique play style (aggressive clicker, idle auto-farmer, card-focused, etc.).

---

## 7. Cards

### 7.1 Card Acquisition — Drop System

Cards are **not drawn from a pre-built deck**. Instead, they drop randomly during the day.

- **Card Drop Rate** (stat, base: 0%) — per jump, there is a % chance a random card drops into the player's hand.
- The omen branch (constellation) is the only way to raise this rate.
- Max hand size: **5 cards**. If the hand is full, no new cards drop.
- Cards not played by sunset trigger their **penalty effect** automatically.
- Cards have no memory between days: the hand resets at each new day (unplayed cards penalize first, then are discarded).

#### 🩶 COMMON — Light penalty (or none)

**Black Tide**

> _"They feel the call. Just a little stronger."_

- Effect: Reduces spawn interval by 50% for 20 seconds
- Penalty if unplayed: none (missed bonus)

**Evening Mist**

> _"The path back disappears into the fog."_

- Effect: Reduces turn-back rate by 30% for 15 seconds
- Penalty if unplayed: none

---

#### 🟣 UNCOMMON — Moderate penalty

**Whisper of the Abyss**

> _"He has been speaking to their dreams for weeks."_

- Effect: The next human to spawn automatically drags 2 additional humans with them
- Penalty if unplayed: +20% birth rate until next sunset

**Suspended Hour**

> _"The sun hesitates. One more minute."_

- Effect: Extends current day duration by 60 seconds
- Penalty if unplayed: +15% birth rate this day

**Vow of Fragility**

> _"Their feet can no longer turn around."_

- Effect: Suppresses all turn-back rate for 30 seconds
- Penalty if unplayed: +20% birth rate + turn-back rate increased by 15% for this day

---

#### 🔴 RARE — Heavy penalty

**Call of the Void**

> _"It is not a fall. It is a return."_

- Effect: Immediately spawns 8 humans in a single wave
- Penalty if unplayed: +40% birth rate + turn-back rate doubled until next sunset

**Soul Eclipse**

> _"The light that guided them has gone out."_

- Effect: Blocks birth rate for the remainder of the current day
- Penalty if unplayed: Birth rate doubled until end of day AND turn-back rate +30%

**Cursed Procession**

> _"They walk. They sing. They do not stop."_

- Effect: For 45 seconds, every human who jumps automatically triggers the next spawn
- Penalty if unplayed: +30% birth rate + next night duration is halved

---

#### ⚫ LEGENDARY — Severe penalty, single use per run

**The Last Sermon**

> _"His voice convinced empires. It will convince a species."_

- Effect: Instantly reduces population by 5%, suppresses all turn-back for 60 seconds
- Penalty if unplayed: Birth rate +60% for the remainder of the run

**Memory of Extinction**

> _"He remembers having succeeded before."_

- Effect: Reveals the birth rate curve for the next 3 days + increases spawn rate by 40% this day
- Penalty if unplayed: Birth rate +50%, turn-back rate +40% for 2 days

---

### 7.4 Power Tiers & Associated Penalties

The power/penalty relationship is proportional and must be clearly communicated on each card's UI:

| Tier          | Card effect                       | Penalty if unplayed                        |
| ------------- | --------------------------------- | ------------------------------------------ |
| **Common**    | Small punctual boost              | No penalty — missed bonus only             |
| **Uncommon**  | Notable impact on day flow        | Temporary birth rate increase              |
| **Rare**      | Major impact on the day           | Birth rate boost + turn-back rate increase |
| **Legendary** | Game-altering, single use per run | Severe, long-lasting debuff                |

### 7.5 Card Play Decision Logic

Timing is the player's main daytime skill, now combined with the risk of a card dropping at the wrong moment.

Examples of meaningful decisions:

- A _Call of the Void_ drop when turn-back rate is high = consider declining the play and taking the penalty intentionally.
- Holding _Suspended Hour_ for a productive late-day stretch rather than playing it early.
- Choosing to invest in the Omen branch early = more cards but higher penalty risk if clicks are infrequent.

---

## 8. Meta Progression

### 8.1 Card Pool Unlocks

Cards are unlocked **permanently** by completing specific in-game actions. Once unlocked, they are added to the global drop pool (eligible to drop during any future run's daytime).

| Unlock condition                         | Card unlocked                        |
| ---------------------------------------- | ------------------------------------ |
| First victory                            | **Memory of Extinction** (Legendary) |
| 50 humans jumped in a single day         | **Call of the Void** (Rare)          |
| Complete a run without any card dropping | **Evening Mist** (Common)            |
| Suffer 3 heavy penalties in a single run | **Cursed Procession** (Rare)         |
| Reach population 0 in fewer than 4 days  | **The Last Sermon** (Legendary)      |

Unlock conditions are designed to incentivize experimentation and non-obvious strategies. They should never require grinding — each is a one-time achievement.

### 8.2 Run Modifiers

At the start of each run, one **random modifier** is offered from the unlocked pool. Modifiers adjust difficulty and create run variety:

| Modifier              | Effect                                    |
| --------------------- | ----------------------------------------- |
| _Abundant Population_ | +50% starting population                  |
| _Silent Cliff_        | Card Drop Rate halved                     |
| _Natural Resilience_  | Base turn-back rate increased by 20%      |
| _Baby Boom_           | Birth rate accelerates every 2 days       |
| _Mute God_            | Manual click spawns 2 humans instead of 1 |

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
| Decor spawn chance (base)  | 40% per night, +10%/day, cap 90% |
| Base Card Drop Rate        | 0% (requires Omen branch)        |
| Max hand size              | 5 cards                          |
| Dark Faith start (night 1) | 5                                |
| Auto-clicker base count    | 0 (requires Auto-Clicker branch) |

---

## 10. Intended Player Experience

This table describes the **emotional target** for each phase. Implementation decisions should be evaluated against these targets:

| Phase                 | Target emotion                                                                  |
| --------------------- | ------------------------------------------------------------------------------- |
| Night                 | Silent architect. Control, anticipation, quiet planning                         |
| Daytime (early runs)  | Frantic clicking. Urgency, building rhythm                                      |
| Daytime (later runs)  | Contemplative tension. A machine humming, occasionally disrupted by a card drop |
| Unplayed card penalty | Legible punishment, never feels unfair                                          |
| Victory               | Cold satisfaction. No fanfare — the silence of an empty cliff                   |
| Defeat                | Immediate understanding of the mistake. Desire to rebuild                       |

---

## 11. Implementation Constraints

These are hard rules for Claude Code. Do not deviate without explicit instruction:

- **No zone effects.** All stat modifications are global and probabilistic.
- **Click-to-spawn is the base mechanic.** No humans spawn without player input by default. Auto-clickers supplement but never replace the click mechanic until explicitly unlocked.
- **Dark Faith is the sole constellation currency.** Earned only from jumps, never granted for free (except the 5 starting Faith on night 1).
- **One constellation, one tree.** There is no multiple-tree system. All upgrades live in one structure.
- **Cards drop, they are not drawn.** There is no pre-run deck selection and no morning hand. Cards enter play exclusively through the drop system.
- **No visual population.** The population count is always a number, never a crowd or visual mass.
- **One screen only.** No navigation between screens during a run. Night and day happen on the same visual layout — sky changes from stars to sun, the cliff remains.
- **Card penalties are automatic.** At sunset, any unplayed card triggers its penalty without player confirmation.
- **Constellation effects are permanent within a run.** Once a node is unlocked, its effect applies for the rest of the run. Dark Faith spent cannot be recovered.
- **Decor elements are permanent and non-destructible.** Once a decor element appears on the cliff, it stays for the rest of the run.
- **No automatic birth rate escalation.** All difficulty scaling comes from decor elements appearing on the cliff.
