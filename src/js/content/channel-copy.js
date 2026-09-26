(() => {
    'use strict';

    // Top-level www.twitch.tv routes that are not channel pages.
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
        if (document.getElementById('tl-channel-copy-style')) return;
        const style = document.createElement('style');
        style.id = 'tl-channel-copy-style';
        style.textContent = [
            '.tl-channel-copy-btn{border:none;border-radius:0.4rem;padding:2px;cursor:pointer;',
            'width:30px;height:30px;display:flex;align-items:center;justify-content:center;background:transparent;}',
            '.tl-channel-copy-btn:hover{background-color:rgba(255,255,255,.13);}',
            '.tl-channel-copy-btn:active{background-color:rgba(255,255,255,.16);}',
            '.tl-channel-copy-btn:focus{background-color:rgba(255,255,255,.13);}'
        ].join('');
        document.head.appendChild(style);
    };

    const copyText = async (text) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return;
            }
            throw new Error('no clipboard');
        } catch (e) {
            const area = document.createElement('textarea');
            area.value = text;
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            document.body.removeChild(area);
        }
    };

    const copyChannelUsername = async () => {
        const username = getChannelName();
        if (!username) return;
        await copyText(username);
        console.log('%cTwitch Channel Copy:', 'color: #9147ff', 'Channel username copied to clipboard.');
    };

    const createButton = () => {
        if (isClipPage()) {
            document.querySelector('.tl-channel-copy-btn')?.remove();
            return;
        }
        const target = findControls();
        if (!target) {
            document.querySelector('.tl-channel-copy-btn')?.remove();
            return;
        }
        if (document.querySelector('.tl-channel-copy-btn')) return;
        if (!getChannelName()) return;

        ensureStyle();
        const wrapper = document.createElement('div');
        wrapper.className = 'tl-channel-copy-userscript';
        const button = document.createElement('button');
        button.className = 'tl-channel-copy-btn';
        button.title = 'Copy channel name (Alt+T)';
        button.innerHTML = [
            '<svg viewBox="0 0 448 512" height="17" width="17">',
            '<path fill="#ffffff" d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 ',
            '26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 ',
            '26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z"></path></svg>'
        ].join('');
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            copyChannelUsername();
        });
        wrapper.appendChild(button);
        const children = target.children;
        if (children.length >= 2) {
            target.insertBefore(wrapper, children[children.length - 2]);
        } else {
            target.appendChild(wrapper);
        }
    };

    const isTyping = (event) => {
        const el = event.target;
        if (!el || !el.tagName) return false;
        const tag = el.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    };

    window.addEventListener('keydown', (event) => {
        if (event.altKey && (event.key === 't' || event.key === 'T') && !isTyping(event)) {
            copyChannelUsername();
        }
    });

    chrome.storage.local.get({ channelCopyToggle: false }, (res) => {
        if (!res.channelCopyToggle) return;
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
