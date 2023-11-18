// Define a variable to store the number of live channels
let liveChannelsCount = 0;

// Function to update the badge text and color on the extension icon
const updateBadge = () => {
    const badgeText = liveChannelsCount > 0 ? liveChannelsCount.toString() : "";
    chrome.browserAction.setBadgeText({ text: badgeText });
    chrome.browserAction.setBadgeBackgroundColor({ color: "#67676b" });
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

// Update streams update every 10 minutes
chrome.alarms.create("updateStreamsAlarm", { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener(updateStreamsPeriodically);

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "update-badge") {
        updateBadge();
    }
});

// Initial update when the extension is loaded
updateStreamsPeriodically();
