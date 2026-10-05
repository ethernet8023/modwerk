# Sidechain Compressor verification

Version: **0.1.0-experimental**. Recorded: **5 October 2026**.
Native-buildable source draft; outside the public catalog.
Instruction parity, LCD evidence and release qualification have separate status.

## Source and build identity

| Input | Exact identity |
| --- | --- |
| octabam wrapper/tools/profile | f80ecfeabc187a33403588678e707443161afc96 |
| Zac-Kyoti authored dependency | d3e0801a5f666abc04bc05fc1cb37969d7fb38d0 |
| Modwerk SDK emulator/capture source | 3297d862e7fe002d06bd11e3c8279027565b5b10 |
| Original local 1.40C MAIN OS | 164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e |
| Private composed MAIN OS | b5aa8cee7787a3dc0ea53007fe31358ba14d155421ebec9c7f98948de740675f |
| Composed length / changed bytes | 1,112,560 / 2,462 |

[Import record](../../imports/sidechain-compressor-f80ecfe.json) identifies every
retained upstream file and its transformations. Assembly and coefficient
sources remain exact. The standalone oracle contains only the author's
AST-extracted sc_assemble function; its stock expectation spans and packaging
code are excluded. Three DSP instruction guards use fingerprinted lazy local
reads. No copied stock expectations or firmware are distributed.

Native options: REMIX=sidechain-compressor, XBUS=1, SPEC=1, DEV=0,
NOROUNDTRIP=0, BUILD=81. The profile selects stock effects and this module,
removes SPRING REV, preserves its 35-word DARK helper, and retains PLATE/DARK.
The proof uses pinned upstream tools, without upgrading Modwerk's SDK.

## Actual results

| Check | Result / scope |
| --- | --- |
| Native composition and DSP roundtrip | Passed in bubblewrap isolation, both payloads. |
| ColdFire reference | Passed at reference address 0x400d7000; 134 bytes, SHA-256 24853ca8ce0095ff9e4c4f4184416f0f439b34cc4deded006396eccc2befcc9e. |
| Standalone DSP parity | Passed: both 340-word code blocks differ only at indices 138, 209, 210 (table pointer and FTAB instruction pair). Reassembling exactly those native substitutions matches all code words. |
| Coefficient tables | Passed: all 48 words/core identical to the standalone assembler output. |
| COMPRESSOR dispatch | Passed: stock init/proc entries stay unchanged on both cores. |
| Synthetic Y overlap | Passed: native ledger independently rejects private-keybus and shared-window overlaps; a disjoint control claim is accepted. Not a built BusDelay/BusVerb combination. |
| Changed base | Passed: byte 100 XOR 1 in a private copy refused by original-1.40C guards before output. |
| Emulator EMAC/peripheral gates | Both passed using the capture emulator build. |
| LCD selection/main/SETUP | Passed, MKII, stopped transport, no audio assets; three reviewed screenshots. |
| Local audio smoke / live ducking | Not run on this image. |
| Worst-case DSP/ColdFire cycles | Pending; no numerical qualification claimed. |
| Complete memory and peak bounds | Pending; reservations below are incomplete. |
| Current-image hardware operation | Pending; historical upstream author evidence only. |
| Modwerk browser/native full-file parity | Pending; newer native declarations need a reviewed public package path. |

[Native evidence](reports/native-evidence.json) records code/table/tool hashes.
It contains no firmware bytes. Instruction identity does not establish
real-time timing, audio behavior, hardware operation or browser composition.

## Native reproduction

Follow README's developer build in a new disposable workspace.
Copy this folder as modules/sidechain-compressor with pinned upstream tools/dsp
and the pinned test remix. Copy Modwerk's stock_guard.py into tools/remix.
Provide the fingerprinted local original, assembler/disassembler and reviewed
m68k toolchain. Mount sources/toolchain read-only, clear the environment,
unshare network/credentials and write only into private output.

Within that isolation boundary run:

    python3 -B tools/build/build_bus.py
    python3 -B modules/sidechain-compressor/tools/verify_native.py
    python3 -B modules/sidechain-compressor/tools/verify_rejections.py

The verifier reads out/mainos_bus.bin and the local original, runs the
AST-extracted author assembler, compares normalized instructions/tables and
preserved dispatch, and writes sanitized native-evidence.json plus private
assembler inputs/outputs. It must never run in CI or on a visitor machine.
Remove private binaries after retaining permitted text evidence.
The original verification used a locally built DSP assembler, with its full
binary fingerprint in the report. The capture emulator separately uses DSP
revision 8ccdd843adda9c18fc232a2ca50d6caccbf3cb1e plus Modwerk's reviewed patch,
AsmJit 3577608cab0bc509f856ebf6e41b2f9d9f71acc4 and mc68k
4a6d0d17a1f2b30077ab726c27fe9bb770fa0456. GCC: 15.2.0.
A minimal CMake build selected ot_emu, ot_emac_test and ot_periph_test without
LTO; CMake and executable fingerprints are in capture.json.

## LCD evidence and reproduction

