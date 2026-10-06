// SPDX-License-Identifier: GPL-3.0-or-later
// Updates the vendored elekloader kit, its catalog, or both (vendor/elekloader/README.md, "Updating"):
//
//   npm run elekloader:update -- [elekloader-kit-<version>.zip [--sha256 <the release's>]] [elekloader-catalog.json]
//
// - The kit: every file in the zip checked against its kit.json, and the files Modwerk vendors put in place of kit/.
//   A kit of another protocol is refused: src/engine/elekloader/digi-build.ts is written for KIT_PROTOCOL.
// - The catalog: its Digitakt and Digitone entries, each file downloaded from its author's release by the kit's own
//   sync and checked against its pin. Files it no longer names are removed.
// Then the lock, the elekloader licence entry and the notices, and the vendor check. It prints what changed and what
// is left to do by hand. Both new copies are staged in a temporary folder first, so a refusal or a failed download
// leaves vendor/elekloader as it was.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { members, read } from '../vendor/elekloader/kit/src/zip.ts'

/** The kit protocol src/engine/elekloader/digi-build.ts is written for. */
export const KIT_PROTOCOL = 1
/** The devices Modwerk builds for: digi-build.ts's DEVICE, the machine folders under sdk/. */
export const DEVICES: Record<string, string> = { 'digitakt-mk1': 'digitakt', 'digitone-mk1': 'digitone' }
/** The kit files Modwerk vendors; the zip's dist/, tools/build.ts and examples/ are for sites without a bundler. */
const VENDORED = (name: string) => name.startsWith('src/') || ['tools/kit.ts', 'LICENSE', 'NOTICE', 'README.md', 'kit.json'].includes(name)

export type KitJson = { name: string; version: string; protocol: number; commit: string; files: Record<string, string> }
type Pin = { file: string; sha256: string; id: string; version: string; device: string; os: string }
type CatalogFile = { revision: string; cores: Pin[]; mods: Pin[] }

const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')

/** The files of a kit zip that Modwerk vendors, once every file in it is the one its kit.json names. */
export async function readKitZip(raw: Uint8Array): Promise<{ kit: KitJson; files: Map<string, Uint8Array> }> {
  const list = members(raw), tops = new Set(list.map(m => m.filename.split('/')[0]))
  if (tops.size !== 1) throw new Error('This is not a kit zip: its files are not in one elekloader-kit-<version>/ folder.')
  const [top] = tops, all = new Map<string, Uint8Array>()
  for (const m of list) {
    if (m.filename.endsWith('/')) continue
    const name = m.filename.slice(top.length + 1)
    if (!name || name.split('/').some(part => !part || part === '.' || part === '..' || part.includes('\\'))) throw new Error('The kit zip names a file outside its folder: ' + m.filename)
    all.set(name, await read(raw, m))
  }
  const json = all.get('kit.json')
  if (!json) throw new Error('This is not a kit zip: it has no kit.json.')
  const kit = JSON.parse(new TextDecoder().decode(json)) as KitJson
  if (kit.name !== 'elekloader-kit' || typeof kit.version !== 'string' || !/^[0-9a-f]{40}$/.test(String(kit.commit)) || !kit.files || typeof kit.files !== 'object')
    throw new Error('kit.json is not an elekloader kit\'s.')
  if (top !== 'elekloader-kit-' + kit.version) throw new Error(`The zip's folder is ${top}, not elekloader-kit-${kit.version} as its kit.json says.`)
  if (kit.protocol !== KIT_PROTOCOL)
    throw new Error(`This kit speaks protocol ${kit.protocol}. src/engine/elekloader/digi-build.ts is written for protocol ${KIT_PROTOCOL}: update it and KIT_PROTOCOL first.`)
  const bad: string[] = []
  for (const [name, hash] of Object.entries(kit.files)) {
    const data = all.get(name)
    if (!data) bad.push('missing: ' + name)
    else if (sha(data) !== hash) bad.push('not the file kit.json names: ' + name)
  }
  for (const name of all.keys()) if (name !== 'kit.json' && !(name in kit.files)) bad.push('not in kit.json: ' + name)
  if (bad.length) throw new Error('The kit zip does not match its kit.json:\n  ' + bad.join('\n  '))
  return { kit, files: new Map([...all].filter(([name]) => VENDORED(name))) }
}

export type Change = { key: string; id: string; device: string; os: string; from?: Pin; to?: Pin }

