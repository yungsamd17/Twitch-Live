// Shared UI animations for popup (deduplicated from main.js + settings.js)
function animatePopup(element, targetState) {
    if (!element) return;
    if (targetState === true) {
        element.style.visibility = 'visible';
        element.classList.remove('popup-anim-out');
        element.classList.add('popup-anim-in');
    } else {
        element.classList.remove('popup-anim-in');
        element.classList.add('popup-anim-out');
    }
}

function animateSettingsBackground(element, targetState) {
    if (!element) return;
    if (targetState === true) {
        element.style.visibility = 'visible';
        element.classList.remove('settings-background-anim-out');
        element.classList.add('settings-background-anim-in');
    } else {
        element.classList.remove('settings-background-anim-in');
        element.classList.add('settings-background-anim-out');
    }
}
