// Function to set the toggle switch status
const setToggleSwitchStatus = (toggleId, status) => {
    const toggleSwitch = document.getElementById(toggleId);
    if (toggleSwitch) {
        toggleSwitch.checked = status;
        chrome.storage.local.set({
            [toggleId]: status
        });
    }
};

// Function to fetch the extension version from manifest.json
const getExtensionVersion = () => {
    const manifestData = chrome.runtime.getManifest();
    return manifestData.version;
};

// Retrieve the stored settings on popup load
chrome.storage.local.get(
    [
        "simpleViewToggle",
        "openInPlayerToggle",
        "openInNewWindowToggle",
        "showRaidButtonToggle",
        "customBadgeColor",
        "extensionVersion",
        "backgroundUpdateRateMin",
        "twitchAccessToken"
    ],
    (result) => {
        setToggleSwitchStatus(
            "simpleViewToggle",
            result.simpleViewToggle !== undefined ? result.simpleViewToggle : false
        );
        setToggleSwitchStatus(
            "openInPlayerToggle",
            result.openInPlayerToggle !== undefined ? result.openInPlayerToggle : false
        );
        setToggleSwitchStatus(
            "openInNewWindowToggle",
            result.openInNewWindowToggle !== undefined ? result.openInNewWindowToggle : false
        );
        setToggleSwitchStatus(
            "showRaidButtonToggle",
            result.showRaidButtonToggle !== undefined ? result.showRaidButtonToggle : false
        );
        document.getElementById("colorInput").value = result.customBadgeColor || "";

        backgroundRefreshSelect.value = result.backgroundUpdateRateMin || 5;

        // Display the extension version in the settings modal
        const versionElement = document.getElementById("extensionVersion");
        if (versionElement) {
            versionElement.textContent = `v${getExtensionVersion()}`;
        }
        // console.log(`%cSam's Twitch Live v${getExtensionVersion()}`, "color: #a855f7");

        // Check if the user is logged in
        if (result.twitchAccessToken) {
            // User is logged in
            return
        } else {
            // User is not logged in, hide the button
            document.getElementById("logoutBtn").style.display = "none";
        }
    }
);

// Listen for changes in the toggle switches and store the settings
document.getElementById("simpleViewToggle").addEventListener("change", function() {
    setToggleSwitchStatus("simpleViewToggle", this.checked);
    loadTwitchContent(); // Reload content based on the Simple view toggle
});

document.getElementById("openInPlayerToggle").addEventListener("change", function() {
    setToggleSwitchStatus("openInPlayerToggle", this.checked);
});

document.getElementById("openInNewWindowToggle").addEventListener("change", function() {
    setToggleSwitchStatus("openInNewWindowToggle", this.checked);
});

document.getElementById("showRaidButtonToggle").addEventListener("change", function() {
    setToggleSwitchStatus("showRaidButtonToggle", this.checked);
});

// Listen for changes in storage and update the toggle switches accordingly
chrome.storage.onChanged.addListener((changes) => {
    if (changes.openInPlayerToggle !== undefined) {
        setToggleSwitchStatus("openInPlayerToggle", changes.openInPlayerToggle.newValue);
    }
    if (changes.openInNewWindowToggle !== undefined) {
        setToggleSwitchStatus("openInNewWindowToggle", changes.openInNewWindowToggle.newValue);
    }
    if (changes.showRaidButtonToggle !== undefined) {
        setToggleSwitchStatus("showRaidButtonToggle", changes.showRaidButtonToggle.newValue);
    }
    if (changes.simpleViewToggle !== undefined) {
        setToggleSwitchStatus("simpleViewToggle", changes.simpleViewToggle.newValue);
    }
    if (changes.backgroundUpdateRateMin !== undefined) {
        backgroundRefreshSelect.value = changes.backgroundUpdateRateMin.newValue;
    }
});

// Log the toggle switch statuses
const openInPlayerToggle = document.getElementById("openInPlayerToggle");
const openInNewWindowToggle = document.getElementById("openInNewWindowToggle");
const colorInput = document.getElementById("colorInput");
// console.log("Toggle Switch Status - Open in Player:", openInPlayerToggle.checked);
// console.log("Toggle Switch Status - Open in New Window:", openInNewWindowToggle.checked);

