const contentSection = document.getElementById("content");
const filterInput = document.getElementById("searchStreams");
const refreshButton = document.getElementById("refreshButton");

const authScreenPresent = () => {
    return contentSection.querySelector(".auth-header");
};

const setNavbar = (isVisible) => {
    const navbar = document.querySelector(".navbar");
    if (navbar) {
        if (isVisible) navbar.style.display = "block";
        else navbar.style.display = "none";
    }
}

const authScreen = () => {
    // Hide the navbar when creating the authentication screen
    setNavbar(false);

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
    authButton.onclick = () => chrome.runtime.sendMessage({ message: "fetch-twitch-auth-token", popup: true });
    contentSection.appendChild(authButton);
};

const formatViewerCount = (count) => {
    // Format viewer count with space-separated thousands
    return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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

const loadTwitchContent = async () => {
    const storageItems = ["twitchIsValidated", "twitchAccessToken", "twitchStreams"];
    const res = await chrome.storage.local.get(storageItems);

    // Always refresh Twitch streams when the popup is opened
    await refreshTwitchStreams();

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
};

const refreshTwitchStreams = async () => {
    await chrome.runtime.sendMessage({ message: "refresh-twitch-streams" });
};

// Function to handle the refresh button click
const handleRefreshButtonClick = () => {
    filterInput.value = ""; // Clear the search input
    loadTwitchContent();
};

// Event listeners for the search input and refresh button
filterInput.addEventListener("input", loadTwitchContent);
refreshButton.addEventListener("click", handleRefreshButtonClick);

// Initial load
addEventListener("DOMContentLoaded", async () => { 
    await loadTwitchContent();
    if (authScreenPresent()) return;
    setupAutoRefresh();
});

const setupAutoRefresh = () => {
    // Automatically refresh streams every minute (when popup is "open")
    window.setInterval(async () => {
        await loadTwitchContent();
    }, 1000 * 60);

    return true;
};

// Reload popup on successful authentication
chrome.runtime.onMessage.addListener(async (request) => {
    if (request.message === "popup-auth-success") {
        // Remove all elements that have class starting with "auth"
        const authElements = document.querySelectorAll("[class^=auth]");
        authElements.forEach((element) => element.remove());

        // Show the navbar
        setNavbar(true);

        await loadTwitchContent();
        setupAutoRefresh();
    }
});