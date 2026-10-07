# Poly Machine — development draft

POLY is a FLEX sample machine with a **shared pool of 32 active voices**.
One track can use all 32; the pool is not divided into four voices per track.
Each voice has an independent pitch, playback position and AMP envelope.
Filters, FX, sample selection, RATE and parameter controls remain per track.
When the pool is full, the oldest active voice is stolen, including a voice
on another POLY track. Ordinary sample tracks are outside this pool.

PTCH tunes the whole chord. Panel and MIDI notes add their own semitone offset
without moving PTCH or overwriting its live lock. The machine follows the
instrument's audio frames and sequencer; it has no independent clock.

This is an experimental source draft, outside the public catalog. Emulator
results do **not** establish that 32 voices meet physical OT audio deadlines.

## Controls and flow

| Control | Behaviour |
| --- | --- |
| SRC SETUP → POLY | Selects POLY and opens the native FLEX sample pool directly. |
| FLEX pool | Stock slot selection and file loading; no STATIC/FLEX chooser. |
| PTCH | Tunes every active/releasing voice independently of note input. |
| Chromatic keys | Separate notes and releases, with held-key boxes. |
| FUNC + LEFT/RIGHT | Ten octave positions, -6 through +3; endpoints clamp. |
| MIDI | Notes 0–127 on exclusively POLY routes; note 84 is the tuned sample root. |
| AMP | Independent ATK/HOLD/REL envelopes. REL INF intentionally sustains released voices. |
| SRC SETUP | Native FLEX settings; TSTR is OFF. |

## Usage

1. Select an audio track, open SRC SETUP, choose POLY and press YES.
2. POLY opens the FLEX sample pool directly. Load a sample with the stock file browser, then confirm its slot with YES. NO leaves the browser.
3. Return to SRC and enter chromatic mode with FUNC+DOWN. Hold several trig keys; FUNC+LEFT/RIGHT changes octave from -6 to +3.
4. Turn PTCH to transpose the sounding chord. A dedicated POLY MIDI channel accepts notes 0–127; note 84 plays the tuned sample root.
5. Set AMP REL to a finite value for notes that end after key-up. All POLY tracks share 32 voices, and one track can use the entire free pool.

## Implementation and efficiency

All playback and envelope storage is allocated at build time. A note never
allocates a DSP amp, filter, FX chain or heap buffer. Eight native primary
records act as stock trigger entry points; 31 fixed extension records allow
one track to reach 32 sounding heads. The allocator enforces **32 active heads
total**, not 39. State arrays cover the physical bridge records too.

The audio loop visits set bits in each track's active mask. Note/tuning ratios
are cached. Render scratch and the raw-fetch buffer are reused across tracks.
The mix has enough integer headroom for 32 simultaneous full-scale sources
and retains a per-track limiter. That limiter cannot prevent clipping caused
by summing several loud tracks at the main output.

The runtime uses the existing shared platform arena, which reserves about
10 MiB of sample RAM once; the module itself uses only a small part of that
arena. High playback ratios still require more raw sample fetching. This is
not a claim of hardware-safe maximum polyphony.

## Compatibility and limitations

- Octatrack OS 1.40C only; physical hardware has not been tested.
- FLEX only. STATIC was excluded after an exploratory audio test lost chord
  components as independent streaming heads diverged.
- Panel note recording and extended MIDI note recording are incomplete.
  Ordinary sequencer trigs play the tuned root. Shared MIDI channels retain
  stock commands outside 72–96 if any routed audio track is not POLY.
- Ratios saturate below 32× without octave folding. Linear interpolation can
  alias; very low notes have limited Q16 playback-phase resolution. An earlier
  maximum-pitch load did not establish 32 simultaneous high voices.
- The octave is global live state, not saved in a Part. Stock octave LEDs clamp
  to their four available positions; the printed signed octave is exact.
- At most 64 distinct owners can remain held per track, with 31 queued presses
  behind the armed stock mailbox. Excess queued input is rejected before it
  becomes a held note.
- Scenes, LFOs/locks, slices/reverse combinations, project/Part reload, recorder
  activity and machine changes under load need broader qualification.
- VECTOR, Analog BD, FM Synth and Quantizer overlap the registration hooks.
  Their integration was used as a reference; coexistence is not claimed.
  OctaKit's Part layout is incompatible.

POLY uses a `PL/1` signature in three unused NEIGHBOR bytes while retaining
FLEX's native machine byte. Both Part copies are updated. Legacy raw-type-5
POLY95 Parts migrate to signed FLEX when visited.

## Validation and provenance

[TESTING.md](TESTING.md) separates measured results from remaining work.
[import.json](import.json) records the exact preservation archive and source
hashes. Historical [upstream notes](upstream) describe POLY95, not this draft.
Stock replay placeholders are filled from the developer's locally verified OS;
no firmware, extracted stock spans, card images or memory dumps are included.

Sam Banks' original POLY is MIT; full terms are in [LICENSE](LICENSE).
The pool adapter follows repeat98's MIT VECTOR code and the Analog BD/FM
registration conventions. New integration and allocator work is MIT.
