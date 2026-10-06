# FM Synth native preview testing

This report covers version 0.1.0-experimental. It does not qualify publication. Current hardware: **untested**. Historical author MKI reports predate the dedicated chooser and sample-free transport and are not current evidence.

## Exact sources and build

octabam `949f3be15eae5d3d16a7682b9e3218d42f6c1284`, author octatrick `525f4b19b04dc3ba3f3bae3b25abbf48df34a10a` (v2.9). The reviewed quantizer import supplies the matching mailbox/accessor, adapted to recognize the Part tag. See the import inventory for original and adapted file hashes. The chooser derives from Modwerk’s Analog BD registration at `cb1f0a16a41902fe874b8f307dd3d9065daf6eff`; the Analog BD audio engine is not included.

Native declaration/source execution used a private staged SDK tree. Only `modules/synth` was added; the regular shared `build_bus.py` remained unchanged. The preview Remix selected the fourteen stock effects plus SYNTH MACHINE; FX1 was FILTER, EQUALIZER, DJ EQ, PHASER, FLANGER, CHORUS, SPATIALIZER, COMB FILTER, COMPRESSOR, LO-FI. `fallback=NO_FALLBACK`, `static_stock=True`; platform USB/dynloader modules were omitted from this private capture profile. No module-specific public builder was added.

The build ran in local `octamod-tapehead-qualification-tools:local` with no network, read-only container root, all capabilities dropped, no-new-privileges, 128-process limit, a private source/output bind mount and a temporary filesystem. Environment: XBUS=1, SPEC=1, DEV=0, NOROUNDTRIP=0, OCTABAM_STATIC_STOCK=1, OCTABAM_NO_CACHE=1, BUILD=79, REMIX=fm-synth-ui. The local OS stayed outside Git. GNU ColdFire/DSP source assembly and native build passed.

The included `registration.s` reproduces exactly from `registration.c` with GCC 16.2.0:

```sh
m68k-elf-gcc -mcpu=5475 -O2 -ffreestanding -fno-builtin -fno-common -fno-pic -S registration.c -o registration.s
```

Firmware identity, source builder identity, image size and private arena layout are in `evidence/native-build.json`. The image SHA-256 is `6b6d0ef7b076e0096a9a930c4ec65992d5eda3b9bb18865b925ed1b49e29548a`. No output binary is retained in the module.

## UI and Part storage — passed

The trusted headless `ot_emu` and `scripts/capture-module-ui.py` drove normal MKII panel UART events. A private empty 32 MiB card was used. Container shared memory was 512 MiB (the emulator cannot start with Docker’s default 64 MiB). All seven kept screenshots were opened and visually reviewed: dedicated SRC SETUP machine row, six SRC controls, VOIC/CHRD, LEG, SCALE, ROOT and GLIDE. `media/capture.json` contains the exact panel plan and image/emulator hashes.

Reproduction, inside a reviewed private SDK staging tree containing this source as `modules/synth`, with the ordinary native toolchain and local OS:

```sh
python3 -B verify.py --emulator /path/to/ot_emu --sdk /path/to/staged/sdk/octabam --image /private/path/mainos_bus.bin --image-sha256 6b6d0ef7b076e0096a9a930c4ec65992d5eda3b9bb18865b925ed1b49e29548a --output /private/path/storage-report.json
python3 -B scripts/capture-module-ui.py --emulator /path/to/ot_emu --image /private/path/mainos_bus.bin --image-sha256 6b6d0ef7b076e0096a9a930c4ec65992d5eda3b9bb18865b925ed1b49e29548a --plan /private/path/plan.json --output /private/path/new-capture-folder
```

Use `media/capture.json`’s plan as plan.json. `verify.py` asserts selection and defaults on T1–T8, FM/1 in the current Part and SRAM shadow, all forty sample-slot bytes unchanged, edited INDX preserved on reselection, and full signature clearing when returning to FLEX. All five checks passed; sanitized results are in `evidence/storage.json`. This reads current Part storage; it does not prove a saved project reload.

## Octemu sample-free audio and recovery — passed

The owner authorized the local `coding/octemu` setup. Its cached `out/fx2` card and battery file were copied privately; the original files were not modified. The private card’s only WAV was deleted before boot. It retained a firmware-created saved project and a step-1 trig, with track 1 FX1/FX2 NONE. No FMSYNTH marker exists. Binary identities and fixture fingerprints are in `evidence/audio.json`.

