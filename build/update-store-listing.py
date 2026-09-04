#!/usr/bin/env python3
"""Rewrite the What's-new block in store/listing.txt for a release.

Usage:
  python3 build/update-store-listing.py <version> <notes-file> [listing-file]
  python3 build/update-store-listing.py --check [listing-file]

The block between the WHATS-NEW-START and WHATS-NEW-END marker lines is
replaced with "WHAT'S NEW IN v<version>" followed by the notes converted
to the listing's plain-text syntax (see to_plain). Marker lines start
with '#' so they are easy to spot and delete before pasting into CWS.
--check only verifies the markers exist (for CI); it changes nothing.
"""

import re
import sys
from pathlib import Path

START = "# WHATS-NEW-START"
END = "# WHATS-NEW-END"


def to_plain(notes: str) -> str:
    """Convert CHANGELOG markdown to the listing's plain-text syntax.

    Rules: `# Head` -> `HEAD:`, `- item` -> `• item` (one per line, no
    blank lines between items), `**b**`/`` `code` `` unwrapped,
    `[text](url)` -> `text (url)`.
    """
    out = []
    after_heading = False
    for line in notes.strip().splitlines():
        m = re.match(r"^#{1,6}\s+(.*)$", line)
        if m:
            out.append(m.group(1).strip().upper() + ":")
            after_heading = True
            continue
        if not line.strip() and after_heading:
            continue
        after_heading = False
        line = re.sub(r"^(\s*)-\s+", r"\1• ", line)
        line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
        line = re.sub(r"`(.+?)`", r"\1", line)
        line = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", line)
        out.append(line.rstrip())
    return "\n".join(out).strip() + "\n"


def split_block(text: str):
    """Split listing text into (head, tail) around the marker lines."""
    lines = text.splitlines(keepends=True)
    try:
        si = next(i for i, line in enumerate(lines) if line.startswith(START))
        ei = next(i for i, line in enumerate(lines) if line.startswith(END))
    except StopIteration:
        return None
    if si >= ei:
        return None
    return "".join(lines[: si + 1]), "".join(lines[ei:])


def main() -> int:
    args = sys.argv[1:]
    if args[:1] == ["--check"]:
        listing = Path(args[1] if len(args) > 1 else "store/listing.txt")
        if split_block(listing.read_text()) is None:
            print(f"::error::{listing} needs exactly one WHATS-NEW block (START before END)", file=sys.stderr)
            return 1
        print(f"{listing}: markers ok")
        return 0

    if len(args) < 2:
        print("usage: update-store-listing.py <version> <notes-file> [listing-file]", file=sys.stderr)
        return 2
    version, notes_file = args[0], args[1]
    listing = Path(args[2] if len(args) > 2 else "store/listing.txt")
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        print(f"::error::version '{version}' is not semver x.y.z", file=sys.stderr)
        return 1
    parts = split_block(listing.read_text())
    if parts is None:
        print(f"::error::{listing} needs exactly one WHATS-NEW block (START before END)", file=sys.stderr)
        return 1
    notes = Path(notes_file).read_text()
    if not notes.strip():
        print(f"::error::{notes_file} is empty", file=sys.stderr)
        return 1
    head, tail = parts
    listing.write_text(head + f"WHAT'S NEW IN v{version}\n\n" + to_plain(notes) + tail)
    print(f"{listing}: What's new updated to v{version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
