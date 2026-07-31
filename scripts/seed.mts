/**
 * Seed the reference content: instruments, genres, drill types, the theory
 * curriculum, the five skill trees, a starter quiz bank, the EP shell and the
 * four roadmap quarters.
 *
 *   npm run db:seed
 *
 * Idempotent. Every insert conflicts on a natural key and does nothing, so
 * running it twice is safe and it will not clobber edits you have made in the
 * app. New seed content added later lands on the next run.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import pg from "pg";

import * as schema from "../src/db/schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Run `vercel env pull .env.local` first.");
  process.exit(1);
}

/**
 * Uses node-postgres rather than the app's Neon HTTP driver. This is a one-off
 * Node script, not a serverless request, so a normal TCP connection is both
 * fine and faster for many small inserts. It also means the same script runs
 * against a local Postgres for testing.
 */
const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
});
const db = drizzle(pool, { schema });

/* -------------------------------------------------------------------------- */

const INSTRUMENTS = [
  { key: "drums", name: "Drums", sortOrder: 1 },
  { key: "bass", name: "Bass", sortOrder: 2 },
  { key: "guitar", name: "Guitar", sortOrder: 3 },
  { key: "keys", name: "Keys", sortOrder: 4 },
];

const GENRES = [
  { key: "pop", name: "Pop", sortOrder: 1 },
  { key: "rnb", name: "R&B", sortOrder: 2 },
  { key: "jazz", name: "Jazz", sortOrder: 3 },
  { key: "hip_hop", name: "Hip-Hop", sortOrder: 4 },
  { key: "rock", name: "Rock", sortOrder: 5 },
  { key: "gospel", name: "Gospel / Worship", sortOrder: 6 },
  { key: "funk", name: "Funk", sortOrder: 7 },
  { key: "soul", name: "Soul", sortOrder: 8 },
  { key: "electronic", name: "Electronic", sortOrder: 9 },
  { key: "country", name: "Country", sortOrder: 10 },
  { key: "latin", name: "Latin", sortOrder: 11 },
  { key: "reggae", name: "Reggae", sortOrder: 12 },
];

const DRILL_TYPES = [
  {
    key: "intervals",
    name: "Intervals",
    domain: "ear_training" as const,
    description: "Identify ascending, descending and harmonic intervals.",
    sortOrder: 1,
  },
  {
    key: "triads",
    name: "Triads",
    domain: "ear_training" as const,
    description: "Major, minor, diminished and augmented triads by ear.",
    sortOrder: 2,
  },
  {
    key: "seventh_chords",
    name: "7th Chords",
    domain: "ear_training" as const,
    description: "maj7, min7, dom7, half-diminished and diminished 7ths.",
    sortOrder: 3,
  },
  {
    key: "progressions",
    name: "Chord Progressions",
    domain: "ear_training" as const,
    description: "Hear and name progressions by scale degree.",
    sortOrder: 4,
  },
  {
    key: "rhythm_dictation",
    name: "Rhythm Dictation",
    domain: "ear_training" as const,
    description: "Transcribe rhythms after one or two hearings.",
    sortOrder: 5,
  },
  {
    key: "melodic_dictation",
    name: "Melodic Dictation",
    domain: "ear_training" as const,
    description: "Transcribe short melodic phrases.",
    sortOrder: 6,
  },
  {
    key: "notation_reading",
    name: "Notation Reading",
    domain: "sight_reading" as const,
    description: "Timed reading of pitched notation at increasing tempo.",
    sortOrder: 7,
  },
  {
    key: "rhythm_reading",
    name: "Rhythm Reading",
    domain: "sight_reading" as const,
    description: "Read and perform rhythms at sight, no pitch.",
    sortOrder: 8,
  },
  {
    key: "chart_reading",
    name: "Chart / Lead Sheet Reading",
    domain: "sight_reading" as const,
    description: "Read chord charts and Nashville numbers in real time.",
    sortOrder: 9,
  },
];

