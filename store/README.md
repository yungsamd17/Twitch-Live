# Store assets

Publishing helper for the Chrome Web Store listing. Nothing here ships inside the extension.

## Files

- [`listing.md`](listing.md) — copy-paste source for the CWS **description** field (pitch, features, privacy, What's new, links).
  Plain text only: the CWS description does not render markdown, so keep this file free of `#`, `*`, backticks, and `[text](url)` links (bare URLs are auto-linked).
  When pasting into the dashboard, delete the two `<!-- WHATS-NEW-... -->` marker lines — they are only there for automation.
  The `What's new` block itself is rewritten automatically by `release.yml` via `build/update-store-listing.py` on every release (markdown notes are converted to plain text) — don't edit that block by hand.
- [`screenshots/`](screenshots) — listing screenshots.
- [`promo/`](promo) — promo/banner art.

## Publishing checklist (manual, in the CWS Developer Dashboard)

1. Upload the new `Twitch-Live.zip` from the GitHub Release assets.
2. Paste `store/listing.md` into the description field (minus the two marker lines).
3. Upload/refresh screenshots and promo images as needed (see inventory below).

## Asset inventory

| File | Size | Used for | Status |
|---|---|---|---|
| `screenshots/cws-promo-live-list.png` | 1280×800 | Screenshot: live stream list | ✅ ideal size |
| `screenshots/cws-promo-settings-search-more.png` | 1280×800 | Screenshot: settings, search, menus | ✅ ideal size |
| `screenshots/cws-promo-simple-view-copy-raid.png` | 1280×800 | Screenshot: simple view, raid copy | ✅ ideal size |
| `screenshots/popup-live-list.png` | 430×600 | spare popup shot (copied from `website/assets/preview.png`) | ✅ spare |
| `promo/banner-1920x580.png` | 1920×580 | Promo banner | ✅ in repo (same art as README header) |
| small promo tile | 440×280 required | Store listing tile | ❌ TODO — needs to be created |

Icon (128px) is taken from the uploaded zip (`src/icons/icon-128.png`) — no separate file needed.
