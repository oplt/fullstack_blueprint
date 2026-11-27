#!/usr/bin/env python3
"""Targeted hotfix for the November 27 validation log. Preview by default."""
import argparse
import difflib
import re
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true', help='Write reviewed changes')
args = parser.parse_args()
root = Path.cwd()
src = root / 'frontend/src'
css_path = src / 'index.css'
if not css_path.is_file():
    raise SystemExit('Run from the fullstack_blueprint repository root.')
changes = {}

def load(path):
    return changes.get(path, path.read_text(encoding='utf-8'))

css = load(css_path)
if '.ui-card {' not in css or '.ui-button {' not in css:
    raise SystemExit('Install the Phases 3–10 package first.')

# Only the 18 known card objects, not arbitrary JSX or runtime geometry.
counts = {
    'ai/components/PromptLibraryPanel.tsx': 1,
    'ai/components/RetrievalDocumentsPanel.tsx': 1,
    'platform/components/PlatformSections.tsx': 4,
    'platform-admin/components/CloneConfigSection.tsx': 2,
    'platform-admin/components/FlagsSection.tsx': 2,
    'platform-admin/components/PlansSection.tsx': 2,
    'platform-admin/components/TemplatesSection.tsx': 2,
    'profile/components/ProfileSections.tsx': 2,
    'settings-admin/components/SettingEditors.tsx': 2,
}
pattern = re.compile(r'style=\{\(\{\s*padding:\s*(12|16|18|20),\s*borderRadius:\s*(12|16),\s*border:\s*`1px solid \$\{"var\(--border\)"\}`\s*(?:,\s*backgroundColor:\s*(current\s*\?\s*colorMix\("var\(--primary\)",\s*0\.1\)\s*:\s*"var\(--card\)"|colorMix\("var\(--card\)",\s*0?\.78\)))?\s*,?\s*\}\)\}')

def surface(match):
    padding, _, bg = match.groups()
    classes = 'surface-card ui-feature-surface'
    if padding == '12': classes += ' ui-feature-surface-dense'
    if bg and bg.startswith('colorMix'): classes += ' ui-feature-surface-subtle'
    return f'className="{classes}"' + (' data-selected={current}' if bg and bg.startswith('current') else '')

for name, expected in counts.items():
    file = src / 'features' / name
    original = load(file)
    updated, n = pattern.subn(surface, original)
    # Safe to re-run: already migrated files have exactly the expected formats.
    if n == 0 and original.count('className="surface-card ui-feature-surface') == expected:
        continue
    if n != expected:
        raise SystemExit(f'{name}: expected {expected} known objects, found {n}. No files written; inspect local changes.')
    if 'colorMix(' not in updated:
        updated = re.sub(r'import\s*\{\s*colorMix\s*\}\s*from\s*[\'\"]@/lib/color[\'\"];\s*', '', updated)
    # Existing duplicate font stack in the API-key display.
    updated = re.sub(r'style=\{\{\s*fontFamily:\s*\'"IBM Plex Mono", monospace\'\s*\}\}', 'className="font-mono text-code"', updated)
    changes[file] = updated

marker = '/* Validation hotfix: canonical feature surfaces. */'
if marker not in css:
    changes[css_path] = css.rstrip() + '\n\n' + marker + '''
@layer components {
    .ui-feature-surface { padding: var(--card-padding); min-width: 0; }
    .ui-feature-surface-dense { padding: var(--card-padding-dense); }
    .ui-feature-surface-subtle { background: color-mix(in srgb, var(--card) 78%, transparent); }
    .ui-feature-surface[data-selected="true"] { background: color-mix(in srgb, var(--primary) 10%, transparent); }
}
'''

# Replace the test's obsolete implementation-class selector, not the test behavior.
file = src / 'features/agent/AgentView.test.tsx'
original = load(file)
old = 'container.querySelector(".animate-pulse")'
new = '''container.querySelector('[role="status"][aria-busy="true"] [data-slot="skeleton"]')'''
if original.count(old) == 1:
    changes[file] = original.replace(old, new)
elif new not in original:
    raise SystemExit('AgentView test changed unexpectedly; no files written.')

# Both siblings previously had the same key; keep route-based remounts but prefix them.
file = src / 'components/layout/AppLayout.tsx'
original = load(file)
updated = original.replace('<MobileNavigation key={location.key}', '<MobileNavigation key={`navigation-${location.key}`}').replace('<PageSearch key={location.key}', '<PageSearch key={`search-${location.key}`}')
if updated != original:
    changes[file] = updated

for file, updated in changes.items():
    original = file.read_text(encoding='utf-8')
    relative = str(file.relative_to(root))
    print(''.join(difflib.unified_diff(original.splitlines(keepends=True), updated.splitlines(keepends=True), fromfile=relative, tofile=relative+' (fixed)')))
if args.apply:
    for file, updated in changes.items():
        file.write_text(updated, encoding='utf-8')
    print(f'Applied {len(changes)} file changes. Run design:check, typecheck and tests.')
else:
    print(f'Preview: {len(changes)} files. No files changed. Re-run with --apply after reviewing.')
