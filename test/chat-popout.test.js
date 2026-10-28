'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/js/content/chat-popout.js'), 'utf8');

// Run the actual content script with extras enabled and controls already present
// unless requested otherwise. Record insertions to catch even transient buttons.
const loadScript = (url, { enabled = true, controlsReady = true } = {}) => {
    const inserted = [];
    const opened = [];
    let onMutation;
    const controls = { children: [], appendChild: el => inserted.push(el) };
    const context = {
        URLSearchParams,
        window: { location: new URL(url), open: (...args) => opened.push(args) },
        chrome: { storage: { local: { get: (_, cb) => cb({ playerExtrasToggle: enabled }) } } },
        MutationObserver: class {
            constructor(callback) { onMutation = callback; }
            observe() {}
        },
        document: {
            body: {},
            head: { appendChild() {} },
            getElementById: () => null,
            querySelector(selector) {
                if (selector === '.tl-chat-popout-btn') return inserted[0]?.children[0] || null;
                return controlsReady ? controls : null;
            },
            createElement() {
                return {
                    children: [],
                    appendChild(el) { this.children.push(el); },
                    addEventListener(_, callback) { this.click = callback; },
                    remove() { inserted.length = 0; },
                };
            },
        },
    };
    vm.runInNewContext(source, context);
    return {
        inserted, opened, context,
        get observing() { return !!onMutation; },
        mutate() { onMutation?.(); },
        showControls() { controlsReady = true; },
    };
};

describe('chat popout injection', () => {
    for (const url of [
        'https://www.twitch.tv/shroud',
        'https://www.twitch.tv/shroud?channel=shroud&player=embed',
        'https://www.twitch.tv/directory',
        'https://www.twitch.tv/popout/shroud/chat',
        'https://twitch.tv/shroud',
        'https://clips.twitch.tv/Example',
        'https://player.twitch.tv.example.com/?channel=shroud',
    ]) {
        it(`never inserts or observes on ${url}`, () => {
            const page = loadScript(url);
            page.mutate();
            assert.equal(page.observing, false);
            assert.equal(page.inserted.length, 0);
        });
    }

    for (const host of ['player.twitch.tv', 'embed.twitch.tv']) {
        it(`inserts once on ${host} and opens the channel chat`, () => {
            const page = loadScript(`https://${host}/?channel=Shroud&parent=twitch-live`);
            assert.equal(page.inserted.length, 1);
            page.mutate();
            assert.equal(page.inserted.length, 1);
            page.inserted[0].children[0].click({ stopPropagation() {} });
            assert.equal(page.opened[0][0], 'https://www.twitch.tv/popout/Shroud/chat');
        });
    }

    it('waits for controls on player pages', () => {
        const page = loadScript('https://player.twitch.tv/?channel=shroud', { controlsReady: false });
        assert.equal(page.inserted.length, 0);
        page.showControls();
        page.mutate();
        assert.equal(page.inserted.length, 1);
    });

    for (const query of ['', '?channel=', '?video=v123']) {
        it(`does not insert without a channel: ${query}`, () => {
            assert.equal(loadScript(`https://player.twitch.tv/${query}`).inserted.length, 0);
        });
    }

    it('respects the disabled extras toggle', () => {
        const page = loadScript('https://player.twitch.tv/?channel=shroud', { enabled: false });
        assert.equal(page.observing, false);
        assert.equal(page.inserted.length, 0);
    });

    it('rechecks context before later injection attempts', () => {
        const page = loadScript('https://player.twitch.tv/?channel=shroud', { controlsReady: false });
        page.context.window.location = new URL('https://www.twitch.tv/shroud');
        page.showControls();
        page.mutate();
        assert.equal(page.inserted.length, 0);
    });

    it('only registers the chat script on the two player hosts', () => {
        const manifest = require('../manifest.json');
        const script = manifest.content_scripts.find(entry => entry.js.includes('src/js/content/chat-popout.js'));
        assert.deepEqual(script.matches, ['https://player.twitch.tv/*', 'https://embed.twitch.tv/*']);
    });
});
