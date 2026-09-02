importScripts('util.js');

// Set up listeners and alarms
chrome.runtime.onMessage.addListener((request) => {
    (async () => {
        if (request.message === "fetch-twitch-auth-token") {
            const result = await getTwitchAuth();
            if (result === true && request.popup === true) {
                await getLiveTwitchStreams();
                chrome.runtime.sendMessage({ message: "popup-auth-success" }).catch(() => {});
            }
        } else if (request.message === "refresh-twitch-streams") {
            console.log("Refreshing Twitch streams...");
            await getLiveTwitchStreams();
        }
    })();
    return true;
});

chrome.alarms.create("validateTwitchTokenAlarm", { periodInMinutes: 60 });

let lastUpdate = new Date();

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "validateTwitchTokenAlarm") {
        validateTwitchToken();
    } else if (alarm.name === "updateStreamsAlarm") {
        const updateTime = new Date();
        const diff = Math.abs(updateTime - lastUpdate);
        const diffSeconds = diff / 1000;

        console.log(`Stream update alarm at ${updateTime.toTimeString().slice(0,8)} :: difference to previous: ${lastUpdate.toTimeString().slice(0,8)} (${diffSeconds} seconds)`);

        lastUpdate = updateTime;

        updateStreamsPeriodically();
    }
});

const createUpdateStreamsAlarm = async (updateRateMin) => {
    await chrome.alarms.clear("updateStreamsAlarm");
    await chrome.alarms.create("updateStreamsAlarm", { periodInMinutes: updateRateMin });
};

chrome.storage.local.get({ backgroundUpdateRateMin: 5 }, (data) => {
    const value = data.backgroundUpdateRateMin;
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
// Initial value is set only on install; fallback to 0 otherwise (avoid clobber on every SW wake)

// Function that returns the number of live channels
const getLiveChannelsCount = async () => {
    let result = await chrome.storage.local.get({ liveChannelsCount: 0 });
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
    if (!url) {
        console.error("URL is undefined");
        return false;
    }
    try {
        const hash = new URL(url).hash.slice(1);
        const token = new URLSearchParams(hash).get("access_token");
        if (token) {
            chrome.storage.local.set({ twitchAccessToken: token });
            await validateTwitchToken();
            return true;
        }
        console.error("Token parameter not found in the URL");
    } catch (e) {
        console.error(e);
    }
    return false;
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
            throw new Error('validate failed: ' + response.status);
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
        const msg = String(error && error.message || '');
        if (msg.includes('401') || msg.includes('403') || msg.includes('Token expiry')) {
            handleTwitchUnauthorized();
        }
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

    const followUrl = "https://api.twitch.tv/helix/streams/followed" + `?first=100&user_id=${res.twitchUserId}`;
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
                startedAt: stream["started_at"],
                startedAtDisplay: getStartedAtTime(stream["started_at"]),
                startedAtISO: stream["started_at"],
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
const updateStreamsPeriodically = async () => {
    await getLiveTwitchStreams();
    await updateBadge();
};