# Vendored elekloader kit

Modwerk builds Digitakt mk1 and Digitone mk1/Keys firmware with [elekloader](https://github.com/irpina/elekloader)'s kit, by irpina, under GPL-3.0-or-later. The kit is elekloader's builder packaged for any website: its TypeScript engine, a builder worker, a client for the page, and a catalog format ([decisions](../../docs/DECISIONS.md); the kit's own guide is `kit/README.md`). Modwerk's own builder is frozen and resumes later.

| Path | What | From |
| --- | --- | --- |
| `kit/` | the kit, unchanged: `src/` (the engine and `src/kit/`), `tools/kit.ts`, `LICENSE` (GPL-3.0-or-later), `NOTICE`, `README.md` and `kit.json` | `elekloader-kit-<version>.zip`, the commit in `kit.json` |
| `catalog/` | `catalog.json` and the files it pins: the four device cores, and DIGISLICER, NEIGHBOR, SOPHIE and digihealth | cores from elekloader release v0.4.0, mods from each author's GitHub release |
| `elekloader.lock.json` | the lock: every kit file and the catalog by SHA-256 | written by `kit/tools/kit.ts lock` |

`npm run elekloader:check` (part of `npm run check`) checks everything against the lock, as the kit's own `verify --lock` does. It refuses any changed, missing or extra file in `kit/` or `catalog/`. The site serves `catalog/` under `elekloader/`.

The catalog's `revision` names its set of cores and mods: the elekloader commit whose catalog pinned them, still `e4d8ba8`. Configuration backups record it, so it changes only when the cores or mods do, not with the kit.

`src/engine/elekloader/digi-build.ts` is Modwerk's side:
- it starts the kit's worker (`kit/src/kit/worker.ts`, bundled by Vite) through the kit's client;
- it maps Modwerk's machine ids to the kit's device keys;
- it uses the kit's `prepare`, build steps and build log.

The worker checks each file against its pin and refuses requests to other sites. The owner's stock file never leaves the browser.

The `.elemod` files carry each author's own bytes. Stock instructions are referenced by address, length and hash and copied from the owner's file during the build. They contain no Elektron firmware.

## Updating

Update by pull request, owner reviewed:

1. **The kit:** take `elekloader-kit-<version>.zip` from an elekloader release and check it against the release's sha256. Replace `kit/` with its `src/`, `tools/kit.ts`, `LICENSE`, `NOTICE`, `README.md` and `kit.json`.
2. **New cores or mods:**
   - take them from elekloader's catalog (`elekloader-catalog.json` in the release), or add entries pinned to their authors' releases;
   - copy them with `node vendor/elekloader/kit/tools/kit.ts sync <catalog.json> vendor/elekloader/catalog --device digitakt-mk1 --device digitone-mk1`;
   - give the catalog a new `revision`.
3. **The lock:** run `node vendor/elekloader/kit/tools/kit.ts lock --kit vendor/elekloader/kit --catalog vendor/elekloader/catalog > vendor/elekloader/elekloader.lock.json`. Update the elekloader entry in `vendor/licenses/manifest.json`, and run `npm run licenses:generate`.
4. **Check and record:** run `npm run check`. Build every module subset locally against the previous builder or elekloader's command line, and record the result in `docs/VERIFICATION.md`.