/** Curriculum path. `requires` refers to earlier slugs. */
const THEORY_CONCEPTS: {
  slug: string;
  title: string;
  stage: (typeof schema.theoryStageEnum.enumValues)[number];
  summary: string;
  requires?: string[];
}[] = [
  {
    slug: "interval-quality",
    title: "Interval Quality & Size",
    stage: "intervals",
    summary:
      "Naming intervals by number and quality: major, minor, perfect, augmented, diminished.",
  },
  {
    slug: "interval-inversion",
    title: "Interval Inversion",
    stage: "intervals",
    summary: "Inverting intervals and the rule that the sizes sum to nine.",
    requires: ["interval-quality"],
  },
  {
    slug: "triad-construction",
    title: "Triad Construction",
    stage: "triads",
    summary: "Building major, minor, diminished and augmented triads from stacked thirds.",
    requires: ["interval-quality"],
  },
  {
    slug: "triad-inversions",
    title: "Triad Inversions & Figured Bass",
    stage: "triads",
    summary: "Root position, first and second inversion, and how they are figured.",
    requires: ["triad-construction"],
  },
  {
    slug: "diatonic-triads",
    title: "Diatonic Triads of the Major Scale",
    stage: "triads",
    summary: "The I ii iii IV V vi vii° pattern and why the qualities fall where they do.",
    requires: ["triad-construction"],
  },
  {
    slug: "seventh-chord-types",
    title: "Seventh Chord Types",
    stage: "sevenths",
    summary: "maj7, min7, dominant 7, half-diminished and fully diminished.",
    requires: ["triad-construction"],
  },
  {
    slug: "diatonic-sevenths",
    title: "Diatonic Sevenths",
    stage: "sevenths",
    summary: "Imaj7 ii-7 iii-7 IVmaj7 V7 vi-7 vii-7b5 and their functions.",
    requires: ["seventh-chord-types", "diatonic-triads"],
  },
  {
    slug: "modes-of-major",
    title: "Modes of the Major Scale",
    stage: "modes",
    summary: "Ionian through Locrian as rotations, and the characteristic note of each.",
    requires: ["diatonic-triads"],
  },
  {
    slug: "modal-harmony",
    title: "Modal Harmony & Avoid Notes",
    stage: "modes",
    summary: "Which chords establish a mode, and which notes undermine it.",
    requires: ["modes-of-major"],
  },
  {
    slug: "tonic-subdominant-dominant",
    title: "Tonic, Subdominant, Dominant",
    stage: "functional_harmony",
    summary: "The three functional families and how chords substitute within them.",
    requires: ["diatonic-sevenths"],
  },
  {
    slug: "cadences",
    title: "Cadences",
    stage: "functional_harmony",
    summary: "Authentic, plagal, half and deceptive cadences.",
    requires: ["tonic-subdominant-dominant"],
  },
  {
    slug: "secondary-dominants",
    title: "Secondary Dominants",
    stage: "functional_harmony",
    summary: "V/V and friends: tonicising a chord that is not the tonic.",
    requires: ["tonic-subdominant-dominant"],
  },
  {
    slug: "ii-v-i-major",
    title: "ii-V-I in Major",
    stage: "ii_v_i",
    summary: "The central jazz cadence, its voicings and its guide tones.",
    requires: ["secondary-dominants", "diatonic-sevenths"],
  },
  {
    slug: "ii-v-i-minor",
    title: "ii-V-i in Minor",
    stage: "ii_v_i",
    summary: "Half-diminished ii, altered V, and the minor tonic options.",
    requires: ["ii-v-i-major"],
  },
  {
    slug: "tritone-substitution",
    title: "Tritone Substitution",
    stage: "ii_v_i",
    summary: "Substituting bII7 for V7 and the shared tritone that makes it work.",
    requires: ["ii-v-i-major"],
  },
  {
    slug: "reharmonization",
    title: "Reharmonization Techniques",
    stage: "ii_v_i",
    summary: "Backdoor ii-V, modal interchange, chord scale substitution.",
    requires: ["tritone-substitution", "ii-v-i-minor"],
  },
  {
    slug: "voice-leading-basics",
    title: "Voice Leading Fundamentals",
    stage: "voice_leading",
    summary: "Common tones, stepwise motion, and avoiding parallel fifths and octaves.",
    requires: ["cadences"],
  },
  {
    slug: "guide-tone-lines",
    title: "Guide Tone Lines",
    stage: "voice_leading",
    summary: "Threading 3rds and 7ths through a progression to imply the harmony.",
    requires: ["voice-leading-basics", "ii-v-i-major"],
  },
  {
    slug: "four-part-voicing",
    title: "Four-Part Voicing & Drop 2",
    stage: "voice_leading",
    summary: "Close position, drop 2 and drop 3 voicings across instruments.",
    requires: ["guide-tone-lines"],
  },
];