Octemu ran headless/read-only with this image, the copied card/battery, `evidence/octemu-walk.jsonl`, a private WAV recording and a 150-second timeout. The walk gates on PTCH, RATO and PLAY/STOP lamp states, selects FM SYNTH with five DOWN taps, sets INDX=0 and AMP REL=40, starts the pattern and stops twice. It verifies actual firmware panel behavior, not a direct DSP test tone.

```sh
./octemu --headless --read-only --cf-card /private/fixture/card.img --nvram /private/fixture/nvram.bin --os /private/mainos_bus.bin --script /path/to/evidence/octemu-walk.jsonl --recording /private/audio.wav --timeout 150
python3 -B verify-audio.py /private/audio.wav --output /private/audio-report.json
```

Run Octemu from its own checkout root. Copy `out/fx2` first, remove its AUDIO WAV using the reviewed `scripts/card.py`/mtools setup, and copy the battery again before each run. The walk’s waits use guest time. The recording includes boot/settle silence; analysis checks nonzero generated audio, a carrier period near 169 frames (about 261 Hz, rather than the deleted fixture’s 440 Hz sine), and a silent final half-second. All passed. A first attempt without an active CF voice lifecycle kept sounding after STOP; the final START callback marks the native voice active so stock kill/transport ends it.

## Resource and sequencing limits

Native arena reservation: 10,487,808 bytes; current runtime extent and staging extent are recorded exactly in `evidence/native-build.json`. These are platform extents, not exact FM ownership or complete worst-case memory. Stack peaks, temporary clones, stock reuse, shared lifetimes, incremental per-track state and padding require a reviewed full inventory. Worst-case ColdFire cycles and DSP transport overhead are **not measured**. Eight-track selection is not eight-track audio stress.

The engine uses stock note/trig starts, releases and stops. Its oscillators run at sample rate for live playing; envelopes/glide follow stock clock data. At the guide checklist level: SRC SETUP selection, highlight/reselection, main name, SRC edit/page drawing, full stock guards, Part/shadow writes, sample-slot preservation, one-voice pattern PLAY and double-STOP are observed. Main chooser commit variants, neighbouring FLEX/STATIC audio, each p-lock, each LFO destination, scene sweeps, MIDI, chord/voice switching, save/reload, Part/pattern switching, non-1x speed/length, swing, tempo changes, loop transitions and restart behavior are **not tested**. The single engine has no model list.

## Publication gates — pending

Do not add this draft to sdk/catalog.json or freeze a qualification exemption. Required before publication: full worst-case cycles/memory; current attributed hardware report (or exact owner waiver where policy allows); lock/modulation/stock-path/persistence coverage; stock-free packages; shared native/browser composition and matching refusal matrix; module doctor. The hardware policy has no minimum duration or track count, but requires truthful recorded coverage. `qualification.example.json` contains pending fields and is not attached as tests.qualification.

Stock-free draft integrity and documentation tests are run by `npm run check` and `npm run sdk:check`. `npm run modules:generate`, `npm run modules:check -- --base origin/main`, and licence generation/checks validate the existing published catalog without adding this draft. `npm run module:doctor -- synth` reports it unavailable because it is deliberately outside native/public discovery; publication integration is pending.

## Repository review checks — passed on current main

Rebased onto `ea147a8f42f166437e56e1087c8cfba12808dbe4`. The native preview reproduces the captured/audio-tested image exactly; shared native tools/DSP inputs did not change across this rebase.

- `npm run modules:generate`: passed; draft remains excluded.
- `npm run check`: passed — lint, SDK checks, TypeScript, production build and 761 tests in 115 files.
- `npm run sdk:check`: passed — 39 read-only SDK tests, including three new draft integrity/hygiene/evidence tests.
- `npm run modules:check -- --base origin/main`: passed.
- `npm run licenses:generate` and `npm run licenses:check`: passed.
- `npm run module:doctor -- synth`: expected unavailable-draft result; there is no module under native/public discovery. This is a pending publication gate, not a green doctor claim.
- Isolated stock-free package rebuild and `npm run modules:import -- <private-output>/packages --development`: passed. Image `modwerk-source-tools:continuation` provides GCC 16.2.0, GNU binutils 2.47 and Node 24.21.0. The full immutable image ID was supplied to `scripts/build-modules-isolated.sh`; no firmware/network/credentials were mounted. All ten existing package documents compare identical to main after removing only sourceCommit provenance. The release source-tree fingerprint changes because the licence inventory/notices now identify this draft. No existing executable payload, module version or recipe changed.

The final check result supersedes early runs against incomplete shared dependencies and the pre-rebuild release fingerprint. All source and evidence changes remain in the isolated worktree.
