+++
date = '2026-01-27T10:33:41-05:00'
draft = false
title = 'ChatGPT'
description = 'Forensic analysis of ChatGPT web usage in Chrome: IndexedDB, Network, and Sessions artifacts to investigate data exfiltration and malicious extensions.'
+++

## Scope

When investigating whether sensitive data was pasted into ChatGPT, or whether a browser extension is intercepting or exfiltrating data from a ChatGPT session, the artifacts you need depend on how the user accessed the service:

- **Desktop app** (Windows/macOS) — uses its own local storage and LevelDB paths, out of scope for this post.
- **Web access via Chrome** (or any Chromium-based browser: Edge, Brave) — covered here. Firefox and Safari store the equivalent IndexedDB data in SQLite instead of LevelDB; the artifacts and reasoning are the same, only the parser format changes.

For a Chromium browser, three locations inside the user's profile directory matter most for this kind of investigation:

1. `IndexedDB/` — per-origin LevelDB store used by the ChatGPT single-page app
2. `Network/` — connection and prefetch history, independent of what the user actually navigated to
3. `Sessions/` — open/restored tab state, useful even when browsing history has been cleared

The profile path depends on the OS:

- Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\`
- Linux: `~/.config/google-chrome/Default/`
- macOS: `~/Library/Application Support/Google/Chrome/Default/`

## 1. IndexedDB

Chrome stores each origin's IndexedDB database in its own folder inside `IndexedDB/`, named after the origin:

```
IndexedDB/https_chatgpt.com_0.indexeddb.leveldb/
```

This is a full LevelDB database (`.log`, `.ldb`, `MANIFEST-######`, `CURRENT`, `LOG` files), not a single file — point the parser at the folder, not at an individual file inside it.

### Parsing it with dfindexeddb

