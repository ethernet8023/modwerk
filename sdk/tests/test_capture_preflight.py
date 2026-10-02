"""Synthetic capture-startup regressions; no firmware, DSP or emulator tests."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

APP = Path(__file__).resolve().parents[2]
SCRIPT = APP / 'scripts/capture-module-ui.py'
spec = importlib.util.spec_from_file_location('synthetic_card', APP / 'sdk/octabam/tools/emu/emu_card.py')
card_codec = importlib.util.module_from_spec(spec)
spec.loader.exec_module(card_codec)


@unittest.skipIf(os.name == 'nt', 'Synthetic protocol subprocess uses a POSIX executable script')
class CapturePreflight(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='octamod-capture-test.')
        self.root = Path(self.temporary.name)
        self.image = self.root / 'synthetic-input'
        self.image.write_bytes(b'Original synthetic fixture, never firmware')
        self.plan = self.root / 'plan.json'
        self.plan.write_text(json.dumps([{'capture': 'page.png'}]))
        self.tree = self.root / 'card-tree'
        (self.tree / 'TEST/PROJECT').mkdir(parents=True)
        for name in ['project.work', 'bank01.work']:
            (self.tree / 'TEST/PROJECT' / name).write_bytes(b'Original synthetic project fixture')
        self.card = self.root / 'card.img'
        self.card.write_bytes(card_codec.build_image(str(self.tree), 32))
        self.output = self.root / 'output'
        self.emulator = self.root / 'synthetic-protocol'

    def tearDown(self):
        self.temporary.cleanup()

    def run_capture(self, mode='date'):
        self.emulator.write_text(f'''#!{sys.executable}
from pathlib import Path
import sys
Path({str(self.root / 'launched')!r}).touch()
assert '--mount' in sys.argv
assert sys.argv[sys.argv.index('--set')+1]=='TEST'
assert sys.argv[sys.argv.index('--project')+1]=='PROJECT'
Path(sys.argv[sys.argv.index('--card')+1]).write_bytes(b'Synthetic emulator card write')
plane=Path(sys.argv[sys.argv.index('--lcd')+1])
data=bytearray(1024+5*56+0x2800)
data[1024+32:1024+36]=(0x20).to_bytes(4,'big')
plane.write_bytes(data)
if {mode!r} != 'failed-bank': print('saved_bank: 0, final bank: 0', flush=True)
if {mode!r} != 'failed-load': print('load run ended: LOAD PROJECT handled', flush=True)
print('ready sample=0 frames=0', flush=True)
no_pressed=False
for line in sys.stdin:
    if line.strip()=='quit': print('ok quit',flush=True);break
    if {mode!r}=='failed-command' and line.startswith('knob '): print('err refused',flush=True);break
    if line.startswith('key 38 4'): no_pressed=True
    if no_pressed and {mode!r} != 'stuck-dialog':
        data[1024+32:1024+36]=bytes(4);plane.write_bytes(data)
    print('ok stop=time',flush=True)
''')
        self.emulator.chmod(0o755)
        return subprocess.run([sys.executable, '-B', str(SCRIPT), '--emulator', str(self.emulator),
                               '--image', str(self.image), '--image-sha256', hashlib.sha256(self.image.read_bytes()).hexdigest(),
                               '--plan', str(self.plan), '--card', str(self.card), '--set', 'TEST',
                               '--project', 'PROJECT', '--output', str(self.output)],
                              capture_output=True, text=True, timeout=10)

    def test_missing_set_project_is_rejected_before_launch(self):
        (self.tree / 'TEST/PROJECT/project.work').unlink()
        self.card.write_bytes(card_codec.build_image(str(self.tree), 32))
        result = self.run_capture()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('stage a valid fixture', result.stderr)
        self.assertFalse((self.root / 'launched').exists())
        self.assertFalse(self.output.exists())

    def test_date_prompt_is_cleared_before_any_export(self):
        card_hash = hashlib.sha256(self.card.read_bytes()).hexdigest()
        result = self.run_capture()
        self.assertEqual(result.returncode, 0, result.stderr)
        record = json.loads((self.output / 'capture.json').read_text())
        self.assertEqual(record['preflight'], {'loadHandled': True, 'bankParsed': True, 'startupDialogsCleared': True})
        self.assertEqual(record['lcdStyle'], 'black-and-white')
        self.assertEqual(record['fixture'], {'set': 'TEST', 'project': 'PROJECT', 'cardSha256': card_hash})
        self.assertEqual(hashlib.sha256(self.card.read_bytes()).hexdigest(), card_hash)
        self.assertTrue((self.output / 'page.png').exists())

    def test_duplicate_slots_are_rejected_before_launch(self):
        block = b'[SAMPLE]\r\nTYPE=STATIC\r\nSLOT=001\r\nPATH=\r\n[/SAMPLE]\r\n'
        (self.tree / 'TEST/PROJECT/project.work').write_bytes(block * 2)
        self.card.write_bytes(card_codec.build_image(str(self.tree), 32))
        result = self.run_capture()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('duplicate sample slots', result.stderr)
        self.assertFalse((self.root / 'launched').exists())
        self.assertFalse(self.output.exists())

    def test_missing_audio_is_rejected_and_staged_relative_audio_is_accepted(self):
        (self.tree / 'TEST/PROJECT/project.work').write_bytes(b'[SAMPLE]\r\nTYPE=FLEX\r\nSLOT=001\r\nPATH=../AUDIO/TONE.wav\r\n[/SAMPLE]\r\n')
        self.card.write_bytes(card_codec.build_image(str(self.tree), 32))
        result = self.run_capture()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('stage its audio', result.stderr)
        self.assertFalse((self.root / 'launched').exists())
        self.assertFalse(self.output.exists())
        (self.tree / 'TEST/AUDIO').mkdir()
        (self.tree / 'TEST/AUDIO/TONE.wav').write_bytes(b'Original synthetic audio placeholder')
        self.card.write_bytes(card_codec.build_image(str(self.tree), 32))
        result = self.run_capture()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_failed_load_and_remaining_startup_popup_never_export(self):
        for mode in ['failed-load', 'failed-bank', 'stuck-dialog']:
            with self.subTest(mode=mode):
                result = self.run_capture(mode)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Capture preflight:', result.stderr)
                self.assertFalse(self.output.exists())

    def test_failure_after_a_capture_does_not_export_partial_media(self):
        self.plan.write_text(json.dumps([{'capture': 'page.png'}, {'encoder': {'name': 'D', 'delta': -1}}]))
        result = self.run_capture('failed-command')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('refused a capture command', result.stderr)
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
