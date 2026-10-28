'use strict';

const { it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

it('registers Copy channel on main Twitch pages', () => {
    const manifest = require('../manifest.json');
    const script = manifest.content_scripts.find(entry => entry.js.includes('src/js/content/channel-copy.js'));
    assert.ok(script.matches.includes('https://www.twitch.tv/*'));
});

it('shows Copy channel on a main Twitch channel page and copies its name', async () => {
    const inserted = [];
    const copied = [];
    const controls = { children: [], appendChild: el => inserted.push(el) };
    const source = fs.readFileSync(path.join(__dirname, '../src/js/content/channel-copy.js'), 'utf8');
    vm.runInNewContext(source, {
        window: { location: new URL('https://www.twitch.tv/Shroud'), addEventListener() {} },
        navigator: { clipboard: { writeText: async text => copied.push(text) } },
        console: { log() {} },
        chrome: { storage: { local: { get: (_, cb) => cb({ playerExtrasToggle: true }) } } },
        MutationObserver: class { observe() {} },
        document: {
            body: {},
            head: { appendChild() {} },
            getElementById: () => null,
            querySelector: selector => selector === '.tl-channel-copy-btn' ? null : controls,
            createElement: () => ({
                children: [],
                appendChild(el) { this.children.push(el); },
                addEventListener(_, callback) { this.click = callback; },
            }),
        },
    });
    assert.equal(inserted.length, 1);
    const button = inserted[0].children[0];
    assert.equal(button.className, 'tl-channel-copy-btn');
    button.click({ stopPropagation() {} });
    // Let the clipboard promise settle before checking the result.
    await Promise.resolve();
    assert.deepEqual(copied, ['Shroud']);
});
