+++
date = '2026-04-05T23:47:23-05:00'
draft = false
title = 'Faramir'
+++

After building [Boromir](https://github.com/AI3xGP) in Python, it was time to let the younger brother take over.

Faramir is a Rust-based forensic utility designed to extract and timeline Windows persistence artifacts from offline registry hives. It targets mounted disk images and parses the SYSTEM, SOFTWARE, and NTUSER.DAT registry files to surface known persistence techniques, outputting everything to CSV for easy ingestion into a timeline or SIEM.

The move to Rust was intentional — single self-contained binary, no Python environment to set up, and better performance when parsing large hives.

## What it detects

Faramir covers 30+ persistence techniques, including:

- **Registry Run Keys** (MITRE T1547.001) — Standard run, RunOnce, RunEx variants
- **DLL Injection / Hijacking** (MITRE T1546.010, T1546.015) — AppInit_DLLs, COM hijacking, ServiceDll manipulation
- **Authentication Hooks** (MITRE T1547.002, T1547.004) — LSA packages, Winlogon properties
- **Boot Mechanisms** (MITRE T1542.003) — Session Manager BootExecute
- **Debugger Hooks** (MITRE T1546.012) — IFEO, AeDebug, WerFault configurations
- **Startup Methods** (MITRE T1547.001, T1546.002) — Autorun keys, screensaver exploitation
- **Scheduled Tasks & Services** (MITRE T1053.005, T1543.003)

## Output

Each finding is recorded in a CSV with: timestamp, technique name, MITRE/Hexacorn classification, registry path, suspicious value, access level, and a reference link.

The format is timeline-ready and can be fed directly into tools like Timesketch or any SIEM that accepts CSV.

## Try it

https://github.com/AI3xGP/faramir
