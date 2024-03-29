const contentSection = document.getElementById("content");
const filterInput = document.getElementById("searchStreams");
const refreshButton = document.getElementById("refreshButton");

const authScreenPresent = () => {
    return contentSection.querySelector(".auth-header");
};

const authScreen = () => {
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
    authButton.innerHTML = `<i class="fa-brands fa-twitch"></i>&nbsp;&nbsp;Login with Twitch`;

    authButton.onclick = () => chrome.runtime.sendMessage({ message: "fetch-twitch-auth-token", popup: true });
    contentSection.appendChild(authButton);
};

const formatViewerCount = (count) => {
    // Format viewer count with space-separated thousands
    return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

        // Open in a new window
        if (openInNewWindow) {
            if (openInPlayer) {
                chrome.windows.create({ url, type: 'popup' });
            } else {
                chrome.windows.create({ url });
            }
        } else {
            // Open in a new tab
            chrome.tabs.create({ url });
        }
    }
};

const loadTwitchContent = async () => {
    const storageItems = ["twitchIsValidated", "twitchAccessToken", "twitchStreams", "showRaidButtonToggle"];
    const res = await chrome.storage.local.get(storageItems);

    // Check if Simple view is enabled
    const simpleViewToggle = document.getElementById("simpleViewToggle");
    const simpleViewEnabled = simpleViewToggle ? simpleViewToggle.checked : false;

    // Always refresh Twitch streams when the popup is opened
    await refreshTwitchStreams();

    if (authScreenPresent()) {
        return; // Skip refreshing streams when authScreen is present
    }

    if (res.twitchStreams) {
        let filteredStreams = [...res.twitchStreams];

        // Filter/Sort options
        const selectedFilter = getSelectedFilterOption();
        switch (selectedFilter) {
            case "Broadcaster":
                filteredStreams.sort((a, b) => (a.channelName > b.channelName ? 1 : -1));
                break;
            case "Category":
                filteredStreams.sort((a, b) => (a.gameName > b.gameName ? 1 : -1));
                break;
            case "Uptime":
                filteredStreams.sort((a, b) => {
                    const aUptime = new Date(a.startedAt).getTime();
                    const bUptime = new Date(b.startedAt).getTime();
                    return aUptime - bUptime;
                });
                break;
            case "Viewers (High to Low)":
                filteredStreams.sort((a, b) => b.viewerCount - a.viewerCount);
                break;
            case "Viewers (Low to High)":
                filteredStreams.sort((a, b) => a.viewerCount - b.viewerCount);
                break;
            case "Recently Started":
                filteredStreams.sort((a, b) => {
                    const aStarted = new Date(a.startedAt).getTime();
                    const bStarted = new Date(b.startedAt).getTime();
                    return bStarted - aStarted;
                });
                break;
            case "Longest Running":
                filteredStreams.sort((a, b) => {
                    const aStarted = new Date(a.startedAt).getTime();
                    const bStarted = new Date(b.startedAt).getTime();
                    const aRunning = a.runningAt ? new Date(a.runningAt).getTime() : Date.now();
                    const bRunning = b.runningAt ? new Date(b.runningAt).getTime() : Date.now();
                    const aDuration = aRunning - aStarted;
                    const bDuration = bRunning - bStarted;

                    // console.log("aDuration:", aDuration, "bDuration:", bDuration); // debugging
                    return bDuration - aDuration;
                });
                break;
            default:
                break;
        }

        const query = filterInput.value.toLowerCase();
        filteredStreams = filteredStreams.filter(
            (stream) =>
            stream.channelName.toLowerCase().includes(query) ||
            stream.title.toLowerCase().includes(query) ||
            stream.gameName.toLowerCase().includes(query)
        );

        if (filteredStreams.length > 0) {
            const streamList = filteredStreams.map((stream) => {
                const streamContainer = document.createElement("div");
                streamContainer.setAttribute("class", `stream-container ${simpleViewEnabled ? 'simpleview-stream-container' : ''}`);

                const streamThumbnail = document.createElement("div");
                streamThumbnail.setAttribute("class", `stream-thumbnail ${simpleViewEnabled ? 'simpleview-stream-thumbnail' : ''}`);
                streamContainer.appendChild(streamThumbnail);

                const uptime = document.createElement("div");
                uptime.setAttribute("class", "stream-uptime");
                uptime.innerHTML = `${stream.liveTime}`;
                uptime.setAttribute("title", `Live since ${stream.startedAt}`);
                streamThumbnail.appendChild(uptime);

                const thumbnail = document.createElement("img");
                thumbnail.src = stream.thumbnail
                    .replace("{width}", "128")
                    .replace("{height}", "72");
                streamThumbnail.appendChild(thumbnail);

                const streamDetails = document.createElement("div");
                streamDetails.setAttribute("class", `stream-details ${simpleViewEnabled ? 'simpleview-stream-details' : ''}`);
                streamContainer.appendChild(streamDetails);

                const channelContainer = document.createElement("div");
                channelContainer.setAttribute("class", "channel-container")
                streamDetails.appendChild(channelContainer);

                const channel = document.createElement("span");
                channel.setAttribute("class", "stream-channel-name");
                channel.innerHTML = stream.channelName;
                channelContainer.appendChild(channel);

                const raidButton = document.createElement("button");
                raidButton.setAttribute("class", "channel-raid-button");
                raidButton.innerHTML = `<i class="fa-regular fa-copy"></i>`
                raidButton.setAttribute("title", "Click to copy raid command");

                // Add the "hidden" class if the showRaidButtonToggle is disabled
                if (!res.showRaidButtonToggle) {
                    raidButton.classList.add("hidden");
                }

                // Function to show and hide timedAlert
                const showTimedAlert = (message) => {
                    const timedAlert = document.querySelector('.timed-alert');

                    // Check if the timedAlert is currently visible
                    if (timedAlert) {
                        // Remove the timedAlert from the DOM
                        document.body.removeChild(timedAlert);
                    }

                    // Create a new timedAlert
                    const newTimedAlert = document.createElement("div");
                    newTimedAlert.classList.add("timed-alert");
                    newTimedAlert.innerHTML = message;

                    document.body.appendChild(newTimedAlert);

                    // Set a timeout to remove the alert after 2 seconds
                    setTimeout(() => {
                        // Check if the newTimedAlert is still a child of document.body before attempting to remove it
                        if (document.body.contains(newTimedAlert)) {
                            document.body.removeChild(newTimedAlert);
                        }
                    }, 2500);
                };

                // Inside the raidButton.addEventListener callback
                raidButton.addEventListener("click", async (event) => {
                    event.stopPropagation();
                    // Handle raid button click - copy channel name with raid command
                    const raidCommand = `/raid ${stream.channelName}`;

                    // Create a temporary textarea to copy text to clipboard
                    const textArea = document.createElement("textarea");
                    textArea.value = raidCommand;
                    document.body.appendChild(textArea);
                    textArea.select();

                    // Copy text to clipboard
                    document.execCommand("copy");

                    // Remove the temporary textarea
                    document.body.removeChild(textArea);

                    console.log(`Raid command copied to clipboard: ${raidCommand}`);

                    // Call the helper function to show and hide the timedAlert
                    showTimedAlert(`Copied "${raidCommand}"`);
                });

                channelContainer.appendChild(raidButton);

                const streamViewerCount = document.createElement("div");
                streamViewerCount.setAttribute("class", "stream-viewers");
                streamViewerCount.innerHTML = `<i class="fa-solid fa-eye" style="color: #e74c3c;"></i> ${formatViewerCount(stream.viewerCount)}`;
                streamViewerCount.setAttribute("title", `${formatViewerCount(stream.viewerCount)} Viewers`);
                channelContainer.appendChild(streamViewerCount);

                const categoryAndViewCount = document.createElement("span");
                categoryAndViewCount.setAttribute("class", "stream-category");
                categoryAndViewCount.innerHTML = `${stream.gameName}`;
                categoryAndViewCount.setAttribute("title", `${stream.gameName}`);
                streamDetails.appendChild(categoryAndViewCount);

                const title = document.createElement("span");
                title.setAttribute("class", "stream-title");

                title.innerHTML = escapeHTML(stream.title);

                title.setAttribute("title", stream.title);
                streamDetails.appendChild(title);

                // Add the click event for the entire stream container
                streamContainer.addEventListener("click", () => openStream(stream));

                return streamContainer;
            });

            contentSection.replaceChildren(...streamList);
        } else {
            const searchTerm = filterInput.value.trim();

            // Display a message when no matching results are found
            const noResultsMessage = document.createElement("div");
            noResultsMessage.setAttribute("class", "no-search-results");

            const noResultsMessageText = document.createElement("p")
            noResultsMessageText.innerHTML = "No matching Search results found.";
            noResultsMessage.appendChild(noResultsMessageText)

            const searchOnTwitch = document.createElement("a")
            searchOnTwitch.setAttribute("class", "search-on-twitch-link")
            searchOnTwitch.setAttribute("href", `https://www.twitch.tv/search?term=${searchTerm}`)
            searchOnTwitch.setAttribute("target", "_blank")
            searchOnTwitch.innerHTML = `Search on Twitch&nbsp;<i class="fa-solid fa-arrow-up-right-from-square search-on-twitch-link-icon"></i>`
            noResultsMessage.appendChild(searchOnTwitch)

            contentSection.replaceChildren(noResultsMessage);
        }

        // Show logout button after login/when logged in
        document.getElementById("logoutBtn").style.display = "block";

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

// Open "Twitch Live Following" navbar button link
document.getElementById('openTwitchLiveFollowing').addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://www.twitch.tv/directory/following/live' });
});

