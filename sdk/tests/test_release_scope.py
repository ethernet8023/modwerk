"""Release metadata and retained-package checks only; never execute module source."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from types import ModuleType
import unittest
from unittest.mock import patch

APP = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('octamod_release_compiler', APP / 'scripts/build-module-packages.py')
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)


class ReleaseScope(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((APP / 'sdk/catalog.json').read_text())
        self.documents = {
            module['id']: json.loads((APP / 'sdk/octabam/modules' / module['id'] / 'octamod.module.json').read_text())
            for module in self.catalog['modules']
        }
        self.baseline = json.loads((APP / 'src/engine/assets/requested-packages.json').read_text())

    def test_pending_midi_update_leaves_ten_eligible_modules_and_full_source_inventory(self):
        ids, versions = compiler.compilation_scope(self.catalog, self.documents)
        recorded = json.loads((APP / 'src/engine/assets/module-build.json').read_text())
        self.assertEqual(versions, recorded['moduleVersions'])
        self.assertEqual(len(ids), 10)
        self.assertNotIn('midi-scenes', ids)
        self.assertNotIn('midi-scenes', versions)
        self.assertIn('modules/midi-scenes/manifest.py', compiler.source_hashes(APP / 'sdk/octabam'))
        self.assertIn('usb-audio-out-tracks-main-cue', ids)

    def test_reproduced_baseline_is_pinned_to_the_current_compiler_and_source_inventory(self):
        recorded = json.loads((APP / 'src/engine/assets/module-build.json').read_text())
        self.assertEqual(recorded['compilerSha256'], compiler.HASH((APP / 'scripts/build-module-packages.py').read_bytes()))
        sources = compiler.source_hashes(APP / 'sdk/octabam')
        fingerprint = compiler.HASH(json.dumps(sources, sort_keys=True, separators=(',', ':')).encode())
        self.assertEqual(recorded['sourceTreeSha256'], fingerprint)

    def test_all_verified_and_all_pending_requested_profiles(self):
        for id in compiler.REQUESTED:
            self.documents[id].pop('build', None)
        ids, versions = compiler.compilation_scope(self.catalog, self.documents)
        self.assertEqual(ids, compiler.ORDER + compiler.REQUESTED)
        self.assertEqual(len(versions), 11)
        for id in compiler.REQUESTED:
            self.documents[id]['build'] = {'status': 'pending'}
        ids, versions = compiler.compilation_scope(self.catalog, self.documents)
        self.assertEqual(ids, compiler.ORDER)
        self.assertEqual(list(versions), compiler.ORDER)

    def test_development_opt_in_does_not_claim_pending_versions_are_verified(self):
        ids, versions = compiler.compilation_scope(self.catalog, self.documents, include_pending=True)
        self.assertIn('midi-scenes', ids)
        self.assertNotIn('midi-scenes', versions)

    def test_stale_versions_unsupported_scope_and_unverified_original_profile_fail_closed(self):
        self.documents['midi-scenes']['version'] = '0.1.1-experimental'
        with self.assertRaisesRegex(ValueError, 'Stale catalog'):
            compiler.compilation_scope(self.catalog, self.documents)
        self.setUp()
        for extra in [{'id': 'unreviewed-module'}, self.catalog['modules'][0]]:
            catalog = {**self.catalog, 'modules': self.catalog['modules'] + [extra]}
            with self.assertRaisesRegex(ValueError, 'supports the seven original'):
                compiler.compilation_scope(catalog, self.documents)
        self.documents['miniverb']['build'] = {'status': 'pending'}
        with self.assertRaisesRegex(ValueError, 'original seven-module'):
            compiler.compilation_scope(self.catalog, self.documents)

    def test_preserves_pending_package_bytes_versions_sources_and_order_without_rebuilding_them(self):
        ids, _ = compiler.compilation_scope(self.catalog, self.documents)
        rebuilt_ids = set(ids) | {'usb-midi'}
        for field, key in [('objects', 'label'), ('groups', 'moduleId')]:
            baseline = self.baseline[field]
            rebuilt = [copy.deepcopy(row) for row in baseline if row['moduleId'] in rebuilt_ids]
            self.assertEqual(compiler.retain_pending_records(baseline, rebuilt, rebuilt_ids, key), baseline)
            pending = [row for row in baseline if row['moduleId'] == 'midi-scenes']
            self.assertTrue(pending)
            self.assertFalse(any(row['moduleId'] == 'midi-scenes' for row in rebuilt))
        self.assertEqual({row['version'] for row in self.baseline['objects'] if row['moduleId'] == 'midi-scenes'}, {'0.1.1-experimental'})

    def test_release_entrypoint_stages_only_eligible_modules_before_native_discovery(self):
        class ScopeChecked(Exception):
            pass
        registry, guards, schema, remix = [ModuleType(name) for name in ['registry', 'stock_guard', 'schema', 'remix']]
        remix.registry, remix.stock_guard, schema.Remix = registry, guards, object
        def check_discovery():
            staged = Path.cwd() / 'modules'
            self.assertEqual(sorted(path.name for path in staged.iterdir()), sorted(self.baseline['moduleVersions']))
            self.assertFalse((staged / 'midi-scenes').exists())
            self.assertIn('usb-midi', registry.PLATFORM_NAMES)
            # Windows cannot remove the compiler's temporary directory while it is the cwd.
            os.chdir(original_directory)
            raise ScopeChecked()
        registry.modules = check_discovery
        def git_only(arguments, cwd):
            self.assertEqual(arguments[0], 'git', 'No assembler or module source may execute in this test')
            return '0' * 40 if arguments[1] == 'rev-parse' else ''
        original_directory = Path.cwd()
        with tempfile.TemporaryDirectory(prefix='octamod-release-scope.') as temporary:
            root = Path(temporary)
            vendor = root / 'vendor'
            for rel in ['dsp56300/build/source/dsp_host/dsp_asm', 'dsp56300/build/source/disassemble/dsp56kDisassemble']:
                path = vendor / rel
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('Unused test toolchain placeholder')
            argv = ['compiler', '--vendor', str(vendor), '--output', str(root / 'output'), '--source-commit', '0' * 40]
            try:
                with patch.object(sys, 'argv', argv), patch.object(sys, 'path', list(sys.path)), patch.dict(os.environ), \
                     patch.dict(sys.modules, {'toolpath': ModuleType('toolpath'), 'remix': remix, 'remix.schema': schema}), \
                     patch.object(compiler, 'run', git_only):
                    with self.assertRaises(ScopeChecked):
                        compiler.main()
                self.assertFalse((root / 'output').exists())
            finally:
                os.chdir(original_directory)

    def test_changed_eligible_output_is_not_hidden_by_retaining_the_baseline(self):
        baseline = self.baseline['objects']
        rebuilt_ids = {'analog-bassdrum'}
        rebuilt = [copy.deepcopy(row) for row in baseline if row['moduleId'] in rebuilt_ids]
        rebuilt[0]['code'] = 'changed authored output'
        result = compiler.retain_pending_records(baseline, rebuilt, rebuilt_ids, 'label')
        self.assertNotEqual(result, baseline)
        self.assertEqual(result[0]['code'], 'changed authored output')
        with self.assertRaisesRegex(ValueError, 'Unexpected rebuilt'):
            compiler.retain_pending_records(baseline, [baseline[3]], rebuilt_ids, 'label')


if __name__ == '__main__':
    unittest.main()