/** Starter quiz bank. Deliberately small and editable in-app. */
const QUIZ_QUESTIONS: {
  concept: string;
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
}[] = [
  {
    concept: "interval-quality",
    prompt: "How many semitones are in a perfect fifth?",
    choices: ["5", "6", "7", "8"],
    answer: "7",
    explanation: "A perfect fifth spans seven semitones, e.g. C up to G.",
  },
  {
    concept: "interval-quality",
    prompt: "What interval is C up to E flat?",
    choices: ["Major third", "Minor third", "Augmented second", "Perfect fourth"],
    answer: "Minor third",
    explanation: "Three semitones spanning three letter names is a minor third.",
  },
  {
    concept: "interval-inversion",
    prompt: "A major sixth inverts to which interval?",
    choices: ["Minor third", "Major third", "Minor sixth", "Perfect fourth"],
    answer: "Minor third",
    explanation: "Sizes sum to nine and quality flips: major sixth becomes minor third.",
  },
  {
    concept: "triad-construction",
    prompt: "Which triad is built from a minor third with a major third on top?",
    choices: ["Major", "Minor", "Diminished", "Augmented"],
    answer: "Minor",
    explanation: "Minor third then major third gives a minor triad, e.g. A C E.",
  },
  {
    concept: "triad-construction",
    prompt: "What are the notes of an F major triad?",
    choices: ["F A C", "F A flat C", "F A C sharp", "F B flat D"],
    answer: "F A C",
    explanation: "Root, major third, perfect fifth.",
  },
  {
    concept: "triad-inversions",
    prompt: "A triad with its third in the bass is in which position?",
    choices: ["Root position", "First inversion", "Second inversion", "Third inversion"],
    answer: "First inversion",
    explanation: "Third in the bass is first inversion, figured 6.",
  },
  {
    concept: "diatonic-triads",
    prompt: "What quality is the vi chord in a major key?",
    choices: ["Major", "Minor", "Diminished", "Augmented"],
    answer: "Minor",
    explanation: "In major the pattern is I ii iii IV V vi vii°, so vi is minor.",
  },
  {
    concept: "diatonic-triads",
    prompt: "Which diatonic triad in a major key is diminished?",
    choices: ["ii", "iii", "vi", "vii"],
    answer: "vii",
    explanation: "The triad on the leading tone is diminished.",
  },
  {
    concept: "seventh-chord-types",
    prompt: "Which seventh chord is a major triad with a minor seventh?",
    choices: ["Major 7", "Minor 7", "Dominant 7", "Half-diminished 7"],
    answer: "Dominant 7",
    explanation: "Major triad plus minor seventh, e.g. G B D F.",
  },
  {
    concept: "seventh-chord-types",
    prompt: "What are the notes of Cmaj7?",
    choices: ["C E G B flat", "C E G B", "C E flat G B flat", "C E G A"],
    answer: "C E G B",
    explanation: "Major triad plus major seventh.",
  },
  {
    concept: "diatonic-sevenths",
    prompt: "In C major, what is the ii-7 chord?",
    choices: ["D-7", "E-7", "F maj7", "G7"],
    answer: "D-7",
    explanation: "D F A C, the seventh chord on the second degree.",
  },
  {
    concept: "modes-of-major",
    prompt: "Which mode has a flat second as its characteristic note?",
    choices: ["Dorian", "Phrygian", "Lydian", "Mixolydian"],
    answer: "Phrygian",
    explanation: "Phrygian's flat second is what gives it its distinctive colour.",
  },
  {
    concept: "modes-of-major",
    prompt: "Lydian differs from Ionian by which single note?",
    choices: ["Flat third", "Sharp fourth", "Flat sixth", "Flat seventh"],
    answer: "Sharp fourth",
    explanation: "Lydian raises the fourth degree.",
  },
  {
    concept: "modal-harmony",
    prompt: "Which chord most strongly establishes Dorian rather than Aeolian?",
    choices: ["i-7", "IV7 (major IV)", "bVI maj7", "v-7"],
    answer: "IV7 (major IV)",
    explanation: "The major IV comes from Dorian's natural sixth, the mode's defining note.",
  },
  {
    concept: "tonic-subdominant-dominant",
    prompt: "Which function does the iii chord most commonly substitute for?",
    choices: ["Tonic", "Subdominant", "Dominant", "None"],
    answer: "Tonic",
    explanation: "iii shares two notes with I and usually acts as a tonic substitute.",
  },
  {
    concept: "cadences",
    prompt: "V moving to vi is which cadence?",
    choices: ["Authentic", "Plagal", "Half", "Deceptive"],
    answer: "Deceptive",
    explanation: "The dominant resolves somewhere other than the expected tonic.",
  },
  {
    concept: "secondary-dominants",
    prompt: "In C major, what chord is V/V?",
    choices: ["G7", "D7", "A7", "E7"],
    answer: "D7",
    explanation: "The dominant of G, which is itself the dominant of C.",
  },
  {
    concept: "ii-v-i-major",
    prompt: "What is the ii-V-I in the key of F major?",
    choices: ["G-7 C7 Fmaj7", "A-7 D7 Gmaj7", "C-7 F7 B flat maj7", "D-7 G7 Cmaj7"],
    answer: "G-7 C7 Fmaj7",
    explanation: "Second, fifth and first degrees of F major.",
  },
  {
    concept: "ii-v-i-minor",
    prompt: "The ii chord in a minor ii-V-i is usually which quality?",
    choices: ["Minor 7", "Half-diminished 7", "Dominant 7", "Major 7"],
    answer: "Half-diminished 7",
    explanation: "The natural minor second degree gives a -7b5.",
  },
  {
    concept: "tritone-substitution",
    prompt: "In C major, which chord is the tritone substitute for G7?",
    choices: ["D flat 7", "C sharp maj7", "F7", "B7"],
    answer: "D flat 7",
    explanation: "Db7 shares the B/F tritone with G7.",
  },
  {
    concept: "voice-leading-basics",
    prompt: "Which motion should generally be avoided between two voices?",
    choices: ["Contrary motion", "Oblique motion", "Parallel fifths", "Stepwise motion"],
    answer: "Parallel fifths",
    explanation: "Parallel fifths and octaves collapse the independence of the voices.",
  },
  {
    concept: "guide-tone-lines",
    prompt: "Guide tone lines are built primarily from which chord tones?",
    choices: ["Root and fifth", "Third and seventh", "Fifth and ninth", "Root and third"],
    answer: "Third and seventh",
    explanation: "Thirds and sevenths define chord quality and move by step through a ii-V-I.",
  },
];

