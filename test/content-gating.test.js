// Contract test: all player-extras content scripts share one settings toggle,
// and the popup exposes exactly that toggle with a link to the extras docs.
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contentFiles = ['player-title.js', 'channel-copy.js', 'chat-popout.js'];

const readRepo = (...parts) =>
    fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

describe('player extras single-toggle contract', () => {
    for (const file of contentFiles) {
        it(`${file} gates on playerExtrasToggle`, () => {
            const src = readRepo('src', 'js', 'content', file);
            assert.match(src, /playerExtrasToggle/);
        });
    }

    it('popup exposes one Player extras toggle linked to the docs', () => {
        const html = readRepo('popup.html');
        assert.match(html, /id="playerExtrasToggle"/);
        assert.match(html, /docs\/PLAYER-EXTRAS-SCRIPTS\.md/);
        assert.doesNotMatch(html, /playerTitleToggle|channelCopyToggle|chatPopoutToggle/);
    });

    it('every extras script is documented', () => {
        const docs = readRepo('docs', 'PLAYER-EXTRAS-SCRIPTS.md');
        for (const file of contentFiles) {
            const keyword = file === 'player-title.js' ? 'tab title'
                : file === 'channel-copy.js' ? 'copy' : 'popout';
            assert.match(docs.toLowerCase(), new RegExp(keyword),
                `${file} has no matching docs section`);
        }
    });
});