// Raid command button toggle
document.getElementById("showRaidButtonToggle").addEventListener("change", async function() {
    await chrome.storage.local.set({ showRaidButtonToggle: this.checked });

    // Refresh Twitch streams immediately upon toggling the raid button visibility
    await loadTwitchContent();
});

// Function to get the selected filter option
const getSelectedFilterOption = () => {
    const broadcasterButton = document.getElementById("broadcasterButton");
    const categoryButton = document.getElementById("categoryButton");
    const viewersHighToLowButton = document.getElementById("viewersHighToLowButton");
    const viewersLowToHighButton = document.getElementById("viewersLowToHighButton");
    const startedButton = document.getElementById("startedButton");
    const runningButton = document.getElementById("runningButton");

    if (broadcasterButton && broadcasterButton.classList.contains("active")) {
        return "Broadcaster";
    } else if (categoryButton && categoryButton.classList.contains("active")) {
        return "Category";
    } else if (viewersHighToLowButton && viewersHighToLowButton.classList.contains("active")) {
        return "Viewers (High to Low)";
    } else if (viewersLowToHighButton && viewersLowToHighButton.classList.contains("active")) {
        return "Viewers (Low to High)";
    } else if (startedButton && startedButton.classList.contains("active")) {
        return "Recently Started";
    } else if (runningButton && runningButton.classList.contains("active")) {
        return "Longest Running";
    }

    return "viewersHighToLowButton"; // Default filter option
};

