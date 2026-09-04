const contentSection = document.getElementById("content");
const filterInput = document.getElementById("searchStreams");
const refreshButton = document.getElementById("refreshButton");
let autoRefreshId = null;
let searchDebounce = null;

// DEBUG-START
// Diagnostics hook (no-op when src/js/debug.js is absent). Never throws.
const dbg = (msg) => {
    try {
        if (window.DebugLog) window.DebugLog.step(msg);
    } catch (e) { /* ignore */ }
};
dbg("main.js start");
// DEBUG-END

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

        const baseStreamUrl = `https://www.twitch.tv/${encodeURIComponent(stream.channelName)}`;
        let url;

        if (openInPlayer) {
            url = `https://player.twitch.tv/?channel=${encodeURIComponent(stream.channelName)}&parent=twitch-live`;
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

const renderEmptyState = () => {
    const empty = document.createElement("div");
    empty.setAttribute("class", "no-search-results");
    const emptyText = document.createElement("p");
    emptyText.textContent = "No live channels — follow more on Twitch.";
    empty.appendChild(emptyText);
    const browseLink = document.createElement("a");
    browseLink.setAttribute("class", "search-on-twitch-link");
    browseLink.setAttribute("href", "https://www.twitch.tv/directory/following/live");
    browseLink.setAttribute("target", "_blank");
    browseLink.innerHTML = `Browse Following&nbsp;<i class="fa-solid fa-arrow-up-right-from-square search-on-twitch-link-icon"></i>`;
    empty.appendChild(browseLink);
    contentSection.replaceChildren(empty);
    document.getElementById("logoutBtn").style.display = "block";
    dbg("render: empty state (nobody live)");
};

const loadTwitchContent = async () => {
    const storageItems = ["twitchIsValidated", "twitchAccessToken", "twitchStreams", "showRaidButtonToggle"];
    const res = await chrome.storage.local.get(storageItems);
    dbg(`storage: validated=${!!res.twitchIsValidated} token=${res.twitchAccessToken ? "set" : "unset"} streams=${Array.isArray(res.twitchStreams) ? `array[${res.twitchStreams.length}]` : typeof res.twitchStreams}`);

    // Check if Simple view is enabled
    const simpleViewToggle = document.getElementById("simpleViewToggle");
    const simpleViewEnabled = simpleViewToggle ? simpleViewToggle.checked : false;

    // Always refresh Twitch streams when the popup is opened.
    // Failures must not blank the popup: log and fall through to cached storage.
    try {
        await refreshTwitchStreams();
    } catch (err) {
        dbg(`refreshTwitchStreams failed, continuing with cached storage: ${(err && err.message) || String(err)}`);
    }

    if (authScreenPresent()) {
        return; // Skip refreshing streams when authScreen is present
    }

    if (res.twitchStreams) {
        if (res.twitchStreams.length === 0) {
            renderEmptyState();
            return;
        }
        renderStreamList(res.twitchStreams, simpleViewEnabled, res.showRaidButtonToggle);

        // Show logout button after login/when logged in
        document.getElementById("logoutBtn").style.display = "block";

    } else if (!res.twitchIsValidated || !res.twitchAccessToken) {
        dbg("render: auth screen");
        authScreen();
    } else {
        dbg("render: skipped (streams present but empty branch not taken?)");
    }
};

const renderNoResults = (searchTerm) => {
    // Display a message when no matching results are found
    const noResultsMessage = document.createElement("div");
    noResultsMessage.setAttribute("class", "no-search-results");

    const noResultsMessageText = document.createElement("p")
    noResultsMessageText.innerHTML = "No matching Search results found.";
    noResultsMessage.appendChild(noResultsMessageText)

    const searchOnTwitch = document.createElement("a")
    searchOnTwitch.setAttribute("class", "search-on-twitch-link")
    searchOnTwitch.setAttribute("href", `https://www.twitch.tv/search?term=${encodeURIComponent(searchTerm)}`)
    searchOnTwitch.setAttribute("target", "_blank")
    searchOnTwitch.innerHTML = `Search on Twitch&nbsp;<i class="fa-solid fa-arrow-up-right-from-square search-on-twitch-link-icon"></i>`
    noResultsMessage.appendChild(searchOnTwitch)

    contentSection.replaceChildren(noResultsMessage);
};

const renderStreamList = (streams, simpleViewEnabled, showRaidButton) => {
        let filteredStreams = [...streams];

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
                    const aUptime = new Date(a.startedAtISO || a.startedAt).getTime() || 0;
                    const bUptime = new Date(b.startedAtISO || b.startedAt).getTime() || 0;
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
                    const aStarted = new Date(a.startedAtISO || a.startedAt).getTime() || 0;
                    const bStarted = new Date(b.startedAtISO || b.startedAt).getTime() || 0;
                    return bStarted - aStarted;
                });
                break;
            case "Longest Running":
                filteredStreams.sort((a, b) => {
                    const aStarted = new Date(a.startedAtISO || a.startedAt).getTime() || 0;
                    const bStarted = new Date(b.startedAtISO || b.startedAt).getTime() || 0;
                    return aStarted - bStarted;
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
                const liveTime = typeof getTimePassed === 'function' ? getTimePassed(stream.startedAtISO || stream.startedAt) : stream.liveTime;
                uptime.textContent = liveTime;
                uptime.setAttribute("title", `Live since ${stream.startedAtDisplay || stream.startedAt}`);
                streamThumbnail.appendChild(uptime);

                const thumbnail = document.createElement("img");
                thumbnail.src = stream.thumbnail
                    .replace("{width}", "128")
                    .replace("{height}", "72");
                thumbnail.alt = `${stream.channelName} thumbnail`;
                thumbnail.loading = "lazy";
                thumbnail.onerror = () => {
                    thumbnail.onerror = null;
                    thumbnail.src = "src/icons/icon-128.png";
                    thumbnail.style.objectFit = "contain";
                    thumbnail.style.padding = "6px";
                    thumbnail.style.backgroundColor = "#242429";
                };
                streamThumbnail.appendChild(thumbnail);

                const streamDetails = document.createElement("div");
                streamDetails.setAttribute("class", `stream-details ${simpleViewEnabled ? 'simpleview-stream-details' : ''}`);
                streamContainer.appendChild(streamDetails);

                const channelContainer = document.createElement("div");
                channelContainer.setAttribute("class", "channel-container")
                streamDetails.appendChild(channelContainer);

                const channel = document.createElement("span");
                channel.setAttribute("class", "stream-channel-name");
                channel.textContent = stream.channelName;
                channelContainer.appendChild(channel);

                const raidButton = document.createElement("button");
                raidButton.setAttribute("class", "channel-raid-button");
                raidButton.innerHTML = `<i class="fa-regular fa-copy"></i>`
                raidButton.setAttribute("title", "Click to copy raid command");

                // Add the "hidden" class if the showRaidButtonToggle is disabled
                if (!showRaidButton) {
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
                    newTimedAlert.textContent = message;

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

                    try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(raidCommand);
                        } else {
                            throw new Error('no clipboard');
                        }
                    } catch {
                        // Fallback for older Chromium
                        const textArea = document.createElement("textarea");
                        textArea.value = raidCommand;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textArea);
                    }

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
                categoryAndViewCount.textContent = stream.gameName;
                categoryAndViewCount.setAttribute("title", stream.gameName);
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
            dbg(`render: ${streamList.length} streams`);
        } else {
            renderNoResults(filterInput.value.trim());
        }
};

