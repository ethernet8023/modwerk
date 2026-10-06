import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEVICE } from '../engine/elekloader/digi-build'
import { DEVICES, KIT_PROTOCOL, catalogChanges, followUps, readKitZip, type KitJson } from '../../scripts/elekloader-update.ts'
import { PROTOCOL } from '../../vendor/elekloader/kit/src/kit/protocol.ts'

const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')
const text = (value: string) => new TextEncoder().encode(value)

function crc32(data: Uint8Array) {
  let c = 0xffffffff
  for (const byte of data) { c ^= byte; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1 }
  return (c ^ 0xffffffff) >>> 0
}

/** A stored zip, as packaging/build_kit.py writes the kit. */
function zip(files: Record<string, Uint8Array>) {
  const parts: Uint8Array[] = [], central: Uint8Array[] = []
  let offset = 0
  for (const [name, data] of Object.entries(files)) {
    const n = text(name), crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true); local.setUint32(22, data.length, true); local.setUint16(26, n.length, true)
    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true); entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true); entry.setUint32(24, data.length, true); entry.setUint16(28, n.length, true); entry.setUint32(42, offset, true)
    parts.push(new Uint8Array(local.buffer), n, data); central.push(new Uint8Array(entry.buffer), n)
    offset += 30 + n.length + data.length
  }
  const size = central.reduce((sum, part) => sum + part.length, 0), end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, central.length / 2, true); end.setUint16(10, central.length / 2, true)
  end.setUint32(12, size, true); end.setUint32(16, offset, true)
  return new Uint8Array(Buffer.concat([...parts, ...central, new Uint8Array(end.buffer)]))
}

function kitZip(change: (kit: KitJson, files: Record<string, Uint8Array>) => void = () => {}, top = 'elekloader-kit-0.5.0') {
  const files: Record<string, Uint8Array> = {
    'LICENSE': text('GPL'), 'NOTICE': text('elekloader'), 'README.md': text('# kit'), 'src/kit/protocol.ts': text('export const PROTOCOL = 1'),
    'tools/kit.ts': text('// tools'), 'tools/build.ts': text('// build'), 'dist/kit/worker.js': text('// worker'), 'examples/minimal/index.html': text('<!doctype html>'),
  }
  const kit: KitJson = { name: 'elekloader-kit', version: '0.5.0', protocol: 1, commit: 'a'.repeat(40), files: Object.fromEntries(Object.entries(files).map(([name, data]) => [name, sha(data)])) }
  change(kit, files)
  return zip(Object.fromEntries([...Object.entries({ ...files, 'kit.json': text(JSON.stringify(kit)) })].map(([name, data]) => [top + '/' + name, data])))
}

describe('the elekloader update', () => {
  it('is written for the vendored kit\'s protocol and Modwerk\'s devices', () => {
    expect(KIT_PROTOCOL).toBe(PROTOCOL)
    expect(Object.keys(DEVICES).sort()).toEqual(Object.values(DEVICE).sort())
    for (const [key, machine] of Object.entries(DEVICES)) expect(DEVICE[machine as keyof typeof DEVICE]).toBe(key)
  })
  it('takes the kit files Modwerk vendors from a zip that matches its kit.json', async () => {
    const { kit, files } = await readKitZip(kitZip())
    expect(kit.version).toBe('0.5.0')
    expect([...files.keys()].sort()).toEqual(['LICENSE', 'NOTICE', 'README.md', 'kit.json', 'src/kit/protocol.ts', 'tools/kit.ts'])
  })
  it('refuses a changed, missing or extra file, another protocol, and a zip that is not a kit', async () => {
    await expect(readKitZip(kitZip((_, files) => { files['NOTICE'] = text('changed') }))).rejects.toThrow('not the file kit.json names: NOTICE')
    await expect(readKitZip(kitZip((_, files) => { delete files['NOTICE'] }))).rejects.toThrow('missing: NOTICE')
    await expect(readKitZip(kitZip((_, files) => { files['src/extra.ts'] = text('') }))).rejects.toThrow('not in kit.json: src/extra.ts')
    await expect(readKitZip(kitZip(kit => { kit.protocol = 2 }))).rejects.toThrow('protocol 2')
    await expect(readKitZip(kitZip(() => {}, 'elekloader-kit-0.4.0'))).rejects.toThrow('not elekloader-kit-0.5.0')
    await expect(readKitZip(zip({ 'a/kit.json': text('{}'), 'b/x': text('') }))).rejects.toThrow('one elekloader-kit-<version>/ folder')
    await expect(readKitZip(zip({ 'elekloader-kit-0.5.0/../kit.json': text('{}') }))).rejects.toThrow('outside its folder')
  })
  it('lists what changed between two catalogs and what is left to do by hand', () => {
    const pin = (id: string, version: string, os = '1.53', device = 'digitakt-mk1') => ({ file: `${id}-${version}.elemod`, sha256: sha(text(id + version)), id, version, device, os })
    const before = { revision: 'a', cores: [pin('core', '2.1')], mods: [pin('digislicer', '2.1'), pin('digisophie', '1.1.13')] }
    const after = { revision: 'b', cores: [pin('core', '2.1')], mods: [pin('digislicer', '2.2'), pin('digifresh', '0.1', '1.43', 'digitone-mk1')] }
    const changes = catalogChanges(before, after)
    expect(changes.map(c => [c.id, c.from?.version ?? null, c.to?.version ?? null])).toEqual([['digifresh', null, '0.1'], ['digislicer', '2.1', '2.2'], ['digisophie', '1.1.13', null]])
    const manifest = { components: [{ id: 'digisophie', usedIn: ['vendor/elekloader/catalog/digisophie-1.1.12.elemod'] }, { id: 'digi-mods', usedIn: ['vendor/elekloader/catalog'] }] }
    expect(followUps(fileURLToPath(new URL('../..', import.meta.url)), changes, manifest)).toEqual([
      'sdk/digitakt/modules/digislicer/modwerk.module.json: bring its version, releases and memory in line with the catalog, then run npm run modules:generate.',
      'sdk/digitakt/modules/digisophie/modwerk.module.json: digisophie left the catalog for OS 1.53. Remove those releases, or the module, then run npm run modules:generate.',
      "digitone/digifresh is in the catalog but not in Modwerk's library: add sdk/digitone/modules/digifresh/ to offer it, or leave it out of the catalog.",
      'vendor/licenses/manifest.json: "digisophie" names vendor/elekloader/catalog/digisophie-1.1.12.elemod, which is gone.',
    ])
  })
})
