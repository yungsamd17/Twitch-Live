importScripts('util.js');

// Set up message listeners and refresh data on browser startup and extension reload (dev/unpacked)
const launch = async () => {
    // Listen for messages to fetch Twitch auth token
    chrome.runtime.onMessage.addListener(async (request) => {
        if (request.message === "fetch-twitch-auth-token") {
            const result = await getTwitchAuth();

            if (result === true && request.popup === true) {
                await chrome.runtime.sendMessage({ message: "popup-auth-success" });
            }
        }
        
        return true;
    });

    // Listen for messages to refresh Twitch streams
    chrome.runtime.onMessage.addListener(async (request) => {
        if (request.message === "refresh-twitch-streams") {
            console.log("Refreshing Twitch streams...");
            await getLiveTwitchStreams();
        }
        return true;
    });

    // Create an alarm to validate Twitch token every hour
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === "validateTwitchTokenAlarm") {
            validateTwitchToken();
        }
    });
    chrome.alarms.create("validateTwitchTokenAlarm", { periodInMinutes: 60 });

    // Update streams update every 5 minutes
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === "updateStreamsAlarm") {
            updateStreamsPeriodically();
        }
    });
    chrome.alarms.create("updateStreamsAlarm", { periodInMinutes: 5 });

    // NOTE: it is necessary to await these, otherwise the functions would run in parallel, before the streams are fetched.
    await validateTwitchToken();
    await getLiveTwitchStreams();
    await updateBadge();
}

chrome.runtime.onStartup.addListener(async () => launch());
chrome.runtime.onInstalled.addListener(async () => launch());

// Store the number of live channels
// In Manifest V3, we have to use storage for this, as the service worker is not persistent
chrome.storage.local.set({ liveChannelsCount: 0 });

// Function that returns the number of live channels
const getLiveChannelsCount = async () => {
    let result = await chrome.storage.local.get("liveChannelsCount");
    return result.liveChannelsCount;
};

// Function to update the badge text and color
const updateBadge = async () => {
    const liveChannelsCount = await getLiveChannelsCount();
    const badgeText = liveChannelsCount > 0 ? liveChannelsCount.toString() : "";
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: "#67676b" });
};

// Twitch app token
const TWITCH_APP_TOKEN = "veho7ytn25l8a9dpgfkk79sqgey43j";
const redirectURL = chrome.identity.getRedirectURL();

// Function to handle Twitch unauthorized state
const handleTwitchUnauthorized = () => {
    chrome.storage.local.set({
        twitchAccessToken: null,
        twitchIsValidated: false,
        twitchUserId: null,
        twitchStreams: null,
    });
};

// Function to store the Twitch access token
const storeTwitchToken = async (url) => {
    if (url) {
        const tokenParam = url.split("#")[1];
        if (tokenParam) {
            const token = tokenParam.split("=")[1].split("&")[0];
            chrome.storage.local.set({ twitchAccessToken: token });
            await validateTwitchToken();
        } else {
            console.error("Token parameter not found in the URL");
        }
    } else {
        console.error("URL is undefined");
    }
    return true;
};

// Function to initiate Twitch authentication
const getTwitchAuth = async () => {
    const authPage =
        `https://id.twitch.tv/oauth2/authorize` +
        `?client_id=${TWITCH_APP_TOKEN}` +
        `&response_type=token` +
        `&redirect_uri=${redirectURL}` +
        "&scope=user:read:follows&force_verify=true";

    try {
        const result = await chrome.identity.launchWebAuthFlow({ interactive: true, url: authPage });
        await storeTwitchToken(result);
        return true;
    } catch (error) {
        console.error(error);
    }
    
    return false;
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
            .then(async (response) => {
                if (response.expires_in === 0) {
                    handleTwitchUnauthorized();
                } else {
                    chrome.storage.local.set({
                        twitchIsValidated: true,
                        twitchUserId: response["user_id"],
                    });
                }
            })
            .catch((error) => {
                handleTwitchUnauthorized();
                console.error(error);
            });
    });
    return true;
};



// Function to get live Twitch streams
const getLiveTwitchStreams = async () => {

    const storageItems = [
        "twitchIsValidated",
        "twitchAccessToken",
        "twitchUserId",
    ];

    chrome.storage.local.get(storageItems, (res) => {
        if (!res.twitchIsValidated) return;

        const followUrl = "https://api.twitch.tv/helix/streams/followed" + `?&first=100&user_id=${res.twitchUserId}`;
        fetch(followUrl, {
            headers: {
                Authorization: `Bearer ${res.twitchAccessToken}`,
                "Client-ID": TWITCH_APP_TOKEN,
            },
        }
        ).then((response) => {
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

                chrome.storage.local.set({ liveChannelsCount: response.data.length }); // Store live channels count
                updateBadge(); // Update badge
            })
            .catch((error) => {
                handleTwitchUnauthorized();
                console.error(error);
            });
    });
};

// Function to handle the periodic update of streams
const updateStreamsPeriodically = () => {
    // Refresh Twitch streams in the background
    getLiveTwitchStreams();

    // Update the badge count based on the latest data
    chrome.storage.local.get("twitchStreams", (res) => {
        if (res.twitchStreams) {
            chrome.storage.local.set({ liveChannelsCount: res.twitchStreams.length });
            updateBadge();
        }
    });
};