/** What changed between two catalogs, by mod (or core), device and OS. */
export function catalogChanges(before: CatalogFile, after: CatalogFile): Change[] {
  const index = (c: CatalogFile) => new Map([...c.cores, ...c.mods].map(p => [`${p.id} ${p.device} ${p.os}`, p]))
  const a = index(before), b = index(after), out: Change[] = []
  for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const from = a.get(key), to = b.get(key)
    if (from?.sha256 === to?.sha256 && from?.file === to?.file) continue
    const pin = (to ?? from)!
    out.push({ key, id: pin.id, device: pin.device, os: pin.os, from, to })
  }
  return out
}

/** What is left to do by hand after a catalog change: Modwerk's own module files, and licence entries naming a
 * catalog file that is gone. `root` is the repository. */
export function followUps(root: string, changes: readonly Change[], manifest: { components: { id: string; usedIn?: string[] }[] }) {
  const out: string[] = []
  for (const id of [...new Set(changes.filter(c => c.id !== 'core').map(c => `${DEVICES[c.device]}/${c.id}`))].sort()) {
    const [machine, mod] = id.split('/'), folder = `sdk/${machine}/modules/${mod}`
    const mine = changes.filter(c => c.id === mod && DEVICES[c.device] === machine), gone = mine.filter(c => !c.to).map(c => 'OS ' + c.os)
    if (!existsSync(resolve(root, folder))) { if (gone.length < mine.length) out.push(`${id} is in the catalog but not in Modwerk's library: add ${folder}/ to offer it, or leave it out of the catalog.`) }
    else if (gone.length === mine.length) out.push(`${folder}/modwerk.module.json: ${mod} left the catalog for ${gone.join(', ')}. Remove those releases, or the module, then run npm run modules:generate.`)
    else out.push(`${folder}/modwerk.module.json: bring its version, releases and memory in line with the catalog, then run npm run modules:generate.`)
  }
  for (const component of manifest.components)
    for (const path of component.usedIn ?? [])
      if (path.startsWith('vendor/elekloader/catalog/') && !existsSync(resolve(root, path))) out.push(`vendor/licenses/manifest.json: "${component.id}" names ${path}, which is gone.`)
  return out
}

