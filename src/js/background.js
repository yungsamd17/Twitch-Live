// Define a variable to store the number of live channels
let liveChannelsCount = 0;

// Function to update the badge text and color
const updateBadge = () => {
    const badgeText = liveChannelsCount > 0 ? liveChannelsCount.toString() : "";
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: "#67676b" });
};

// Twitch app token
const TWITCH_APP_TOKEN = "veho7ytn25l8a9dpgfkk79sqgey43j";
const redirectURL = chrome.identity.getRedirectURL();

// Function to send live channels count to the popup and update badge
const sendLiveChannelsCountToPopup = () => {
    chrome.runtime.sendMessage({ message: "update-badge", liveChannelsCount });
    updateBadge();
};

// Function to handle Twitch unauthorized state
const handleTwitchUnauthorized = () => {
    chrome.storage.local.set({
        twitchAccessToken: null,
        twitchIsValidated: false,
        twitchUserId: null,
        twitchStreams: null,
    });
};

// Function to validate the Twitch access token
const validateTwitchToken = async () => {
    chrome.storage.local.get("twitchAccessToken", async (res) => {
        const accessToken = res.twitchAccessToken;
        if (!accessToken) return;
        await fetch("https://id.twitch.tv/oauth2/validate", {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            .then((response) => response.json())
            .then((response) => {
                if (response.expires_in === 0) {
                    handleTwitchUnauthorized();
                } else {
                    chrome.storage.local.set({
                        twitchIsValidated: true,
                        twitchUserId: response["user_id"],
                    });
                    getLiveTwitchStreams();
                }
            })
            .catch((error) => {
                handleTwitchUnauthorized();
                console.error(error);
            });
    });
};

// Function to store the Twitch access token
const storeTwitchToken = (url) => {
    if (url) {
        const tokenParam = url.split("#")[1];
        if (tokenParam) {
            const token = tokenParam.split("=")[1].split("&")[0];
            chrome.storage.local.set({ twitchAccessToken: token });
            validateTwitchToken();
        } else {
            console.error("Token parameter not found in the URL");
        }
    } else {
        console.error("URL is undefined");
    }
};

// Function to initiate Twitch authentication
const getTwitchAuth = () => {
    const authPage =
        `https://id.twitch.tv/oauth2/authorize` +
        `?client_id=${TWITCH_APP_TOKEN}` +
        `&response_type=token` +
        `&redirect_uri=${redirectURL}` +
        "&scope=user:read:follows&force_verify=true";
    chrome.identity.launchWebAuthFlow({ interactive: true, url: authPage },
        storeTwitchToken
    );
};

// Set interval to validate Twitch token periodically
setInterval(validateTwitchToken, 1000 * 60 * 60);
validateTwitchToken();

// Listen for messages to fetch Twitch auth token
chrome.runtime.onMessage.addListener((request) => {
    if (request.message === "fetch-twitch-auth-token") {
        getTwitchAuth();
    }
});

// Function to get live Twitch streams
const getLiveTwitchStreams = async () => {
    const storageItems = [
        "twitchIsValidated",
        "twitchAccessToken",
        "twitchUserId",
    ];
    chrome.storage.local.get(storageItems, (res) => {
        if (!res.twitchIsValidated) return;
        const followUrl =
            "https://api.twitch.tv/helix/streams/followed" +
            `?&first=100&user_id=${res.twitchUserId}`;
        fetch(followUrl, {
                headers: {
                    Authorization: `Bearer ${res.twitchAccessToken}`,
                    "Client-ID": TWITCH_APP_TOKEN,
                },
            })
            .then((response) => {
                if (response.status !== 200) {
                    handleTwitchUnauthorized();
                    throw new Error("An error occurred");
                }
                return response.json();
            })
            .then((response) => {
                chrome.storage.local.set({
                    twitchStreams: response.data.map((stream) => ({
                        gameName: stream["game_name"],
                        thumbnail: stream["thumbnail_url"],
                        title: stream["title"],
                        channelName: stream["user_name"],
                        viewerCount: stream["viewer_count"],
                        liveTime: getTimePassed(stream["started_at"]),
                    })),
                });

                liveChannelsCount = response.data.length; // Update live channels count
                sendLiveChannelsCountToPopup(); // Send live channels count to the popup
            })
            .catch((error) => {
                handleTwitchUnauthorized();
                console.error(error);
            });
    });
};

// Listen for messages to refresh Twitch streams
chrome.runtime.onMessage.addListener((request) => {
    if (request.message === "refresh-twitch-streams") {
        getLiveTwitchStreams();
    }
});

// Function to get formatted time passed since stream started
const getTimePassed = (startTime) => {
    let elapsedTime = Date.now() - Date.parse(startTime);
    const hours = Math.floor(elapsedTime / 3600000);
    const minutes = Math.floor((elapsedTime % 3600000) / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);

    const format = (s) => (s < 10 ? `0${s}` : s);

    const formattedHours = hours > 0 ? `${hours}:` : '';
    const formattedMinutes = hours > 0 || minutes >= 10 ? format(minutes) : minutes;
    const formattedSeconds = `${format(seconds)}`;

    return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
};

// Function to handle the periodic update of streams
const updateStreamsPeriodically = () => {
    // Refresh Twitch streams in the background
    chrome.runtime.sendMessage({ message: "refresh-twitch-streams" });

    // Update the badge count based on the latest data
    chrome.storage.local.get("twitchStreams", (res) => {
        if (res.twitchStreams) {
            liveChannelsCount = res.twitchStreams.length;
            updateBadge();
        }
    });
};

// Update streams update every 5 minutes
chrome.alarms.create("updateStreamsAlarm", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(updateStreamsPeriodically);

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "update-badge") {
        updateBadge();
    }
});

// Initial update when the extension is loaded
updateStreamsPeriodically();
