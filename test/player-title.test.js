// Tests for src/js/content/player-title.js URL parsing and title format.
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { installStubs, setUrl } = require('./support.js');

installStubs();
const { getChannelFromUrl, applyTitle, TITLE_SUFFIX } = require('../src/js/content/player-title.js');

describe('getChannelFromUrl', () => {
    it('reads ?channel= from player URLs', () => {
        setUrl('https://player.twitch.tv/?channel=Shroud&parent=twitch-live');
        assert.equal(getChannelFromUrl(), 'Shroud');
    });

    it('returns null when no channel param is present', () => {
        setUrl('https://player.twitch.tv/');
        assert.equal(getChannelFromUrl(), null);
    });
});

describe('applyTitle', () => {
    it('writes "<channel> - Twitch Player" to the tab', () => {
        installStubs();
        applyTitle('shroud');
        assert.equal(global.document.title, `shroud${TITLE_SUFFIX}`);
        assert.equal(global.document.title, 'shroud - Twitch Player');
    });
});
