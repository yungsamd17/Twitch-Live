# How to Install unpacked extension (from storage)

Here is guide on how to install an unpacked extension on Google Chrome or Chromium-based browsers (e.g. Brave, Edge, Opera) and create your Twitch App to use for auth to login with.

1. Download the latest release `.zip` [here](https://github.com/yungsamd17/Twitch-Live/releases/latest) 
2. Unzip the folder and place the folder somewhere you might not remove it by mistake
3. Open the **"Extensions"** page *`chrome://extensions/`* in the browser and turn on the **"Developer mode"**

![screenshot1](https://i.imgur.com/uu44PIC.png)

4. Click on the **"Load unpacked"** button and select the directory of the extension
5. Now go to https://dev.twitch.tv/console and click **"Register Your Application"**
6. For **"Name"** make it something like `YOUR-USERNAME-live-extension` or anything you wish
7. For **"OAuth Redirect URLs"** `https://YOUR-EXTENSION-ID.chromiumapp.org/`
8. `YOUR-EXTENSION-ID` change with your ID on the unpaced extension

![screenshot2](https://i.imgur.com/hxPXUtd.png)

9. Under **"Category"** select "Browser Extension", under **"Client Type"** select "Confidential" and then press **"Create"**
10. Now after creating the Application copy **"Client ID"**
11. Open `background.js` in any text/code editor and change the `TWITCH_APP_TOKEN`
12. Now you just need to refresh the extension in the *`chrome://extensions/`* with the refresh button 
13. And now are done, ready to login to the extension and use it.

Enjoy 😊