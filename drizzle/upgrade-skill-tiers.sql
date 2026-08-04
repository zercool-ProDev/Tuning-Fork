-- Tuning Fork: add Professional and Mastery tiers to every skill tree.
--
-- Run this ONCE in the Neon SQL editor. Safe to run twice: every insert is
-- guarded on the node slug, so nothing is duplicated and no progress is lost.

BEGIN;

INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'drums'), 'drums-linear', 'Linear Drumming', 'Patterns where no two limbs strike together.', 5, 8
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'drums-linear');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'drums'), 'drums-polyrhythm', 'Polyrhythms & Metric Modulation', '3:2 and 4:3, and shifting the felt pulse.', 5, 9
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'drums-polyrhythm');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'drums'), 'drums-brushes', 'Brushes', 'Jazz brush technique: stirring, slaps, legato sweeps.', 5, 10
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'drums-brushes');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'drums'), 'drums-double-bass', 'Double Bass & Heel-Toe', 'Fast, even doubles without losing the groove.', 5, 11
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'drums-double-bass');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'drums'), 'drums-soloing', 'Soloing & Trading Fours', 'Structured improvisation that still states the form.', 6, 12
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'drums-soloing');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'drums'), 'drums-click-tracking', 'Playing to a Click & Tracking', 'Studio-grade time, takes that need no editing.', 6, 13
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'drums-click-tracking');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'drums'), 'drums-genre-authenticity', 'Genre Authenticity', 'Samba, songo, second line, drum and bass, played idiomatically.', 6, 14
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'drums-genre-authenticity');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'bass'), 'bass-chordal', 'Chordal & Double Stops', 'Tenths, upper structures, filling space without a guitar.', 5, 7
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'bass-chordal');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'bass'), 'bass-advanced-slap', 'Advanced Slap', 'Double thumbing, ghost-note vocabulary, funk phrasing.', 5, 8
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'bass-advanced-slap');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'bass'), 'bass-fretless', 'Fretless Intonation & Vibrato', 'Playing in tune with no frets to hide behind.', 5, 9
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'bass-fretless');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'bass'), 'bass-odd-meter', 'Odd Meter Grooves', 'Locking 5/4 and 7/8 without counting out loud.', 5, 10
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'bass-odd-meter');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'bass'), 'bass-solo-improv', 'Improvised Solos Over Changes', 'Melodic soloing that outlines the harmony.', 6, 11
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'bass-solo-improv');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'bass'), 'bass-session-reading', 'Session Reading', 'Sight-reading charts on the first take.', 6, 12
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'bass-session-reading');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'bass'), 'bass-tone-di', 'Tone Shaping & DI Recording', 'Getting a finished bass sound to tape.', 6, 13
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'bass-tone-di');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'guitar'), 'guitar-caged-fluency', 'CAGED Fluency', 'One shape anywhere on the neck, without hunting.', 5, 7
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'guitar-caged-fluency');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'guitar'), 'guitar-modal-improv', 'Modal Improvisation', 'Soloing over static vamps with modal colour.', 5, 8
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'guitar-modal-improv');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'guitar'), 'guitar-hybrid-picking', 'Hybrid Picking', 'Pick and fingers together for country and R&B lines.', 5, 9
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'guitar-hybrid-picking');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'guitar'), 'guitar-comping', 'Comping Behind a Vocal', 'Rhythm guitar that supports rather than competes.', 5, 10
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'guitar-comping');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'guitar'), 'guitar-chord-melody', 'Chord Melody', 'Melody, harmony and bass at once, unaccompanied.', 6, 11
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'guitar-chord-melody');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'guitar'), 'guitar-reharm', 'Reharmonisation on Guitar', 'Substitutions and passing chords under a known melody.', 6, 12
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'guitar-reharm');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'guitar'), 'guitar-recording-tone', 'Recording Tone', 'Amps, pedals and mic placement for a mix-ready sound.', 6, 13
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'guitar-recording-tone');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'keys'), 'keys-rootless', 'Rootless Voicings', 'Bill Evans style A and B voicings in all keys.', 5, 7
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'keys-rootless');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'keys'), 'keys-upper-structures', 'Upper Structure Triads', 'Triads over dominants for altered colour.', 5, 8
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'keys-upper-structures');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'keys'), 'keys-stride', 'Stride & Walking Left Hand', 'Carrying bass and comp with the left hand alone.', 5, 9
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'keys-stride');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'keys'), 'keys-quartal', 'Quartal & Modal Voicings', 'Fourths-based voicings for modal and gospel settings.', 5, 10
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'keys-quartal');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'keys'), 'keys-solo-arrangement', 'Solo Piano Arrangement', 'A whole tune alone: melody, harmony, bass, form.', 6, 11
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'keys-solo-arrangement');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'keys'), 'keys-standards-improv', 'Improvising Over Standards', 'Soloing through rhythm changes and common forms.', 6, 12
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'keys-standards-improv');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'instrument', (select id from instruments where key = 'keys'), 'keys-synth-programming', 'Synth Programming', 'Building pads and leads from oscillators, not presets.', 6, 13
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'keys-synth-programming');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-mid-side', 'Mid/Side Processing', 'Widening and controlling the stereo field independently.', 5, 15
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-mid-side');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-sidechain', 'Sidechain & Ducking', 'Making space rhythmically instead of with EQ alone.', 5, 16
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-sidechain');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-flex-pitch', 'Advanced Vocal Tuning', 'Flex Pitch by hand, keeping the performance human.', 5, 17
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-flex-pitch');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-sampler', 'Sampler & Quick Sampler', 'Chopping, mapping and playing your own sources.', 5, 18
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-sampler');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-mono-phase', 'Mixing in Mono & Phase', 'Catching phase problems a stereo mix hides.', 5, 19
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-mono-phase');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-bus-chain', 'Mix Bus Chain', 'Compression and saturation that glue without squashing.', 6, 20
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-bus-chain');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-stem-mastering', 'Stem Mastering', 'Mastering from stems when the mix needs the control.', 6, 21
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-stem-mastering');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-delivery', 'Delivery & Loudness', 'LUFS targets, headroom and formats for each platform.', 6, 22
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-delivery');
INSERT INTO skill_nodes (tree_kind, instrument_id, slug, title, description, tier, sort_order)
SELECT 'logic', NULL, 'logic-reference-workflow', 'Reference Workflow', 'Systematically matching tone and level to a reference.', 6, 23
WHERE NOT EXISTS (SELECT 1 FROM skill_nodes WHERE slug = 'logic-reference-workflow');

-- Every node needs a progress row so the tree never renders a gap.
INSERT INTO skill_progress (skill_node_id)
SELECT n.id FROM skill_nodes n
WHERE NOT EXISTS (SELECT 1 FROM skill_progress p WHERE p.skill_node_id = n.id);

COMMIT;
