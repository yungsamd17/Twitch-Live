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
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(report);
                    } else {
                        throw new Error("no clipboard API");
                    }
                    copyBtn.textContent = "Copied!";
                } catch (e) {
                    const ta = document.createElement("textarea");
                    ta.value = report;
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
            const pre = document.createElement("pre");
            pre.id = "debug-report";
            pre.textContent = report;
            overlay.append(bar, pre);
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

    window.DebugLog = {
        step: (msg) => push("step", [msg]),
        show: (note) => showPanel(note),
    };
    hookConsole();
    push("step", ["debug.js loaded"]);
    armBlankDetector();
    armManualTrigger();
})();