/** `tier` groups nodes into rough stages; `parent` is a slug in the same tree. */
const INSTRUMENT_TREES: Record<string, { slug: string; title: string; tier: number; description: string }[]> = {
  drums: [
    { slug: "drums-grip-posture", title: "Grip & Posture", tier: 1, description: "Matched grip, seat height, relaxed stroke." },
    { slug: "drums-basic-beat", title: "Basic Rock Beat", tier: 1, description: "Steady 8th-note groove at 80-120 bpm." },
    { slug: "drums-rudiments", title: "Core Rudiments", tier: 2, description: "Single, double, paradiddle, flam." },
    { slug: "drums-fills", title: "Fills & Transitions", tier: 2, description: "One-bar fills that land on the one." },
    { slug: "drums-shuffle-swing", title: "Shuffle & Swing", tier: 3, description: "Triplet feel, jazz ride pattern." },
    { slug: "drums-ghost-notes", title: "Ghost Notes & Dynamics", tier: 3, description: "R&B and funk pocket playing." },
    { slug: "drums-odd-time", title: "Odd Time Signatures", tier: 4, description: "5/4, 7/8 and comfortable counting." },
    { slug: "drums-independence", title: "Four-Way Independence", tier: 4, description: "Limbs moving independently under a groove." },
  ],
  bass: [
    { slug: "bass-fretting-hand", title: "Fretting Hand Technique", tier: 1, description: "One-finger-per-fret, clean notes, no buzz." },
    { slug: "bass-root-notes", title: "Root Note Playing", tier: 1, description: "Locking roots to the kick drum." },
    { slug: "bass-major-minor-scales", title: "Scales & Positions", tier: 2, description: "Major, minor and pentatonic across the neck." },
    { slug: "bass-walking-lines", title: "Walking Bass Lines", tier: 3, description: "Quarter-note lines through changes." },
    { slug: "bass-slap", title: "Slap & Pop", tier: 3, description: "Thumb slap, finger pop, muting." },
    { slug: "bass-groove-pocket", title: "Groove & Pocket", tier: 2, description: "Sitting behind, on, and ahead of the beat." },
    { slug: "bass-chord-tones", title: "Chord Tone Targeting", tier: 4, description: "Outlining harmony rather than roots alone." },
  ],
  guitar: [
    { slug: "guitar-open-chords", title: "Open Chords", tier: 1, description: "Clean CAGED open shapes and changes." },
    { slug: "guitar-barre-chords", title: "Barre Chords", tier: 2, description: "E and A shape barres across the neck." },
    { slug: "guitar-strumming", title: "Strumming & Rhythm", tier: 1, description: "Consistent patterns, muting, dynamics." },
    { slug: "guitar-pentatonic", title: "Pentatonic Positions", tier: 2, description: "Five positions and connecting them." },
    { slug: "guitar-fingerstyle", title: "Fingerstyle", tier: 3, description: "Travis picking, independent bass and melody." },
    { slug: "guitar-extended-chords", title: "Extended & Jazz Chords", tier: 4, description: "7ths, 9ths, drop 2 voicings." },
    { slug: "guitar-lead-phrasing", title: "Lead Phrasing", tier: 3, description: "Bends, vibrato, target notes, space." },
  ],
  keys: [
    { slug: "keys-hand-position", title: "Hand Position & Posture", tier: 1, description: "Curved fingers, relaxed wrists, thumb-under." },
    { slug: "keys-major-scales", title: "Major Scales, All Keys", tier: 2, description: "Two octaves, hands together, evenly." },
    { slug: "keys-triads-inversions", title: "Triads & Inversions", tier: 2, description: "All inversions in all keys, both hands." },
    { slug: "keys-seventh-voicings", title: "Seventh Chord Voicings", tier: 3, description: "Rootless and shell voicings." },
    { slug: "keys-comping", title: "Comping", tier: 3, description: "Rhythmic accompaniment behind a singer or soloist." },
    { slug: "keys-gospel-runs", title: "Gospel Voicings & Runs", tier: 4, description: "Passing chords, fills, worship progressions." },
    { slug: "keys-two-hand-independence", title: "Two-Hand Independence", tier: 4, description: "Bass line and comping simultaneously." },
  ],
};

