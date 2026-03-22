// stages.js — Stage definitions, word lists, difficulty curves
// Task 15: Shared pool of 17 stages, bracket sequences, overrides

// ── Finger zone mapping (matches keyboard.js zones) ─────────────
// Independent from keyboard.js so stages.js has zero imports.

const FINGER_ZONES = {
  Q: "left-pinky",  A: "left-pinky",  Z: "left-pinky",
  W: "left-ring",   S: "left-ring",   X: "left-ring",
  E: "left-middle", D: "left-middle", C: "left-middle",
  R: "left-index",  T: "left-index",  F: "left-index",
  G: "left-index",  V: "left-index",  B: "left-index",
  Y: "right-index", U: "right-index", H: "right-index",
  J: "right-index", N: "right-index", M: "right-index",
  I: "right-middle", K: "right-middle",
  O: "right-ring",  L: "right-ring",
  P: "right-pinky",
  // Punctuation (home row + bottom row)
  ";": "right-pinky", ",": "right-middle", ".": "right-ring", "/": "right-pinky",
};

// Zone → CSS custom property mapping (for canvas colour lookups)
const ZONE_CSS_VARS = {
  "left-pinky":   "--zone-left-pinky",
  "left-ring":    "--zone-left-ring",
  "left-middle":  "--zone-left-middle",
  "left-index":   "--zone-left-index",
  "right-index":  "--zone-right-index",
  "right-middle": "--zone-right-middle",
  "right-ring":   "--zone-right-ring",
  "right-pinky":  "--zone-right-pinky",
};

// ── Words inappropriate for 4-5 bracket (Fix W6) ────────────────
// These are filtered out for the youngest age group.
const YOUNG_FILTER = new Set([
  "gem", "den", "pub", "dusk", "gust", "ramp", "gun", "wax", "tax", "funk",
  "scalp", "tramp", "stark", "stink", "skunk", "shrub", "rascal", "goblet",
  "zenith", "pilgrim", "gin", "rum", "jab", "nag", "hag", "slag", "drab",
  "grim", "skull", "trump", "grind", "dwelt", "skimp", "corpse", "damsel",
  "gibbet", "musket", "punish", "demise", "captain", "emperor", "fiction",
  "husband", "quantum", "company", "problem", "product", "program", "publish",
  "protect", "content", "subject",
  "rob", "mob", "sob", "slug", "spit", "grim", "skull", "filth", "thrash",
]);

// Extra simple words to add for 4-5 bracket replacements
const YOUNG_EXTRAS = [
  "dog", "mum", "dad", "sun", "cup", "pig", "leg", "cat", "hat", "top",
  "pop", "hop", "got", "big", "hug", "fun", "bat",
  "row", "map", "sun", "snug", "spin", "grin", "shell", "flour", "thread",
];

// ── Shared Stage Pool ────────────────────────────────────────────
// Each stage defines its base parameters. Brackets apply multipliers.

