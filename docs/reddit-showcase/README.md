# Modwerk Reddit gallery

Four real Three.js scenes for a Modwerk launch post on r/elektron. The original screenshots remain in `assets/`; 2400 × 1800 PNG and JPEG deliverables are in `exports/`. `exports/contact-sheet.png` previews the set. These are standalone marketing assets, outside the site's production bundle.

| Order | Feature | Headline |
| --- | --- | --- |
| 01 | Overview | A home for (all) Elektron mods |
| 02 | Community forum | Talk mods. Share discoveries. |
| 03 | Clear module documentation | Every mod, explained. |
| 04 | Standardized SDK, supported devices and contribution invitation | One shared SDK |

## Preview and export

Use Node.js 24. From this directory:

```sh
npm ci
npm start
```

Open <http://127.0.0.1:4176/>. Choose a scene, adjust the screen angle, and export PNG or JPEG. The default angle is 35. Exports use a fixed 2400 × 1800 renderer rather than enlarging a screenshot of the viewer. All fonts and source captures are local. Native buttons and the range control support keyboard input; the gallery wraps on narrow screens.

Save the four PNGs into `exports/` using their existing names, then run `npm run pack` to validate capture dimensions and reject blank captures, make JPEG companions and a contact sheet, and refresh SHA-256 provenance in `manifest.json`. `npm run check` checks the standalone scripts. The root repository's `npm run check` validates the normal application.

## Capture provenance

The site captures come from an isolated local copy of `modwerk/elemod-engine` at `503c7db2fb73624d5ab936391ad3057d23e8c312`. They show the launch branch, rather than the older deployed Octamod site. The exact new mark is from `claude/elektron-thumbnail-redesign-btzzfu` at `33e224c6326f4ce0fd955f83ce7ad1cfbb0bd9e8`. For the local capture only, the sidebar used that mark and the original author's `repeat98` handle with its existing source link. Module metadata and versions were not edited.

Screens are actual 1280 × 720 browser JPEGs mapped onto Three.js meshes with shallow perspective, extruded frames, lighting and original editorial text. The SDK screen is an explicitly identified rendered excerpt of `docs/SDK.md`, with the exact full source alongside it. The forum uses an isolated, empty local database; no people, discussions or activity were invented.

The combined SDK/device slide presents the owner's requested **launch** lineup: Octatrack, Digitakt and Digitone under **Builds available**. Digitakt II and Digitone II show research started; the remaining profiles invite platform and module contributions through the shared standard. The captured registry is retained unchanged in `assets/device-status.json`, including its prelaunch status values. This gallery does not change the application, browser engine, verification requirements or download gates.

The module-documentation slide uses the real Tape Echo page as an example of the shared format, rather than promoting that particular effect. Its LCD images are the existing original emulator captures, with captions and rights attribution retained. The module page and controls show source credit and resource estimates; none of those estimates were turned into measured hardware claims.

Only visible UI was captured: firmware contents, raw dumps, private logs and configuration storage are absent from this pack. No firmware was exported or added to source control, and no firmware, DSP or hardware test suite was run for these scenes.

See [CREDITS.md](CREDITS.md) for assets and rights, and [manifest.json](manifest.json) for hashes, source commits and publication intent. Keep the credits with the gallery when preparing the post. Publishing these assets or posting to Reddit is a separate owner action.
