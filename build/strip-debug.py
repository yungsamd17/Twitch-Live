#!/usr/bin/env python3
"""Stage a store-ready copy of the extension with all debug code stripped.

Usage: python3 build/strip-debug.py <repo-root> <dest-dir>

Debug-only code is identified by convention (see AGENTS.md):
  1. Files src/js/debug.js and src/css/debug.css are never staged.
  2. <!-- DEBUG-START --> ... <!-- DEBUG-END --> blocks in *.html are removed.
  3. Full-line // DEBUG-START ... // DEBUG-END markers in *.js remove the
     whole block (markers included).
  4. Lines matching ^\\s*dbg\\( in *.js (dbg() call sites) are removed.

Fails loudly on unbalanced markers or any leftover debug references, so
release.yml and CI catch marker rot instead of shipping it.
"""

import pathlib
import re
import shutil
import sys

DEBUG_FILES = ("src/js/debug.js", "src/css/debug.css")

# Staged file set mirrors the CWS zip contents.
STAGE_PATHS = ("manifest.json", "popup.html", "LICENSE", "src", "lib")

HTML_BLOCK = re.compile(r"<!-- DEBUG-START -->.*?<!-- DEBUG-END -->\s*\n?", re.DOTALL)
JS_BLOCK = re.compile(r"^[ \t]*// DEBUG-START[^\n]*\n.*?^[ \t]*// DEBUG-END[^\n]*\n?", re.MULTILINE | re.DOTALL)
JS_CALL = re.compile(r"^[ \t]*dbg\(.*$", re.MULTILINE)

LEFTOVER = re.compile(r"DEBUG-START|DEBUG-END|DebugLog|debug-ping|^[ \t]*dbg\(", re.MULTILINE)


def strip_file(path: pathlib.Path) -> None:
    text = path.read_text()
    if path.suffix == ".html":
        text = HTML_BLOCK.sub("", text)
    elif path.suffix == ".js":
        text = JS_BLOCK.sub("", text)
        text = JS_CALL.sub("", text)
    path.write_text(text)


def main() -> int:
    if len(sys.argv) != 3:
        print(f"usage: {sys.argv[0]} <repo-root> <dest-dir>", file=sys.stderr)
        return 2
    root = pathlib.Path(sys.argv[1])
    dest = pathlib.Path(sys.argv[2])
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    for rel in STAGE_PATHS:
        src = root / rel
        target = dest / rel
        if src.is_dir():
            shutil.copytree(src, target)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, target)

    for rel in DEBUG_FILES:
        target = dest / rel
        if target.exists():
            target.unlink()

    for path in sorted(dest.rglob("*")):
        if path.is_file() and path.suffix in (".html", ".js"):
            strip_file(path)

    leftovers = []
    for path in sorted(dest.rglob("*")):
        if path.is_file() and path.suffix in (".html", ".js", ".css"):
            for i, line in enumerate(path.read_text().splitlines(), 1):
                if LEFTOVER.search(line):
                    leftovers.append(f"{path.relative_to(dest)}:{i}: {line.strip()}")
    if (dest / "src/js/debug.js").exists() or (dest / "src/css/debug.css").exists():
        leftovers.append("debug-only file survived staging")
    if leftovers:
        print("::error::debug code survived stripping:", file=sys.stderr)
        for entry in leftovers:
            print(f"::error::{entry}", file=sys.stderr)
        return 1

    print(f"staged store build in {dest} (debug code stripped)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
