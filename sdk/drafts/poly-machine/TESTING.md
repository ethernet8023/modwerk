# POLY draft validation

Status: experimental source draft, **not hardware-qualified or in the catalog**.
Tests on 7 October 2026 used a locally verified Octatrack 1.40C, the native
ColdFire/DSP port and the separate octemu/QEMU front-panel emulator. Firmware,
project/card images, raw memory dumps and compiled executables remain private.

## Measured results

- Native guarded build: passes, with 50 non-overlapping stock edits. Authored
  C is compiled for MCF5475 and linked with the assembly; four replay holes are
  populated only from the locally guarded original OS.
- Pitch helper: 768 combinations, all MIDI notes at six track-tuning values.
  Monotonic including saturation, zero-rate preserved, maximum error 0.024667
  cents, maximum 61 ColdFire instructions and 12 bytes of helper stack.
- Bounded allocator: AddressSanitizer/UndefinedBehaviorSanitizer host test
  passes 32 voices on one track, cross-track allocation, 10,000 repeated steals,
  stealing the oldest primary, independent release ownership and stale-machine
  extension cleanup. Fixed storage only; no allocation calls.
- Native 32-voice pool: one track has one active primary plus 31 extensions;
  eight tracks have eight primaries plus 24 extensions. Both produce audio.
  On the 33rd note, then a note on another track, the pool remains at 32.
  A later release of a stolen note does not stop its replacement.
- Full-range MIDI: notes 0, 127, 71, 72, 84, 96, 97 and 126; velocity-zero note
  off; C–E–G chord; CC16 tuning of all three voices. Held owners clear,
  independent finite releases finish, and note input never writes the PTCH lock.
- Native UI: selecting POLY opens FLEX slots directly; loading SINE440.WAV,
  confirming the slot and leaving the browser reaches SRC/POLY; chromatic
  presses create three distinct pitches without moving PTCH; turning PTCH
  transposes them together. Current real LCD captures are in `media/`.
- Earlier UI pass verified printed octave endpoints -6/+3 and TSTR OFF in
  SRC SETUP. Their control logic is unchanged by the allocator work. This is
  distinct from the current flow capture; do not treat old pool-choice screenshots
  as current UI. Double-tap TRACK reopening is not qualified by the current walk.

## Quick paraphony comparison

Same source-fetch/resampling and per-track FX path, 32 held voices across eight
tracks, four notes per track (72, 76, 79, 84), generated 440 Hz FLEX loop.
Warm up for 1,200 audio blocks and measure the following 1,200 blocks; each
block is 16 samples. ATK 0, HOLD INF, REL 20, AMP VOL 64. Both runs verify
8 primary plus 24 extension heads active and render audio.

| Envelope arrangement | ColdFire instructions / 16 samples |
| --- | ---: |
| Separate envelope per voice | 79,800 |
| One shared AMP per track | 76,787 |

Shared AMP saves **3.78%** of the measured total in this held-note case.
The user selected polyphony; the shipped draft retains independent envelopes.
These variants used the earlier fixed allocation only to isolate AMP cost.
The current shared-pool implementation is tested separately. This quick test
is not a comparison of moving attacks/releases or physical CPU percentages.

The native CLI resets its instruction counter after the last timed action but
prints a denominator covering the whole run. `benchmark-result.py --window 1200`
uses the actual steady window, not that misleading printed per-frame figure.
Host wall time and emulator “real time” ratios are not hardware evidence.

The SDK records [earlier hardware freezes under added ColdFire audio work](../../octabam/docs/remixer/FAILURE_MODES.md#freeze-without-an-exception-screen-as-coldfire-delay-routine-work-grows--his-unit-open),
with a missed frame deadline inferred as the cause despite fixed memory use.
That report concerns Tape Echo, not a POLY hardware test. It reinforces why
bounded allocation alone does not establish crash-free playback, and why the
32-voice count is an experimental capacity rather than a qualified operating limit.

## Reproduction

The native SDK must be available separately, with the developer's own verified
stock image and reviewed local toolchain. Copy this draft into a private
`modules/poly-machine` staging directory and select it from a native remix.
Regenerate the authored C assembly into a fresh output file:

```sh
python3 modules/poly-machine/prepare-registration.py --output /private/tmp/registration.s
```

Copy that generated file into the private module directory, then use the
repository's native build procedure (`REMIX=poly-machine`, `XBUS=1`, `SPEC=1`).
Use a one- or two-digit BUILD tag. No stock bytes are needed to regenerate the
C/assembly; the guarded image is required only for the actual native build.

Firmware-free checks from this draft directory:

```sh
python3 verify-source.py
cc -std=c11 -Wall -Wextra -Werror -fsanitize=address,undefined pool-test.c -o /private/tmp/poly-pool-test
/private/tmp/poly-pool-test
```

`native-fixture.py` stages generated sample/project fixtures and command lists
for the native emulator. `verify-midi.py PRIVATE_OUTPUT_DIRECTORY` verifies
its `final-*` dumps. `pitch-probe.cpp` executes the linked helper using the SDK
native port; pass image, runtime blob, runtime base and helper symbol address.
The source-only checks do not substitute for native execution.

## Remaining qualification

- Physical MKI/MKII, audio deadlines and long stress sessions: **not tested**.
  Emulator instruction counts cannot certify crash-free operation. An earlier
  extreme-pitch workload only delivered 12 active voices; it did not establish
  a 32-high-note limit. High-ratio raw fetching remains the major CPU risk.
- A STATIC prototype lost quieter chord components as streaming positions
  diverged. STATIC is therefore excluded; FLEX is the only current source.
- Reverse/slices, parameter locks/LFOs/scenes, mixed machines, sample replacement
  during notes, transport/Part/project changes, recorders and save/reload:
  require broader end-to-end stress coverage. Do not infer these from allocator
  unit tests.
- Panel note recording and extended-range MIDI recording are incomplete.
- Browser/website composition, downloadable firmware package and public catalog
  qualification are intentionally pending. `module:doctor poly-machine` does
  not discover modules under `sdk/drafts`; it cannot certify this unpublished
  draft. Repository checks and exact outcomes are recorded in the PR.

## Evidence integrity

JSON reports include source/image fingerprints where relevant. Images are
actual monochrome 128×64 emulator LCD captures enlarged by nearest-neighbour
scaling. No invented screen or physical recording is used. Historical POLY95
claims in `upstream/` are not claims about this implementation.