function run(args: string[], options: { capture?: boolean; cwd: string }) {
  const result = spawnSync(process.execPath, args, { cwd: options.cwd, encoding: 'utf8', stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' })
  if (result.status !== 0) throw new Error(`node ${args.join(' ')} failed`)
  return result.stdout ?? ''
}

const listFiles = (dir: string, at = ''): string[] => readdirSync(join(dir, at), { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? listFiles(dir, at + entry.name + '/') : [at + entry.name])

/** Makes `target` hold exactly the files of `next`, a complete staged copy. File by file, not by renaming folders:
 * on Windows a running dev server's watcher keeps them open. */
function mirror(next: string, target: string) {
  const want = new Set(listFiles(next))
  for (const name of listFiles(target)) if (!want.has(name)) rmSync(join(target, name))
  for (const name of want) {
    const data = readFileSync(join(next, name)), to = join(target, name)
    if (existsSync(to) && readFileSync(to).equals(data)) continue
    mkdirSync(dirname(to), { recursive: true })
    writeFileSync(to, data)
  }
  const prune = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) if (entry.isDirectory()) prune(join(at, entry.name))
    if (at !== target && !readdirSync(at).length) try { rmdirSync(at) } catch { /* an empty folder holds no file the lock sees */ }
  }
  prune(target)
}

async function main(root: string, argv: string[]) {
  const usage = 'Usage: npm run elekloader:update -- [elekloader-kit-<version>.zip [--sha256 <hex>]] [elekloader-catalog.json]'
  const paths: string[] = []
  let expected: string | undefined
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--sha256') expected = argv[++i]
    else if (argv[i].startsWith('--')) throw new Error(usage)
    else paths.push(argv[i])
  }
  const zip = paths.find(p => p.toLowerCase().endsWith('.zip')), from = paths.find(p => p.toLowerCase().endsWith('.json'))
  if (!paths.length || paths.length !== [zip, from].filter(Boolean).length || expected !== undefined && (!zip || !/^[0-9a-fA-F]{64}$/.test(expected))) throw new Error(usage)
  const vendor = resolve(root, 'vendor/elekloader'), kitDir = join(vendor, 'kit'), catalogDir = join(vendor, 'catalog')
  const scratch = mkdtempSync(join(tmpdir(), 'modwerk-elekloader-')), notes: string[] = []
  const kitNext = join(scratch, 'kit'), catalogNext = join(scratch, 'catalog')
  try {
    const before = JSON.parse(readFileSync(join(kitDir, 'kit.json'), 'utf8')) as KitJson
    let after = before, changedKit: string[] = [], kitCount = 0
    if (zip) {
      const raw = new Uint8Array(readFileSync(resolve(zip)))
      if (expected && sha(raw) !== expected.toLowerCase()) throw new Error(`${zip} has sha256 ${sha(raw)}, not the ${expected} given.`)
      if (!expected) notes.push(`The zip's sha256 is ${sha(raw)}: compare it with the release's SHA256SUMS.txt, or pass --sha256.`)
      const { kit, files } = await readKitZip(raw)
      for (const [name, data] of files) { mkdirSync(dirname(join(kitNext, name)), { recursive: true }); writeFileSync(join(kitNext, name), data) }
      changedKit = [...files.keys()].filter(name => !existsSync(join(kitDir, name)) || sha(readFileSync(join(kitDir, name))) !== sha(files.get(name)!))
      after = kit; kitCount = files.size
    }
    const oldCatalog = JSON.parse(readFileSync(join(catalogDir, 'catalog.json'), 'utf8')) as CatalogFile
    let newCatalog = oldCatalog
    if (from) {
      // the kit's own sync, the new kit's if there is one, into a copy of the current folder: files already there
      // with the pinned sha256 are not downloaded again
      cpSync(catalogDir, catalogNext, { recursive: true })
      const tool = join(zip ? kitNext : kitDir, 'tools/kit.ts')
      run([tool, 'sync', resolve(from), catalogNext, ...Object.keys(DEVICES).flatMap(key => ['--device', key])], { cwd: root })
      newCatalog = JSON.parse(readFileSync(join(catalogNext, 'catalog.json'), 'utf8')) as CatalogFile
      const named = new Set([...newCatalog.cores, ...newCatalog.mods].map(p => p.file))
      for (const name of readdirSync(catalogNext)) if (name !== 'catalog.json' && !named.has(name)) rmSync(join(catalogNext, name))
    }
    if (zip) mirror(kitNext, kitDir)
    if (from) mirror(catalogNext, catalogDir)
    if (zip) console.log(`Kit: ${before.version} (${before.commit.slice(0, 7)}) -> ${after.version} (${after.commit.slice(0, 7)}), ${changedKit.length} of ${kitCount} files changed${changedKit.length ? ': ' + changedKit.join(', ') : ''}.`)
    const changes = catalogChanges(oldCatalog, newCatalog)
    if (from) {
      console.log(`Catalog: ${oldCatalog.revision.slice(0, 7)} -> ${newCatalog.revision.slice(0, 7)}, ${newCatalog.cores.length} cores and ${newCatalog.mods.length} mods${changes.length ? ':' : ', no file changed.'}`)
      for (const c of changes) console.log(`  ${c.id} for ${c.device} OS ${c.os}: ${c.from ? c.from.version + ' (' + c.from.file + ')' : 'new'} -> ${c.to ? c.to.version + ' (' + c.to.file + ')' : 'removed'}`)
      if (newCatalog.revision !== oldCatalog.revision) notes.push('Configuration backups made before this name the old catalog revision. They still import, with their modules checked again against the library.')
    }
    writeFileSync(join(vendor, 'elekloader.lock.json'), run([join(kitDir, 'tools/kit.ts'), 'lock', '--kit', kitDir, '--catalog', catalogDir], { capture: true, cwd: root }))
    const manifestPath = resolve(root, 'vendor/licenses/manifest.json')
    if (after.commit !== before.commit) {
      const text = readFileSync(manifestPath, 'utf8')
      if (text.includes(before.commit)) writeFileSync(manifestPath, text.split(before.commit).join(after.commit))
      else notes.push(`vendor/licenses/manifest.json does not name the previous kit commit ${before.commit}: point its elekloader entry at ${after.commit} by hand.`)
    }
    run(['scripts/licenses.mjs', '--write'], { cwd: root })
    run(['scripts/elekloader-vendor.ts'], { cwd: root })
    const todo = [...followUps(root, changes, JSON.parse(readFileSync(manifestPath, 'utf8'))),
      'Run npm run check, then record the update in docs/VERIFICATION.md (vendor/elekloader/README.md, "Updating").']
    for (const note of notes) console.log('Note: ' + note)
    console.log('Left to do:\n' + todo.map(item => '  - ' + item).join('\n'))
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { await main(resolve(dirname(fileURLToPath(import.meta.url)), '..'), process.argv.slice(2)) }
  catch (error) { console.error((error as Error).message); process.exitCode = 1 }
}
