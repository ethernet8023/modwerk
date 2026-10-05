# Sidechain Compressor — frozen handoff, 5 October 2026

**Stopped at the owner's request. This branch is WIP, fails validation, and must not be merged or released yet.**

Repository: https://github.com/repeat98/modwerk  
Branch: `codex/sidechain-compressor-common-builder`  
Base: `0de0c29fbae9249000299944a6e2ca845268ca02` (publication hold, PR #119).

## Owner requirements and authorization

- Import https://github.com/sambanks/octabam/tree/main/modules/sidechain-compressor.
- Document, verify software cycle/memory bounds, and release it build ready.
- Explicit approval to proceed without fresh physical hardware evidence. This waives **hardware evidence only**, not software qualification or compatibility.
- Use the existing common Octatrack MkI/MkII builder; verify compatibility with current Modwerk modules before release.
- BusVerb and BusDelay are outside the immediate scope.
- Clean up this task's temporary files after verification; never touch other agents' work.
- Latest instruction: stop, freeze and commit a handoff for another machine.

No release approval question is needed again within that scope. Historical
upstream hardware reports are not a test of the current Modwerk image.

## Publication history

The first attempt used a standalone shortcut. PR #115 merged it at
`8cce62689c269a5d6d70bfc8e087a843eb3a8caf`, but deployment run `37313371008`
was cancelled before publish when the owner required shared-builder compatibility.

PR #119 (https://github.com/repeat98/modwerk/pull/119) reverted that attempt.
Its merged commit is this branch's base. The standalone release did **not** deploy.
A separate owner community-performance merge between those changes is preserved.

The old candidate remains at `08a97ac36eadd8a87c2d3a4fbbe06d47746cb4bd`
on `codex/sidechain-compressor`. It is historical reference, **not** the
implementation to release. No new PR or deployment was created for this WIP branch.

## Source pins

- Octabam: `f80ecfeabc187a33403588678e707443161afc96`
- Zac-Kyoti/octatrack-kyoti-fw gitlink:
  `d3e0801a5f666abc04bc05fc1cb37969d7fb38d0`
- Existing Modwerk SDK:
  `b8deefc88b2c3e5f3c6158e364eb741df1924e1d`

Authored DSP/ColdFire/coefficient source is under
`sdk/octabam/modules/sidechain-compressor/upstream/` with MIT notices.
The wrapper changes tool paths, uses lazy fingerprint-only stock guards,
explicitly inherits stock enable nibbles (`Param(active=None)`), and sets the author.
Update its import record hash and listed transforms before final validation.

## Current implementation

Selective ports into the existing native SDK:

- `schema.py`: stock-DSP descriptor replacements, raw formatter/widget fields,
  inherited controls, payload-specific hooks, substitutions and DSP data ranges.
  Old modules retain `Param.active=False` by default.
- `build_bus.py`: per-core substitutions/hooks, preserve stock COMPRESSOR code
  and dispatch, inherit enable nibbles, link raw descriptor pointers, skip generic
  label formatters for raw formatter fields.
- `ledger.py`: per-payload hook addresses. **DSP data range overlap checking
  is still missing**, despite adding the schema.
- The existing registry replacement path is used. No Sidechain registry skip or
  standalone browser build branch was restored.

WIP shared browser composer changes:

- Core-specific guarded-hook variants in normal `dsp-packages.json`.
- Existing static DSP placement/donor planning, retaining COMPRESSOR code.
- Hook writes with stock init/process dispatch unchanged.
- FX1/FX2 chooser replacement, inherited descriptor nibbles and raw symbol pointers.
- Floating authored ColdFire ELF units through the existing ROM linker/allocator.

`scripts/build-module-packages.py` emits both variants, four-origin relocation
proofs, the `sc_cf` ROM object and descriptors through ordinary package files.
No extra standalone package format was added.

The WIP catalog declares `0.1.1-experimental`. It is **not qualified**.
Most restored docs/evidence/tools still describe the abandoned standalone
0.1.0 image and must be reconciled. The module README is marked WIP.

## What was checked

### New common-native port

The older shared native `build_bus.py` with feature ports and an isolated
Sidechain-only profile successfully built both cores, inherited controls, three
hooks/core and the authored formatter; stock COMPRESSOR dispatch was unchanged.

MAIN_OS: 1,112,560 bytes, 2,456 changed bytes, SHA-256:
`aa0ed057cf4cfcd78fbe3f4431b1b1520cb36ea0bd822d0b3eb3e7df9081733e`

It differs from modern Octabam's earlier standalone oracle MAIN
`b5aa8cee7787a3dc0ea53007fe31358ba14d155421ebec9c7f98948de740675f`
by six bytes outside Sidechain placements:

- A P: `0x9c`
- B P: `0x41, 0x43, 0x45, 0x4c, 0x173`
- OS addresses: `0x400ef795, 0x40102d49, 0x40102d4f,
  0x40102d55, 0x40102d6a, 0x401030f1`

**The cause is not established.** Investigate older/newer base patches before
claiming functional/cross-core parity. Do not copy standalone kernel patches
into the browser as a shortcut.

This successful native profile did **not** include mandatory common Core Logger.
New common browser/native complete-image parity has **not** been run.

### WIP authored packages

Each core: 48 table words + 340 code words = 388 words, nine absolute word
relocations. Relative entries in the complete table+code package:

| Entry | Offset |
|---|---:|
| sctap | 48 |
| scdet | 116 |
| moncommit | 361 |

Hooks A `0x4a7 / 0x1ab1 / 0x50e`, B `0x29c / 0x1871 / 0x303`.

ColdFire is 134 linked bytes, containing absolute self-string references:
keep the ELF relocation path, never move a fixed linked blob.
Author reference at `0x400d7000`:
`24853ca8ce0095ff9e4c4f4184416f0f439b34cc4deded006396eccc2befcc9e`.

Local development source compilation completed. Only new Sidechain rows were
copied into DSP/descriptor/ROM assets; existing objects were retained.
**The full local artifact is unsuitable for release.** The local older DSP
assembler misencodes two Character instructions. A private development wrapper
disabled its roundtrip check to obtain the new Sidechain rows; committed compiler
checks were not disabled.

Use `sdk/build/Dockerfile`: DSP `8ccdd843adda9c18fc232a2ca50d6caccbf3cb1e`,
GNU binutils 2.47/GCC 16.2. Local wrappers are GNU 2.46/GCC 15.2 and differ for
C preboot objects. Do not import unrelated packages from the local artifact.
Earlier exact CI output reproduced the old catalog with the pinned toolchain.

### Latest validation failures

Latest `tsc -b` failed:

- `src/catalog/module-qualification.test.ts`: functional hardware branch must
  exclude the new `owner-waived` union case.
- `src/engine/descriptors.ts`: `recipe.inheritedEnable` possibly undefined.
- `src/engine/module-menus.ts`: `recipe.rawPointers` possibly undefined.
- `src/engine/static-dsp.ts`: `pkg.stockKey` possibly undefined.

`modules:generate` fails because qualification source hash is stale after wrapper
changes. The frontend module document was manually appended for development.
Source manifest/version/inventory provenance is incomplete.
Screenshots are genuine old 0.1.0 native captures, not current common-image evidence.
License generation passed.

**No** passing new common full test suite, compatibility matrix, complete update
comparison, fresh screenshot capture or release CI run. Prior full passing checks
covered the abandoned standalone candidate only.

## Earlier evidence retained: limit its scope

The module folder contains source-only measurement tools, genuine old LCD
captures and earlier evidence for the algorithm/standalone image:

- Conditional modeled DSP per-core maximum 69,496 vs 72,560 cycles/block,
  including eight instances/core, stock reserve and a 2x engineering allowance
  for modeled interlock/shared contention. This is not physical chip timing.
- Single-instance/shared work bound: 6,196 cycles/block.
- Conditional ColdFire UI event maximum: 8,162,688 vs 8,800,000 cycles/event.
- Logical memory inventory: 23,292 bytes for sixteen instances, including
  inherited stock state/scratch, DSP windows/code/tables, descriptor and formatters.
- Earlier 16 splits × 2,304 blocks × 16 slots software cycle matrix,
  numerical stages, original rejection and old standalone update parity.
- Attributed MKI report, 4 October 2026, six KYOTI modules + REC_TRIG_MUTE;
  not evidence for arbitrary current Modwerk selections or runtime image.

Private Y: `0x7f0..0x9ff` per core.
Shared Y: A `0x33dfe..0x33fff`, B `0x3bdfe..0x3bfff`.
Check against companions' declared/derived writes, including Analog BD and runtimes.

## Continue in this order

1. Fix TypeScript narrowing and add meaningful hook/replacement/relocation guard tests.
2. Finish DSP range collision checking; prove unchanged modules remain byte
   compatible. Protect stock helpers: DARK calls 35 words in SPRING+820;
   PLATE calls 93 words in DARK+974.
3. Reproduce packages with the pinned isolated toolchain. The old candidate's
   `octatrack-source` PR job is a template; current branch has not added it yet.
4. Verify shared native/browser output including Core Logger: Sidechain alone,
   every current companion in both orders, retained/compact stock choices,
   representative combinations and crowded selections. Establish real exclusions
   and overruns, not blanket refusals. MIDI Scenes already has a standalone
   replacement profile: investigate/classify that limitation accurately.
5. Investigate six kernel differences; run stress/bounds on actual common and
   valid mixed images. Reuse old evidence only where invariance is demonstrated.
6. Capture genuine current native LCD screens; update docs/tutorial, exact
   source/image/folder-bound qualification and hardware-only owner approval.
   Old `08a97ac` approval logic required all 14 companions refused: replace it.
7. Remove abandoned standalone recipe/compiler and stale claims while keeping
   useful source-only evidence. Run required checks.
8. Create/attach PR, complete authorized owner merge/release verification, verify
   deployment, then clean owned temporary files. **Do not release this WIP.**

## Transfer to another machine

In Modwerk, fetch/switch using the usual clean-checkout workflow:

    git fetch origin codex/sidechain-compressor-common-builder
    git switch --track origin/codex/sidechain-compressor-common-builder

Read this file, install lockfile dependencies and use the pinned isolated compiler.
Provide original firmware locally for private/native checks: firmware and dumps
are deliberately not committed.

Original machine only:

- Worktree: `/home/jannikassfalg/modwerk/.wrangler/sidechain-compressor`
- Owned private state: `/home/jannikassfalg/modwerk/.wrangler/sidechain-private`
- Shared checkout: `/home/jannikassfalg/modwerk`, branch `claude/forum-media`,
  contains other agents' dirty work. Do not modify it.
- This task's node_modules symlink points at shared dependencies.
- WSL intermittent internal errors and previous `/tmp` cleanup caused lost
  private files. Do not restart WSL or stop other agents' processes.

The private directory retains original firmware, isolated native/source/app
launchers, old dumps/logs, old source CI packages and the new native fixture.
It is not pushed. Preserve it if continuation might use the original machine.

Original MAIN SHA-256:
`164f31224bf61181e3f50e7dec40df9afcae5b16dbf6e4c0d0cc5e986af0a84e`
Original update:
`34695b606eb00e1b4dded5fd0c4b66f3a460522a632e47d7416dbd220599e1ad`

Minimal private native profile: `fallback="NONE"`,
`REMIX=sidechain-compressor XBUS=1 SPEC=1 DEV=0 BUILD=79
OCTABAM_STATIC_STOCK=1`, verified MAIN in `out/raw/section_3_MAIN_OS.bin`.
Use reviewed native code in isolation, with these chooser module keys:

    modules=(
        "FILTER", "EQUALIZER", "DJ EQ", "PHASER", "FLANGER",
        "CHORUS", "SPATIALIZER", "COMB FILTER", "SIDECHAIN_COMPRESSOR", "LO-FI",
        "DELAY", "PLATE REV", "DARK REV",
    )

Private task-only source recovery:
`C:/Users/jannik.aßfalg/.codex/visualizations/2026/10/05/01a10b73-cbf2-7302-89c4-717c3c3f7ca0/source-recovery.json`.

Cleanup of owned recovery/temp files and obsolete standalone code is unfinished:
the owner requested freezing immediately. No further implementation or
qualification work was performed after that request.