const refreshTwitchStreams = async () => {
    // Backstop: never let a missing/slow background reply blank the popup.
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("refresh-twitch-streams timed out after 8000ms")), 8000)
    );
    await Promise.race([
        chrome.runtime.sendMessage({ message: "refresh-twitch-streams" }),
        timeout,
    ]);
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

// Persisted sort filter handling
const filterToButtonId = {
    "Broadcaster": "broadcasterButton",
    "Category": "categoryButton",
    "Viewers (High to Low)": "viewersHighToLowButton",
    "Viewers (Low to High)": "viewersLowToHighButton",
    "Recently Started": "startedButton",
    "Longest Running": "runningButton"
};
const buttonIdToFilter = {
    "broadcasterButton": "Broadcaster",
    "categoryButton": "Category",
    "viewersHighToLowButton": "Viewers (High to Low)",
    "viewersLowToHighButton": "Viewers (Low to High)",
    "startedButton": "Recently Started",
    "runningButton": "Longest Running"
};

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

    return "Viewers (High to Low)"; // Default filter option
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
    // Persist choice
    const filterName = buttonIdToFilter[buttonId];
    if (filterName) {
        chrome.storage.local.set({ selectedFilter: filterName });
    }
};

// Restore persisted sort filter on load
const restoreSelectedFilter = async () => {
    const res = await chrome.storage.local.get({ selectedFilter: "Viewers (High to Low)" });
    const buttonId = filterToButtonId[res.selectedFilter] || "viewersHighToLowButton";
    setSelectedFilterOption(buttonId);
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
filterInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => loadTwitchContent(), 150);
});
refreshButton.addEventListener("click", handleRefreshButtonClick);