const STAGE_POOL = {
  // --- Letter stages ---
  "home-row": {
    id: "home-row", label: "Home Row Only",
    needed: 10, letters: "ASDFGHJK", words: null,
    maxItems: 1, spawnMs: 5000, speed: 0.12,
  },
  "home-row-ext": {
    id: "home-row-ext", label: "Home Row + Neighbours",
    needed: 12, letters: "ASDFGHJKMNBVRT", words: null,
    maxItems: 1, spawnMs: 4200, speed: 0.15,
  },
  "left-hand": {
    id: "left-hand", label: "Left Hand Keys",
    needed: 12, letters: "QWERTASDFGZXCVB", words: null,
    maxItems: 1, spawnMs: 4000, speed: 0.16,
  },
  "right-hand": {
    id: "right-hand", label: "Right Hand Keys",
    needed: 12, letters: "YUIOPHJKLNM", words: null,
    maxItems: 1, spawnMs: 4000, speed: 0.16,
  },
  "all-letters-slow": {
    id: "all-letters-slow", label: "All Letters — Slow",
    needed: 14, letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", words: null,
    maxItems: 1, spawnMs: 3800, speed: 0.18,
  },
  "all-letters-fast": {
    id: "all-letters-fast", label: "All Letters — Faster",
    needed: 14, letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", words: null,
    maxItems: 2, spawnMs: 3000, speed: 0.24,
  },
  "all-letters-rapid": {
    id: "all-letters-rapid", label: "All Letters — Rapid",
    needed: 16, letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", words: null,
    maxItems: 3, spawnMs: 2400, speed: 0.3,
  },

  // --- 2-letter words ---
  "two-letter": {
    id: "two-letter", label: "2-Letter Words",
    needed: 10, letters: null,
    words: [
      "at", "in", "on", "it", "is", "am", "an", "as", "up", "us",
      "be", "he", "me", "we", "do", "go", "no", "so", "by", "my",
      "or", "if", "of", "to", "hi", "ha", "ho", "oh", "la", "ma",
      "pa", "ox", "ow", "ax", "ok", "oi", "ew",
    ],
    maxItems: 1, spawnMs: 4500, speed: 0.15,
  },
  // --- Word stages ---
  "cvc-easy": {
    id: "cvc-easy", label: "3-Letter CVC Words",
    needed: 12, letters: null,
    words: [
      "cat", "bat", "hat", "mat", "rat", "van", "man", "fan", "can", "pan",
      "bed", "red", "fed", "net", "set", "wet", "pet", "bit", "sit", "fit",
      "hit", "pot", "dot", "got", "rot", "cut", "but", "nut", "mug", "bug",
      "hug", "tug", "jug", "dog", "log", "fog", "hog", "wig", "dig", "pig",
      "cup", "bus", "beg", "peg", "leg", "sum", "gum", "yam", "jam", "dam",
      "ram", "ham", "dim", "rim", "dip", "hip", "lip", "rip", "sip", "tip",
      "zip", "nod", "rod", "sob", "cob", "job", "mob", "rob",
    ],
    maxItems: 1, spawnMs: 4000, speed: 0.18,
  },

  "cvc-more": {
    id: "cvc-more", label: "More 3-Letter Words",
    needed: 14, letters: null,
    words: [
      "fun", "run", "sun", "bun", "gum", "map", "cap", "tap", "nap", "gap",
      "web", "gem", "hen", "den", "ten", "pen", "bin", "pin", "win", "fin",
      "fox", "box", "wax", "tax", "cub", "rub", "hub", "pub", "mud", "bud",
      "cup", "pup", "vet", "jet", "met", "yet", "lab", "cab", "tab", "dab",
      "jab", "nag", "tag", "bag", "rag", "wag", "sag", "lap", "rap", "zap",
      "dug", "lug", "rug", "nun", "pun", "fig", "gin", "kit", "lid", "mix",
      "rib", "tin", "vim", "wit", "yak", "cod", "cop", "cot", "hop", "mob",
    ],
    maxItems: 2, spawnMs: 3500, speed: 0.22,
  },

  // --- KS1 high-frequency / sight words ---
  "ks1-sight-words": {
    id: "ks1-sight-words", label: "KS1 Sight Words",
    needed: 14, letters: null,
    words: [
      // 3-letter HFW
      "the", "was", "you", "are", "all", "her", "his", "had", "has", "can",
      "did", "but", "not", "for", "our", "out", "day", "how", "now", "old",
      "see", "two", "way", "may", "too", "use", "say", "ask", "put", "she",
      "him", "off", "who", "one", "ten",
      // 4-letter HFW
      "that", "this", "with", "have", "from", "they", "some", "what", "here",
      "when", "come", "like", "been", "just", "also", "into", "your", "over",
      "back", "time", "want", "give", "make", "went", "then", "them", "said",
      "will", "told", "came", "look", "find", "more", "same", "each", "much",
      "well", "help", "live", "next",
    ],
    maxItems: 2, spawnMs: 3200, speed: 0.22,
  },

  "four-letter": {
    id: "four-letter", label: "4-Letter Words",
    needed: 12, letters: null,
    words: [
      "jump", "frog", "crab", "flat", "grab", "help", "kept", "lamp", "neck", "ramp",
      "sand", "task", "back", "band", "bark", "barn", "camp", "damp", "dusk", "fast",
      "gust", "hand", "just", "kind", "last", "nest", "past", "rest", "rust", "sent",
      "vent", "west", "wind", "wink", "dent", "funk", "land", "mint", "wish", "fish",
      "dish", "chip", "clip", "flip", "grip", "trip", "skip", "slim", "swim", "drum",
      "from", "step", "spot", "stop", "drop", "clap", "snap", "trap", "wrap", "plan",
      "scan", "than", "belt", "bolt", "bump", "cast", "clam", "clog", "club", "crop",
      "drab", "drag", "drip", "dump", "dust", "film", "flag", "glob", "grim", "gulf",
      "gulp", "hint", "husk", "jolt", "knob", "lump", "melt", "mild", "mock", "plod",
      "plug", "plum", "pond", "pump", "risk", "self", "silk", "slab", "glen", "slam",
      "slap", "slit", "slug", "snag", "snip", "spin", "spit", "stem", "stir", "stub",
      "stud", "stun", "sunk", "tilt", "trim", "trod", "trot", "tusk", "weld", "yelp",
    ],
    maxItems: 2, spawnMs: 3200, speed: 0.24,
  },
  "digraph-sh-ch-th": {
    id: "digraph-sh-ch-th", label: "Digraphs: sh ch th",
    needed: 14, letters: null,
    words: [
      "shop", "ship", "shed", "shut", "shin", "chap", "chip", "chin", "chop", "chat",
      "this", "that", "them", "then", "with", "thin", "bash", "cash", "dash", "wash",
      "dish", "fish", "wish", "such", "much", "rich", "each", "inch", "path", "bath",
      "math", "moth", "both", "sham", "shim", "shod", "shot", "show", "shun", "chew",
      "chef", "chia", "chum", "char", "than", "thus", "thud", "gash", "hash", "lash",
      "mash", "rash", "gush", "hush", "lush", "mush", "rush", "arch", "loch", "etch",
      "itch", "myth", "mesh", "push", "pith",
    ],
    maxItems: 2, spawnMs: 3000, speed: 0.26,
  },
  "digraph-ck-ng-qu": {
    id: "digraph-ck-ng-qu", label: "Digraphs: ck ng qu",
    needed: 14, letters: null,
    words: [
      "back", "duck", "kick", "lock", "neck", "pick", "rack", "rock", "sock", "tick",
      "tuck", "deck", "hack", "jack", "pack", "sick", "bang", "hang", "rang", "sang",
      "wing", "ring", "king", "sing", "long", "song", "quit", "quiz", "quip", "buck",
      "dock", "flak", "lick", "luck", "muck", "mock", "nick", "peck", "puck", "ruck",
      "sack", "wick", "honk", "ding", "glow", "dawn", "fang", "gang", "gong", "lung",
      "pang", "ping", "palm", "rung", "sung", "tang", "tong", "zing", "quad", "quid",
    ],
    maxItems: 3, spawnMs: 2800, speed: 0.28,
  },
  "five-letter": {
    id: "five-letter", label: "5-Letter Words",
    needed: 14, letters: null,
    words: [
      "stamp", "brand", "craft", "flick", "flint", "frost", "grunt", "plant", "print", "scalp",
      "shift", "shrub", "skunk", "slant", "smart", "spent", "stand", "stark", "stink", "stomp",
      "stump", "swift", "swamp", "swept", "trail", "trend", "trunk", "twist", "whisk", "blast",
      "clamp", "cramp", "draft", "drank", "dwelt", "flash", "flask", "grand", "grasp", "grind",
      "plank", "plump", "quest", "shrug", "skimp", "skull", "slump", "smash", "snack", "stamp",
      "spill", "split", "squat", "stalk", "sting", "stock", "strap", "strip", "strum", "swirl",
      "think", "thump", "train", "trash", "trick", "truck", "trunk", "blank", "blink", "block",
      "blunt", "brisk", "chunk", "cleft", "cling", "cloth", "crust", "drift", "drink", "dwell",
      "filth", "flank", "flock", "flush", "graft", "grump", "hatch", "knelt", "match", "notch",
      "patch", "pinch", "pluck", "prank", "prowl", "punch", "sling", "spelt", "stack", "staff",
      "stiff", "still", "stork", "stuff", "swing", "thick", "thorn", "track", "watch", "wrist",
    ],
    maxItems: 3, spawnMs: 2800, speed: 0.3,
  },
  "five-letter-fast": {
    id: "five-letter-fast", label: "5-Letter Words — Fast",
    needed: 16, letters: null,
    words: [
      "stamp", "brand", "craft", "flick", "flint", "frost", "grunt", "plant", "print", "scalp",
      "shift", "shrub", "skunk", "slant", "smart", "spent", "stand", "stark", "stink", "stomp",
      "stump", "swift", "swamp", "swept", "trail", "trend", "trunk", "twist", "whisk", "blast",
      "clamp", "cramp", "draft", "drank", "dwelt", "flash", "flask", "grand", "grasp", "grind",
      "plank", "plump", "quest", "shrug", "skimp", "skull", "slump", "smash", "snack", "stamp",
      "spill", "split", "squat", "stalk", "sting", "stock", "strap", "strip", "strum", "swirl",
      "think", "thump", "train", "trash", "trick", "truck", "trunk", "blank", "blink", "block",
      "blunt", "brisk", "chunk", "cleft", "cling", "cloth", "crust", "drift", "drink", "dwell",
      "filth", "flank", "flock", "flush", "graft", "grump", "hatch", "knelt", "match", "notch",
      "patch", "pinch", "pluck", "prank", "prowl", "punch", "sling", "spelt", "stack", "staff",
      "stiff", "still", "stork", "stuff", "swing", "thick", "thorn", "track", "watch", "wrist",
    ],
    maxItems: 3, spawnMs: 2400, speed: 0.34,
  },
  "six-letter": {
    id: "six-letter", label: "6-Letter Words",
    needed: 14, letters: null,
    words: [
      "bridge", "button", "castle", "clumsy", "danger", "expect", "frozen", "goblet", "humble", "insect",
      "jumble", "kitten", "locket", "muffin", "nibble", "pocket", "rascal", "sample", "thirst", "tumble",
      "upward", "velvet", "wander", "zenith", "basket", "blanch", "bonnet", "breach", "buckle", "buffet",
      "burden", "cobalt", "cobweb", "copper", "cradle", "dainty", "drench", "fathom", "fidget", "flimsy",
      "flinch", "flight", "fossil", "garden", "global", "goblin", "gospel", "gravel", "impact", "invent",
      "kennel", "lancet", "market", "marble", "napkin", "nestle", "nutmeg", "pardon", "picnic", "piston",
      "plinth", "pencil", "rabbit", "ribbon", "ripple", "signal", "socket", "spirit", "splint", "strict",
      "stroll", "submit", "sultan", "switch", "tablet", "tariff", "thrash", "thread", "ticket", "tonsil",
      "tremor", "unplug", "violin", "walnut", "waffle", "wrench",
    ],
    maxItems: 3, spawnMs: 2600, speed: 0.32,
  },
  "six-letter-fast": {
    id: "six-letter-fast", label: "6-Letter+ Words — Fast",
    needed: 16, letters: null,
    words: [
      "bridge", "button", "castle", "clumsy", "danger", "expect", "frozen", "goblet", "humble", "insect",
      "jumble", "kitten", "locket", "muffin", "nibble", "pocket", "rascal", "sample", "thirst", "tumble",
      "upward", "velvet", "wander", "zenith", "basket", "blanch", "bonnet", "breach", "buckle", "buffet",
      "burden", "cobalt", "cobweb", "copper", "cradle", "dainty", "drench", "fathom", "fidget", "flimsy",
      "flinch", "flight", "fossil", "garden", "global", "goblin", "gospel", "gravel", "impact", "invent",
      "kennel", "lancet", "market", "marble", "napkin", "nestle", "nutmeg", "pardon", "picnic", "piston",
      "plinth", "pencil", "rabbit", "ribbon", "ripple", "signal", "socket", "spirit", "splint", "strict",
      "stroll", "submit", "sultan", "switch", "tablet", "tariff", "thrash", "thread", "ticket", "tonsil",
      "tremor", "unplug", "violin", "walnut", "waffle", "wrench",
      // 7-letter words
      "blanket", "captain", "distant", "flutter", "harvest", "kingdom", "monster", "pilgrim", "shelter", "trumpet",
      "whisper",
    ],
    maxItems: 4, spawnMs: 2200, speed: 0.36,
  },
  "seven-letter": {
    id: "seven-letter", label: "7-Letter Words",
    needed: 16, letters: null,
    words: [
      "blanket", "captain", "channel", "chicken", "company", "content", "cricket", "cushion", "distant", "dolphin",
      "emperor", "fashion", "fiction", "flutter", "freedom", "general", "harvest", "husband", "journey", "kingdom",
      "kitchen", "lantern", "million", "monster", "nothing", "pattern", "pilgrim", "problem", "product", "program",
      "protect", "publish", "quantum", "rainbow", "shelter", "sixteen", "subject", "thunder", "trumpet", "whisper",
      "balcony", "biscuit", "cabinet", "charter", "climber", "cluster", "compact", "cracker", "crumble", "current",
      "desktop", "doorway", "exhibit", "factory", "fitness", "flannel", "glimpse", "grapple", "grumble", "halfway",
      "hamster", "handful", "impulse", "inspect", "javelin", "juniper", "ketchup", "kindred", "laundry", "lecture",
      "marshal", "midwife", "mustard", "neglect", "numeral", "overlap", "panther", "phantom", "plaster", "plastic",
      "plumber", "postman", "presume", "pumpkin", "quicken", "remnant", "sandpit", "segment", "scarlet", "scratch",
      "shackle", "shingle", "sincere", "shuttle", "spinach", "splotch", "stamped", "startle", "stomach", "stretch",
      "stumble", "sunspot", "tankard", "tempest", "tractor", "trinket", "triumph", "twinkle", "ukulele", "unkempt",
      "upright", "verdict", "warthog", "western", "whistle", "wrangle",
    ],
    maxItems: 4, spawnMs: 2400, speed: 0.34,
  },
  // --- Mixed marathon ---
  "mixed-marathon": {
    id: "mixed-marathon",
    label: "Mixed Marathon",
    needed: 20,
    letters: null,
    words: [
      // CVC
      "cat", "bat", "hat", "net", "set", "hit", "pot", "cut", "hug", "fun",
      "dog", "log", "pig", "bus", "cup", "jam", "zip", "nod", "rob", "dim",
      // 4-letter
      "jump", "frog", "crab", "help", "sand", "kind", "west", "band", "fast", "flip",
      "grip", "drum", "step", "snap", "trap", "clap", "belt", "bolt",
      // 5-letter
      "stamp", "brand", "craft", "frost", "plant", "shift", "smart", "swift", "blast", "flash",
      "grand", "think", "trick", "truck", "split", "stock",
      // 6-letter
      "bridge", "button", "castle", "frozen", "kitten", "pocket", "tumble", "basket", "cobalt", "global",
      "impact", "market", "rabbit", "signal",
      // 7-letter
      "blanket", "captain", "channel", "dolphin", "flutter", "harvest", "kingdom", "monster", "shelter", "trumpet",
      "whisper", "rainbow",
    ],
    maxItems: 4,
    spawnMs: 2000,
    speed: 0.38,
  },
};

