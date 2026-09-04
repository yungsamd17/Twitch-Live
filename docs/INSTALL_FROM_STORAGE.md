# Installing and testing the extension locally

This guide applies to Google Chrome or other Chromium-based browsers (e.g. Brave, Edge, Opera, etc.)

Logging in with Twitch requires registering the locally installed extension's unique identifier in the Twitch developer console. **Authentication will not succeed in local installations otherwise.**

## Installing the extension

1. Clone the repository with Git or [download and unzip the latest release (`.zip`)](https://github.com/yungsamd17/Twitch-Live/releases/latest).
2. Visit your browser's **Extensions** page (enter `chrome://extensions` into address bar) and turn on **Developer mode**.
3. Click on the **Load unpacked** button and select the root directory of the extension.

   ![screenshot1](https://i.imgur.com/uu44PIC.png)

## Registering the extension with Twitch

To log in to the extension with your Twitch account, your unique extension ID has to be registered with Twitch.  
This is done for security reasons from Twitch's side. Not registering your local install will not let you log in with Twitch.

1. Visit https://dev.twitch.tv/console and click **Register Your Application**.
2. Enter a name into the **Name** field (e.g. `YOUR-USERNAME-live-extension`, this does not have to be anything specific)
3. Enter the following link into the **OAuth Redirect URLs** field:

   `https://YOUR-EXTENSION-ID.chromiumapp.org/`

   Replace `YOUR-EXTENSION-ID` with your unique extension identifier.  
   This changes with every unpacked extension install. If you reinstall the extension, you'll have to re-register the app with the new identifier.

   You can find the extension ID below the extension name and description on the Extensions page (`chrome://extensions`):

![screenshot2](https://i.imgur.com/hxPXUtd.png)

4. Under **Category**, select **Browser Extension**.  
   Under **Client Type**, select **Confidential**, then press **Create**.
5. After creating the Application, copy the **Client ID** (a public application identifier, not a secret).
6. Open `src/js/background.js` in any text/code editor and find the line near the top that declares the token:

   ```js
   const TWITCH_APP_TOKEN = "veho7ytn25l8a9dpgfkk79sqgey43j";
   ```

   Replace **only the text between the quotes** with your copied Client ID, keeping the quotes:

   ```js
   const TWITCH_APP_TOKEN = "YOUR-COPIED-CLIENT-ID";
   ```

   Do not edit the `` `?client_id=${TWITCH_APP_TOKEN}` `` line inside `getTwitchAuth()` — that `${...}` placeholder must stay as-is, otherwise the file breaks with `Uncaught SyntaxError: Invalid or unexpected token`.
7. Refresh the extension on the Extensions page with the refresh button.
8. Open the extension and log in with your account.

Happy testing!

## Troubleshooting

- **`Uncaught SyntaxError: Invalid or unexpected token` in `background.js` + blank popup:** the Client ID was pasted over the `${TWITCH_APP_TOKEN}` placeholder (or without its surrounding quotes). Undo that edit and follow step 6 exactly — only the quoted value on the `const TWITCH_APP_TOKEN = "...";` line changes.
- **Login fails or loops back to the login screen:** your extension ID most likely isn't registered, or it changed after reinstalling the extension. Re-check step 3 — the redirect URL must exactly match `https://YOUR-EXTENSION-ID.chromiumapp.org/`.
- **Popup opens but stays blank (no login screen, no errors):** on mobile or other browsers without popup DevTools, open the extension's Settings (gear icon) and tap the version number at the bottom 5 times — a diagnostics panel appears with a Copy button. (If the content area stays empty, the panel also opens by itself after a few seconds.) Paste the report into a GitHub issue. Your access token is never included (shown as `set`/`unset` only).
- **Logged out unexpectedly:** Twitch tokens expire or get revoked. The extension re-checks your login hourly and signs you out if Twitch rejects it — just log in again.
- **No live channels showing:** make sure you're logged in and follow channels that are currently live. Press the popup's refresh button; fresh data otherwise arrives on the background schedule (every 5 minutes by default, configurable in the extension settings).
