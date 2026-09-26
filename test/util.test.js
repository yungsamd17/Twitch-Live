// Pure-logic tests for src/js/util.js — no stubs needed.
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getTimePassed, getStartedAtTime } = require('../src/js/util.js');

describe('getTimePassed', () => {
    const withFrozenNow = (nowIso, fn) => {
        const orig = Date.now;
        Date.now = () => Date.parse(nowIso);
        try {
            fn();
        } finally {
            Date.now = orig;
        }
    };

    it('formats hours with padded minutes and seconds', () => {
        withFrozenNow('2026-09-26T12:00:00Z', () => {
            assert.equal(getTimePassed('2026-09-26T10:57:57Z'), '1:02:03');
        });
    });

    it('leaves single-digit minutes unpadded below an hour', () => {
        withFrozenNow('2026-09-26T12:00:00Z', () => {
            assert.equal(getTimePassed('2026-09-26T11:54:55Z'), '5:05');
            assert.equal(getTimePassed('2026-09-26T11:59:51Z'), '0:09');
        });
    });

    it('pads minutes once they reach double digits', () => {
        withFrozenNow('2026-09-26T12:00:00Z', () => {
            assert.equal(getTimePassed('2026-09-26T11:49:30Z'), '10:30');
        });
    });
});

describe('getStartedAtTime', () => {
    it('renders a human-readable US date with AM/PM', () => {
        const out = getStartedAtTime('2026-09-26T12:00:00Z');
        assert.match(out, /2026/);
        assert.match(out, /AM|PM/);
    });
});
