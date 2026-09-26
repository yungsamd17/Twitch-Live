# Player Extras Scripts

The extension's **Player extras** toggle (Settings, off by default) enables small
enhancements on Twitch player pages. They are ported from
[yungsamd17/UserScripts](https://yungsamd17.github.io/UserScripts) and run as
content scripts on `www.twitch.tv`, `player.twitch.tv` and `embed.twitch.tv`.

After flipping the toggle, reload any already-open Twitch tabs for it to take
effect.

## Player tab title

Shows the channel name in the browser tab on `player.twitch.tv` pages
(`<channel> - Twitch Player`). Falls back to the name from the page URL, then
upgrades to the correctly-cased name once the player loads.

## Copy channel button

Adds a copy-icon button to the player's control bar. Clicking it (or pressing
**Alt+T** outside of chat/text inputs) copies the channel name to the clipboard.
Works on `player.twitch.tv` and `embed.twitch.tv` (`?channel=` parameter) as
well as `www.twitch.tv/<channel>` pages.

## Chat popout button

Adds a chat-icon button to the player's control bar that opens the channel's
chat popout (`twitch.tv/popout/<channel>/chat`) in a small window.

## Notes

- The buttons stay hidden on clip pages (`/clip/`, `clips.twitch.tv`).
- The buttons attach next to Twitch's own player controls; if Twitch renames
  those controls, the buttons may disappear until the extension is updated.
