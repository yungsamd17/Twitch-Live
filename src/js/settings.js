// Function to set the toggle switch status
const setToggleSwitchStatus = (toggleId, status) => {
    const toggleSwitch = document.getElementById(toggleId);
    if (toggleSwitch) {
        toggleSwitch.checked = status;
        chrome.storage.local.set({ [toggleId]: status });
    }
};

// Function to fetch the extension version from manifest.json
const getExtensionVersion = () => {
    const manifestData = chrome.runtime.getManifest();
    return manifestData.version;
};

// Retrieve the stored settings on popup load
chrome.storage.local.get(
    ["openInPlayerToggle", "openInNewWindowToggle", "customBadgeColor", "extensionVersion", "backgroundUpdateRateMin"],
    (result) => {
        setToggleSwitchStatus(
            "openInPlayerToggle",
            result.openInPlayerToggle !== undefined ? result.openInPlayerToggle : false
        );
        setToggleSwitchStatus(
            "openInNewWindowToggle",
            result.openInNewWindowToggle !== undefined ? result.openInNewWindowToggle : false
        );
        document.getElementById("colorInput").value = result.customBadgeColor || "";

        backgroundRefreshSelect.value = result.backgroundUpdateRateMin || 5;

        // Display the extension version in the settings modal
        const versionElement = document.getElementById("extensionVersion");
        if (versionElement) {
            versionElement.textContent = `v${getExtensionVersion()}`;
        }
        // console.log(`%cSam's Twitch Live v${getExtensionVersion()}`, "color: #a855f7");
    }
);

// Listen for changes in the toggle switches and store the settings
document.getElementById("openInPlayerToggle").addEventListener("change", function () {
    setToggleSwitchStatus("openInPlayerToggle", this.checked);
});

document.getElementById("openInNewWindowToggle").addEventListener("change", function () {
    setToggleSwitchStatus("openInNewWindowToggle", this.checked);
});

// Listen for changes in storage and update the toggle switches accordingly
chrome.storage.onChanged.addListener((changes) => {
    if (changes.openInPlayerToggle !== undefined) {
        setToggleSwitchStatus("openInPlayerToggle", changes.openInPlayerToggle.newValue);
    }
    if (changes.openInNewWindowToggle !== undefined) {
        setToggleSwitchStatus("openInNewWindowToggle", changes.openInNewWindowToggle.newValue);
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
colorInput.addEventListener("focus", function () {
    this.addEventListener("input", handleColorInput);
});

colorInput.addEventListener("blur", function () {
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

    // Remove the extension badge
    chrome.action.setBadgeText({ text: "" });
    // Close the popup
    window.close();
};

// Event listener for the logout button
const logoutButton = document.getElementById("logoutBtn");
if (logoutButton) {
    logoutButton.addEventListener("click", handleLogoutButtonClick);
}

// Filter dropdown
var dropdown = document.getElementById("filterDropdown");
var filterBtn = document.getElementById("filterButton");
filterBtn.onclick = function(event) {
    dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
    event.stopPropagation();
};

window.onclick = function(event) {
    if (!event.target.matches('.dropdown-content') && dropdown.style.display === "flex") {
        dropdown.style.display = "none";
    }
}

// Background update refresh dropdown
var backgroundRefreshSelect = document.getElementById("backgroundRefreshSelect");
backgroundRefreshSelect.addEventListener("change", function(value) {
    chrome.storage.local.set({ backgroundUpdateRateMin: parseInt(value.target.value) });
});

// Settings Modal
var modal = document.getElementById("settingsModal");
var btn = document.getElementById("settingsBtn");
var span = document.getElementsByClassName("settings-close-btn")[0];
btn.onclick = function() {
    modal.style.display = "flex";
}
span.onclick = function() {
    modal.style.display = "none";
}
