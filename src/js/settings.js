// Function to set the toggle switch status
const setToggleSwitchStatus = (toggleId, status) => {
    const toggleSwitch = document.getElementById(toggleId);
    if (toggleSwitch) {
        toggleSwitch.checked = status;
        chrome.storage.local.set({ [toggleId]: status });
    }
};

// Retrieve the stored settings on popup load
chrome.storage.local.get(["openInPlayerToggle", "openInNewWindowToggle", "customBadgeColor"], (result) => {
    setToggleSwitchStatus("openInPlayerToggle", result.openInPlayerToggle !== undefined ? result.openInPlayerToggle : false);
    setToggleSwitchStatus("openInNewWindowToggle", result.openInNewWindowToggle !== undefined ? result.openInNewWindowToggle : false);
    document.getElementById("colorInput").value = result.customBadgeColor || "";
});

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
});

// Log the toggle switch statuses
const openInPlayerToggle = document.getElementById("openInPlayerToggle");
const openInNewWindowToggle = document.getElementById("openInNewWindowToggle");
const colorInput = document.getElementById("colorInput");
/*console.log("Toggle Switch Status - Open in Player:", openInPlayerToggle.checked);
console.log("Toggle Switch Status - Open in New Window:", openInNewWindowToggle.checked);*/

// Custom color badge input
colorInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        const color = this.value.trim();

        // Check if the entered color is a valid HEX format and starts with "#"
        if (/^#[0-9A-Fa-f]{6}$/.test(color) && color.startsWith("#")) {
            chrome.storage.local.set({ customBadgeColor: color }, () => {
                // Update the badge color
                chrome.action.setBadgeBackgroundColor({ color });
            });
        } else {
            // If the input is invalid or empty, set to default color and clear the input
            chrome.storage.local.set({ customBadgeColor: "" }, () => {
                this.value = "";
                chrome.action.setBadgeBackgroundColor({ color: "#666666" });
            });
        }

        // Prevent the default form submission behavior
        event.preventDefault();
    }
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
