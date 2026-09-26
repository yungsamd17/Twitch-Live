(() => {
    'use strict';

    const RESERVED = new Set([
        'directory', 'search', 'settings', 'subscriptions', 'drops',
        'store', 'p', 'popout', 'clip', 'clips', 'videos', 'about',
        'schedule', 'chat', 'jobs', 'turbo', 'prime', 'downloads'
    ]);

    const isClipPage = () =>
        window.location.href.includes('/clip/') ||
        window.location.hostname === 'clips.twitch.tv';

    const getChannelName = () => {
        if (isClipPage()) return null;
        const host = window.location.hostname;
        if (host === 'player.twitch.tv' || host === 'embed.twitch.tv') {
            try {
                return new URLSearchParams(window.location.search).get('channel');
            } catch (e) {
                return null;
            }
        }
        if (host === 'www.twitch.tv') {
            const first = window.location.pathname.split('/').filter(Boolean)[0];
            if (!first || RESERVED.has(first.toLowerCase())) return null;
            return first;
        }
        return null;
    };

    const findControls = () =>
        document.querySelector('[class*="player-controls__right-control-group"]') ||
        document.querySelector('[data-a-target="player-controls"]');

    const ensureStyle = () => {
        if (document.getElementById('tl-chat-popout-style')) return;
        const style = document.createElement('style');
        style.id = 'tl-chat-popout-style';
        style.textContent = [
            '.tl-chat-popout-btn{border:none;border-radius:50%;padding:2px;cursor:pointer;',
            'width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:transparent;}',
            '.tl-chat-popout-btn:hover{background-color:rgba(255,255,255,.13);}',
            '.tl-chat-popout-btn:active{background-color:rgba(255,255,255,.16);}',
            '.tl-chat-popout-btn:focus{background-color:rgba(255,255,255,.13);}'
        ].join('');
        document.head.appendChild(style);
    };

    const openChatPopout = () => {
        const channel = getChannelName();
        if (!channel) return;
        window.open(
            `https://www.twitch.tv/popout/${encodeURIComponent(channel)}/chat`,
            '_blank',
            'width=380,height=600,menubar=no,toolbar=no'
        );
    };

    const createButton = () => {
        if (isClipPage()) {
            document.querySelector('.tl-chat-popout-btn')?.remove();
            return;
        }
        const target = findControls();
        if (!target) {
            document.querySelector('.tl-chat-popout-btn')?.remove();
            return;
        }
        if (document.querySelector('.tl-chat-popout-btn')) return;
        if (!getChannelName()) return;

        ensureStyle();
        const wrapper = document.createElement('div');
        wrapper.className = 'tl-chat-popout-userscript';
        const button = document.createElement('button');
        button.className = 'tl-chat-popout-btn';
        button.title = 'Open chat popout';
        button.innerHTML = [
            '<svg viewBox="0 0 24 24" height="18" width="18">',
            '<path fill="#ffffff" d="M4 2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8l-4 4V4a2 2 0 0 1 2-2z',
            'M7 8h10v1.5H7V8zm0 3.5h7V13H7v-1.5z"></path></svg>'
        ].join('');
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            openChatPopout();
        });
        wrapper.appendChild(button);
        const children = target.children;
        if (children.length >= 2) {
            target.insertBefore(wrapper, children[children.length - 2]);
        } else {
            target.appendChild(wrapper);
        }
    };

    chrome.storage.local.get({ playerExtrasToggle: false }, (res) => {
        if (!res.playerExtrasToggle) return;
        const observer = new MutationObserver(createButton);
        observer.observe(document.body, { childList: true, subtree: true });
        createButton();
    });

    // Exposed for zero-dependency unit tests (node --test test/).
    // Inert in the browser: `module` is undefined in classic extension scripts.
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getChannelName, isClipPage, RESERVED };
    }
})();
