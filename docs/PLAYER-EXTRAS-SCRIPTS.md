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
Only runs on `player.twitch.tv` and `embed.twitch.tv` with a `?channel=`
parameter, never on regular `twitch.tv` pages (including theater/fullscreen).
The hostname check runs before observing or inserting controls, so loading or
navigation on the main site cannot briefly show the button. Player URLs without
a channel (such as video-only URLs) do not get a button. New Twitch player
hostnames would need to be explicitly supported.

## Notes

- The buttons stay hidden on clip pages (`/clip/`, `clips.twitch.tv`).
- The buttons attach next to Twitch's own player controls; if Twitch renames
  those controls, the buttons may disappear until the extension is updated.
