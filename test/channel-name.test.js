// Channel-name parsing is duplicated across content scripts by design
// (each content script is self-contained), so both copies are tested here
// against the same matrix to keep them in sync.
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { setUrl } = require('./support.js');

const cases = [
    ['https://player.twitch.tv/?channel=Shroud&parent=twitch-live', 'Shroud'],
    ['https://embed.twitch.tv/?channel=shroud', 'shroud'],
    ['https://www.twitch.tv/shroud', 'shroud'],
    ['https://www.twitch.tv/shroud/about', 'shroud'],
    ['https://www.twitch.tv/', null],
    ['https://www.twitch.tv/directory/following/live', null],
    ['https://www.twitch.tv/search?term=chess', null],
    ['https://www.twitch.tv/shroud/clip/AbC123', null], // clip pages hide the button
    ['https://clips.twitch.tv/AbC123', null],
];

for (const file of ['channel-copy.js', 'chat-popout.js']) {
    describe(`${file} getChannelName`, () => {
        // Stubs must exist before requiring: each IIFE touches
        // window/chrome at load. Require lazily per file so each module
        // gets fresh stub state.
        setUrl('https://www.twitch.tv/');
        const mod = require(`../src/js/content/${file}`);

        for (const [url, expected] of cases) {
            it(`${url} -> ${expected}`, () => {
                setUrl(url);
                assert.equal(mod.getChannelName(), expected);
            });
        }

        it('exposes a non-empty reserved-routes set', () => {
            for (const route of ['directory', 'search', 'clip', 'clips']) {
                assert.ok(mod.RESERVED.has(route), `missing reserved route: ${route}`);
            }
        });
    });
}
