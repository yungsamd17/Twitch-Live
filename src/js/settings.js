// Function to set the toggle switch status
const setToggleSwitchStatus = (toggleId, status) => {
    const toggleSwitch = document.getElementById(toggleId);
    if (toggleSwitch) {
        toggleSwitch.checked = status;
        chrome.storage.local.set({ [toggleId]: status });
    }
};

// Retrieve the stored settings on popup load
chrome.storage.local.get(["openInPlayerToggle", "openInNewWindowToggle", "openInNewTabToggle"], (result) => {
    setToggleSwitchStatus("openInPlayerToggle", result.openInPlayerToggle !== undefined ? result.openInPlayerToggle : false);
    setToggleSwitchStatus("openInNewWindowToggle", result.openInNewWindowToggle !== undefined ? result.openInNewWindowToggle : false);
    setToggleSwitchStatus("openInNewTabToggle", result.openInNewTabToggle !== undefined ? result.openInNewTabToggle : true);
});

// Listen for changes in the toggle switches and store the settings
document.getElementById("openInPlayerToggle").addEventListener("change", function () {
    setToggleSwitchStatus("openInPlayerToggle", this.checked);
});

document.getElementById("openInNewWindowToggle").addEventListener("change", function () {
    setToggleSwitchStatus("openInNewWindowToggle", this.checked);
});

document.getElementById("openInNewTabToggle").addEventListener("change", function () {
    setToggleSwitchStatus("openInNewTabToggle", this.checked);
});

// Listen for changes in storage and update the toggle switches accordingly
chrome.storage.onChanged.addListener((changes) => {
    if (changes.openInPlayerToggle !== undefined) {
        setToggleSwitchStatus("openInPlayerToggle", changes.openInPlayerToggle.newValue);
    }
    if (changes.openInNewWindowToggle !== undefined) {
        setToggleSwitchStatus("openInNewWindowToggle", changes.openInNewWindowToggle.newValue);
    }
    if (changes.openInNewTabToggle !== undefined) {
        setToggleSwitchStatus("openInNewTabToggle", changes.openInNewTabToggle.newValue);
    }
});

// Log the toggle switch statuses
const openInPlayerToggle = document.getElementById("openInPlayerToggle");
const openInNewWindowToggle = document.getElementById("openInNewWindowToggle");
const openInNewTabToggle = document.getElementById("openInNewTabToggle");
console.log("Toggle Switch Status - Open in Player:", openInPlayerToggle.checked);
console.log("Toggle Switch Status - Open in New Window:", openInNewWindowToggle.checked);
console.log("Toggle Switch Status - Open in New Tab:", openInNewTabToggle.checked);


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
