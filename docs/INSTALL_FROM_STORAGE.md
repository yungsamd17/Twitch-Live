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
5. After creating the Application, copy the **Client ID**.
6. Open `background.js` in any text/code editor and replace existing `TWITCH_APP_TOKEN` value with the copied value.
7. Refresh the extension on the Extensions page with the refresh button.
8. Open the extension and log in with your account.

Happy testing!
