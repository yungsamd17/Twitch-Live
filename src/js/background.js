importScripts('util.js');

// Set up listeners and alarms: 
//
// Listen for messages to fetch Twitch auth token
chrome.runtime.onMessage.addListener(async (request) => {
    if (request.message === "fetch-twitch-auth-token") {
        const result = await getTwitchAuth();
        if (result === true && request.popup === true) {
            await getLiveTwitchStreams();
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

let lastUpdate = new Date();

// Update streams (badge) in background, periodically
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "updateStreamsAlarm") {
        const updateTime = new Date();
        const diff = Math.abs(updateTime - lastUpdate);
        const diffSeconds = diff / 1000;

        console.log(`Stream update alarm at ${updateTime.toTimeString().slice(0,8)} :: difference to previous: ${lastUpdate.toTimeString().slice(0,8)} (${diffSeconds} seconds)`);

        lastUpdate = updateTime;

        updateStreamsPeriodically();
    }
});

const createUpdateStreamsAlarm = (updateRateMin) => {
    chrome.alarms.get("updateStreamsAlarm", (alarm) => {
        // console.log(`[debug] creating background refresh alarm:`)
        // console.log("  - before clear: updateStreamsAlarm get: ", alarm);
    });

    chrome.alarms.clear("updateStreamsAlarm", (wasCleared) => {
        // console.log("    | updateStreamsAlarm wasCleared: ", wasCleared);
    });

    chrome.alarms.get("updateStreamsAlarm", (alarm) => {
        // console.log("  - after clear: updateStreamsAlarm get: ", alarm);
    });

    chrome.alarms.create("updateStreamsAlarm", { periodInMinutes: updateRateMin });

    chrome.alarms.get("updateStreamsAlarm", (alarm) => {
        // console.log("[debug] new alarm: updateStreamsAlarm get: ", alarm);
    });
};

chrome.storage.local.get({ backgroundUpdateRateMin: 5 }, (data) => {
    value = data.backgroundUpdateRateMin;
    console.log(`[startup] Background update rate: ${value} minutes`);
    createUpdateStreamsAlarm(value);
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.backgroundUpdateRateMin !== undefined) {
        const newValue = changes.backgroundUpdateRateMin.newValue;
        console.log(`[config] Background update rate changed: ${newValue} minutes`)
        createUpdateStreamsAlarm(newValue);
    }
});

// Set up message listeners and refresh data on browser startup and extension reload (dev/unpacked)
const launch = async () => {
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

    // Retrieve custom badge color from local storage
    chrome.storage.local.get("customBadgeColor", (result) => {
        const badgeColor = result.customBadgeColor || "#666666";
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    });
};

// Twitch app token
const TWITCH_APP_TOKEN = "rcailimmjedyclwyf2u3xjw5xnt7j6";
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
    const res = await chrome.storage.local.get("twitchAccessToken");

    const accessToken = res.twitchAccessToken;
    if (!accessToken) return;

    try {
        let response = await fetch("https://id.twitch.tv/oauth2/validate", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.status !== 200) {
            throw new Error(error);
        }
        response = await response.json();

        if (response.expires_in === 0) {
            handleTwitchUnauthorized();
            throw new Error("Token expiry was 0.");
        } else {
            await chrome.storage.local.set({
                twitchIsValidated: true,
                twitchUserId: response["user_id"],
            });
        }
    } catch (error) {
        handleTwitchUnauthorized();
        console.error(error);
    }
};

// Function to get live Twitch streams
const getLiveTwitchStreams = async () => {
    const storageItems = [
        "twitchIsValidated",
        "twitchAccessToken",
        "twitchUserId",
    ];

    const res = await chrome.storage.local.get(storageItems);
    if (!res.twitchIsValidated) return;

    const followUrl = "https://api.twitch.tv/helix/streams/followed" + `?&first=100&user_id=${res.twitchUserId}`;
    try {
        let response = await fetch(followUrl, {
            headers: {
                Authorization: `Bearer ${res.twitchAccessToken}`,
                "Client-ID": TWITCH_APP_TOKEN,
            },
        });

        if (response.status !== 200) {
            throw new Error("Response status: " + response.status);
        }

        response = await response.json();

        await chrome.storage.local.set({
            twitchStreams: response.data.map((stream) => ({
                gameName: stream["game_name"],
                thumbnail: stream["thumbnail_url"],
                title: stream["title"],
                channelName: stream["user_name"],
                viewerCount: stream["viewer_count"],
                liveTime: getTimePassed(stream["started_at"]),
                startedAt: getStartedAtTime(stream["started_at"]),
            })),
        });

        chrome.storage.local.set({ liveChannelsCount: response.data.length }); // Store live channels count
        updateBadge(); // Update badge
    } catch (error) {
        handleTwitchUnauthorized();
        console.error(error);
    }
    return true;
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