// ── Bracket-specific stage sequences ─────────────────────────────

const BRACKET_STAGES = {
  "4-5": [
    "home-row",          // Stage 1 of 7
    "home-row-ext",      // Stage 2 of 7
    "all-letters-slow",  // Stage 3 of 7
    "two-letter",        // Stage 4 of 7
    "cvc-easy",          // Stage 5 of 7
    "cvc-more",          // Stage 6 of 7
    "four-letter",       // Stage 7 of 7
  ],
  "6-8": [
    "home-row",          // Stage 1 of 10
    "home-row-ext",      // Stage 2 of 10
    "all-letters-slow",  // Stage 3 of 10
    "two-letter",        // Stage 4 of 10
    "cvc-easy",          // Stage 5 of 10
    "cvc-more",          // Stage 6 of 10
    "ks1-sight-words",   // Stage 7 of 10
    "four-letter",       // Stage 8 of 10
    "digraph-sh-ch-th",  // Stage 9 of 10
    "digraph-ck-ng-qu",  // Stage 10 of 10
  ],
  "9-12": [
    "home-row-ext",      // Stage 1 of 11
    "all-letters-fast",  // Stage 2 of 11
    "cvc-easy",          // Stage 3 of 11
    "cvc-more",          // Stage 4 of 11
    "ks1-sight-words",   // Stage 5 of 11
    "four-letter",       // Stage 6 of 11
    "digraph-sh-ch-th",  // Stage 7 of 11
    "digraph-ck-ng-qu",  // Stage 8 of 11
    "five-letter",       // Stage 9 of 11
    "six-letter",        // Stage 10 of 11
    "mixed-marathon",    // Stage 11 of 11
  ],
  Adult: [
    "all-letters-fast",  // Stage 1 of 14
    "all-letters-rapid", // Stage 2 of 14
    "cvc-more",          // Stage 3 of 14
    "ks1-sight-words",   // Stage 4 of 14
    "four-letter",       // Stage 5 of 14
    "digraph-sh-ch-th",  // Stage 6 of 14
    "digraph-ck-ng-qu",  // Stage 7 of 14
    "five-letter",       // Stage 8 of 14
    "five-letter-fast",  // Stage 9 of 14
    "six-letter",        // Stage 10 of 14
    "six-letter-fast",   // Stage 11 of 14
    "seven-letter",      // Stage 12 of 14
    "mixed-marathon",    // Stage 13 of 14
    "mixed-marathon",    // Stage 14 of 14 (repeat, higher effective speed)
  ],
};

