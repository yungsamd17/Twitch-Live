// Popup diagnostics for Sam's Twitch Live.
//
// Captures console output, init steps, uncaught errors and rejected promises,
// then builds a copyable report (app version, background reachability, safe
// storage snapshot, log) shown in an on-screen panel. The panel opens
// automatically if the popup content is still empty 4s after load
// (blank-screen detector), or manually by tapping the extension version in
// the settings modal 5 times.
//
// Safety: every entry point is guarded so this file can never break the
// popup itself. Secrets are never logged (access token is presence-only).
(() => {
    const MAX_ENTRIES = 300;
    const BLANK_DETECT_MS = 4000;
    const PING_TIMEOUT_MS = 5000;
    const t0 = Date.now();
    const entries = [];

    const elapsed = () => Date.now() - t0;

    const push = (level, args) => {
        try {
            const msg = args.map((a) => {
                if (a instanceof Error) {
                    return `${a.name}: ${a.message}${a.stack ? `\n${a.stack}` : ""}`;
                }
                if (typeof a === "object" && a !== null) {
                    try {
                        return JSON.stringify(a);
                    } catch (e) {
                        return String(a);
                    }
                }
                return String(a);
            }).join(" ");
            entries.push(`[t+${elapsed()}ms] [${level}] ${msg}`);
            if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
        } catch (e) { /* never break the popup */ }
    };

    const hookConsole = () => {
        try {
            ["log", "info", "warn", "error", "debug"].forEach((method) => {
                let orig = null;
                try {
                    orig = console[method] ? console[method].bind(console) : null;
                } catch (e) { orig = null; }
                console[method] = (...args) => {
                    push(method, args);
                    if (orig) {
                        try {
                            orig(...args);
                        } catch (e) { /* ignore */ }
                    }
                };
            });
        } catch (e) { /* ignore */ }
    };

    try {
        window.addEventListener("error", (e) => {
            push("error", [`window.onerror: ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`]);
        });
        window.addEventListener("unhandledrejection", (e) => {
            const reason = e.reason instanceof Error ? e.reason.stack || e.reason.message : String(e.reason);
            push("error", [`unhandledrejection: ${reason}`]);
        });
    } catch (e) { /* ignore */ }

    const pingBackground = () => new Promise((resolve) => {
        const started = Date.now();
        let done = false;
        const timer = setTimeout(() => finish("TIMEOUT after 5000ms (service worker unreachable?)"), PING_TIMEOUT_MS);
        const finish = (text) => {
            if (!done) {
                done = true;
                clearTimeout(timer);
                resolve(text);
            }
        };
        try {
            const send = chrome && chrome.runtime && chrome.runtime.sendMessage;
            if (!send) {
                finish("FAILED: chrome.runtime unavailable");
                return;
            }
            const p = send.call(chrome.runtime, { message: "debug-ping" });
            if (p && typeof p.then === "function") {
                p.then(
                    (res) => finish(`ok in ${Date.now() - started}ms (${JSON.stringify(res)})`),
                    (err) => finish(`FAILED: ${(err && err.message) || String(err)}`)
                );
            } else {
                finish("FAILED: sendMessage returned no promise");
            }
        } catch (err) {
            finish(`FAILED: ${(err && err.message) || String(err)}`);
        }
    });

    const snapshotStorage = async () => {
        const lines = [];
        try {
            const get = chrome && chrome.storage && chrome.storage.local && chrome.storage.local.get;
            if (!get) {
                return ["  (chrome.storage unavailable)"];
            }
            const all = await get.call(chrome.storage.local, null);
            Object.keys(all).sort().forEach((key) => {
                let value = all[key];
                if (key === "twitchAccessToken") {
                    value = value ? `set (${String(value).length} chars, redacted)` : "unset";
                } else if (key === "twitchStreams" && Array.isArray(value)) {
                    value = `array[${value.length}]`;
                } else {
                    try {
                        value = JSON.stringify(value);
                    } catch (e) {
                        value = String(value);
                    }
                }
                lines.push(`  ${key} = ${value}`);
            });
        } catch (err) {
            lines.push(`  (storage read failed: ${(err && err.message) || String(err)})`);
        }
        return lines;
    };

    const buildReport = async (note) => {
        let manifest = {};
        try {
            manifest = chrome.runtime.getManifest();
        } catch (e) { manifest = {}; }
        const lines = [
            "=== Sam's Twitch Live diagnostics ===",
            `app: ${manifest.name || "?"} v${manifest.version || "?"}`,
            `url: ${location.href}`,
            `ua: ${navigator.userAgent}`,
            `viewport: ${window.innerWidth}x${window.innerHeight}`,
            `online: ${navigator.onLine}`,
            `identity API: ${!!(chrome && chrome.identity && chrome.identity.launchWebAuthFlow)}`,
            `background ping: ${await pingBackground()}`,
            "storage:",
            ...(await snapshotStorage()),
            "--- popup log ---",
            ...entries,
            "=== end ===",
        ];
        if (note) lines.splice(1, 0, `note: ${note}`);
        return lines.join("\n");
    };

    let panelOpen = false;

    // Sample data for the "Sample streams" preview (same shape as cached streams).
    const mockStreams = () => {
        const now = Date.now();
        return [
            {
                channelName: "preview_channel",
                title: "Debug preview — sample stream one",
                gameName: "Preview Category",
                viewerCount: 1234,
                thumbnail: "https://picsum.photos/seed/twitchlive1/{width}/{height}",
                startedAtISO: new Date(now - 42 * 60000).toISOString(),
                startedAtDisplay: "preview",
            },
            {
                channelName: "another_channel",
                title: "Second sample with a much longer title to check wrapping behavior",
                gameName: "Just Chatting",
                viewerCount: 56789,
                thumbnail: "https://picsum.photos/seed/twitchlive2/{width}/{height}",
                startedAtISO: new Date(now - 5 * 60000).toISOString(),
                startedAtDisplay: "preview",
            },
        ];
    };

    // Call a main.js render function defensively (main.js loads after this
    // file; bare identifiers resolve at call time). No eval — CSP forbids it.
    const callMain = (label, getFn, ...args) => {
        try {
            const fn = getFn();
            if (typeof fn !== "function") {
                push("error", [`preview failed: ${label} is not available`]);
                return false;
            }
            const result = fn(...args);
            if (result && typeof result.catch === "function") {
                result.catch((err) => push("error", [`preview failed (${label}): ${(err && err.message) || String(err)}`]));
            }
            return true;
        } catch (err) {
            push("error", [`preview failed (${label}): ${(err && err.message) || String(err)}`]);
            return false;
        }
    };

    const clearContent = () => {
        try {
            document.getElementById("content").replaceChildren();
            return true;
        } catch (err) {
            push("error", [`preview failed (clear content): ${(err && err.message) || String(err)}`]);
            return false;
        }
    };

    const toggleStates = () => {
        try {
            const simple = document.getElementById("simpleViewToggle");
            const raid = document.getElementById("showRaidButtonToggle");
            return [simple ? simple.checked : false, raid ? raid.checked : true];
        } catch (err) {
            return [false, true];
        }
    };

    const showLogout = () => {
        try {
            document.getElementById("logoutBtn").style.display = "block";
        } catch (err) { /* ignore */ }
    };

    // Buttons that render hard-to-reproduce states using the real render code.
    // "Restore" re-runs the normal load path, so previews never stick.
    const previewActions = [
        ["Nobody live", () => {
            if (!clearContent()) return false;
            const ok = callMain("renderEmptyState", () => renderEmptyState);
            if (ok) push("step", ["preview: empty state (nobody live)"]);
            return ok;
        }],
        ["Sample streams", () => {
            if (!clearContent()) return false;
            const [simple, raid] = toggleStates();
            const ok = callMain("renderStreamList", () => renderStreamList, mockStreams(), simple, raid);
            if (ok) {
                showLogout();
                push("step", ["preview: sample streams"]);
            }
            return ok;
        }],
        ["No results", () => {
            if (!clearContent()) return false;
            const ok = callMain("renderNoResults", () => renderNoResults, "zzzz-preview");
            if (ok) push("step", ["preview: no search results"]);
            return ok;
        }],
        ["Auth screen", () => {
            if (!clearContent()) return false;
            const ok = callMain("authScreen", () => authScreen);
            if (ok) push("step", ["preview: auth screen (login button is live)"]);
            return ok;
        }],
        ["Context menu", () => {
            let ok = true;
            try {
                // main.js globals: channel/category used by menu actions on click.
                currentChannelName = "preview_channel";
                currentCategoryName = "Preview Category";
                hideContextMenu();
                showContextMenu(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 3));
            } catch (err) {
                push("error", [`preview failed (context menu): ${(err && err.message) || String(err)}`]);
                ok = false;
            }
            if (ok) push("step", ["preview: context menu"]);
            return ok;
        }],
        ["\u21A9 Restore", () => {
            const ok = callMain("loadTwitchContent", () => loadTwitchContent);
            if (ok) push("step", ["preview restored: live view reloading"]);
            return ok;
        }],
    ];
    const showPanel = async (note) => {
        if (panelOpen) return;
        panelOpen = true;
        try {
            push("step", ["diagnostics panel opened"]);
            const report = await buildReport(note);
            const overlay = document.createElement("div");
            overlay.id = "debug-overlay";
            const bar = document.createElement("div");
            bar.id = "debug-bar";
            const copyBtn = document.createElement("button");
            copyBtn.id = "debug-copy-btn";
            copyBtn.textContent = "Copy";
            copyBtn.addEventListener("click", async () => {
                // Read live from the panel so previews are included.
                const liveReport = pre.textContent;
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(liveReport);
                    } else {
                        throw new Error("no clipboard API");
                    }
                    copyBtn.textContent = "Copied!";
                } catch (e) {
                    const ta = document.createElement("textarea");
                    ta.value = liveReport;
                    document.body.appendChild(ta);
                    ta.select();
                    try {
                        document.execCommand("copy");
                        copyBtn.textContent = "Copied!";
                    } catch (copyErr) {
                        copyBtn.textContent = "Copy failed";
                    }
                    document.body.removeChild(ta);
                }
                setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
            });
            const closeBtn = document.createElement("button");
            closeBtn.id = "debug-close-btn";
            closeBtn.textContent = "Close";
            closeBtn.addEventListener("click", () => {
                overlay.remove();
                panelOpen = false;
            });
            bar.append(copyBtn, closeBtn);
            // Preview row: render hard-to-reproduce states with the real
            // render code. Refresh the shown report afterwards so it
            // includes the preview step. Previews reset on auto-refresh.
            const prevWrap = document.createElement("div");
            prevWrap.id = "debug-preview";
            const prevLabel = document.createElement("span");
            prevLabel.id = "debug-preview-label";
            prevLabel.textContent = "Preview:";
            prevWrap.appendChild(prevLabel);
            previewActions.forEach(([label, action]) => {
                const btn = document.createElement("button");
                btn.textContent = label;
                btn.addEventListener("click", async () => {
                    let ok = false;
                    try {
                        ok = await action();
                    } catch (e) {
                        push("error", [`preview failed (${label}): ${(e && e.message) || String(e)}`]);
                    }
                    try {
                        pre.textContent = await buildReport(ok ? `preview: ${label}` : `preview failed: ${label}`);
                    } catch (e) { /* keep stale report */ }
                });
                prevWrap.appendChild(btn);
            });
            const pre = document.createElement("pre");
            pre.id = "debug-report";
            pre.textContent = report;
            overlay.append(bar, prevWrap, pre);
            document.body.appendChild(overlay);
        } catch (e) {
            panelOpen = false;
        }
    };

    // Auto-open when the popup renders nothing (blank-screen detector).
    const armBlankDetector = () => {
        const check = () => {
            try {
                const content = document.getElementById("content");
                if (content && content.childElementCount === 0) {
                    showPanel("popup content still empty 4s after load (blank-screen detector)");
                }
            } catch (e) { /* ignore */ }
        };
        try {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => setTimeout(check, BLANK_DETECT_MS));
            } else {
                setTimeout(check, BLANK_DETECT_MS);
            }
        } catch (e) { /* ignore */ }
    };

    // Manual trigger: tap the version in the settings modal 5 times.
    const armManualTrigger = () => {
        let taps = 0;
        let timer = null;
        try {
            document.addEventListener("click", (e) => {
                try {
                    if (e.target && e.target.closest && e.target.closest("#extensionVersion")) {
                        taps += 1;
                        clearTimeout(timer);
                        timer = setTimeout(() => { taps = 0; }, 1500);
                        if (taps >= 5) {
                            taps = 0;
                            showPanel("opened manually (5x version tap)");
                        }
                    }
                } catch (inner) { /* ignore */ }
            });
        } catch (e) { /* ignore */ }
    };

    // Floating action button (bottom-right) that opens the diagnostics panel.
    const addFab = () => {
        try {
            if (document.getElementById("debug-fab")) return;
            const btn = document.createElement("button");
            btn.id = "debug-fab";
            btn.title = "Open diagnostics";
            btn.setAttribute("aria-label", "Open diagnostics");
            const icon = document.createElement("i");
            icon.className = "fa-solid fa-bug";
            btn.appendChild(icon);
            btn.addEventListener("click", () => showPanel("opened via debug button"));
            const mount = () => {
                try {
                    document.body.appendChild(btn);
                } catch (e) { /* ignore */ }
            };
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", mount);
            } else {
                mount();
            }
        } catch (e) { /* ignore */ }
    };

    window.DebugLog = {
        step: (msg) => push("step", [msg]),
        show: (note) => showPanel(note),
    };
    hookConsole();
    push("step", ["debug.js loaded"]);
    armBlankDetector();
    armManualTrigger();
    addFab();
})();
