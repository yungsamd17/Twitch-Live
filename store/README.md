# Store assets

Publishing helper for the Chrome Web Store listing. Nothing here ships inside the extension.

## Files

- [`listing.md`](listing.md) — copy-paste source for the CWS **description** field (pitch, features, privacy, What's new, links).
  The `What's new` block (between `WHATS-NEW-START` / `WHATS-NEW-END` markers) is rewritten automatically by `release.yml` via `build/update-store-listing.py` on every release — don't edit that block by hand.
- [`screenshots/`](screenshots) — listing screenshots.
- [`promo/`](promo) — promo/banner art.

## Publishing checklist (manual, in the CWS Developer Dashboard)

1. Upload the new `Twitch-Live.zip` from the GitHub Release assets.
2. Paste `store/listing.md` into the description field.
3. Upload/refresh screenshots and promo images as needed (see inventory below).

## Asset inventory

| File | Size | Used for | Status |
|---|---|---|---|
| `screenshots/popup-live-list.png` | 430×600 | Screenshot slot | ✅ in repo (copied from `website/assets/preview.png`) |
| `promo/banner-1920x580.png` | 1920×580 | Promo banner | ✅ in repo (same art as README header) |
| small promo tile | 440×280 required | Store listing tile | ❌ TODO — needs to be created |
| screenshots | 1280×800 or 640×400 required | Screenshot slots | ⚠️ existing shot is 430×600; acceptable but ideally re-capture at 1280×800 |

Icon (128px) is taken from the uploaded zip (`src/icons/icon-128.png`) — no separate file needed.