// Function to set the selected filter option
const setSelectedFilterOption = (buttonId) => {
    // Remove the 'active' class from all filter buttons
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => button.classList.remove('active'));

    // Add the 'active' class to the clicked filter button
    const selectedButton = document.getElementById(buttonId);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
};

// Event listeners for the filter buttons
const filterButtons = document.querySelectorAll('.filter-button');
filterButtons.forEach(button => {
    button.addEventListener('click', function() {
        const buttonId = this.id;
        setSelectedFilterOption(buttonId);
        loadTwitchContent(); // Reload content based on the selected filter
    });
});

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
    }, 1000 * 30);

    return true;
};

// Reload popup on successful authentication
chrome.runtime.onMessage.addListener(async (request) => {
    if (request.message === "popup-auth-success") {
        // Remove all elements that have class starting with "auth"
        const authElements = document.querySelectorAll("[class^=auth]");
        authElements.forEach((element) => element.remove());

        await loadTwitchContent();
        setupAutoRefresh();
    }
});

// Right click context menu
let contextMenu = document.getElementById("context-menu");
let currentChannelName = null;
let currentCategoryName;

document.addEventListener('contextmenu', (event) => {
    const streamContainer = event.target.closest('.stream-container');
    if (streamContainer) {
        event.preventDefault();
        currentChannelName = streamContainer.querySelector('.stream-channel-name').innerHTML.trim();
        currentCategoryName = streamContainer.querySelector('.stream-category').innerText.split(' - ')[0].trim();
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        hideContextMenu();
        showContextMenu(mouseX, mouseY);
    }
});