// Custom color badge input
colorInput.addEventListener("focus", function() {
    this.addEventListener("input", handleColorInput);
});

colorInput.addEventListener("blur", function() {
    this.removeEventListener("input", handleColorInput);
});

function handleColorInput() {
    const color = this.value.trim();

    // Check if the entered color is a valid HEX format and starts with "#"
    if (/^#[0-9A-Fa-f]{6}$/.test(color) && color.startsWith("#") && color.length >= 7) {
        // Clear any existing timeout
        clearTimeout(this.timeoutId);

        // Schedule the update after a delay (e.g., 100 milliseconds)
        this.timeoutId = setTimeout(() => {
            chrome.storage.local.set({ customBadgeColor: color }, () => {
                // Update the badge color
                chrome.action.setBadgeBackgroundColor({ color });
            });
        }, 100);
    } else if (color.length === 0) {
        // If the input is empty, set to default color
        chrome.storage.local.set({ customBadgeColor: "" }, () => {
            chrome.action.setBadgeBackgroundColor({ color: "#666666" });
        });
    }
}

// Function to handle the logout button click
const handleLogoutButtonClick = () => {
    chrome.storage.local.set({
        twitchAccessToken: null,
        twitchIsValidated: false,
        twitchUserId: null,
        twitchStreams: null,
    });

    // Remove the extension badge, and close the popup
    chrome.action.setBadgeText({ text: "" });
    window.close();
};

// Event listener for the logout button
const logoutButton = document.getElementById("logoutBtn");
if (logoutButton) {
    logoutButton.addEventListener("click", handleLogoutButtonClick);
}

// Filter dropdown
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

var dropdown = document.getElementById("filterDropdown");
var filterBtn = document.getElementById("filterButton");
var filterLabel = document.querySelector('[filter-label]');

filterBtn.onclick = function(event) {
    let isFilterLabelHidden = filterLabel.classList.contains('filter-label-hidden');

    if (isFilterLabelHidden) {
        filterLabel.classList.remove('filter-label-hidden');
    } else {
        filterLabel.classList.add('filter-label-hidden');
    }

    let dropdownVisibility = window.getComputedStyle(dropdown).visibility === "visible";
    animatePopup(dropdown, !dropdownVisibility);

    event.stopPropagation();
};

// Event listener to reset the filter label visibility on hover
filterBtn.addEventListener('mouseenter', function() {
    filterLabel.classList.remove('filter-label-hidden');
});

window.onmousedown = function(event) {
    if (!event.target.matches('.dropdown-content') && dropdown.style.visibility === "visible") {
        animatePopup(dropdown, false);
    }
}

function animateSettingsBackground(element, targetState) {
    if (targetState === true) {
        element.style.visibility = 'visible';
        element.classList.remove('settings-background-anim-out');
        element.classList.add('settings-background-anim-in');
    } else {
        element.classList.remove('settings-background-anim-in');
        element.classList.add('settings-background-anim-out');
    }
}

// Background update refresh dropdown
var backgroundRefreshSelect = document.getElementById("backgroundRefreshSelect");
backgroundRefreshSelect.addEventListener("change", function(value) {
    chrome.storage.local.set({ backgroundUpdateRateMin: parseInt(value.target.value) });
});

// Settings Modal
var modal = document.getElementById("settingsModal");
var modalContent = document.getElementById("settingsModalContent");
var settingsBtn = document.getElementById("settingsBtn");
var settingsCloseBtn = document.getElementsByClassName("settings-close-btn")[0];
var settingsLabel = document.querySelector("[settings-label]");

settingsBtn.addEventListener("mousedown", function() {
    // Hide the settings-label on mousedown
    settingsLabel.classList.add("hidden-label");
});

settingsBtn.onclick = function() {
    animateSettingsBackground(modal, true);
    animatePopup(modalContent, true);
};

// Function to close the modal
function closeModal() {
    // Restore the settings-label when the modal is closed
    settingsLabel.classList.remove("hidden-label");
    animateSettingsBackground(modal, false);
    animatePopup(modalContent, false);
}

// Close modal when the close button is clicked
settingsCloseBtn.onclick = closeModal;
// Close modal when the 'f' key is pressed
document.addEventListener('keydown', function(event) {
    if (event.key.toLowerCase() === 'f') {
        closeModal();
    }
});