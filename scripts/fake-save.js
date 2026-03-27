/**
 * Fake save for screenshots.
 * Open the game in browser, open DevTools (F12), paste this script and press Enter.
 * Then refresh the page — the main menu will show "Continue".
 */

const fakeSave = {
  version: 2,
  timestamp: Date.now(),

  // Game state — Night phase so the skill tree is visible
  currentPhase: "Night",
  phaseElapsed: 0,
  dayCount: 42,

  // Population — impressive numbers
  population: 312_580,
  jumped: 999_417_420,
  turnedBack: 18_230,
  born: 45_000,
  stats: {
    walkSpeed: 380,
    turnBackRate: 0.05,
    dragRate: 0.35,
    birthRate: 50,
    birthratePerSec: 3,
    clickCooldown: 200,
    deathMultiplier: 8,
  },

  // Souls — fat stack
  souls: 125_000,

  // Unlocked nodes — root + deep progression in all branches
  unlockedNodes: [
    "root",
    // Velocity — full trunk + fork A + ability branch
    "ve_1", "ve_2", "ve_3", "ve_4", "ve_5", "ve_6", "ve_7", "ve_8", "ve_9", "ve_10",
    "ve_11", "ve_12", "ve_13", "ve_14", "ve_15",
    "ve_fa1", "ve_fa2", "ve_fa3", "ve_fa4",
    "ve_ab1", "ve_ab2", "ve_ab3", "ve_ab4", "ve_ab5",
    // Devotion — trunk up to 12 + fork A + ability
    "de_1", "de_2", "de_3", "de_4", "de_5", "de_6", "de_7", "de_8", "de_9", "de_10",
    "de_11", "de_12",
    "de_fa1", "de_fa2", "de_fa3",
    "de_ab1", "de_ab2", "de_ab3", "de_ab4",
    // Contagion — trunk up to 10 + fork B + ability
    "co_1", "co_2", "co_3", "co_4", "co_5", "co_6", "co_7", "co_8", "co_9", "co_10",
    "co_fb1", "co_fb2", "co_fb3",
    "co_ab1", "co_ab2", "co_ab3",
    // Machinery — trunk up to 8 + ability
    "ma_1", "ma_2", "ma_3", "ma_4", "ma_5", "ma_6", "ma_7", "ma_8",
    "ma_ab1", "ma_ab2", "ma_ab3",
    // Genesis — trunk up to 6 + ability
    "ge_1", "ge_2", "ge_3", "ge_4", "ge_5", "ge_6",
    "ge_ab1", "ge_ab2",
  ],

  // Bonuses matching the unlocked nodes
  bonuses: {
    autoClickerCount: 5,
    soulMultiplier: 4.5,
    abilities: ["frenzy_pulse", "void_call", "dark_wave", "soul_harvest", "silence"],
    frenzyPulse: { multiplier: 3, duration: 16000, cooldown: 25000 },
    voidCall: { duration: 12000, cooldown: 20000 },
    darkWave: { count: 15, cooldown: 18000 },
    soulHarvest: { multiplier: 4, duration: 14000, cooldown: 30000 },
    silence: { duration: 20000, cooldown: 45000 },
  },
};

localStorage.setItem("cliff_whisper_save", JSON.stringify(fakeSave));
console.log("Fake save injected! Refresh the page to load it.");
