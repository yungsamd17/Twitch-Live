# Changelog

All notable changes to Sam's Twitch Live will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.4] - 2026-09-04

### Fixed

- Fix blank popup hang on browsers that keep message ports open: the background worker now always replies to runtime messages, the popup refresh has an 8s timeout backstop with fallback to cached data, and `launch()` steps are guarded individually so one failure can't abort the rest

- Fix time sorting broken for non-US locales by storing raw ISO (`startedAt`/`startedAtISO`) and sorting on it; recompute `liveTime` in popup via `getTimePassed` so uptime ticks correctly (B1)
- Fix badge count reset to 0 on every service-worker wake by removing unconditional `set({liveChannelsCount:0})` and using fallback `get({liveChannelsCount:0})` (B2)
- Fix `ReferenceError: error is not defined` in token validation and prevent transient 429/500 from wiping auth — only clear on 401/403 (B4)
- Fix implicit global `value` leak in background startup alarm (B3)
- Fix followed-streams URL typo `?&first` → `?first` (B5)
- Fix XSS via unsanitized channel/category/search — use `textContent` and `encodeURIComponent` for URLs and messages (B6)
- Fix brittle token extraction via `split` by using `URL` + `URLSearchParams` (S3)
- Fix duplicate `onMessage`/`onAlarm` listeners and unhandled `Receiving end does not exist` by merging handlers and guarding `sendMessage` (S4)

### Added

- Add manual Debug Build workflow producing a downloadable `artifact.zip` for Load-unpacked testing (no tag required)
- Add debug-build-only diagnostics panel with copyable report and one-tap previews of rare states (empty list, no results, auth screen, context menu) — stripped from store builds via `build/strip-debug.py`
- Add `host_permissions` for `https://api.twitch.tv/*` and `https://id.twitch.tv/*` (S1)

### Changed

- Debounce search input (150ms) and make auto-refresh interval idempotent to prevent duplicate 30s polls and per-keystroke fetches (P1)
- Eliminate storage write loop in settings sync by updating DOM directly on `storage.onChanged` (P2)
- Make background alarm recreation use promise API (`clear`/`create`) instead of callback soup (P4)
- Make periodic badge update await fresh fetch before updating badge (P3)
- Deduplicate popup animations to `src/css/animations.css` + `src/js/ui.js` and remove duplicates from `main.css`/`settings.css`/`main.js`/`settings.js` (A1)
- Deduplicate tooltip CSS (was 452 lines) to shared base + per-label overrides (A7)
- Fix `rgba(175.31,…)` invalid placeholder color to `rgba(175,175,175,0.6)` (A7)
- Clarify local Client ID setup in `docs/INSTALL_FROM_STORAGE.md` with exact paste instructions and blank-popup troubleshooting

### Fixed

- Fix `window.onmousedown/onmouseup` overwrite clobber by using `addEventListener` (A2)
- Fix context-menu listener leak — bind 7 items once instead of per right-click (A3)
- Fix `document.execCommand('copy')` deprecation by using `navigator.clipboard.writeText` with fallback (P5)
- Fix empty live-list shows misleading “No matching Search” — now shows “No live channels” with Browse Following (L2)
- Fix thumbnail broken image by adding `alt`, `loading=lazy` and fallback to extension icon (L2)
- Fix badge color/text race by awaiting storage and `chrome.action` atomically (L2)

### Added

- Persist sort filter choice (`selectedFilter`) in storage and restore on popup open; fix default filter string (L1)

### Security

- Add SRI `integrity` + `crossorigin` for Font Awesome CDN and `content_security_policy` for extension pages (S2)

## [1.3.3] - 2024-02-22

### Enhancements

- Updated viewers count style
  - Now it is on right side of stream container and has red "eye" icon
- Updated the scrollbar, so now it will show right away on load without the need to hover over streams

### Miscellaneous

- A lot of HTML/CSS and JS cleanup

## [1.3.2] - 2024-02-14

### Enhancements

- Close settings modal by just clicking outside of the modal content
- Update stream refresh interval when popup is open from 60s to 30s

### Bug Fixes

- Fix navbar "Twitch Live Following" link tooltip getting outlined when focusing the button with tab
- Filter dropdown will only close now with `mousedown` when clicked outside of it, and with `mouseup` when clicked on filter option

### Miscellaneous

- Tweak animation durations

## [1.3.1] - 2024-01-31

### Added

- Added the "Simple view" streams layout option, which hides stream thumbnail images and uptime. You can toggle this setting in the extension's options
- Added the "Copy raid command" button. Adds a copy button next to channel name

### Enhancements

- The navbar is now always visible, even when users are not logged in
- The logout button will hide when the user is not logged in
- Updated search results — now shows link to "Search on Twitch" when showing "No matching Search results found" message
- Updated the uptime tooltip, so now it shows "Live since [date], [time]"

### Bug Fixes

- Pressing 'F' key will now close the settings modal. However, this action will only trigger if you are not focused on an input field within the modal

### Miscellaneous

- Added a link to the release notes for the extension version in the settings
- Made small styling tweaks and cleaned up the code for improved readability

## [1.3.0] - 2024-01-18

### Added

- Added right-click context menu for streams
- Added background stream refresh interval customization (same 5 minute interval by default as before)

### Enhancements

- Updated "Open in new window" settings option — now it will open streams only in normal window instead of old popup it used to open, unless opening stream in player (this applies both when opening normally with player settings option on and from context menu)
- Display extension version in settings
- Added and tweaked animations, for sorting dropdown, context menu and settings modal
- You can now also close settings modal with F key
- Many styling and code changes/tweaks across the whole extension

### Bug Fixes

- Prevent creation of separate elements for titles with HTML-like tags

## [1.2.1] - 2024-01-11

### Fixed

- Fix wrong app token

## [1.2] - 2024-01-10

### Added

- Version 1.2 release — see [compare v1.1...v1.2](https://github.com/yungsamd17/Twitch-Live/compare/v1.1...v1.2)

## [1.1] - 2024-01-04

### Added

- Added option to set badge custom color
- Updated settings options names
- Added info icon with link for player option (example)

[Unreleased]: https://github.com/yungsamd17/Twitch-Live/compare/v1.3.3...HEAD
[1.3.3]: https://github.com/yungsamd17/Twitch-Live/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/yungsamd17/Twitch-Live/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/yungsamd17/Twitch-Live/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/yungsamd17/Twitch-Live/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/yungsamd17/Twitch-Live/compare/v1.2...v1.2.1
[1.2]: https://github.com/yungsamd17/Twitch-Live/compare/v1.1...v1.2
[1.1]: https://github.com/yungsamd17/Twitch-Live/releases/tag/v1.1
