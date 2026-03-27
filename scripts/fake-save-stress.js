/**
 * Stress-test fake save — max auto-clickers + min cooldown.
 * Tests endgame performance with ~180 human spawns/sec.
 *
 * Open the game in browser, open DevTools (F12), paste this script and press Enter.
 * Then refresh the page — the main menu will show "Continue".
 * Skip the Night phase to start Daytime and observe FPS.
 */

const fakeSave = {
  version: 2,
  timestamp: Date.now(),

  // Start in Daytime to immediately see the stress
  currentPhase: "Daytime",
  phaseElapsed: 0,
  dayCount: 80,

  // Large population so the game doesn't end instantly
  population: 500_000_000,
  jumped: 500_000_000,
  turnedBack: 50_000,
  born: 0,
  stats: {
    walkSpeed: 336,         // max from skill tree (base 100 + 236)
    turnBackRate: 0.05,     // min (floor)
    dragRate: 0.71,         // max from all contagion + devotion FB
    birthRate: 6_400,       // high birth from fork Bs
    birthratePerSec: 20,    // max from genesis FA
    clickCooldown: 100,     // min (base 900 - 790 skills, floor 100)
    deathMultiplier: 6000,  // max (×2 ×3 ×5 ×10 ×20)
  },

  souls: 999_999,

  // Full skill tree unlocked
  unlockedNodes: [
    "root",
    // Velocity — full trunk + fork A + fork B + ability
    "ve_1", "ve_2", "ve_3", "ve_4", "ve_5", "ve_6", "ve_7", "ve_8", "ve_9", "ve_10",
    "ve_11", "ve_12", "ve_13", "ve_14", "ve_15",
    "ve_fa1", "ve_fa2", "ve_fa3", "ve_fa4", "ve_fa5", "ve_fa6",
    "ve_fb1", "ve_fb2", "ve_fb3", "ve_fb4", "ve_fb5",
    "ve_ab1", "ve_ab2", "ve_ab3", "ve_ab4", "ve_ab5", "ve_ab6", "ve_ab7",
    // Devotion — full trunk + fork A + fork B + ability
    "de_1", "de_2", "de_3", "de_4", "de_5", "de_6", "de_7", "de_8", "de_9", "de_10",
    "de_11", "de_12", "de_13", "de_14", "de_15",
    "de_fa1", "de_fa2", "de_fa3", "de_fa4", "de_fa5", "de_fa6",
    "de_fb1", "de_fb2", "de_fb3", "de_fb4", "de_fb5",
    "de_ab1", "de_ab2", "de_ab3", "de_ab4", "de_ab5", "de_ab6", "de_ab7",
    // Contagion — full trunk + fork A + fork B + ability
    "co_1", "co_2", "co_3", "co_4", "co_5", "co_6", "co_7", "co_8", "co_9", "co_10",
    "co_11", "co_12", "co_13", "co_14", "co_15",
    "co_fa1", "co_fa2", "co_fa3", "co_fa4", "co_fa5", "co_fa6",
    "co_fb1", "co_fb2", "co_fb3", "co_fb4", "co_fb5",
    "co_ab1", "co_ab2", "co_ab3", "co_ab4", "co_ab5", "co_ab6", "co_ab7",
    // Machinery — full trunk + fork A + fork B + ability
    "ma_1", "ma_2", "ma_3", "ma_4", "ma_5", "ma_6", "ma_7", "ma_8", "ma_9", "ma_10",
    "ma_11", "ma_12", "ma_13", "ma_14", "ma_15",
    "ma_fa1", "ma_fa2", "ma_fa3", "ma_fa4", "ma_fa5", "ma_fa6",
    "ma_fb1", "ma_fb2", "ma_fb3", "ma_fb4", "ma_fb5",
    "ma_ab1", "ma_ab2", "ma_ab3", "ma_ab4", "ma_ab5", "ma_ab6", "ma_ab7",
    // Genesis — full trunk + fork A + fork B + ability
    "ge_1", "ge_2", "ge_3", "ge_4", "ge_5", "ge_6", "ge_7", "ge_8", "ge_9", "ge_10",
    "ge_11", "ge_12", "ge_13", "ge_14", "ge_15",
    "ge_fa1", "ge_fa2", "ge_fa3", "ge_fa4", "ge_fa5", "ge_fa6",
    "ge_fb1", "ge_fb2", "ge_fb3", "ge_fb4", "ge_fb5",
    "ge_ab1", "ge_ab2", "ge_ab3", "ge_ab4", "ge_ab5", "ge_ab6", "ge_ab7",
  ],

  // All bonuses maxed
  bonuses: {
    autoClickerCount: 18,
    soulMultiplier: 43,
    abilities: ["frenzy_pulse", "void_call", "dark_wave", "soul_harvest", "silence"],
    frenzyPulse: { multiplier: 4, duration: 16000, cooldown: 20000 },
    voidCall: { duration: 17000, cooldown: 15000 },
    darkWave: { count: 30, cooldown: 10000 },
    soulHarvest: { multiplier: 4, duration: 20000, cooldown: 19000 },
    silence: { duration: 25000, cooldown: 33000 },
  },
};

localStorage.setItem("cliff_whisper_save", JSON.stringify(fakeSave));
console.log("Stress-test save injected! Refresh the page to load it.");
console.log("Expected: ~180 humans spawned/sec, ~1000+ active sprites, O(n²) contagion check.");
console.log("Watch FPS in DevTools Performance tab or game framerate.");