[`dfindexeddb`](https://github.com/google/dfindexeddb) is a pure-Python parser that reads LevelDB/IndexedDB structures directly, without needing Chrome or native LevelDB libraries installed. Install it with:

```bash
sudo apt install libsnappy-dev
pip install dfindexeddb
```

Then parse the ChatGPT store:

```bash
dfindexeddb db \
  -s "IndexedDB/https_chatgpt.com_0.indexeddb.leveldb" \
  --format chrome \
  --use_manifest \
  -o json > basechatgpt.json
```

- `-s/--source` — path to the LevelDB *folder* (not a specific file inside it)
- `--format chrome` — tells the tool to decode Chromium's IndexedDB encoding (valid values: `chromium`, `chrome`, `firefox`, `safari`)
- `--use_manifest` — reconstructs database state from the current `MANIFEST` file, which also surfaces records that are still physically present on disk but were marked deleted/overwritten and haven't been compacted away yet. Useful when the suspect deleted conversations or cleared site data but the browser hasn't run LevelDB compaction since. It's mutually exclusive with `--use_sequence_number`, which recovers records via the LevelDB write sequence number instead — worth trying as a fallback if `--use_manifest` comes up empty.
- `-o json` — explicit output format (`json`, `jsonl`, or `repr`); defaults to `json` if omitted

**What to expect in the output:** the ChatGPT web app fetches conversation content live from the API, so don't expect IndexedDB to contain a clean dump of full chat transcripts. What you *will* reliably find is evidence of usage and state — conversation/session identifiers, cached UI and feature-flag state, service worker asset references, and timestamps. Treat this as proof of *access and activity*, and pair it with the Sessions and Network artifacts below to build a timeline.

If you only need to confirm the origin was ever active, `db_info` is faster than a full dump:

```bash
dfindexeddb db_info -s "IndexedDB/https_chatgpt.com_0.indexeddb.leveldb" --format chrome
```

## 2. Network artifacts

Independent of IndexedDB, the `Network/` folder inside the profile can confirm connections to `chatgpt.com` / `openai.com` even when the user never fully typed the URL or the tab was closed before a session snapshot was written:

- **`Network Action Predictor`** (SQLite) — logs characters typed in the omnibox and what Chrome *predicted and prefetched*, letter by letter. Can reveal an attempt to reach ChatGPT that was typed and then aborted.
- **`TransportSecurity`** (JSON) — HSTS state; a `chatgpt.com` or `openai.com` entry confirms at least one HTTPS connection was established to that host from this profile.
- **`Reporting and NEL`** — Network Error Logging reports; can show connection failures to the domain, e.g. a proxy or DLP tool blocking it.

These are SQLite/JSON files, so a generic SQLite browser or `jq` is enough — no special tooling required.

## 3. Sessions and Tabs

`Sessions/` contains `Session_*` and `Tabs_*` files in Chrome's proprietary **SNSS** format (magic bytes `SNSS`, little-endian, version as a 32-bit integer right after the magic). These record open and restored tabs, including page titles and URLs, and persist independently of `History` — valuable when the suspect cleared browsing history but a "restore tabs" snapshot was still written afterwards.

SNSS is undocumented and binary; don't parse it by hand. Use an existing parser, e.g. [`chrome-session-dump`](https://github.com/lemnos/chrome-session-dump):

```bash
chrome-session-dump "Sessions/Session_13389658601925577"
```

By default it prints the URL of every tab found in the session, in order; add `-printf '%t\n'` to print titles instead, or `-active` to print only the most recently active tab. Look for `chatgpt.com` entries and cross-reference their timestamps against the IndexedDB and Network findings above.

## Checking for malicious or exfiltrating extensions

The other half of the investigation — whether an extension was involved — doesn't live in any of the three folders above. Chrome extensions are unpacked under:

```
Extensions/<extension_id>/<version>/manifest.json
```

The folder name is the extension ID (the same string shown in `chrome://extensions` with developer mode enabled). For each installed extension, check `manifest.json` for:

- `permissions` / `host_permissions` — an extension requesting `clipboardRead`, `webRequest`, `webRequestBlocking`, `<all_urls>`, or an explicit `*://chatgpt.com/*` / `*://*.openai.com/*` host permission can read or intercept page content and network traffic on ChatGPT's origin.
- `content_scripts` whose `matches` field includes ChatGPT's domain — the most direct sign an extension injects code into the ChatGPT page itself, e.g. to scrape prompts and responses straight from the DOM.

Cross-reference the extension ID and install metadata against the profile's `Secure Preferences` file (JSON), under the `extensions.settings.<extension_id>` key. It records `install_time`, `state` (enabled/disabled), and the permissions Chrome actually granted — useful to confirm an extension was active at the time of the incident, not merely that it's currently installed.

## Summary

| Artifact | Location | Reveals |
|---|---|---|
| IndexedDB | `IndexedDB/https_chatgpt.com_0.indexeddb.leveldb/` | App state, cached identifiers, usage evidence |
| Network Action Predictor | `Network/Network Action Predictor` | Typed/prefetched URLs, including aborted attempts |
| TransportSecurity | `Network/TransportSecurity` | Confirmed HTTPS connections to the domain |
| Sessions/Tabs | `Sessions/Session_*`, `Sessions/Tabs_*` | Open/restored tabs, survives history clearing |
| Extensions | `Extensions/<id>/<version>/manifest.json` | Permissions/content scripts able to read ChatGPT page content |
| Secure Preferences | profile root | Extension install time and state at a given point |

No single one of these artifacts proves data exfiltration on its own — the value is in correlating timestamps across IndexedDB activity, network connection evidence, session/tab state, and extension permissions to build a defensible timeline.

## Tooling reference

- [google/dfindexeddb](https://github.com/google/dfindexeddb) — IndexedDB/LevelDB parser used above
- [lemnos/chrome-session-dump](https://github.com/lemnos/chrome-session-dump) — SNSS session/tab parser
