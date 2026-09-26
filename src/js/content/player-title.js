(() => {
    'use strict';

    const TITLE_SUFFIX = ' - Twitch Player';

    const getChannelFromUrl = () => {
        try {
            return new URLSearchParams(window.location.search).get('channel');
        } catch (e) {
            return null;
        }
    };

    const applyTitle = (name) => {
        if (name) document.title = `${name}${TITLE_SUFFIX}`;
    };

    // Case-sensitive name from the embed info card (URL param casing can be off).
    const updateFromInfoCard = (observer) => {
        const el = document.querySelector('[data-test-selector="stream-info-card-component__title-link"]');
        if (el && el.textContent.trim()) {
            applyTitle(el.textContent.trim());
            if (observer) observer.disconnect();
            return true;
        }
        return false;
    };

    chrome.storage.local.get({ playerTitleToggle: false }, (res) => {
        if (!res.playerTitleToggle) return;

        const initial = getChannelFromUrl();
        if (initial) applyTitle(initial);

        const run = () => updateFromInfoCard(observer);
        const observer = new MutationObserver(run);
        observer.observe(document.documentElement, { childList: true, subtree: true });

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run, { once: true });
        } else {
            run();
        }
    });
})();