// ── Bracket overrides (applied per stage) ────────────────────────

const BRACKET_OVERRIDES = {
  "4-5": {
    speedMult: 2.8,
    spawnMult: 1.0,
    maxItemsCap: 1,
    livesOverride: 5,
    fontLetter: 36,
    fontWord: 26,
  },
  "6-8": {
    speedMult: 0.9,
    spawnMult: 1.1,
    maxItemsCap: 2,
    livesOverride: 4,
    fontLetter: 30,
    fontWord: 22,
  },
  "9-12": {
    speedMult: 1.1,
    spawnMult: 1.0,
    maxItemsCap: 3,
    livesOverride: 3,
    fontLetter: 28,
    fontWord: 20,
  },
  Adult: {
    speedMult: 4.5,
    spawnMult: 0.35,
    maxItemsCap: 7,
    livesOverride: 3,
    fontLetter: 26,
    fontWord: 18,
  },
};

// ── Exports ──────────────────────────────────────────────────────

/**
 * Get the finger zone name for a given letter.
 * @param {string} letter - Single letter (case-insensitive)
 * @returns {string} Zone name (e.g. 'left-index')
 */
export function getFingerZone(letter) {
  return FINGER_ZONES[letter.toUpperCase()] || "left-pinky";
}

/**
 * Get the CSS variable name for a zone colour.
 * @param {string} zone - Zone name from getFingerZone()
 * @returns {string} CSS variable name (e.g. '--zone-left-index')
 */
