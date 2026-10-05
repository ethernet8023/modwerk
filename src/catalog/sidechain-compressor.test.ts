import { describe, expect, it } from 'vitest'
import composition from '../engine/assets/sidechain-composition-proofs.json'
import companions from '../engine/assets/sidechain-companion-proofs.json'
import { CATALOG_SOURCE } from './modules'
import { checkSelection } from './compatibility'
import { selectionConflicts } from './selection-conflicts'
import { defaultChoosers } from '../engine/choosers'

const key = (ids: readonly string[], keep: boolean) => [...ids].sort().join('+') + ':' + keep
const originalScope = ['spectrum', 'modulation', 'character', 'miniverb', 'tapeecho', 'euclid', 'repitch', 'tapehead', 'sidechain-compressor']
const companionScope = ['miniverb', 'analog-bassdrum', 'usb-audio-out-tracks-main-cue', 'quantizer', 'previewvol', 'cc-map', 'sidechain-compressor']
const companionIds = ['analog-bassdrum', 'usb-audio-out-tracks-main-cue', 'quantizer', 'previewvol', 'cc-map']
const suites = [
  { name: 'original eight modules', proofs: composition.proofs, expected: 512, built: 216 },
  { name: 'requested and utility modules', proofs: companions.proofs, expected: 124, built: 60 },
]
const refusalClass = /overruns the region|label formatters do not fit|wide dial hook|chooser list of|not free|past the stock zero run|stock effects only/

describe('Sidechain Compressor native evidence on the shared builder', () => {
  it('covers every selection that contains the module, with and without stock FX2, and holds no firmware bytes', () => {
    for (const [proofs, scope, companion, expected] of [[composition, originalScope, [] as string[], 512], [companions, companionScope, companionIds, 124]] as const) {
      expect(proofs.schema).toBe(1)
      expect(proofs.revision).toBe(CATALOG_SOURCE.revision)
      expect(proofs.staticStock).toBe(true)
      const actual = new Set(proofs.proofs.map(proof => key(proof.moduleIds, proof.keepStockFx2)))
      expect(proofs.proofs).toHaveLength(expected)
      expect(actual.size).toBe(expected)
      for (let mask = 0; mask < 2 ** scope.length; mask++) for (const keep of [true, false]) {
        const ids = scope.filter((_, bit) => mask >> bit & 1)
        expect(actual.has(key(ids, keep))).toBe(ids.includes('sidechain-compressor') && (!companion.length || companion.some(id => ids.includes(id))))
      }
      for (const proof of proofs.proofs) {
        expect(proof).not.toHaveProperty('code'); expect(proof).not.toHaveProperty('image')
        if ('error' in proof) continue
        for (const field of ['sha256', 'osSha256', 'maskedOsSha256', 'appendSha256'] as const) expect(proof[field]).toMatch(/^[a-f0-9]{64}$/)
        // Native has no logger, so without a runtime its image is the OS and nothing else, and no platform write exists to mask.
        if (proof.bytes === 1112560) { expect(proof.osSha256).toBe(proof.sha256); expect(proof.maskedOsSha256).toBe(proof.sha256) }
      }
    }
  })
  it('builds the same menus as the native profiles for every selection', () => {
    for (const { proofs } of suites) for (const proof of proofs) {
      expect(defaultChoosers(proof.moduleIds, proof.keepStockFx2), key(proof.moduleIds, proof.keepStockFx2)).toEqual({ fx1: proof.menu.fx1, fx2: proof.menu.fx2 })
    }
  })
  it('records which selections native builds and why it refuses the others', () => {
    for (const { name, proofs, expected, built } of suites) {
      expect(proofs.filter(proof => !('error' in proof)), name).toHaveLength(built)
      expect(proofs.filter(proof => 'error' in proof), name).toHaveLength(expected - built)
      for (const proof of proofs) if ('error' in proof) expect(proof.error).toMatch(refusalClass)
    }
    // Sidechain Compressor beside any one other original module builds in both menu modes.
    for (const other of ['spectrum', 'modulation', 'character', 'miniverb', 'tapeecho', 'euclid', 'repitch', 'tapehead']) for (const keep of [true, false]) {
      const proof = composition.proofs.find(proof => key(proof.moduleIds, proof.keepStockFx2) === key(['sidechain-compressor', other], keep))
      expect(proof, other + ' ' + keep).toBeDefined(); expect(proof).not.toHaveProperty('error')
    }
  })
  it('pins the native image of the module alone, both menu modes', () => {
    const alone = (keep: boolean) => composition.proofs.find(proof => key(proof.moduleIds, proof.keepStockFx2) === key(['sidechain-compressor'], keep))!
    expect(alone(true)).toMatchObject({ bytes: 1112560, sha256: '4fd5fcb49ed17cd4e707d407a6e42a64ec30b50aefaad3b1eeb1bb804493aef0' })
    expect(alone(false)).toMatchObject({ bytes: 1112560, sha256: 'a50b99cf373cca589f97e94d1ac8e6c9c777c5aa9a17777edbbba722d9dbcf4c' })
  })
  it('refuses Analog BD beside it, in the site and in native alike', () => {
    for (const proof of companions.proofs) {
      if (!proof.moduleIds.includes('analog-bassdrum')) continue
      expect(proof).toHaveProperty('error'); expect((proof as { error: string }).error).toMatch(/stock effects only/)
      expect(selectionConflicts(proof.moduleIds, proof.keepStockFx2).map(conflict => conflict.id)).toContain('analog-bd-custom-dsp')
    }
    expect(selectionConflicts(['sidechain-compressor', 'analog-bassdrum']).find(conflict => conflict.id === 'analog-bd-custom-dsp')?.moduleIds).toEqual(['analog-bassdrum', 'sidechain-compressor'])
    // It keeps stock COMPRESSOR and needs no stock FX2 space, so keeping stock FX2 is not a conflict for it alone.
    expect(selectionConflicts(['sidechain-compressor'], true)).toEqual([])
  })
  it('keeps MIDI Scenes standalone and records a declaration check for every other selection', () => {
    expect(checkSelection(['sidechain-compressor', 'midi-scenes']).issues.join(' ')).toContain('standalone')
    const others = ['miniverb', 'tapeecho', 'euclid', 'repitch', 'tapehead', 'analog-bassdrum', 'usb-audio-out-tracks-main-cue', 'quantizer', 'previewvol', 'cc-map']
    for (let mask = 0; mask < 2 ** others.length; mask++) {
      const result = checkSelection([...others.filter((_, bit) => mask >> bit & 1), 'sidechain-compressor'])
      expect(result.notes).toEqual([])
    }
  })
})