// Initial load
addEventListener("DOMContentLoaded", async () => {
    dbg("DOMContentLoaded: init start");
    await restoreSelectedFilter();
    dbg("DOMContentLoaded: filter restored");
    await loadTwitchContent();
    dbg("DOMContentLoaded: content loaded");
    if (authScreenPresent()) return;
    setupAutoRefresh();
});

const setupAutoRefresh = () => {
    if (autoRefreshId) clearInterval(autoRefreshId);
    // Automatically refresh streams every 30s while popup is open
    autoRefreshId = window.setInterval(async () => {
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
        currentChannelName = streamContainer.querySelector('.stream-channel-name').textContent.trim();
        currentCategoryName = streamContainer.querySelector('.stream-category').textContent.split(' - ')[0].trim();
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        hideContextMenu();
        showContextMenu(mouseX, mouseY);
    }
});

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
const handleOpenChannel = () => openLink(`https://www.twitch.tv/${encodeURIComponent(currentChannelName)}`);
const handleOpenPlayer = () => openLinkInPopup(`https://player.twitch.tv/?channel=${encodeURIComponent(currentChannelName)}&parent=twitch-live`);
const handleOpenChat = () => openLink(`https://www.twitch.tv/popout/${encodeURIComponent(currentChannelName)}/chat`);
const handleOpenAbout = () => openLink(`https://www.twitch.tv/${encodeURIComponent(currentChannelName)}/about`);
const handleOpenVideos = () => openLink(`https://www.twitch.tv/${encodeURIComponent(currentChannelName)}/videos`);
const handleOpenClips = () => openLink(`https://www.twitch.tv/${encodeURIComponent(currentChannelName)}/clips?filter=clips&range=7d`);
const handleGoToCategory = () => {
    const formattedCategory = encodeURIComponent(currentCategoryName.toLowerCase().replace(/\s/g, '-'));
    openLink(`https://www.twitch.tv/directory/category/${formattedCategory}`);
};

// Bind context menu items once (avoid re-adding on every right-click)
(() => {
    const bind = (sel, fn) => {
        const el = contextMenu && contextMenu.querySelector(sel);
        if (el) el.addEventListener('click', fn);
    };
    if (contextMenu) {
        bind('.context-item-open-channel', handleOpenChannel);
        bind('.context-item-open-player', handleOpenPlayer);
        bind('.context-item-open-chat', handleOpenChat);
        bind('.context-item-about', handleOpenAbout);
        bind('.context-item-videos', handleOpenVideos);
        bind('.context-item-clips', handleOpenClips);
        bind('.context-item-go-to-category', handleGoToCategory);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            bind('.context-item-open-channel', handleOpenChannel);
            bind('.context-item-open-player', handleOpenPlayer);
            bind('.context-item-open-chat', handleOpenChat);
            bind('.context-item-about', handleOpenAbout);
            bind('.context-item-videos', handleOpenVideos);
            bind('.context-item-clips', handleOpenClips);
            bind('.context-item-go-to-category', handleGoToCategory);
        });
    }
})();

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