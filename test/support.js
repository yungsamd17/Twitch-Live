// Shared browser-API stubs for loading classic extension scripts under Node.
// Extension scripts only touch these at load time when their feature toggles
// are off (the stubbed storage returns {}), so the stubs stay minimal.
'use strict';

const fakeElement = () => ({
    value: '',
    checked: false,
    title: '',
    style: {},
    children: [],
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild() {},
    insertBefore() {},
    select() {},
    click() {},
});

const installStubs = () => {
    global.window = global.window || {};
    Object.assign(global.window, {
        addEventListener() {},
        removeEventListener() {},
        getComputedStyle: () => ({ visibility: 'hidden' }),
        open: () => null,
    });

    global.document = global.document || {};
    Object.assign(global.document, {
        title: '',
        readyState: 'complete',
        activeElement: { tagName: 'BODY' },
        body: fakeElement(),
        documentElement: fakeElement(),
        head: fakeElement(),
        getElementById: () => fakeElement(),
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener() {},
        createElement: () => fakeElement(),
        execCommand: () => false,
    });

    global.addEventListener = global.addEventListener || (() => {});
    global.MutationObserver = global.MutationObserver || class {
        observe() {}
        disconnect() {}
    };

    // Node 24 exposes navigator as a read-only global — only stub when writable.
    try {
        if (!global.navigator) global.navigator = {};
    } catch (e) { /* read-only global, leave as-is */ }

    global.chrome = {
        runtime: {
            onMessage: { addListener() {} },
            sendMessage: () => Promise.resolve({ ok: true }),
        },
        storage: {
            // Returns defaults (all toggles off) so content scripts exit early.
            local: {
                get: (defaults, cb) => {
                    if (typeof cb === 'function') cb({});
                    return Promise.resolve({});
                },
                set: () => Promise.resolve(),
            },
            onChanged: { addListener() {} },
        },
        tabs: { create() {} },
        windows: { create() {} },
        action: {
            setBadgeText: () => Promise.resolve(),
            setBadgeBackgroundColor: () => Promise.resolve(),
        },
    };
};

const setUrl = (url) => {
    installStubs();
    global.window.location = new URL(url);
};

module.exports = { installStubs, setUrl, fakeElement };