const LOGIC_TREE = [
  { slug: "logic-session-setup", title: "Session Setup & Templates", tier: 1, description: "Sample rate, buffer, track stacks, saving a template." },
  { slug: "logic-recording-comping", title: "Recording & Take Comping", tier: 1, description: "Take folders, quick swipe comping." },
  { slug: "logic-editing", title: "Editing & Flex Time", tier: 2, description: "Quantising, Flex Time, Flex Pitch basics." },
  { slug: "logic-eq", title: "EQ Fundamentals", tier: 2, description: "Subtractive EQ, resonance sweeping, high-pass discipline." },
  { slug: "logic-compression", title: "Compression", tier: 2, description: "Ratio, attack, release, and hearing gain reduction." },
  { slug: "logic-gain-staging", title: "Gain Staging", tier: 1, description: "Healthy levels from input to master bus." },
  { slug: "logic-reverb-delay", title: "Reverb & Delay", tier: 3, description: "Sends, pre-delay, and creating depth." },
  { slug: "logic-arrangement", title: "Arrangement", tier: 3, description: "Sections, tension and release, arrangement markers." },
  { slug: "logic-sound-design", title: "Sound Design", tier: 4, description: "Alchemy and Retro Synth, layering, sampling." },
  { slug: "logic-vocal-production", title: "Vocal Production", tier: 3, description: "Comping, tuning, de-essing, doubles and stacks." },
  { slug: "logic-automation", title: "Automation", tier: 3, description: "Volume rides, filter sweeps, keeping a mix moving." },
  { slug: "logic-bus-processing", title: "Bus & Parallel Processing", tier: 4, description: "Drum bus, parallel compression, glue." },
  { slug: "logic-mixing-balance", title: "Mix Balance & Panning", tier: 3, description: "Static balance first, stereo image second." },
  { slug: "logic-mastering", title: "Mastering Basics", tier: 4, description: "Loudness targets, limiting, referencing." },
  { slug: "logic-referencing", title: "Referencing & Translation", tier: 4, description: "Checking a mix on phone, car, headphones." },
];

