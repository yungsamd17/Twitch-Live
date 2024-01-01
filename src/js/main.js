const contentSection = document.getElementById("content");
const filterInput = document.getElementById("searchStreams");
const refreshButton = document.getElementById("refreshButton");

const authScreenPresent = () => {
    return contentSection.querySelector(".auth-header");
};

const authScreen = () => {
    // Hide the navbar when creating the authentication screen
    const hideNavbar = document.querySelector(".navbar");
    if (hideNavbar) {
        hideNavbar.style.display = "none";
    }

    const authHeader = document.createElement("span");
    authHeader.setAttribute("class", "auth-header");
    authHeader.innerHTML = "Sam's Twitch ";
    const authHeaderAccent = document.createElement("span");
    authHeaderAccent.setAttribute("class", "accent-color");
    authHeaderAccent.innerHTML = "Live";
    authHeader.appendChild(authHeaderAccent);
    contentSection.appendChild(authHeader);

    const authText = document.createElement("span");
    authText.setAttribute("class", "auth-text");
    authText.innerHTML = "To see the Live channels you follow, log in by authenticating the extension with your Twitch Account.";
    contentSection.appendChild(authText);

    const authButton = document.createElement("button");
    authButton.setAttribute("id", "auth-button");
    authButton.setAttribute("class", "auth-button");
    authButton.innerHTML = "Login with Twitch";
    authButton.onclick = () => chrome.runtime.sendMessage({ message: "fetch-twitch-auth-token" });
    contentSection.appendChild(authButton);

    const authLoginText = document.createElement("span");
    authLoginText.setAttribute("class", "auth-text auth-text-after");
    authLoginText.innerHTML = "After logging in reopen the extension.";
    contentSection.appendChild(authLoginText);
};

const formatViewerCount = (count) => {
    // Format viewer count with space-separated thousands
    return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// Define a variable to store the number of live channels
let liveChannelsCount = 0;

// Function to update the badge text and color on the extension icon
const updateBadge = () => {
    const badgeText = liveChannelsCount > 0 ? liveChannelsCount.toString() : "";
    chrome.browserAction.setBadgeText({ text: badgeText });
    chrome.browserAction.setBadgeBackgroundColor({ color: "#67676b" });
};

// Open stream in new window and player settings
const openStream = (stream) => {
    const openInPlayerToggle = document.getElementById("openInPlayerToggle");
    const openInNewWindowToggle = document.getElementById("openInNewWindowToggle");

    if (openInPlayerToggle && openInNewWindowToggle) {
        const openInPlayer = openInPlayerToggle.checked;
        const openInNewWindow = openInNewWindowToggle.checked;

        const baseStreamUrl = `https://www.twitch.tv/${stream.channelName}`;
        let url;

        if (openInPlayer) {
            url = `https://player.twitch.tv/?channel=${stream.channelName}&parent=twitch-live`;
        } else {
            url = baseStreamUrl;
        }

        if (openInNewWindow) {
            chrome.windows.create({ url, type: 'popup' });
        } else {
            // Open in a new tab
            chrome.tabs.create({ url });
        }
    }
};

const loadTwitchContent = () => {
    const storageItems = ["twitchIsValidated", "twitchAccessToken", "twitchStreams"];
    chrome.storage.local.get(storageItems, (res) => {
        // Always refresh Twitch streams when the popup is opened
        refreshTwitchStreams();

        if (authScreenPresent()) {
            return; // Skip refreshing streams when authScreen is present
        }

        if (res.twitchStreams) {
            const query = filterInput.value.toLowerCase();
            const filteredStreams = res.twitchStreams.filter(
                (stream) =>
                    stream.channelName.toLowerCase().includes(query) ||
                    stream.title.toLowerCase().includes(query) ||
                    stream.gameName.toLowerCase().includes(query)
            );

            if (filteredStreams.length > 0) {
                const streamList = filteredStreams.map((stream) => {
                    const streamContainer = document.createElement("div");
                    streamContainer.setAttribute("class", "stream-container");
                    streamContainer.onclick = () => openStream(stream);

                    const streamThumbnail = document.createElement("div");
                    streamThumbnail.setAttribute("class", "stream-thumbnail");
                    streamContainer.appendChild(streamThumbnail);

                    const uptime = document.createElement("div");
                    uptime.setAttribute("class", "stream-uptime");
                    uptime.innerHTML = `${stream.liveTime}`;
                    streamThumbnail.appendChild(uptime);

                    const thumbnail = document.createElement("img");
                    thumbnail.src = stream.thumbnail
                        .replace("{width}", "128")
                        .replace("{height}", "72");
                    streamThumbnail.appendChild(thumbnail);

                    const streamDetails = document.createElement("div");
                    streamDetails.setAttribute("class", "stream-details");
                    streamContainer.appendChild(streamDetails);

                    const channel = document.createElement("span");
                    channel.setAttribute("class", "stream-channel-name");
                    channel.innerHTML = stream.channelName;
                    streamDetails.appendChild(channel);

                    const categoryAndViewCount = document.createElement("span");
                    categoryAndViewCount.setAttribute("class", "stream-game-and-viewers");
                    categoryAndViewCount.innerHTML = `${stream.gameName} - ${formatViewerCount(stream.viewerCount)} viewers`;
                    streamDetails.appendChild(categoryAndViewCount);

                    const title = document.createElement("span");
                    title.setAttribute("class", "stream-title");
                    title.innerHTML = stream.title;
                    title.setAttribute("title", stream.title);
                    streamDetails.appendChild(title);

                    return streamContainer;
                });

                contentSection.replaceChildren(...streamList);

                // Update the badge count based on the latest data
                liveChannelsCount = res.twitchStreams.length;

                //updateBadge();
            } else {
                // Display a message when no matching results are found
                const noResultsMessage = document.createElement("div");
                noResultsMessage.setAttribute("class", "no-search-results");
                noResultsMessage.innerHTML = "No matching Search results found.";
                contentSection.replaceChildren(noResultsMessage);
            }
        } else if (!res.twitchIsValidated || !res.twitchAccessToken) {
            authScreen();
        }
    });
};

const refreshTwitchStreams = () => {
    chrome.runtime.sendMessage({ message: "refresh-twitch-streams" });
};

// Function to handle the refresh button click
const handleRefreshButtonClick = () => {
    filterInput.value = ""; // Clear the search input
    refreshTwitchStreams();
    loadTwitchContent();
};

// Event listeners for the search input and refresh button
filterInput.addEventListener("input", loadTwitchContent);
refreshButton.addEventListener("click", handleRefreshButtonClick);

// Initial load
loadTwitchContent();

// Automatically refresh streams every minute (when popup is "open")
setInterval(() => {
    refreshTwitchStreams();
    loadTwitchContent();
}, 1000 * 60);
/*}, 100000 * 60);*/


chrome.runtime.onMessage.addListener((request) => {
    if (request.message === "update-badge") {
        const badgeText = request.liveChannelsCount > 0 ? request.liveChannelsCount.toString() : "";
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: "#67676b" });
    }
});