function animatePopup(element, targetState) {
    if (targetState === true) {
        element.style.visibility = 'visible';
        element.classList.remove('popup-anim-out');
        element.classList.add('popup-anim-in');
    } else {
        element.classList.remove('popup-anim-in');
        element.classList.add('popup-anim-out');
    }
}

const showContextMenu = (x, y) => {
    const menuWidth = contextMenu.getBoundingClientRect().width;
    const menuHeight = contextMenu.getBoundingClientRect().height;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let menuX = x - 57;
    let menuY = y + 5;

    if (menuX + menuWidth > windowWidth) {
        menuX = windowWidth - menuWidth;
    }
    if (menuY + menuHeight > windowHeight) {
        menuY = windowHeight - menuHeight;
    }

    contextMenu.style.left = `${menuX}px`;
    contextMenu.style.top = `${menuY}px`;

    animatePopup(contextMenu, true);

    const openChannelItem = contextMenu.querySelector('.context-item-open-channel');
    const openPlayerItem = contextMenu.querySelector('.context-item-open-player');
    const chatItem = contextMenu.querySelector('.context-item-open-chat');
    const aboutItem = contextMenu.querySelector('.context-item-about');
    const videosItem = contextMenu.querySelector('.context-item-videos');
    const clipsItem = contextMenu.querySelector('.context-item-clips');
    const goToCategoryItem = contextMenu.querySelector('.context-item-go-to-category');

    openChannelItem.addEventListener('click', handleOpenChannel);
    openPlayerItem.addEventListener('click', handleOpenPlayer);
    chatItem.addEventListener('click', handleOpenChat);
    aboutItem.addEventListener('click', handleOpenAbout);
    videosItem.addEventListener('click', handleOpenVideos);
    clipsItem.addEventListener('click', handleOpenClips);
    goToCategoryItem.addEventListener('click', handleGoToCategory);
};

// Function to hide the context menu and remove the class from the stream container
const hideContextMenu = () => {
    animatePopup(contextMenu, false);
};

const openLink = (url, openInNewWindow) => {
    if (openInNewWindowToggle.checked) {
        chrome.windows.create({ url });
    } else {
        chrome.tabs.create({ url });
    }
    contextMenu.style.visibility = 'hidden';
};

const openLinkInPopup = (url, openInNewWindow) => {
    if (openInNewWindowToggle.checked) {
        chrome.windows.create({ url, type: 'popup' });
    } else {
        chrome.tabs.create({ url });
    }
    contextMenu.style.visibility = 'hidden';
};

// Click outside the menu to close it
document.addEventListener('mousedown', (event) => {
    // Only allow closing with primary click
    // This prevents the hide function being called when right-clicking streams as well
    if (event.button !== 0) {
        return;
    }

    if (!contextMenu.contains(event.target)) {
        hideContextMenu();
    }
});

// Defined separate functions to handle each context menu item click
const handleOpenChannel = () => openLink(`https://www.twitch.tv/${currentChannelName}`);
const handleOpenPlayer = () => openLinkInPopup(`https://player.twitch.tv/?channel=${currentChannelName}&parent=twitch-live`);
const handleOpenChat = () => openLink(`https://www.twitch.tv/popout/${currentChannelName}/chat`);
const handleOpenAbout = () => openLink(`https://www.twitch.tv/${currentChannelName}/about`);
const handleOpenVideos = () => openLink(`https://www.twitch.tv/${currentChannelName}/videos`);
const handleOpenClips = () => openLink(`https://www.twitch.tv/${currentChannelName}/clips?filter=clips&range=7d`);
const handleGoToCategory = () => {
    const formattedCategory = encodeURIComponent(currentCategoryName.toLowerCase().replace(/\s/g, '-'));
    openLink(`https://www.twitch.tv/directory/category/${formattedCategory}`);
};

// Function to escape HTML tags
const escapeHTML = (unsafe) => {
    return unsafe.replace(/[&<"']/g, (match) => {
        switch (match) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case '"':
                return "&quot;";
            case "'":
                return "&#039;";
            default:
                return match;
        }
    });
};