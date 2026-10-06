# RIFF testing

Version: `0.2.1-experimental`, 6 October 2026. Source and image identities are recorded in `media/core-tests.json` and `media/capture.json`. Those records bind the authored files by SHA-256; no firmware is committed.

Native-tested authored source revision: `3b285711d27305138b8657435f8ccbe39afe6316`. The private SDK/toolchain base and exact compiled input hashes remain recorded separately in `media/capture.json`.

## Firmware-free core

Run inside the network-disabled, read-only toolchain container, with task-private output:

```sh
cc -std=c11 -Wall -Wextra -Werror -fsanitize=address,undefined engine.c test_engine.c -o /tmp/riff-tests
/tmp/riff-tests
```

Passed 244,800 deterministic/scale/density cases, 29,772 secondary-control cases, packed-settings round trips with canaries, gate/accent edits preserving note selection, and native-record writer checks. The writer checks exact swing/recorder/other-lock preservation, empty-only first-play protection, bounds and validation before any write. See `media/core-tests.json` for compiler identity and exact source hashes. These are synthetic host buffers, not hardware memory or timing measurements.

## Private native build

The original 1.40C MAIN OS has SHA-256 `164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e`. `prepare.py` refuses any other image and refuses an existing output. In a private SDK copy, put this draft under `modules/riff`, remove other custom modules, then run:

```sh
python3 -B modules/riff/prepare.py --stock out/raw/section_3_MAIN_OS.bin --output modules/riff/runtime.s
REMIX=riff-local OCTABAM_STATIC_STOCK=1 XBUS=1 SPEC=1 DEV=0 BUILD=98 python3 -B tools/build/build_bus.py
```

The remix selects RIFF and all fourteen stock effects, with the usual ten FX1 entries, static stock descriptors and `NO_FALLBACK`. Compilation runs in Docker with no network, all capabilities dropped, no new privileges, a read-only root, user 501:20, two CPUs, 4 GiB memory and private writable work/tmp mounts. The exact image/toolchain and build profile are in the capture record. The preparation and compile succeeded. Native publication is still blocked by `verify_native.py`.

## Emulator panel and sequence checks

The disposable project contains one Static test tone (`~SINE440`) on T1, Part ONE, pattern A01 at 120 BPM; FX are NONE. This is a behavior fixture, not a sample tuned to the documented C reference. The panel walk selects RIFF through the native chooser and exercises SRC, SRC SETUP and normal sample editing. Captures are actual 128×64 LCD pixels enlarged six times with nearest-neighbor sampling; no labels or dials are reconstructed.

Read-only GDB observations in this separate test session compare the selected track record before and after stopped/playing changes on all twelve parameters. Other tracks are fingerprinted to detect accidental writes. An empty track is filled after native PLAY. Native step counters advance after first PLAY, main-page edits, secondary-page edits and a populated-track restart; other track records and native track timing stay unchanged. PLAY is handled entirely by the stock input layer. The exact original interactive freeze was not reproduced. The recorded checks and limits are in `media/behavior.json`. GDB briefly pauses the guest to read; that session is not an audio-continuity measurement.

The pool walk checks the automatic choice modal after RIFF selection, RIGHT/LEFT menu navigation, NO cancellation, UP/DOWN selection, both native sample-slot lists and their file browsers. It loads the test tone through each pool, confirms native sample slots and checks that RIFF parameters and the generated track record stay intact. Playback step counters are sampled on both backing kinds. RIGHT/LEFT navigation keeps the Part kind unchanged. Only native sample confirmation updates its backing kind through stock commit/dirty/source-change handling; descriptors are recloned when the underlying sample source changes. See `media/pool-behavior.json` for the recorded checks and limits.

The interactive session is launched independently without a script or timeout. Its separate private card/NVRAM are disposable. Because the loaded battery state overrides the on-card setup during this boot, the preview is bootstrapped with the RIFF settings marker in the current Part and its SRAM mirror; the initial test trig is cleared. Native first PLAY generates the phrase through the tested adapter. The interactive window has no script or timeout. Emulator automation checks use another session. This bootstrap is not a persistence test.

## Remaining qualification

- Real-unit functional, live parameter, playback, load and recovery checks. Current policy imposes no fixed duration or eight-track minimum.
- Save/reload, Part copy/reload, bank and pattern changes, and power-cycle persistence, including migration from the old draft.
- Hardware Flex/Static playback, custom sample locks, swing and track-scale equivalence. The focused emulator fixtures do not qualify these general cases.
- Worst-case ColdFire event cost and complete code/data/stack/allocator accounting for the maximum supported load. No hardware headroom percentage is asserted.
- Browser/native parity, composition rejection (including Analog BD), source packaging and owner review before adding to native discovery or the public catalog.

RIFF uses bounded integer generation: at most 64 ranked steps and 2,016 comparisons, a 2,330-byte staging record, a 257-byte phrase and a 402-byte private draw descriptor. The engine adds a bounded motif scratch buffer. No allocated full-screen generator window or new DSP kernel is used. The platform's 10,487,808-byte audio-pool reservation remains a real cost. These source sizes are not complete memory qualification.
