// Tests for the pure helpers in src/js/main.js (loaded with DOM stubs).
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { installStubs } = require('./support.js');

installStubs();
const {
    formatViewerCount,
    formatCategorySlug,
    escapeHTML,
    filterToButtonId,
    buttonIdToFilter,
} = require('../src/js/main.js');

describe('formatViewerCount', () => {
    it('groups thousands with commas', () => {
        assert.equal(formatViewerCount(0), '0');
        assert.equal(formatViewerCount(999), '999');
        assert.equal(formatViewerCount(1000), '1,000');
        assert.equal(formatViewerCount(1234567), '1,234,567');
    });
});

describe('formatCategorySlug', () => {
    it('lowercases, hyphenates spaces, and encodes', () => {
        assert.equal(formatCategorySlug('Just Chatting'), 'just-chatting');
        assert.equal(formatCategorySlug('League of Legends'), 'league-of-legends');
        assert.equal(formatCategorySlug('Pokémon'), 'pok%C3%A9mon');
    });
});

describe('escapeHTML', () => {
    it('escapes embeddable characters in stream titles', () => {
        assert.equal(escapeHTML('a&b'), 'a&amp;b');
        assert.equal(escapeHTML('<script>'), '&lt;script>');
        assert.equal(escapeHTML('"hi"'), '&quot;hi&quot;');
        assert.equal(escapeHTML("it's"), 'it&#039;s');
    });

    it('leaves plain titles untouched', () => {
        assert.equal(escapeHTML('Late night ranked grind'), 'Late night ranked grind');
    });
});

describe('sort filter maps', () => {
    it('round-trips between filter names and button ids', () => {
        const names = Object.keys(filterToButtonId);
        assert.equal(names.length, 6);
        for (const name of names) {
            assert.equal(buttonIdToFilter[filterToButtonId[name]], name);
        }
    });

    it('keeps Viewers (High to Low) as the default button', () => {
        assert.equal(filterToButtonId['Viewers (High to Low)'], 'viewersHighToLowButton');
    });
});
