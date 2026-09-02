# Changelog

All notable changes to Sam's Twitch Live will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fix time sorting broken for non-US locales by storing raw ISO (`startedAt`/`startedAtISO`) and sorting on it; recompute `liveTime` in popup via `getTimePassed` so uptime ticks correctly (B1)
- Fix badge count reset to 0 on every service-worker wake by removing unconditional `set({liveChannelsCount:0})` and using fallback `get({liveChannelsCount:0})` (B2)
- Fix `ReferenceError: error is not defined` in token validation and prevent transient 429/500 from wiping auth — only clear on 401/403 (B4)
- Fix implicit global `value` leak in background startup alarm (B3)
- Fix followed-streams URL typo `?&first` → `?first` (B5)

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
