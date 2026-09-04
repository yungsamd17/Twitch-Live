#!/usr/bin/env python3
"""Rewrite the What's-new block in store/listing.md for a release.

Usage:
  python3 build/update-store-listing.py <version> <notes-file> [listing-file]
  python3 build/update-store-listing.py --check [listing-file]

The block between <!-- WHATS-NEW-START --> and <!-- WHATS-NEW-END -->
is replaced with "## What's new in v<version>" followed by the notes.
--check only verifies the markers exist (for CI); it changes nothing.
"""

import pathlib
import re
import sys

START = "<!-- WHATS-NEW-START -->"
END = "<!-- WHATS-NEW-END -->"
BLOCK = re.compile(r"<!-- WHATS-NEW-START -->.*?<!-- WHATS-NEW-END -->", re.DOTALL)


def to_plain(notes: str) -> str:
    """Convert CHANGELOG markdown to the plain text the CWS description needs.

    Rules: `# Head` -> `HEAD`, `- item` -> `• item` (indent kept),
    `**b**`/`` `code` `` unwrapped, `[text](url)` -> `text (url)`.
    """
    out = []
    for line in notes.strip().splitlines():
        m = re.match(r"^#{1,6}\s+(.*)$", line)
        if m:
            out.append(m.group(1).strip().upper())
            continue
        line = re.sub(r"^(\s*)-\s+", r"\1• ", line)
        line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
        line = re.sub(r"`(.+?)`", r"\1", line)
        line = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", line)
        out.append(line.rstrip())
    return "\n".join(out).strip() + "\n"


def render(version: str, notes: str) -> str:
    body = to_plain(notes)
    return f"{START}\nWHAT'S NEW IN v{version}\n\n{body}{END}"


def main() -> int:
    args = sys.argv[1:]
    if args[:1] == ["--check"]:
        listing = pathlib.Path(args[1] if len(args) > 1 else "store/listing.md")
        text = listing.read_text()
        if START not in text or END not in text:
            print(f"::error::{listing} is missing WHATS-NEW markers", file=sys.stderr)
            return 1
        if len(BLOCK.findall(text)) != 1:
            print(f"::error::{listing} must contain exactly one WHATS-NEW block", file=sys.stderr)
            return 1
        print(f"{listing}: markers ok")
        return 0

    if len(args) < 2:
        print("usage: update-store-listing.py <version> <notes-file> [listing-file]", file=sys.stderr)
        return 2
    version, notes_file = args[0], args[1]
    listing = pathlib.Path(args[2] if len(args) > 2 else "store/listing.md")
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        print(f"::error::version '{version}' is not semver x.y.z", file=sys.stderr)
        return 1
    text = listing.read_text()
    if len(BLOCK.findall(text)) != 1:
        print(f"::error::{listing} must contain exactly one WHATS-NEW block", file=sys.stderr)
        return 1
    notes = pathlib.Path(notes_file).read_text()
    if not notes.strip():
        print(f"::error::{notes_file} is empty", file=sys.stderr)
        return 1
    listing.write_text(BLOCK.sub(lambda _: render(version, notes), text))
    print(f"{listing}: What's new updated to v{version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