export function getZoneCSSVar(zone) {
  return ZONE_CSS_VARS[zone] || ZONE_CSS_VARS["left-pinky"];
}

/**
 * Get bracket overrides (lives, font sizes, speed multiplier, etc.).
 * @param {string} bracket - Age bracket ('4-5', '6-8', '9-12', 'Adult')
 * @returns {object} Override settings
 */
export function getBracketOverrides(bracket) {
  return { ...(BRACKET_OVERRIDES[bracket] || BRACKET_OVERRIDES["6-8"]) };
}

/**
 * Filter a word list for the 4-5 bracket — removes unfamiliar words
 * and adds simple replacements (Fix W6).
 * @param {string[]} words - Original word list
 * @returns {string[]} Filtered list
 */
function filterForYoung(words) {
  const filtered = words.filter((w) => !YOUNG_FILTER.has(w));
  // Add extras that match the word length if needed
  const avgLen =
    filtered.length > 0
      ? Math.round(filtered.reduce((s, w) => s + w.length, 0) / filtered.length)
      : 3;
  const extras = YOUNG_EXTRAS.filter((w) => w.length <= avgLen + 1);
  // Merge, deduplicate
  const set = new Set(filtered);
  for (const w of extras) set.add(w);
  return [...set];
}

/**
 * Build the resolved stage list for a given age bracket.
 * Deep-clones each pool entry and applies bracket speed/spawn/maxItems multipliers.
 *
 * @param {string} bracket - Age bracket ('4-5', '6-8', '9-12', 'Adult')
 * @returns {Array<object>} Array of fully-resolved stage objects
 */
export function getStagesForBracket(bracket) {
  const ids = BRACKET_STAGES[bracket] || BRACKET_STAGES["6-8"];
  const overrides = BRACKET_OVERRIDES[bracket] || BRACKET_OVERRIDES["6-8"];

  return ids.map((id, index) => {
    const base = { ...STAGE_POOL[id] };

    // Deep-clone word array
    if (base.words) {
      base.words = [...base.words];
      // Filter inappropriate words for youngest bracket (Fix W6)
      if (bracket === "4-5") {
        base.words = filterForYoung(base.words);
      }
    }

    // Apply bracket multipliers
    base.speed = +(base.speed * overrides.speedMult).toFixed(3);
    base.spawnMs = Math.round(base.spawnMs * overrides.spawnMult);
    base.maxItems = Math.min(base.maxItems, overrides.maxItemsCap);

    // Attach stage position metadata
    base.stageNumber = index + 1;
    base.totalStages = ids.length;

    return base;
  });
}