[media/capture.json](media/capture.json) binds exact native source files,
image, tools, emulator, fixture and screenshots.
The copied fixture is cleaned with make_clean_project; T1 FX1 is COMPRESSOR,
other effects NONE, all banks/parts use the recorded defaults.
SET MODWERK / PROJECT SIDECHAIN, disposable 64 MiB card, no samples.
Only hashes of private fixture files are retained.

Run the committed capture tool inside isolation, passing the recorded plan:

    python3 -B scripts/capture-module-ui.py --emulator /work/ot_emu --image /work/out/mainos_bus.bin --image-sha256 <recorded-image-sha256> --card /work/card.img --set-name MODWERK --project-name SIDECHAIN --plan /work/panel-plan.json --output /work/captures --key-ms 50

The plan dismisses the
clock dialog, selects T1, enters FUNC+FX1 SETUP, confirms YES, captures the
main page, re-enters SETUP and turns encoder C. Delta 8 produced **KEY T2**.
The duplicate default SETUP capture was discarded; its original plan action
remains recorded. Every retained PNG was reviewed: no error/load failure,
stale popup or pixel edits. RGB 24/240 palette, integer scale 6, 768x384 pixels.
Temporary card, firmware, LCD dumps and private logs are not distributed.

FX1 SETUP contains the chooser and key controls together. FUNC+FX enters it
directly; FX returns to main. FX2/MKI remain source-described, not captured.
No MON audio, ducking or persistence result follows from a stopped UI session.
Underlying Elektron rights remain reserved in media/LICENSE.md.

## Memory reservations and resource estimates

| Region | Per core |
| --- | --- |
| Placed P code | 340 words |
| Placed P coefficient table | 48 words (16 gain + 32 filter) |
| Private Y 0x7f0..0x9ff | 528 words |
| Shared half-relative Y 0x3dfe..0x3fff | 514 words |
| Total declared Y claim | 1,042 words = 3,126 bytes |
| ColdFire linked UI unit | 134 bytes total across the whole image |

Absolute shared starts: A 0x33dfe, B 0x3bdfe. Spring's 1,063 P words minus
the retained 35-word DARK helper leave 1,028; this module uses 388 and leaves
640 per core. These totals exclude inherited COMPRESSOR state,
descriptor/chooser clones, stack, allocator peak lifetimes and full shared
ownership. They are not a complete-memory qualification.

Impact workload: global publish/commit hooks on eight tracks plus one receiving
compressor with KEY/filter/gain/MON. CPU **low** is a source estimate: small
134-byte UI callbacks, audio in DSP. DSP **moderate** reflects unconditional
per-track block copies plus key gain smoothing/filtering. Memory **low** reflects
fixed short windows rather than long delay buffers. Tiers exclude inherited
stock compression cost; they are not utilization/headroom percentages and
cannot replace measured cycle/memory qualification.

## Historical hardware evidence

The pinned author manifest/README attributes an MKI report to Zac Kyoti on
4 October 2026 for combined octabam with all six KYOTI modules and REC_TRIG_MUTE:
both compressor pages; same-core and cross-core ducking both ways (T1 to T5,
T5 to T1); KFLT/KGN/MON; no PLATE/DARK crosstalk on T7; muted KEY in each
MUTE_MODE and first kick after PLAY. Earlier standalone/KYOTI V1.0 operation
is also reported upstream.

This preserves an upstream statement, not independent verification of this
version, image or remix. No MUTE_MODES variant is imported.
Keep hardwareStatus historical until attributed current-image evidence exists.

## Static checks and thumbnail review

The SVG was rendered and visually inspected at 160x96, 320x192 and 640x384.
The diagram remains readable in the compact card and uses the existing module
palette. The three LCD PNGs were also inspected individually.

Run npm run sdk:check: Python tests inspect the import hashes, AST guard
declarations, source-only hygiene and capture bindings; the Node draft verifier
uses the strict module parser and existing documentation/PNG checks. It checks
the source fingerprint and confirms the real publication function refuses the
unqualified draft. Native Python and emulator code never execute in these checks.

## Remaining publication gates

1. Implement stock-preserving descriptors, formatter/widget references,
   per-core hooks/substitutions and range claims in Modwerk's reviewed
   package path. Reconstruct stock locally.
2. Prove deterministic stock-free packages, browser/native full-file/container
   parity, changed-base refusals and donor/conflict selection behavior.
3. Measure worst-case cycles on both DSPs/ColdFire during parameter modulation,
   same/across-core routing, mode/effect changes and maximum load.
   Emulator stopwatch counts instructions, not physical chip cycles; a
   validated timing model is needed to fill that gate.
4. Account for full memory regions/owners, stock state, maximum instances,
   stack, allocator peaks and shared-window lifetimes.
5. Supply attributed current-image real-hardware operation: ordinary audio,
   cross-core keys, MON, mute/play transitions, reverb coexistence, shared-KEY
   multi-instance interactions, project reload and recovery. The current policy
   does not require a 60-minute/eight-track stress report. Unreported cases
   must remain explicit.
6. Bind measured qualification/version/source, map licences at promotion,
   rerun checks and obtain owner review/merge.

Static checks read AST/data/PNG pixels and verify publication rejection.
They never execute module source or an emulator during npm run check.
