# AGENTS.md

Guidance for AI coding agents (OpenCode, Claude Code, etc.) working in this repository.

## Project Overview

Sam's Twitch Live — Chrome MV3 extension that surfaces your Twitch followed channels that are currently live: searchable, sortable stream list with customizable badge, background refresh, context menu and player options.

- Language/stack: vanilla JavaScript + HTML + CSS, Manifest V3 (no build system, no bundler, no package.json)
- Extension entry: `manifest.json:1` (version `1.3.3`), `popup.html:1`, `src/js/background.js:1` (service worker), `src/js/main.js:1` (popup UI), `src/js/settings.js:1`, `src/js/util.js:1`
- Chrome APIs: `alarms`, `storage`, `identity` (`manifest.json:14`) + `chrome.action` badge, `chrome.windows`/`chrome.tabs`
- Twitch: Helix `https://api.twitch.tv/helix/streams/followed` via OAuth implicit flow (`src/js/background.js:120`) with `chrome.identity.launchWebAuthFlow`
- Author/maintainer: yungsamd17 (https://github.com/yungsamd17)
- Store: https://chromewebstore.google.com/detail/sams-twitch-live/fnaolpkjdickppbebcafdajjndmkgbei
- Pages site: https://yungsamd17.github.io/Twitch-Live/ (built from `website/` on `main`, deployed via `.github/workflows/pages.yml`)

## Build & Verify

There is no build. Verification is manual + CI-validated:

```bash
python3 -c "import json; json.load(open('manifest.json')); print('manifest ok')"
# or: python3 -m json.tool manifest.json > /dev/null
zip -r /tmp/Twitch-Live.zip manifest.json popup.html src/ lib/ LICENSE && unzip -l /tmp/Twitch-Live.zip | head -20

# Manual Chrome test:
# 1. chrome://extensions → Developer mode → Load unpacked → select repo root
# 2. Log in via Twitch OAuth (see docs/INSTALL_FROM_STORAGE.md:1 for local Client ID setup)
# 3. Exercise search, sort, settings toggles, context menu, badge color, background interval
```

- CI (`.github/workflows/ci.yml`) runs on every push to `main` and on PRs: validates `manifest.json` is valid JSON, `version` is semver, required extension files exist, and a CWS-compatible zip can be produced. It does not deploy.
- `.github/workflows/release.yml` runs on `v*` tags and on `workflow_dispatch`: validates the tag matches `manifest.json` version, stages a store-ready copy via `build/strip-debug.py` (drops all debug code — see Gotchas), builds the minimal CWS zip (`manifest.json` at zip root, plus `popup.html`, `src/`, `lib/`, `LICENSE`), extracts the matching `CHANGELOG.md` section as release notes, and creates the GitHub Release with `generate_release_notes: true`.
- `.github/workflows/pages.yml` deploys the Pages site from `website/` on pushes to `main` (plus `workflow_dispatch`).
- Local sandboxes have no Chrome; rely on JSON/lint checks and careful review. Let CI verify.

## Architecture

```
manifest.json              # MV3 manifest — version is the single source of truth (x.y.z)
popup.html                 # popup entry: navbar (search/refresh/sort), streams container, settings modal, context menu
src/js/background.js       # service worker: OAuth (TWITCH_APP_TOKEN), token validation (alarms validateTwitchTokenAlarm:60m), background refresh (updateStreamsAlarm, configurable via storage), badge (liveChannelsCount), helix fetch
src/js/main.js             # popup UI: auth screen, loadTwitchContent(), filtering/sorting (Broadcaster/Category/Viewers/Uptime/Started/Running), search, stream rows, context menu, raid-copy, openStream() player/window logic
src/js/settings.js         # settings persistence (chrome.storage.local), toggles (simpleView/openInPlayer/openInNewWindow/showRaidButton), badge color, background interval, version display, modal/dropdown animations
src/js/util.js             # getTimePassed() + getStartedAtTime() (uptime formatting)
src/css/                   # main.css (+ imports settings.css/tooltips.css/auth.css), settings.css, tooltips.css, auth.css
src/icons/                 # 16/48/128 + favicon.ico (referenced manifest.json:9)
lib/scrollbar/             # vendored simple-scrollbar (lib/README.md) — keep as-is
website/                   # GitHub Pages site (index.html, style.css, assets/) — deployed from main
docs/                      # INSTALL_FROM_STORAGE.md (local install + Twitch Client ID registration)
CHANGELOG.md               # keep a changelog — ## [x.y.z] - YYYY-MM-DD sections used as release notes
```

Key patterns:

- All runtime state lives in `chrome.storage.local`: `twitchAccessToken`, `twitchIsValidated`, `twitchUserId`, `twitchStreams`, `liveChannelsCount`, `backgroundUpdateRateMin`, `customBadgeColor`, `simpleViewToggle`, `openInPlayerToggle`, `openInNewWindowToggle`, `showRaidButtonToggle`. Background and popup both read/write; `storage.onChanged` drives alarm recreation (`src/js/background.js:78`) and toggle sync (`src/js/settings.js:88`).
- Auth is OAuth implicit `response_type=token` via `chrome.identity.launchWebAuthFlow` (`src/js/background.js:152`). Token is stored raw in `twitchAccessToken`; validation hits `https://id.twitch.tv/oauth2/validate` hourly. Unauthorized clears all twitch keys (`handleTwitchUnauthorized()`).
- Background refresh: `chrome.alarms` with period `backgroundUpdateRateMin` (default 5, `src/js/background.js:72`). Popup also polls every 30s while open (`src/js/main.js:377`). Don't entangle the two.
- Filtering/sorting in `src/js/main.js:69-140` is client-side over cached `twitchStreams`. Sort keys map to button IDs (`viewersHighToLowButton` default): Broadcaster, Category, Viewers High→Low/Low→High, Recently Started, Longest Running. Search matches `channelName|title|gameName` lowercased.
- `openStream()` (`src/js/main.js:39`) branches on `openInPlayerToggle` + `openInNewWindowToggle` — `https://player.twitch.tv/?channel=…&parent=twitch-live` vs `https://www.twitch.tv/…`, window `type: 'popup'` vs tab.
- `TWITCH_APP_TOKEN` (`src/js/background.js:120`) is a public OAuth Client ID (not a secret) — the Twitch app's redirect allowlist is `https://<extension-id>.chromiumapp.org/` per `docs/INSTALL_FROM_STORAGE.md:22`. Local installs must register their own extension ID + Client ID.

## Commit Messages

Format: `type(scope): short imperative summary` — lowercase after type, no trailing period.
Keep commits atomic — one logical change per commit.

| Type | Use for |
|---|---|
| `feat` | new user-facing feature |
| `fix` | bug fix |
| `refactor` | code change that neither fixes nor adds behavior |
| `style` | formatting/UI polish without logic change |
| `test` | adding or fixing tests |
| `docs` | documentation only |
| `chore` | build, deps, CI, tooling |
| `release` | version bump / release tagging |

Scope is a short area name for this project (e.g. `popup`, `background`, `api`, `settings`, `css`, `docs`, `ci`, `release`, `pages`).
Use plain `type:` only when a change genuinely spans everything (rare).

Examples:

```
feat(popup): add simple-view toggle for thumbnails
fix(background): clear streams on token expiry
chore(ci): validate manifest version in workflow
docs(readme): document local Client ID setup
release: v1.3.4
```

## Agent Guardrails

- Never commit or push directly to `main`; all changes land through pull requests.
- Never open a PR unless the developer explicitly asks for it.
- One concern per change. If the description says "also", split it into another branch/PR.
- Do not commit secrets, keystores, or local-only files (e.g. `.and-code/`, `dev-token.txt`, unpacked zips).
- Do not hand-edit release zips — they are CI artifacts.
- Do not move/rename `manifest.json`, `popup.html`, `src/`, `lib/` without updating the release zip paths in both workflows.
- When watching CI/bot feedback on your PRs: poll checks and comments newer than the last push, verify each bot finding against the source before "fixing" it, dismiss false positives with a written reason, and stop when checks are green on the latest commit.

## Pull Requests

All changes land on `main` through pull requests.

1. Create a branch off `main`: `<type>/<short-description>` (e.g. `feat/raid-copy-button`, `fix/badge-color-persist`).
2. Commit there using the format from **Commit Messages**; keep commits atomic.
3. Push the branch and open a PR against `main`.

PR rules:

- One feature/fix per PR — small and focused beats large and thorough.
- Title follows the commit message format: `type(scope): short imperative summary` (e.g. `fix(popup): handle empty search results`) — it becomes the squash-merge commit message.
- Body stays concise, following the PR template: what changed and why, bullet list of touched areas, evidence if applicable, testing checklist (tick before merge).
- UI changes must include clear before/after screenshots; motion/timing changes need a short video. Upload evidence directly to GitHub — never commit PR-only screenshots or asset files.
- End the body with an AI attribution line stating exactly which model and agent made the changes, in this exact format:

  ```
  Built with {model} in the {agent} harness.
  ```

  Example: `Built with muse-spark-1.2 in the OpenCode harness.`

- Do **not** put AI attribution in GitHub Release notes — releases stay clean.
- CI must pass before merging.

## Releases

1. Ensure version metadata is correct (`version` in `manifest.json:5`) and add a matching `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md` (see `pebbledo` pattern).
2. Commit those changes to `main` (via PR) — do not tag before merging.
3. Tag on `main`: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. The `release.yml` workflow validates the tag matches `manifest.json`, builds the minimal CWS zip (`Twitch-Live.zip` containing `manifest.json` at root + `popup.html`, `src/`, `lib/`, `LICENSE`), extracts the matching `CHANGELOG.md` section as the release notes (`generate_release_notes: true` appended), refreshes the What's new block in `store/listing.txt` on `main` (`build/update-store-listing.py`, before the Release is created), and creates the GitHub Release (`make_latest: true`) with the zip attached.
5. Download `Twitch-Live.zip` from the Release assets and upload it manually to the Chrome Web Store Developer Dashboard; paste `store/listing.txt` into the dashboard description and refresh screenshots/promo art from `store/` as needed (see `store/README.md`).
6. Keep release notes short — the CHANGELOG section is published verbatim, so write it user-facing in the classic style (`Added` / `Enhancements` / `Bug Fixes` / `Miscellaneous`, plain language, no dev codes; dev-only tooling gets at most one `Miscellaneous` line). Roll the bottom compare links forward too (`[Unreleased]` → `vX.Y.Z...HEAD`, add `[X.Y.Z]`).

Delete the test tag/release if you trigger a dry-run: `git push --delete origin v0.0.0-test && git tag -d v0.0.0-test && gh release delete v0.0.0-test --yes`.

## Gotchas

- `manifest.json` version is the single source — workflow fails if `vX.Y.Z` tag != `manifest.json` version. Bump manifest first.
- The Pages site lives in `website/` on `main` and is deployed by `pages.yml`. Don't put extension code in `website/` and don't serve extension files from Pages.
- `lib/scrollbar/simple-scrollbar.min.js` is intentionally checked in but unused (popup loads the un-minified `simple-scrollbar.min.js` via `src/js`); don't "fix" by deleting either.
- `TWITCH_APP_TOKEN` looks like a secret but is a public Client ID — still, local dev needs a personal Client ID per `docs/INSTALL_FROM_STORAGE.md:16` with redirect `https://<id>.chromiumapp.org/`.
- `src/js/main.js:503-510` category URLs slugify via `encodeURIComponent(name.toLowerCase().replace(/\s/g,'-'))` — Twitch category slugs must keep that form.
- `src/css/main.css:1-3` imports are order-sensitive (`settings` → `tooltips` → `auth`).
- The `updateStreamsAlarm` is recreated on `backgroundUpdateRateMin` changes (`src/js/background.js:51`); don't add a second alarm with the same name.
- Debug-only code ships exclusively in Debug Build zips (`debug.yml` skips stripping). Mark it with `<!-- DEBUG-START -->/<!-- DEBUG-END -->` (HTML), `// DEBUG-START`/`// DEBUG-END` full-line markers (JS blocks), or a `dbg(` line prefix (JS call sites); `src/js/debug.js` + `src/css/debug.css` are debug-only files. `build/strip-debug.py` enforces all of this for store builds and fails on unbalanced markers or leftovers — `ci.yml` runs the same check, so keep markers well-formed.
- `store/listing.txt` is the copy-paste source for the CWS description; its What's-new block (WHATS-NEW markers) is rewritten by `release.yml` on every release — never hand-edit that block, and keep `store/README.md` asset inventory honest. The file must stay markdown-free (CWS renders plain text); `build/update-store-listing.py` converts notes automatically.