/* -------------------------------------------------------------------------- */

async function main() {
  console.log("Seeding reference content...");

  await db
    .insert(schema.settings)
    // CDT/CST. IANA zone, not the abbreviation, so daylight saving is handled.
    .values({ id: 1, timezone: "America/Chicago", weeklyMinutesTarget: 420 })
    .onConflictDoNothing();

  await db.insert(schema.instruments).values(INSTRUMENTS).onConflictDoNothing();
  await db.insert(schema.genres).values(GENRES).onConflictDoNothing();
  await db.insert(schema.drillTypes).values(DRILL_TYPES).onConflictDoNothing();
  console.log(
    `  instruments ${INSTRUMENTS.length}, genres ${GENRES.length}, drill types ${DRILL_TYPES.length}`,
  );

  // Theory concepts, then prerequisites once every id exists.
  await db
    .insert(schema.theoryConcepts)
    .values(
      THEORY_CONCEPTS.map((concept, index) => ({
        slug: concept.slug,
        title: concept.title,
        summary: concept.summary,
        stage: concept.stage,
        orderIndex: index,
      })),
    )
    .onConflictDoNothing();

  const conceptRows = await db.select().from(schema.theoryConcepts);
  const conceptIdBySlug = new Map(conceptRows.map((row) => [row.slug, row.id]));

  const prerequisites = THEORY_CONCEPTS.flatMap((concept) =>
    (concept.requires ?? []).map((requiredSlug) => ({
      conceptId: conceptIdBySlug.get(concept.slug)!,
      requiresConceptId: conceptIdBySlug.get(requiredSlug)!,
    })),
  ).filter((row) => row.conceptId && row.requiresConceptId);

  if (prerequisites.length > 0) {
    await db
      .insert(schema.theoryPrerequisites)
      .values(prerequisites)
      .onConflictDoNothing();
  }
  console.log(
    `  theory concepts ${THEORY_CONCEPTS.length}, prerequisites ${prerequisites.length}`,
  );

  // Quiz questions are keyed by (concept, prompt); skip any already present.
  const existingPrompts = new Set(
    (await db.select({ prompt: schema.quizQuestions.prompt }).from(schema.quizQuestions)).map(
      (row) => row.prompt,
    ),
  );
  const newQuestions = QUIZ_QUESTIONS.filter((q) => !existingPrompts.has(q.prompt)).map(
    (q) => ({
      conceptId: conceptIdBySlug.get(q.concept)!,
      prompt: q.prompt,
      kind: "multiple_choice" as const,
      choices: q.choices,
      answer: [q.answer],
      explanation: q.explanation,
      difficulty: 1,
    }),
  );
  if (newQuestions.length > 0) {
    await db.insert(schema.quizQuestions).values(newQuestions);
  }
  console.log(`  quiz questions ${newQuestions.length} new (${QUIZ_QUESTIONS.length} total)`);

  // Skill trees. Instrument trees first, then the Logic tree.
  const instrumentRows = await db.select().from(schema.instruments);
  const instrumentIdByKey = new Map(instrumentRows.map((row) => [row.key, row.id]));

  const skillNodeValues = [
    ...Object.entries(INSTRUMENT_TREES).flatMap(([instrumentKey, nodes]) =>
      nodes.map((node, index) => ({
        treeKind: "instrument" as const,
        instrumentId: instrumentIdByKey.get(instrumentKey)!,
        slug: node.slug,
        title: node.title,
        description: node.description,
        tier: node.tier,
        sortOrder: index,
      })),
    ),
    ...LOGIC_TREE.map((node, index) => ({
      treeKind: "logic" as const,
      instrumentId: null,
      slug: node.slug,
      title: node.title,
      description: node.description,
      tier: node.tier,
      sortOrder: index,
    })),
  ];

  await db.insert(schema.skillNodes).values(skillNodeValues).onConflictDoNothing();

  // Every node gets a progress row so the UI never has to handle a missing one.
  const nodeRows = await db.select().from(schema.skillNodes);
  await db
    .insert(schema.skillProgress)
    .values(nodeRows.map((node) => ({ skillNodeId: node.id })))
    .onConflictDoNothing();
  console.log(`  skill nodes ${skillNodeValues.length}`);

  // EP shell: one release, five untitled tracks at the idea stage.
  const existingRelease = await db.select().from(schema.epReleases).limit(1);
  if (existingRelease.length === 0) {
    const [release] = await db
      .insert(schema.epReleases)
      .values({ title: "Debut EP", notes: "Five original singles." })
      .returning();

    await db.insert(schema.epTracks).values(
      Array.from({ length: 5 }, (_, index) => ({
        releaseId: release.id,
        title: `Track ${index + 1}`,
        position: index + 1,
        stage: "idea" as const,
      })),
    );
    console.log("  EP release + 5 tracks");
  } else {
    console.log("  EP release already present, skipped");
  }

  // Roadmap quarters, anchored to the goal window if one is set.
  const [settingsRow] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.id, 1));

  const start = settingsRow?.goalStartOn
    ? new Date(settingsRow.goalStartOn)
    : new Date();
  const quarters = Array.from({ length: 4 }, (_, index) => {
    const startsOn = new Date(start);
    startsOn.setMonth(startsOn.getMonth() + index * 3);
    const endsOn = new Date(startsOn);
    endsOn.setMonth(endsOn.getMonth() + 3);
    endsOn.setDate(endsOn.getDate() - 1);
    return {
      quarterIndex: index + 1,
      label: `Q${index + 1}`,
      startsOn: startsOn.toISOString().slice(0, 10),
      endsOn: endsOn.toISOString().slice(0, 10),
      theme: [
        "Foundations: technique, intervals, first grooves",
        "Fluency: diatonic harmony, repertoire, first demos",
        "Depth: jazz harmony, genre range, tracking the EP",
        "Ship: mixing, mastering, release",
      ][index],
    };
  });
  await db.insert(schema.roadmapQuarters).values(quarters).onConflictDoNothing();
  console.log(`  roadmap quarters ${quarters.length}`);

  await db
    .insert(schema.appMeta)
    .values({ key: "seeded_at", value: new Date().toISOString() })
    .onConflictDoUpdate({
      target: schema.appMeta.key,
      set: { value: new Date().toISOString(), updatedAt: sql`now()` },
    });

  console.log("Done.");
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await pool.end();
    process.exit(1);
  });
