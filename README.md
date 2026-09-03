<a href="https://yungsamd17.github.io/Twitch-Live/">
	<img width="960" alt="Sam's Twitch Live" src="https://github.com/yungsamd17/Twitch-Live/assets/64147848/f6fc60ae-cbd4-417f-b2d9-b7b6fe0b54fe">
</a>
<div align="center">
  <h2 align="center">Sam's Twitch Live</h2>

  <p align="center">
    Your ultimate companion for staying connected with your favorite Twitch streams.
    <br />
    <a href="https://chromewebstore.google.com/detail/sams-twitch-live/fnaolpkjdickppbebcafdajjndmkgbei">Chrome Web Store</a>
    ·
    <a href="https://github.com/yungsamd17/Twitch-Live/issues">Bugs & Suggestions</a>
    ·
    <a href="https://github.com/yungsamd17/Twitch-Live/releases">Release Notes</a>
  </p>
</div>

Sam's Twitch Live surfaces the channels you follow that are currently live — searchable, sortable, and one click away from the stream, player, or chat.

### Key Features
- **Live follow list:** see every followed channel that is live right now, with title, category, viewer count, and uptime.
- **Quick search:** find streams by channel name, title, or category.
- **Sorting:** Broadcaster, Category, Viewers (High to Low or Low to High), Recently Started, and Longest Running. Your choice is remembered between sessions.
- **Context menu:** right-click a stream to open its channel, player, or chat; jump to its About, Videos, or Clips pages; or browse more streams in its category.
- **Raid helper:** optional one-click button copies the `/raid` command for a channel.
- **Customizable:** Simple view (hides thumbnails and uptime), open-in-player, open-in-new-window, background refresh interval, custom badge color, and more.
- **Background updates:** the toolbar badge keeps count of live channels on your schedule, even while the popup is closed. The open popup refreshes every 30 seconds.

## Install

<a href="https://chromewebstore.google.com/detail/sams-twitch-live/fnaolpkjdickppbebcafdajjndmkgbei">
	<img src="https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle"> <b>Chrome</b>
</a>
or any Chromium-based browser (e.g. Brave, Edge, Opera)
<br>
<br>

See the [local install and testing guide](docs/INSTALL_FROM_STORAGE.md) to run the extension unpacked from source.

## How to Use
1. Log in with your Twitch account to authenticate the extension.
2. Explore your live followed channels directly from the extension popup.
3. Customize your viewing preferences in the settings for an optimal experience.
4. Enjoy uninterrupted Twitch streaming without leaving your browser.

## Privacy

- Sign-in uses Twitch OAuth with read-only access to your follows (`user:read:follows`). Nothing is ever posted to or changed on your account.
- Your access token and cached stream list are stored only in the extension's local browser storage. There is no analytics, tracking, or external server — the extension talks directly to the Twitch API.
- Logging out clears the token and cached data from local storage.

## Permissions

- `alarms` — refresh live streams in the background and re-check your login hourly.
- `storage` — remember your settings, cached streams, and login token locally.
- `identity` — sign you in with Twitch via OAuth.
- Host access to `api.twitch.tv` and `id.twitch.tv` — fetch live streams and validate your login. Nothing else.

## Contributing
Contributions are welcome, whether it's a new feature, bug fix, or documentation improvement. Fork the repo, create a focused branch, and open a pull request against `main`. Small, single-concern PRs with a short description and testing notes get merged fastest, and CI must pass before merging. Thank you for helping make this project better!

## Credits

Originally based on [MatthewMoye/who-is-live](https://github.com/MatthewMoye/who-is-live) — since heavily rewritten (Twitch-only, Manifest V3, new UI and features).

Thanks to [**xezrunner**](https://github.com/xezrunner) for helping with the Manifest V3 migration and much more.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details, and [CHANGELOG.md](CHANGELOG.md) for release history.
