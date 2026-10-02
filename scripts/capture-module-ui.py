#!/usr/bin/env python3
"""Capture the real OT LCD from a locally built image; never build/upload firmware.

The plan contains panel presses, encoder turns, waits and PNG filenames. Only
the rendered LCD PNGs and their JSON provenance leave the temporary workspace.
Use a reviewed emulator and a locally built image matching the module version.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import posixpath
import re
import selectors
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]
KEYS = {'FUNC': 0x2d, 'SRC': 0x22, 'AMP': 0x23, 'LFO': 0x24,
        'FX1': 0x25, 'FX2': 0x26, 'YES': 0x31, 'NO': 0x32,
        'UP': 0x33, 'DOWN': 0x20, 'LEFT': 0x34, 'RIGHT': 0x21,
        'MENU': 0x1c, 'MIDI': 0x35, 'PART': 0x1d, 'PAGE': 0x1b,
        'SCENE A': 0x19, 'SCENE B': 0x1a, 'AED': 0x1e, 'CUE': 0x2a,
        **{f'PUSH {name}': 0x38 + i for i, name in enumerate('ABCDEF')},
        'PUSH LEVEL': 0x3e,
        **{f'TRIG{i + 1}': i for i in range(16)},
        **{f'T{i + 1}': 0x10 + i for i in range(8)}}
ENCODERS = {name: index for index, name in enumerate(['A', 'B', 'C', 'D', 'E', 'F', 'LEVEL'])}


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--emulator', type=Path, required=True)
    parser.add_argument('--image', type=Path, required=True, help='Local MAIN OS image; never commit it')
    parser.add_argument('--image-sha256', required=True, help='Expected SHA-256 of that local image')
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True, help='New screenshot output directory')
    parser.add_argument('--card', type=Path, required=True, help='Private FAT card containing the capture set/project; empty cards are rejected')
    parser.add_argument('--set', dest='set_name', required=True, help='Mount this local fixture set; requires --card and --project')
    parser.add_argument('--project', dest='project_name', required=True, help='Load this local fixture project; requires --card and --set')
    parser.add_argument('--mki', action='store_true', help='Default panel is MKII')
    parser.add_argument('--key-ms', type=int, default=150, help='Key down/up interval, 20–500 ms; use 50 for double taps')
    parser.add_argument('--lcd-style', choices=['black-and-white', 'original'], default='black-and-white', help='Render actual LCD pixels in the publication palette or the original LCD colors')
    args = parser.parse_args()
    if not all(re.fullmatch(r'[A-Za-z0-9_-]{1,32}', name) for name in [args.set_name, args.project_name]):
        parser.error('Use simple set/project folder names.')
    codec = load('octamod_card', ROOT / 'sdk/octabam/tools/emu/emu_card.py')
    try:
        card_bytes = args.card.read_bytes()
        card_files = codec.extract_image(card_bytes)
    except (OSError, ValueError, IndexError, ZeroDivisionError) as error:
        parser.error('Cannot read the private fixture card: ' + str(error))
    prefix = args.set_name + '/' + args.project_name + '/'
    if not all(prefix + name in card_files for name in ['project.work', 'bank01.work']):
        parser.error('The card does not contain the requested set/project and bank01.work; stage a valid fixture before capturing.')
    # Detect fixture mistakes before spending time booting the native UI.
    slots = set()
    for block in re.findall(rb'\[SAMPLE\]\r?\n(.*?)\[/SAMPLE\]', card_files[prefix + 'project.work'], re.S):
        fields = dict(line.split(b'=', 1) for line in block.splitlines() if b'=' in line)
        machine, slot = fields.get(b'TYPE'), fields.get(b'SLOT', b'')
        if machine not in [b'FLEX', b'STATIC'] or not slot.isdigit() or not 1 <= int(slot) <= 128:
            continue  # Flex recorder buffers are RAM slots, not staged audio files.
        identity = machine, int(slot)
        if identity in slots:
            parser.error('The capture project has duplicate sample slots; stage an unambiguous fixture before capturing.')
        slots.add(identity)
        path = fields.get(b'PATH', b'')
        if path:
            try:
                relative = path.decode('utf-8').replace('\\', '/')
            except UnicodeDecodeError:
                parser.error('Use simple UTF-8 sample paths in the disposable capture fixture.')
            if posixpath.normpath(prefix + relative) not in card_files:
                parser.error('A capture-project sample path is missing from the card; stage its audio before capturing.')
    del card_files
    if not 20 <= args.key_ms <= 500:
        parser.error('--key-ms must be 20–500 emulated milliseconds.')
    image = args.image.resolve()
    if hashlib.sha256(image.read_bytes()).hexdigest() != args.image_sha256:
        parser.error('The local capture image differs from its expected fingerprint.')
    plan = json.loads(args.plan.read_text())
    if not isinstance(plan, list) or not plan or len(plan) > 200:
        parser.error('Use an array of 1–200 panel actions.')
    shots, held = set(), set()
    for action in plan:
        if not isinstance(action, dict) or len(action) != 1:
            parser.error('Each action contains exactly one of press, hold, release, encoder, wait, capture.')
        key, value = next(iter(action.items()))
        if key in ('press', 'hold', 'release'):
            if not isinstance(value, list) or not value or any(not isinstance(v, str) or v not in KEYS for v in value) or len(set(value)) != len(value):
                parser.error('Panel actions must contain unique supported key names.')
            if key == 'release':
                if not set(value) <= held:
                    parser.error('release may only name keys held earlier in the plan.')
                held.difference_update(value)
            else:
                if held.intersection(value):
                    parser.error('A held key cannot be pressed or held again.')
                if key == 'hold':
                    held.update(value)
        elif key == 'encoder':
            if not isinstance(value, dict) or set(value) != {'name', 'delta'} or value['name'] not in ENCODERS or type(value['delta']) is not int or not -127 <= value['delta'] <= 127:
                parser.error('encoder needs a supported name and signed delta in -127..127.')
        elif key == 'wait':
            if type(value) is not int or not 1 <= value <= 10000:
                parser.error('wait is 1–10000 emulated milliseconds.')
        elif key == 'capture':
            if not isinstance(value, str) or not value.endswith('.png') or Path(value).name != value or value in shots:
                parser.error('capture needs a unique PNG filename without a directory.')
            shots.add(value)
        else:
            parser.error('Unknown capture action.')
    if not shots:
        parser.error('The plan must capture at least one PNG.')
    if held:
        parser.error('Release every held key before the plan ends.')
    output = args.output.resolve()
    if output.exists():
        parser.error('Output exists; choose a new directory to preserve previous captures.')
    lcd = load('octamod_lcd', ROOT / 'sdk/octabam/tools/emu/lcd_view.py')
    if args.lcd_style == 'black-and-white':
        lcd.ON, lcd.OFF = (232, 232, 232), (24, 24, 24)
    provenance = {'firmware': '1.40C', 'imageSha256': args.image_sha256,
                  'emulatorSha256': hashlib.sha256(args.emulator.read_bytes()).hexdigest(),
                  'fixture': {'set': args.set_name, 'project': args.project_name,
                              'cardSha256': hashlib.sha256(card_bytes).hexdigest()},
                  'setup': 'Headless ot_emu; ' + ('MKI' if args.mki else 'MKII') + ' panel; stopped transport; 128×64 LCD at integer scale 6.',
                  'keyMs': args.key_ms, 'lcdStyle': args.lcd_style, 'plan': plan, 'screenshots': {}}
    # Discard emulator diagnostics: never retain RAM, firmware, card or private logs.
    with tempfile.TemporaryDirectory(prefix='octamod-ui-capture.') as directory:
        work = Path(directory)
        card = work / 'card.img'
        card.write_bytes(card_bytes)
        del card_bytes
        plane = work / 'lcd.bin'
        capture_root = work / 'screenshots'
        command = [str(args.emulator.resolve()), '--image', str(image), '--card', str(card),
                   '--dsp', '--frame', '--ms', '3000', '--interactive', '--lcd', str(plane),
                   '--main-level', 'off', '--rtc', 'host', '--load-ms', '45000']
        if not args.mki:
            command.append('--mkii')
        if args.set_name:
            command.extend(['--mount', '--set', args.set_name, '--project', args.project_name])
        env = {key: value for key, value in os.environ.items() if not key.startswith('OT_')}
        port = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.DEVNULL, cwd=work, env=env)
        poll = selectors.DefaultSelector()
        poll.register(port.stdout, selectors.EVENT_READ)
        pending = b''
        startup = {'loadHandled': False, 'bankParsed': False}

        def reply(prefixes, timeout=120):
            nonlocal pending
            deadline = time.monotonic() + timeout
            while True:
                while b'\n' in pending:
                    line, pending = pending.split(b'\n', 1)
                    if b'load run ended: LOAD PROJECT handled' in line:
                        startup['loadHandled'] = True
                    if re.search(rb'saved_bank: [0-9]+,', line):
                        startup['bankParsed'] = True
                    if line.startswith(prefixes):
                        if line.startswith(b'err'):
                            raise RuntimeError('The emulator refused a capture command.')
                        return line
                if time.monotonic() >= deadline or port.poll() is not None:
                    raise RuntimeError('The emulator did not finish the UI command.')
                if poll.select(timeout=1):
                    chunk = os.read(port.stdout.fileno(), 65536)
                    if not chunk:
                        raise RuntimeError('The emulator exited before capture completed.')
                    pending += chunk

        def send(line):
            port.stdin.write((line + '\n').encode('ascii'))
            port.stdin.flush()
            result = reply((b'ok', b'err'))
            if line.startswith('run ') and b'stop=time' not in result:
                raise RuntimeError('The UI session stopped before the requested time elapsed.')

        rows = [0] * 8
        try:
            reply(b'ready ', timeout=300)
            if not all(startup.values()):
                raise RuntimeError('Capture preflight: the requested project did not finish loading. No screenshots were exported.')
            # NO is the native panel action for dismissing the initial date prompt.
            code = KEYS['NO']
            send(f'key {0x20 | (code >> 3)} {1 << (code & 7)}')
            send(f'run {args.key_ms}')
            send(f'key {0x20 | (code >> 3)} 0')
            send('run 500')
            data = lcd.read_plane(plane)
            if len(data) == 1024:
                raise RuntimeError('Capture preflight requires an emulator with popup-window capture support.')
            for i in range(lcd.WIN_SLOTS):
                at = lcd.WIN_TABLE + i * lcd.WIN_ENTRY + 32
                if int.from_bytes(data[at:at + 4], 'big') & 0x20:
                    raise RuntimeError('Capture preflight: a startup dialog is still open. No screenshots were exported.')
            provenance['preflight'] = {**startup, 'startupDialogsCleared': True}
            capture_root.mkdir()
            print('Capture preflight passed: project loaded; startup dialogs cleared.', flush=True)
            for action in plan:
                key, value = next(iter(action.items()))
                if key in ('press', 'hold', 'release'):
                    if key != 'release':
                        for name in value:
                            code = KEYS[name]
                            rows[code >> 3] |= 1 << (code & 7)
                            send(f'key {0x20 | (code >> 3)} {rows[code >> 3]}')
                            send(f'run {args.key_ms}')
                    for name in reversed(value) if key != 'hold' else []:
                        code = KEYS[name]
                        rows[code >> 3] &= ~(1 << (code & 7))
                        send(f'key {0x20 | (code >> 3)} {rows[code >> 3]}')
                        send(f'run {args.key_ms}')
                elif key == 'encoder':
                    send(f"knob {0x30 | ENCODERS[value['name']]} {value['delta'] & 255}")
                    send('run 200')
                elif key == 'wait':
                    send(f'run {value}')
                else:
                    lcd.png(lcd.screen(lcd.read_plane(plane)), str(capture_root / value), 6)
                    provenance['screenshots'][value] = hashlib.sha256((capture_root / value).read_bytes()).hexdigest()
                    print('Captured ' + value, flush=True)
            send('quit')
            if port.wait(timeout=10):
                raise RuntimeError('The emulator exited unsuccessfully; no screenshots were exported.')
            (capture_root / 'capture.json').write_text(json.dumps(provenance, indent=2) + '\n')
            shutil.copytree(capture_root, output)
        finally:
            if port.poll() is None:
                port.terminate()
                port.wait(timeout=10)
            poll.close()
    print('Capture complete. Review every screenshot before adding it to a module manifest.')


if __name__ == '__main__':
    try:
        main()
    except RuntimeError as error:
        raise SystemExit(str(error)) from None
